import { useEffect, lazy, Suspense } from "react";
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
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { ScrollToTop } from "@/components/ScrollToTop";
import { UpdateNotification } from "@/components/UpdateNotification";
import { InstallPrompt } from "@/components/InstallPrompt";
import { MobileBottomNavWrapper } from "@/components/MobileBottomNavWrapper";
import { toast } from "@/hooks/use-toast";
import { login as testLogin } from "@/lib/auth-utils";
import { initializeCacheRealtimeSubscriptions } from "@/lib/realtime-cache-manager";
import { clearExpiredCache } from "@/lib/data-cache";
import { logger } from "@/lib/logger";
import { useServiceWorkerMessages } from "@/hooks/use-service-worker-messages";
import { useAnnouncementNotifications } from "@/hooks/use-announcement-notifications";

const Index = lazy(() => import("./pages/Index"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const PiecePage = lazy(() => import("./pages/PiecePage"));
const FigurePage = lazy(() => import("./pages/FigurePage"));
const AhlulBaytPage = lazy(() => import("./pages/AhlulBaytPage"));
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
const BulkRecitationUploadPage = lazy(() => import("./pages/BulkRecitationUploadPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SitemapPage = lazy(() => import("./pages/SitemapPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ContactSubmissionsPage = lazy(() => import("./pages/ContactSubmissionsPage"));
const FiqhHubPage = lazy(() => import("./pages/FiqhHubPage"));
const FiqhTopicPage = lazy(() => import("./pages/FiqhTopicPage"));
const QuranPage = lazy(() => import("./pages/QuranPage"));
const QuranSurahPage = lazy(() => import("./pages/QuranSurahPage"));
const QuranParaPage = lazy(() => import("./pages/QuranParaPage"));
const TeleprompterPage = lazy(() => import("./pages/TeleprompterPage"));
const TeleprompterEditorPage = lazy(() => import("./pages/TeleprompterEditorPage"));
const TeleprompterStudioPage = lazy(() => import("./pages/TeleprompterStudioPage"));
const ImageSegmentEditorPage = lazy(() => import("./pages/ImageSegmentEditorPage"));
const AirSendMobilePage = lazy(() => import("./pages/AirSendMobilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
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
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnMount: false,
      refetchOnReconnect: true,
      structuralSharing: true,
    },
  },
});

function ServiceWorkerHandler() {
  useServiceWorkerMessages();
  useAnnouncementNotifications();
  return null;
}

function BackendHealthCheck() {
  useEffect(() => {
    const run = async () => {
      try {
        await testLogin("healthcheck@example.com", "invalid-password", { suppressErrorLog: true });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error("Auth healthcheck failed", { message: errorMessage });
        toast({
          title: "Backend unreachable",
          description: "We are having trouble reaching the login server. You may not be able to sign in right now.",
          variant: "destructive",
        });
      }
    };
    run();
  }, []);
  return null;
}

function CacheSystemInitializer() {
  useEffect(() => {
    const cleared = clearExpiredCache();
    if (cleared > 0) {
      logger.debug(`Cleared ${cleared} expired cache entries on app start`);
    }
    const cleanup = initializeCacheRealtimeSubscriptions();
    return cleanup;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      clearExpiredCache();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/piece/:id" element={<PiecePage />} />
        <Route path="/teleprompter/studio" element={<TeleprompterStudioPage />} />
        <Route path="/piece/:id/teleprompter" element={<TeleprompterPage />} />
          <Route path="/piece/:id/teleprompter/studio" element={<TeleprompterStudioPage />} />
          <Route path="/piece/:id/teleprompter/edit" element={<TeleprompterEditorPage />} />
          <Route path="/piece/:id/teleprompter/image-edit" element={<ImageSegmentEditorPage />} />
          <Route path="/figure/:slug" element={<FigurePage />} />
      <Route path="/ahlul-bayt" element={<AhlulBaytPage />} />
      <Route path="/artist/:reciterName" element={<ArtistPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/site-settings" element={<SiteSettingsPage />} />
      <Route path="/admin/announcements" element={<AnnouncementsPage />} />
      <Route path="/admin/bulk-upload" element={<BulkRecitationUploadPage />} />
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
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin/contact-submissions" element={<ContactSubmissionsPage />} />
        <Route path="/fiqh" element={<FiqhHubPage />} />
          <Route path="/fiqh/:topicSlug" element={<FiqhTopicPage />} />
          <Route path="/quran" element={<QuranPage />} />
          <Route path="/quran/surah/:surahNumber" element={<QuranSurahPage />} />
            <Route path="/quran/para/:paraNumber" element={<QuranParaPage />} />
            <Route path="/airsend" element={<AirSendMobilePage />} />
            <Route path="/sitemap.xml" element={<SitemapPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontSizeProvider>
            <SettingsProvider>
              <ReadingProgressProvider>
                <FavoritesProvider>
                  <UserRoleProvider>
                    <SiteSettingsProvider>
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
                          <CacheSystemInitializer />
                          <ServiceWorkerHandler />
                          <NotificationPermissionPrompt />
                          <UpdateNotification />
                          <InstallPrompt />
                          <Suspense fallback={<PageLoader />}>
                            <AppRoutes />
                          </Suspense>
                          <MobileBottomNavWrapper />
                        </BrowserRouter>
                      </TooltipProvider>
                    </SiteSettingsProvider>
                  </UserRoleProvider>
                </FavoritesProvider>
              </ReadingProgressProvider>
            </SettingsProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
