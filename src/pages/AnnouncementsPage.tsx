import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Trash2, Send, Loader2, ChevronLeft, Cake, Flame, Heart, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { EventType, Imam } from '@/lib/supabase-types';
import { getNotificationTemplate } from '@/lib/notification-templates';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_by: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  event_type?: EventType | 'general' | null;
  imam_id?: string | null;
  event_date?: string | null;
  hijri_date?: string | null;
  template_data?: any;
}

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { role: currentRole, loading: roleLoading } = useUserRole();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    eventType: 'general' as EventType | 'general',
    imamId: '',
    eventDate: '',
    hijriDate: '',
  });

  useEffect(() => {
    checkAuth();
  }, [currentRole, roleLoading]);

  useEffect(() => {
    if (currentRole === 'admin') {
      fetchAnnouncements();
      fetchImams();
    }
  }, [currentRole]);

  const fetchImams = async () => {
    try {
      const { data, error } = await safeQuery(async () =>
        await (supabase as any)
          .from('imams')
          .select('*')
          .order('order_index, name')
      );

      if (error) throw error;
      setImams(data || []);
    } catch (error) {
      logger.error('Error fetching imams:', error);
    }
  };

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
    // Auto-generate title if event type is not general and imam is selected
    let finalTitle = announcementForm.title.trim();
    if (!finalTitle && announcementForm.eventType !== 'general' && announcementForm.imamId) {
      const selectedImam = imams.find(i => i.id === announcementForm.imamId);
      if (selectedImam) {
        switch (announcementForm.eventType) {
          case 'birthday':
            finalTitle = `Birth Anniversary: ${selectedImam.name}`;
            break;
          case 'martyrdom':
            finalTitle = `Martyrdom: ${selectedImam.name}`;
            break;
          case 'death':
            finalTitle = `Passing: ${selectedImam.name}`;
            break;
          default:
            finalTitle = `${selectedImam.name}: Event`;
        }
      }
    }

    if (!finalTitle || !announcementForm.message.trim()) {
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

      // Get imam name if imam_id is selected
      const selectedImam = imams.find(i => i.id === announcementForm.imamId);
      const imamName = selectedImam?.name || '';

      // Create announcement with sent_at timestamp set immediately
      // This ensures the Realtime INSERT event includes sent_at, so all listeners will receive it
      const sentAt = new Date().toISOString();
      const { data: announcement, error: createError } = await supabase
        .from('announcements')
        .insert({
          title: finalTitle,
          message: announcementForm.message.trim(),
          created_by: user.id,
          sent_at: sentAt, // Set sent_at during INSERT so Realtime event includes it
          event_type: announcementForm.eventType === 'general' ? null : announcementForm.eventType,
          imam_id: announcementForm.imamId || null,
          event_date: announcementForm.eventDate || null,
          hijri_date: announcementForm.hijriDate || null,
          template_data: {
            imamName,
            eventType: announcementForm.eventType,
          }
        })
        .select()
        .single();

      if (createError) throw createError;

      // Send notifications using template
      await sendNotificationToAllUsers(announcement);

      toast({
        title: 'Success',
        description: 'Announcement created and notifications sent to all users',
      });

      setAnnouncementDialogOpen(false);
      setAnnouncementForm({ 
        title: '', 
        message: '', 
        eventType: 'general',
        imamId: '',
        eventDate: '',
        hijriDate: '',
      });
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

  const sendNotificationToAllUsers = async (announcement: Announcement) => {
    try {
      // Get all users with notifications enabled
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, notifications_enabled, notification_permission_granted')
        .eq('notifications_enabled', true)
        .eq('notification_permission_granted', true);

      if (usersError) {
        logger.error('Error fetching users for notifications:', usersError);
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

      // The database INSERT will trigger Realtime listeners on all clients
      // All users who have the app open are listening to INSERT events on announcements table
      // The Realtime listener in App.tsx will handle showing notifications to all users
      // We don't need to manually show notifications here - let Realtime handle it
      // This prevents duplicate notifications (especially on mobile devices)
      logger.info('Announcement will be broadcast via database Realtime listeners to all devices');

      // Method 3: For future implementation - Web Push to all subscriptions
      // This would require a backend service with VAPID keys
      // For now, we'll log that subscriptions exist for future use
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, endpoint')
        .in('user_id', users.map(u => u.id));

      if (subscriptions && subscriptions.length > 0) {
        logger.info(`Found ${subscriptions.length} push subscriptions (for future Web Push implementation)`);
        // TODO: Implement Web Push sending via Supabase Edge Function
        // This requires VAPID keys and a backend service
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
            announcements.map((announcement) => {
              const getEventTypeIcon = () => {
                switch (announcement.event_type) {
                  case 'birthday':
                    return <Cake className="w-4 h-4" />;
                  case 'martyrdom':
                    return <Flame className="w-4 h-4" />;
                  case 'death':
                    return <Heart className="w-4 h-4" />;
                  case 'other':
                    return <Bell className="w-4 h-4" />;
                  default:
                    return <Info className="w-4 h-4" />;
                }
              };

              const getEventTypeColor = () => {
                switch (announcement.event_type) {
                  case 'birthday':
                    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                  case 'martyrdom':
                    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                  case 'death':
                    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                  case 'other':
                    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
                  default:
                    return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
                }
              };

              const getEventTypeLabel = () => {
                switch (announcement.event_type) {
                  case 'birthday':
                    return 'Birthday';
                  case 'martyrdom':
                    return 'Martyrdom';
                  case 'death':
                    return 'Death';
                  case 'other':
                    return 'Other Event';
                  default:
                    return 'General';
                }
              };

              return (
                <div
                  key={announcement.id}
                  className="p-4 sm:p-6 bg-card rounded-lg shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg text-foreground">
                          {announcement.title}
                        </h3>
                        {announcement.event_type && (
                          <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${getEventTypeColor()}`}>
                            {getEventTypeIcon()}
                            <span>{getEventTypeLabel()}</span>
                          </span>
                        )}
                        {announcement.sent_at && (
                          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded">
                            Sent
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap mb-3">
                        {announcement.message}
                      </p>
                      {(announcement.event_date || announcement.hijri_date) && (
                        <div className="mb-3 p-2 bg-muted/50 rounded text-sm">
                          {announcement.event_date && (
                            <div className="text-foreground">
                              <strong>Date:</strong> {new Date(announcement.event_date).toLocaleDateString()}
                            </div>
                          )}
                          {announcement.hijri_date && (
                            <div className="text-muted-foreground">
                              <strong>Hijri:</strong> {announcement.hijri_date}
                            </div>
                          )}
                        </div>
                      )}
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
              );
            })
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
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Select
                  value={announcementForm.eventType}
                  onValueChange={(value) =>
                    setAnnouncementForm({ ...announcementForm, eventType: value as EventType | 'general' })
                  }
                >
                  <SelectTrigger id="event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <span>General Announcement</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="birthday">
                      <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4" />
                        <span>Birthday / Birth Anniversary</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="martyrdom">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        <span>Martyrdom</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="death">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        <span>Death / Passing</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span>Other Event</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {announcementForm.eventType !== 'general' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="imam">Imam / Personality (Optional)</Label>
                    <Select
                      value={announcementForm.imamId}
                      onValueChange={(value) =>
                        setAnnouncementForm({ ...announcementForm, imamId: value })
                      }
                    >
                      <SelectTrigger id="imam">
                        <SelectValue placeholder="Select an imam or personality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {imams.map((imam) => (
                          <SelectItem key={imam.id} value={imam.id}>
                            {imam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-date">Event Date (Optional)</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={announcementForm.eventDate}
                        onChange={(e) =>
                          setAnnouncementForm({ ...announcementForm, eventDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hijri-date">Hijri Date (Optional)</Label>
                      <Input
                        id="hijri-date"
                        placeholder="e.g., 15 Sha'ban 1445"
                        value={announcementForm.hijriDate}
                        onChange={(e) =>
                          setAnnouncementForm({ ...announcementForm, hijriDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder={announcementForm.eventType === 'general' 
                    ? "Enter announcement title"
                    : "Title will be auto-generated if imam is selected"}
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, title: e.target.value })
                  }
                />
                {announcementForm.eventType !== 'general' && announcementForm.imamId && (
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate based on event type and imam
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter announcement message. Include event details, significance, and any important information."
                  value={announcementForm.message}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, message: e.target.value })
                  }
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be included in the notification. Event date and hijri date will be automatically appended if provided.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAnnouncementDialogOpen(false);
                  setAnnouncementForm({ 
                    title: '', 
                    message: '', 
                    eventType: 'general',
                    imamId: '',
                    eventDate: '',
                    hijriDate: '',
                  });
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
