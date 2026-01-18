import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Trash2, Send, Loader2, ChevronLeft, Cake, Flame, Heart, Info, Image, X } from 'lucide-react';
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
import { safeQuery, authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { ensureAuthenticated } from '@/lib/session-utils';
import { optimizeAnnouncementThumbnail } from '@/lib/image-optimizer';
import { realtimeManager } from '@/lib/realtime-manager';
import type { EventType, Imam } from '@/lib/supabase-types';

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
  thumbnail_url?: string | null;
}

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { role: currentRole, loading: roleLoading, user: currentUser, refresh: refreshRole } = useUserRole();
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
    imamId: 'none',
    eventDate: '',
    hijriDate: '',
    thumbnailUrl: '',
  });
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  useEffect(() => {
    if (!roleLoading) {
      checkAuth();
    }
  }, [currentRole, roleLoading, currentUser]);

  useEffect(() => {
    if (currentRole === 'admin') {
      fetchAnnouncements();
      fetchImams();
    }
  }, [currentRole]);

  const fetchImams = async () => {
    try {
      const IMAMS_COLUMNS = 'id, name, slug, title, image_url, order_index, category_id';
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('imams')
          .select(IMAMS_COLUMNS)
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

    if (!currentUser) {
      navigate('/auth');
      return;
    }

    await refreshRole();
    
    const { data: userData, error: roleError } = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', currentUser.id)
        .eq('is_active', true)
        .single();
    });

    if (roleError || !userData) {
      logger.error('AnnouncementsPage: Could not verify user role from database', { error: roleError });
      toast({
        title: 'Access Denied',
        description: 'Unable to verify permissions. Please try again.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    const actualRole = userData?.role || currentRole;

    if (actualRole !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only admins can access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
  };

  const fetchAnnouncements = useCallback(async () => {
    try {
      const ANNOUNCEMENTS_COLUMNS = 'id, title, message, created_by, sent_at, created_at, updated_at, event_type, imam_id, event_date, hijri_date, template_data, thumbnail_url';
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('announcements')
          .select(ANNOUNCEMENTS_COLUMNS)
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
  }, []);

  useEffect(() => {
    if (currentRole !== 'admin') return;

    const subscriptionId = realtimeManager.subscribe(
      'announcements',
      '*',
      () => {
        fetchAnnouncements();
      }
    );

    return () => {
      realtimeManager.unsubscribe(subscriptionId);
    };
  }, [currentRole, fetchAnnouncements]);

  const handleCreateAnnouncement = async () => {
    let finalTitle = announcementForm.title.trim();
    if (!finalTitle && announcementForm.eventType !== 'general' && announcementForm.imamId && announcementForm.imamId !== 'none') {
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
      const user = await ensureAuthenticated();
      if (!user) {
        throw new Error('Not authenticated. Please refresh the page and try again.');
      }

      const selectedImam = announcementForm.imamId && announcementForm.imamId !== 'none' 
        ? imams.find(i => i.id === announcementForm.imamId)
        : null;
      const imamName = selectedImam?.name || '';

      const sentAt = new Date().toISOString();
      const { data: announcement, error: createError } = await authenticatedQuery(async () => {
        return await supabase
          .from('announcements')
          .insert({
            title: finalTitle,
            message: announcementForm.message.trim(),
            created_by: user.id,
            sent_at: sentAt,
            event_type: announcementForm.eventType === 'general' ? null : announcementForm.eventType,
            imam_id: (announcementForm.imamId && announcementForm.imamId !== 'none') ? announcementForm.imamId : null,
            event_date: announcementForm.eventDate || null,
            hijri_date: announcementForm.hijriDate || null,
            thumbnail_url: announcementForm.thumbnailUrl || null,
            template_data: {
              imamName,
              eventType: announcementForm.eventType,
            }
          })
          .select()
          .single();
      });

      if (createError) throw createError;
      if (!announcement) throw new Error('Failed to create announcement');

      toast({
        title: 'Success',
        description: 'Announcement created successfully',
      });

      setAnnouncementDialogOpen(false);
      setAnnouncementForm({ 
        title: '', 
        message: '', 
        eventType: 'general',
        imamId: 'none',
        eventDate: '',
        hijriDate: '',
        thumbnailUrl: '',
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

  const handleThumbnailUpload = async (file: File) => {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)',
        variant: 'destructive',
      });
      return;
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: 'File too large. Maximum size is 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    setUploadingThumbnail(true);
    try {
      const optimizedBlob = await optimizeAnnouncementThumbnail(file);
      const fileName = `announcements/${Date.now()}.webp`;
      
      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/webp',
        });
      
      if (error) throw error;
      if (!data?.path) throw new Error('No path returned');
      
      const { data: { publicUrl } } = supabase.storage
        .from('piece-images')
        .getPublicUrl(data.path);
      
      setAnnouncementForm(prev => ({ ...prev, thumbnailUrl: publicUrl }));
      toast({
        title: 'Success',
        description: 'Thumbnail uploaded successfully',
      });
    } catch (error: any) {
      logger.error('Unexpected error during thumbnail upload:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during upload',
        variant: 'destructive',
      });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const user = await ensureAuthenticated();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Not authenticated',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await authenticatedQuery(async () => {
        return await supabase
          .from('announcements')
          .delete()
          .eq('id', id);
      });

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

  if (roleLoading || loading) {
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
                  case 'birthday': return <Cake className="w-4 h-4" />;
                  case 'martyrdom': return <Flame className="w-4 h-4" />;
                  case 'death': return <Heart className="w-4 h-4" />;
                  case 'other': return <Bell className="w-4 h-4" />;
                  default: return <Info className="w-4 h-4" />;
                }
              };

              const getEventTypeColor = () => {
                switch (announcement.event_type) {
                  case 'birthday': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                  case 'martyrdom': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                  case 'death': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                  case 'other': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
                  default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
                }
              };

              const getEventTypeLabel = () => {
                switch (announcement.event_type) {
                  case 'birthday': return 'Birthday';
                  case 'martyrdom': return 'Martyrdom';
                  case 'death': return 'Death';
                  case 'other': return 'Other Event';
                  default: return 'General';
                }
              };

              return (
                <div
                  key={announcement.id}
                  className="p-4 sm:p-6 bg-card rounded-lg shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    {announcement.thumbnail_url && (
                      <img
                        src={announcement.thumbnail_url}
                        alt={announcement.title}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-border flex-shrink-0"
                      />
                    )}
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
                  <SelectTrigger id="event-type" className="w-full">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Announcement</SelectItem>
                    <SelectItem value="birthday">Birthday / Birth Anniversary</SelectItem>
                    <SelectItem value="martyrdom">Martyrdom</SelectItem>
                    <SelectItem value="death">Death / Passing</SelectItem>
                    <SelectItem value="other">Other Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {announcementForm.eventType !== 'general' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="imam">Imam / Personality (Optional)</Label>
                    <Select
                      value={announcementForm.imamId || undefined}
                      onValueChange={(value) =>
                        setAnnouncementForm({ ...announcementForm, imamId: value === 'none' ? '' : value })
                      }
                    >
                      <SelectTrigger id="imam" className="w-full">
                        <SelectValue placeholder="Select an imam or personality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter announcement message..."
                  value={announcementForm.message}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, message: e.target.value })
                  }
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail Image (Optional)</Label>
                <div className="space-y-3">
                  {announcementForm.thumbnailUrl ? (
                    <div className="relative">
                      <img
                        src={announcementForm.thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-48 object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setAnnouncementForm(prev => ({ ...prev, thumbnailUrl: '' }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        type="file"
                        id="thumbnail"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleThumbnailUpload(file);
                        }}
                        disabled={uploadingThumbnail}
                      />
                      <label htmlFor="thumbnail" className="cursor-pointer flex flex-col items-center gap-2">
                        {uploadingThumbnail ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Image className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to upload thumbnail</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
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
                    imamId: 'none',
                    eventDate: '',
                    hijriDate: '',
                    thumbnailUrl: '',
                  });
                }}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateAnnouncement} disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {sending ? 'Sending...' : 'Send Announcement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
