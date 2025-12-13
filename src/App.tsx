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

// Component to handle service worker messages
function ServiceWorkerHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          navigate(event.data.url);
        }
      });
    }
  }, [navigate]);

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
