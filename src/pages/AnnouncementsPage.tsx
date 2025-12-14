import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Trash2, Send, Loader2, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_by: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { role: currentRole, loading: roleLoading } = useUserRole();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
  });

  useEffect(() => {
    checkAuth();
  }, [currentRole, roleLoading]);

  useEffect(() => {
    if (currentRole === 'admin') {
      fetchAnnouncements();
    }
  }, [currentRole]);

  const checkAuth = async () => {
    if (roleLoading) return;

    if (currentRole !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only admins can access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
      );

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      logger.error('Error fetching announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both title and message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create announcement
      const { data: announcement, error: createError } = await supabase
        .from('announcements')
        .insert({
          title: announcementForm.title.trim(),
          message: announcementForm.message.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Send notification to all users with notifications enabled
      await sendNotificationToAllUsers(announcementForm.title, announcementForm.message);

      // Update announcement with sent_at timestamp
      await supabase
        .from('announcements')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', announcement.id);

      toast({
        title: 'Success',
        description: 'Announcement created and notifications sent to all users',
      });

      setAnnouncementDialogOpen(false);
      setAnnouncementForm({ title: '', message: '' });
      fetchAnnouncements();
    } catch (error) {
      logger.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const sendNotificationToAllUsers = async (title: string, message: string) => {
    try {
      // Get all users with notifications enabled
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, notifications_enabled, notification_permission_granted')
        .eq('notifications_enabled', true)
        .eq('notification_permission_granted', true);

      if (error) {
        logger.error('Error fetching users for notifications:', error);
        return;
      }

      if (!users || users.length === 0) {
        logger.info('No users with notifications enabled');
        toast({
          title: 'Info',
          description: 'No users have notifications enabled yet',
        });
        return;
      }

      logger.info(`Sending notifications to ${users.length} users`);

      // Broadcast to all active clients via service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Send message to all service worker clients (active users)
          const clients = await registration.clients.matchAll({ includeUncontrolled: true });
          
          let sentCount = 0;
          if (clients && clients.length > 0) {
            clients.forEach((client) => {
              client.postMessage({
                type: 'ANNOUNCEMENT_NOTIFICATION',
                title,
                body: message,
                data: {
                  url: '/',
                  type: 'announcement'
                }
              });
              sentCount++;
            });
          }

          // Also show notification directly if we have permission (for admin)
          if (Notification.permission === 'granted') {
            registration.showNotification(title, {
              body: message,
              icon: '/main.png',
              badge: '/main.png',
              tag: `announcement-${Date.now()}`,
              data: {
                url: '/',
                type: 'announcement'
              },
              requireInteraction: false,
              vibrate: [200, 100, 200],
              actions: [
                {
                  action: 'view',
                  title: 'View'
                }
              ]
            });
            sentCount++;
          }

          logger.info(`Notification sent to ${sentCount} active client(s)`);
          
          // Note: This sends to active clients only. For offline users, you would need:
          // 1. Web Push API with subscription tokens stored in database
          // 2. A backend service (Supabase Edge Function) to send push notifications
          // 3. Or use a service like Firebase Cloud Messaging
          
        } catch (swError) {
          logger.error('Error with service worker notification:', swError);
          // Fallback: try direct notification if permission is granted
          if (Notification.permission === 'granted') {
            new Notification(title, {
              body: message,
              icon: '/main.png',
              tag: `announcement-${Date.now()}`,
            });
          }
        }
      } else {
        // Fallback if service worker is not available
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: '/main.png',
            tag: `announcement-${Date.now()}`,
          });
        }
      }
      
      logger.info(`Notification broadcast completed`);
    } catch (error) {
      logger.error('Error sending notifications:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement deleted',
      });

      fetchAnnouncements();
    } catch (error) {
      logger.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialog(null);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 sm:py-6 md:py-8">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Admin</span>
          <span className="sm:hidden">Back</span>
        </Link>

        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Announcements
          </h1>
          <Button onClick={() => setAnnouncementDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Announcement</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No announcements yet</p>
              <p className="text-sm mt-2">Create your first announcement to notify all users</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 sm:p-6 bg-card rounded-lg shadow-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg text-foreground">
                        {announcement.title}
                      </h3>
                      {announcement.sent_at && (
                        <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded">
                          Sent
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap mb-3">
                      {announcement.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Created: {new Date(announcement.created_at).toLocaleString()}
                      </span>
                      {announcement.sent_at && (
                        <span>
                          Sent: {new Date(announcement.sent_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDialog(announcement.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Announcement Dialog */}
        <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                This announcement will be sent as a notification to all users who have enabled notifications.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter announcement title"
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter announcement message"
                  value={announcementForm.message}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, message: e.target.value })
                  }
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAnnouncementDialogOpen(false);
                  setAnnouncementForm({ title: '', message: '' });
                }}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateAnnouncement} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Announcement
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this announcement? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDialog && handleDelete(deleteDialog)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
