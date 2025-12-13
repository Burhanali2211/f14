import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Shield, Menu, X, Sparkles, Heart, Settings, Upload, Calendar } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { User } from '@supabase/supabase-js';
import type { SiteSettings } from '@/lib/supabase-types';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useUserRole();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    // Add event listener with a small delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Fetch site settings
  useEffect(() => {
    const fetchSiteSettings = async () => {
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('site_settings')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .maybeSingle()
      );

      if (error) {
        logger.error('Error fetching site settings:', error);
      } else if (data) {
        setSiteSettings(data as SiteSettings);
      } else {
        // Fallback to defaults
        setSiteSettings({
          id: '00000000-0000-0000-0000-000000000000',
          site_name: 'Kalam Reader',
          site_tagline: 'islamic poetry',
          logo_url: '/main.png',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    };

    fetchSiteSettings();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const closeMenu = () => setIsMenuOpen(false);
  const isActive = (path: string) => location.pathname === path;

  return (
    <header 
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-300 safe-area-inset-top ${
        scrolled ? 'glass-strong shadow-soft' : 'bg-background/80 backdrop-blur-md'
      }`}
    >
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between min-h-[4.5rem] sm:min-h-[5rem] py-2 sm:py-3 gap-2 sm:gap-3">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-1.5 sm:gap-2 md:gap-3 group flex-shrink-0 min-w-0" 
            onClick={closeMenu}
          >
            {siteSettings?.logo_url ? (
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform shadow-primary">
                <img 
                  src={siteSettings.logo_url} 
                  alt={siteSettings.site_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-primary to-emerald-light flex items-center justify-center group-hover:scale-105 transition-transform shadow-primary">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-accent animate-pulse-slow" />
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1 sm:flex-initial">
              <span className="font-display text-sm sm:text-base md:text-xl font-bold text-foreground leading-tight truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">
                {siteSettings?.site_name || 'Kalam Reader'}
              </span>
              {siteSettings?.site_tagline && (
                <span className="text-[9px] sm:text-[10px] text-muted-foreground -mt-0.5 truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">
                  {siteSettings.site_tagline}
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 flex-shrink-0">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                isActive('/') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xl:inline">Home</span>
            </Link>
            <Link
              to="/favorites"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                isActive('/favorites') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xl:inline">Favorites</span>
            </Link>
            <Link
              to="/calendar"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                isActive('/calendar') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xl:inline">Calendar</span>
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                isActive('/settings') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xl:inline">Settings</span>
            </Link>
            {user && role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive('/admin') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xl:inline">Admin</span>
              </Link>
            )}
            {user && (role === 'uploader' || role === 'admin') && (
              <Link
                to="/uploader"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive('/uploader') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xl:inline">Upload</span>
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
            {user ? (
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                className="hidden lg:inline-flex rounded-xl h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4" 
                size="sm"
              >
                <span className="hidden xl:inline">Logout</span>
                <span className="xl:hidden">Out</span>
              </Button>
            ) : (
              <Button 
                asChild 
                className="hidden lg:inline-flex rounded-xl h-9 sm:h-10 bg-gradient-to-r from-primary to-emerald-light hover:opacity-90 text-xs sm:text-sm px-3 sm:px-4" 
                size="sm"
              >
                <Link to="/auth">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="lg:hidden rounded-xl h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden py-3 sm:py-4 border-t border-border/50 animate-slide-down safe-area-inset-bottom">
            <div className="flex flex-col gap-1">
              <Link 
                to="/" 
                onClick={closeMenu} 
                className={`flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive('/') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <Home className="w-5 h-5 flex-shrink-0" />
                <span>Home</span>
              </Link>
              <Link 
                to="/favorites" 
                onClick={closeMenu} 
                className={`flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive('/favorites') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <Heart className="w-5 h-5 flex-shrink-0" />
                <span>Favorites</span>
              </Link>
              <Link 
                to="/calendar" 
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive('/calendar') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span>Calendar</span>
              </Link>
              <Link 
                to="/settings" 
                onClick={closeMenu} 
                className={`flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors ${
                  isActive('/settings') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span>Settings</span>
              </Link>
              {user ? (
                <>
                  {role === 'admin' && (
                    <Link 
                      to="/admin" 
                      onClick={closeMenu} 
                      className={`flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors ${
                        isActive('/admin') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <Shield className="w-5 h-5 flex-shrink-0" />
                      <span>Admin</span>
                    </Link>
                  )}
                  {(role === 'uploader' || role === 'admin') && (
                    <Link 
                      to="/uploader" 
                      onClick={closeMenu} 
                      className={`flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-colors ${
                        isActive('/uploader') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <Upload className="w-5 h-5 flex-shrink-0" />
                      <span>Upload</span>
                    </Link>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => { handleLogout(); closeMenu(); }} 
                    className="justify-start px-4 py-2.5 sm:py-3 text-destructive hover:text-destructive hover:bg-destructive/10 text-sm sm:text-base"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Link 
                  to="/auth" 
                  onClick={closeMenu} 
                  className="flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl bg-primary text-primary-foreground text-sm sm:text-base transition-opacity hover:opacity-90"
                >
                  <Sparkles className="w-5 h-5 flex-shrink-0" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}