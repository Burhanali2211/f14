import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { FontSizeProvider } from "@/hooks/use-font-size";
import { SettingsProvider } from "@/hooks/use-settings";
import { ReadingProgressProvider } from "@/hooks/use-reading-progress";
import { FavoritesProvider } from "@/hooks/use-favorites";
import { UserRoleProvider } from "@/hooks/use-user-role";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Code splitting - lazy load all route components
const Index = lazy(() => import("./pages/Index"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const PiecePage = lazy(() => import("./pages/PiecePage"));
const FigurePage = lazy(() => import("./pages/FigurePage"));
const ArtistPage = lazy(() => import("./pages/ArtistPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const SiteSettingsPage = lazy(() => import("./pages/SiteSettingsPage"));
const UploaderPage = lazy(() => import("./pages/UploaderPage"));
const AddPiecePage = lazy(() => import("./pages/AddPiecePage"));
const CategoryFormPage = lazy(() => import("./pages/CategoryFormPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SitemapPage = lazy(() => import("./pages/SitemapPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <div className="container py-8 flex-1">
      <Skeleton className="h-6 w-32 mb-6" />
      <Skeleton className="h-10 w-64 mb-2" />
      <Skeleton className="h-6 w-96 mb-8" />
      <div className="grid gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { ScrollToTop } from "@/components/ScrollToTop";
import { toast } from "@/hooks/use-toast";
import { login as testLogin } from "@/lib/auth-utils";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection (formerly cacheTime)
      refetchOnMount: false, // Don't refetch if data exists in cache
      refetchOnReconnect: true, // Refetch on reconnect
      // Enable request deduplication
      structuralSharing: true,
    },
  },
});


// Component to handle service worker messages and Supabase Realtime announcements
function ServiceWorkerHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle service worker messages (only for navigation, not announcements)
    // Announcements are handled via Realtime database listeners
    if ('serviceWorker' in navigator) {
      const handleMessage = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          navigate(event.data.url);
        } else if (event.data && event.data.type === 'SUBSCRIBE_NOTIFICATIONS') {
          // Handle subscription request
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // Update user profile to enable notifications for this imam
              const { error } = await supabase
                .from('profiles')
                .update({ 
                  notifications_enabled: true,
                  notification_permission_granted: true 
                })
                .eq('id', user.id);
              
              if (!error) {
                toast({
                  title: 'Subscribed!',
                  description: 'You will receive notifications for this holy personality.',
                });
                // Navigate to settings page to show subscription status
                navigate('/settings');
              } else {
                logger.error('Error updating notification preferences:', error);
                toast({
                  title: 'Error',
                  description: 'Could not update notification preferences.',
                  variant: 'destructive',
                });
              }
            } else {
              // User not logged in, navigate to auth page
              navigate('/auth');
            }
          } catch (error) {
            logger.error('Error handling subscription:', error);
            toast({
              title: 'Error',
              description: 'Could not process subscription request.',
              variant: 'destructive',
            });
          }
        }
        // Removed ANNOUNCEMENT_NOTIFICATION handler - using Realtime instead
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [navigate]);

  // Listen for Supabase Realtime announcements via database changes
  useEffect(() => {
    // Helper functions for persistent notification deduplication
    const STORAGE_KEY = 'shown_notification_ids';
    const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
    
    const getShownNotificationIds = (): Set<string> => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return new Set();
        
        const data = JSON.parse(stored);
        const now = Date.now();
        const validIds = new Set<string>();
        
        // Only keep IDs that are less than 24 hours old
        for (const [id, timestamp] of Object.entries(data)) {
          if (now - (timestamp as number) < RETENTION_MS) {
            validIds.add(id);
          }
        }
        
        // Update storage with only valid IDs
        if (validIds.size !== Object.keys(data).length) {
          const updated: Record<string, number> = {};
          validIds.forEach(id => {
            updated[id] = data[id] || now;
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
        
        return validIds;
      } catch (error) {
        logger.error('Error reading shown notification IDs:', error);
        return new Set();
      }
    };
    
    const markNotificationAsShown = (id: string): void => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const data = stored ? JSON.parse(stored) : {};
        data[id] = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        logger.error('Error saving shown notification ID:', error);
      }
    };
    
    const isNotificationShown = (id: string): boolean => {
      const shownIds = getShownNotificationIds();
      return shownIds.has(id);
    };
    
    // Track shown notifications to prevent duplicates (in-memory cache for quick access)
    const shownNotificationIds = getShownNotificationIds();
    
    logger.info('Setting up Realtime subscription for announcements');
    
    // Listen to database changes (INSERT events on announcements table)
    // This is the PRIMARY method - it works for all devices
    // All devices use the SAME channel name to receive the same events
    const announcementsChannel = supabase
      .channel('announcements-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        async (payload) => {
          const announcement = payload.new as { 
            id: string;
            title: string; 
            message: string; 
            sent_at: string | null;
            created_at: string;
            event_type?: string | null;
            imam_id?: string | null;
            event_date?: string | null;
            hijri_date?: string | null;
            template_data?: any;
            thumbnail_url?: string | null;
          };
          
          logger.info('New announcement detected via database Realtime:', {
            id: announcement.id,
            title: announcement.title,
            eventType: announcement.event_type,
            hasSentAt: !!announcement.sent_at,
            device: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            timestamp: new Date().toISOString()
          });
          
          // Deduplication: Check if we've already shown this notification
          if (isNotificationShown(announcement.id)) {
            logger.info('Notification already shown for announcement:', announcement.id);
            return;
          }
          
          // Only show notification if sent_at is set (means it's a real announcement, not a draft)
          // Also check if notification permission is granted
          if (announcement.sent_at && Notification.permission === 'granted') {
            logger.info('Showing notification for announcement:', announcement.title);
            
            // Mark as shown immediately to prevent duplicates (persistent storage)
            markNotificationAsShown(announcement.id);
            shownNotificationIds.add(announcement.id);
            
            // Fetch imam slug if imam_id exists
            let imamSlug: string | null = null;
            if (announcement.imam_id) {
              try {
                const { data: imamData } = await supabase
                  .from('imams')
                  .select('slug')
                  .eq('id', announcement.imam_id)
                  .maybeSingle();
                
                if (imamData) {
                  imamSlug = imamData.slug;
                }
              } catch (error) {
                logger.warn('Error fetching imam slug for notification:', error);
              }
            }
            
            // Get notification template based on event type
            const { getNotificationTemplate } = await import('@/lib/notification-templates');
            const template = getNotificationTemplate({
              title: announcement.title,
              message: announcement.message,
              eventType: (announcement.event_type as any) || 'general',
              imamName: announcement.template_data?.imamName || '',
              imamId: announcement.imam_id || null,
              imamSlug: imamSlug,
              eventDate: announcement.event_date || '',
              hijriDate: announcement.hijri_date || '',
              thumbnailUrl: announcement.thumbnail_url || null,
            }, announcement.id);
            
            // Play notification sound using Web Audio API (works even if file doesn't exist)
            try {
              // Try to play a simple notification sound
              const playNotificationSound = () => {
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.value = 800; // Pleasant notification tone
                  oscillator.type = 'sine';
                  
                  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.3);
                } catch (webAudioError) {
                  // Fallback: try to play an audio file if it exists
                  try {
                    const audio = new Audio('/notification-sound.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {
                      // Silent fail if audio file doesn't exist
                    });
                  } catch (audioError) {
                    // Silent fail - browser will use default notification sound
                  }
                }
              };
              
              playNotificationSound();
            } catch (error) {
              // Silent fail - browser will use default notification sound
            }
            
            if ('serviceWorker' in navigator) {
              try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(template.title, {
                  body: template.body,
                  icon: template.icon,
                  badge: template.badge,
                  image: template.image,
                  tag: template.tag,
                  data: template.data,
                  requireInteraction: template.requireInteraction,
                  vibrate: template.vibrate,
                  actions: [
                    {
                      action: 'view',
                      title: 'View Recitations',
                      icon: '/main.png'
                    },
                    {
                      action: 'subscribe',
                      title: 'Subscribe',
                      icon: '/main.png'
                    }
                  ],
                  silent: false, // Ensure browser default sound plays
                  renotify: true, // Show notification even if one with same tag exists
                  timestamp: Date.now()
                });
                logger.info('Notification shown successfully via service worker with template');
              } catch (error) {
                logger.error('Error showing notification via service worker:', error);
                // Fallback
                new Notification(template.title, {
                  body: template.body,
                  icon: template.icon,
                  image: template.image,
                  tag: template.tag,
                });
              }
            } else {
              // Fallback if service worker is not available
              new Notification(template.title, {
                body: template.body,
                icon: template.icon,
                image: template.image,
                tag: template.tag,
              });
            }
          } else {
            logger.info('Skipping notification:', {
              hasSentAt: !!announcement.sent_at,
              hasPermission: Notification.permission === 'granted'
            });
          }
        }
      )
      .subscribe((status) => {
        logger.info('Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          logger.info('Successfully subscribed to announcements channel');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Realtime channel error - attempting to resubscribe');
          // Attempt to resubscribe after a delay
          setTimeout(() => {
            logger.info('Resubscribing to channel after error...');
            announcementsChannel.subscribe();
          }, 2000);
        } else if (status === 'TIMED_OUT') {
          logger.warn('Realtime subscription timed out - attempting to resubscribe');
          setTimeout(() => {
            logger.info('Resubscribing to channel after timeout...');
            announcementsChannel.subscribe();
          }, 2000);
        } else if (status === 'CLOSED') {
          logger.warn('Realtime channel closed - attempting to resubscribe');
          setTimeout(() => {
            logger.info('Resubscribing to channel after close...');
            announcementsChannel.subscribe();
          }, 2000);
        } else {
          logger.info('Realtime subscription status:', status);
        }
      });

    // Handle visibility change to ensure subscription is active when page becomes visible
    // This is especially important for mobile devices
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        logger.info('Page became visible - checking Realtime subscription and missed announcements');
        
        // Resubscribe to ensure connection is active
        announcementsChannel.subscribe();
        
        // Check for any announcements we might have missed while in background
        try {
          const { data: recentAnnouncements } = await supabase
            .from('announcements')
            .select('id, title, message, sent_at, event_type, imam_id, event_date, hijri_date, template_data, thumbnail_url')
            .not('sent_at', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5); // Check last 5 announcements
          
          if (recentAnnouncements && recentAnnouncements.length > 0) {
            // Check each announcement to see if we missed it
            for (const announcement of recentAnnouncements) {
              // Use persistent storage check
              if (!isNotificationShown(announcement.id) && 
                  announcement.sent_at && 
                  Notification.permission === 'granted') {
                
                // Only show if it was sent in the last 5 minutes (to avoid showing old announcements)
                const sentTime = new Date(announcement.sent_at).getTime();
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                
                if (sentTime > fiveMinutesAgo) {
                  logger.info('Found missed announcement while in background:', announcement.title);
                  
                  // Mark as shown in persistent storage
                  markNotificationAsShown(announcement.id);
                  shownNotificationIds.add(announcement.id);

                  const { getNotificationTemplate } = await import('@/lib/notification-templates');
                  const template = getNotificationTemplate({
                    title: announcement.title,
                    message: announcement.message,
                    eventType: (announcement.event_type as any) || 'general',
                    imamName: announcement.template_data?.imamName || '',
                    eventDate: announcement.event_date || '',
                    hijriDate: announcement.hijri_date || '',
                    thumbnailUrl: announcement.thumbnail_url || null,
                  }, announcement.id);

                  if ('serviceWorker' in navigator) {
                    try {
                      const registration = await navigator.serviceWorker.ready;
                      await registration.showNotification(template.title, {
                        body: template.body,
                        icon: template.icon,
                        badge: template.badge,
                        image: template.image,
                        tag: template.tag,
                        data: template.data,
                        requireInteraction: template.requireInteraction,
                        vibrate: template.vibrate,
                        actions: [
                          {
                            action: 'view',
                            title: 'View'
                          }
                        ]
                      });
                    } catch (error) {
                      logger.error('Error showing missed notification:', error);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error('Error checking for missed announcements:', error);
        }
      } else {
        logger.info('Page became hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic health check to ensure subscription is active
    const healthCheckInterval = setInterval(() => {
      const state = announcementsChannel.state;
      const isConnected = state === 'joined';
      
      logger.info('Realtime channel health check:', {
        state,
        isConnected,
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      });
      
      if (!isConnected && state !== 'joining') {
        logger.warn('Realtime channel not active, resubscribing...', { state });
        announcementsChannel.subscribe();
      }
    }, 30000); // Check every 30 seconds

    // Fallback: Poll for new announcements if Realtime fails (especially for mobile)
    // This ensures notifications are received even if Realtime connection is lost
    let lastAnnouncementId: string | null = null;
    let realtimeConnected = false;
    
    // Track Realtime connection status
    announcementsChannel.on('system', {}, (payload) => {
      if (payload.status === 'ok') {
        realtimeConnected = true;
        logger.info('Realtime connected');
      } else if (payload.status === 'error') {
        realtimeConnected = false;
        logger.warn('Realtime connection error');
      }
    });

    const pollInterval = setInterval(async () => {
      // Only poll if Realtime is not connected (as a fallback)
      const channelState = announcementsChannel.state;
      const shouldPoll = channelState !== 'joined' && channelState !== 'joining';
      
      if (!shouldPoll) {
        // Realtime is working, skip polling
        return;
      }

      try {
        logger.info('Realtime not connected, using polling fallback');
        
        // Get the most recent announcement
        const { data, error } = await supabase
          .from('announcements')
          .select('id, title, message, sent_at, event_type, imam_id, event_date, hijri_date, template_data, thumbnail_url')
          .not('sent_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !data) return;

        // If this is a new announcement we haven't seen, show notification
        if (data.id !== lastAnnouncementId && !isNotificationShown(data.id)) {
          lastAnnouncementId = data.id;
          
          // Only show if notification permission is granted
          if (data.sent_at && Notification.permission === 'granted') {
            logger.info('New announcement detected via polling fallback:', data.title);
            
            // Mark as shown in persistent storage
            markNotificationAsShown(data.id);
            shownNotificationIds.add(data.id);

            // Fetch imam slug if imam_id exists
            let imamSlug: string | null = null;
            if (data.imam_id) {
              try {
                const { data: imamData } = await supabase
                  .from('imams')
                  .select('slug')
                  .eq('id', data.imam_id)
                  .maybeSingle();
                
                if (imamData) {
                  imamSlug = imamData.slug;
                }
              } catch (error) {
                logger.warn('Error fetching imam slug for notification:', error);
              }
            }

            // Play notification sound
            try {
              const playNotificationSound = () => {
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.value = 800;
                  oscillator.type = 'sine';
                  
                  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.3);
                } catch (webAudioError) {
                  try {
                    const audio = new Audio('/notification-sound.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                  } catch (audioError) {
                    // Silent fail
                  }
                }
              };
              
              playNotificationSound();
            } catch (error) {
              // Silent fail
            }

            // Get notification template
            const { getNotificationTemplate } = await import('@/lib/notification-templates');
            const template = getNotificationTemplate({
              title: data.title,
              message: data.message,
              eventType: (data.event_type as any) || 'general',
              imamName: data.template_data?.imamName || '',
              imamId: data.imam_id || null,
              imamSlug: imamSlug,
              eventDate: data.event_date || '',
              hijriDate: data.hijri_date || '',
              thumbnailUrl: data.thumbnail_url || null,
            }, data.id);

            if ('serviceWorker' in navigator) {
              try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(template.title, {
                  body: template.body,
                  icon: template.icon,
                  badge: template.badge,
                  image: template.image,
                  tag: template.tag,
                  data: template.data,
                  requireInteraction: template.requireInteraction,
                  vibrate: template.vibrate,
                  silent: false,
                  actions: [
                    {
                      action: 'view',
                      title: 'View Recitations',
                      icon: '/main.png'
                    },
                    {
                      action: 'subscribe',
                      title: 'Subscribe',
                      icon: '/main.png'
                    }
                  ],
                  renotify: true,
                  timestamp: Date.now()
                });
              } catch (error) {
                logger.error('Error showing notification via polling:', error);
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error polling for announcements:', error);
      }
    }, 15000); // Poll every 15 seconds as fallback (only when Realtime is down)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(healthCheckInterval);
      clearInterval(pollInterval);
      supabase.removeChannel(announcementsChannel);
    };
  }, []);

  return null;
}

// Simple backend health check on app start focused on auth
function BackendHealthCheck() {
  useEffect(() => {
    const run = async () => {
      try {
        // Try a very cheap auth call with obviously invalid credentials
        // Suppress error logs for healthcheck to avoid console noise
        const result = await testLogin("healthcheck@example.com", "invalid-password", { suppressErrorLog: true });

        // If we get back a structured auth error, backend is reachable
        if (!result.success && result.error) {
          logger.debug("Auth healthcheck: backend reachable", {
            error: result.error,
            errorCode: result.errorCode,
          });
        }
      } catch (error: any) {
        logger.error("Auth healthcheck failed", {
          message: error?.message,
        });

        toast({
          title: "Backend unreachable",
          description:
            "We are having trouble reaching the login server. You may not be able to sign in right now.",
          variant: "destructive",
        });
      }
    };

    run();
  }, []);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <FontSizeProvider>
        <SettingsProvider>
          <ReadingProgressProvider>
            <FavoritesProvider>
              <UserRoleProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    <ScrollToTop />
                    <BackendHealthCheck />
                    <ServiceWorkerHandler />
                    <NotificationPermissionPrompt />
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/category/:slug" element={<CategoryPage />} />
                        <Route path="/piece/:id" element={<PiecePage />} />
                        <Route path="/figure/:slug" element={<FigurePage />} />
                        <Route path="/artist/:reciterName" element={<ArtistPage />} />
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/admin/site-settings" element={<SiteSettingsPage />} />
                        <Route path="/admin/announcements" element={<AnnouncementsPage />} />
                        <Route path="/admin/category/new" element={<CategoryFormPage />} />
                        <Route path="/admin/category/:id/edit" element={<CategoryFormPage />} />
                        <Route path="/admin/piece/new" element={<AddPiecePage />} />
                        <Route path="/admin/piece/:id/edit" element={<AddPiecePage />} />
                        <Route path="/uploader" element={<UploaderPage />} />
                        <Route path="/uploader/piece/new" element={<AddPiecePage />} />
                        <Route path="/uploader/piece/:id/edit" element={<AddPiecePage />} />
                        <Route path="/favorites" element={<FavoritesPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/sitemap.xml" element={<SitemapPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </BrowserRouter>
                </TooltipProvider>
              </UserRoleProvider>
            </FavoritesProvider>
          </ReadingProgressProvider>
        </SettingsProvider>
      </FontSizeProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
