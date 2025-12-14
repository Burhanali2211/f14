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
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import PiecePage from "./pages/PiecePage";
import FigurePage from "./pages/FigurePage";
import ArtistPage from "./pages/ArtistPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import SiteSettingsPage from "./pages/SiteSettingsPage";
import UploaderPage from "./pages/UploaderPage";
import AddPiecePage from "./pages/AddPiecePage";
import FavoritesPage from "./pages/FavoritesPage";
import SettingsPage from "./pages/SettingsPage";
import CalendarPage from "./pages/CalendarPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import NotFound from "./pages/NotFound";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { ScrollToTop } from "@/components/ScrollToTop";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to handle service worker messages and Supabase Realtime announcements
function ServiceWorkerHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle service worker messages
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          navigate(event.data.url);
        } else if (event.data && event.data.type === 'ANNOUNCEMENT_NOTIFICATION') {
          // Handle announcement notification from service worker
          const { title, body, data } = event.data;
          
          // Show notification if permission is granted
          if (Notification.permission === 'granted') {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(title, {
                  body,
                  icon: '/main.png',
                  badge: '/main.png',
                  tag: `announcement-${Date.now()}`,
                  data: data || { url: '/', type: 'announcement' },
                  requireInteraction: false,
                  vibrate: [200, 100, 200],
                  actions: [
                    {
                      action: 'view',
                      title: 'View'
                    }
                  ]
                });
              });
            }
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [navigate]);

  // Listen for Supabase Realtime announcements via database changes
  useEffect(() => {
    // Method 1: Listen to database changes (INSERT events on announcements table)
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
          };
          
          logger.info('New announcement detected via database Realtime:', {
            id: announcement.id,
            title: announcement.title,
            hasSentAt: !!announcement.sent_at
          });
          
          // Only show notification if sent_at is set (means it's a real announcement, not a draft)
          // Also check if notification permission is granted
          if (announcement.sent_at && Notification.permission === 'granted') {
            logger.info('Showing notification for announcement:', announcement.title);
            
            if ('serviceWorker' in navigator) {
              try {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(announcement.title, {
                  body: announcement.message,
                  icon: '/main.png',
                  badge: '/main.png',
                  tag: `announcement-${announcement.id}`,
                  data: {
                    url: '/',
                    type: 'announcement',
                    announcementId: announcement.id
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
                logger.info('Notification shown successfully via service worker');
              } catch (error) {
                logger.error('Error showing notification via service worker:', error);
                // Fallback
                new Notification(announcement.title, {
                  body: announcement.message,
                  icon: '/main.png',
                  tag: `announcement-${announcement.id}`,
                });
              }
            } else {
              // Fallback if service worker is not available
              new Notification(announcement.title, {
                body: announcement.message,
                icon: '/main.png',
                tag: `announcement-${announcement.id}`,
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
      .subscribe();

    // Method 2: Also listen to broadcast events (fallback)
    const broadcastChannel = supabase.channel('announcements-broadcast');
    
    broadcastChannel
      .on('broadcast', { event: 'new_announcement' }, (payload) => {
        const { title, message } = payload.payload;
        
        logger.info('New announcement received via broadcast:', { title, message });
        
        // Show notification to all users who are online and have permission
        if (Notification.permission === 'granted') {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
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
            });
          } else {
            // Fallback if service worker is not available
            new Notification(title, {
              body: message,
              icon: '/main.png',
              tag: `announcement-${Date.now()}`,
            });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(broadcastChannel);
    };
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
                    <ServiceWorkerHandler />
                    <NotificationPermissionPrompt />
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
                      <Route path="/admin/piece/new" element={<AddPiecePage />} />
                      <Route path="/admin/piece/:id/edit" element={<AddPiecePage />} />
                      <Route path="/uploader" element={<UploaderPage />} />
                      <Route path="/uploader/piece/new" element={<AddPiecePage />} />
                      <Route path="/uploader/piece/:id/edit" element={<AddPiecePage />} />
                      <Route path="/favorites" element={<FavoritesPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/calendar" element={<CalendarPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
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
