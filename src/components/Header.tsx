import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Shield, Menu, X, Sparkles, Heart, Settings, Upload, Calendar, LogIn, User, LayoutDashboard, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { signOut } from '@/lib/auth-utils';
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
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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

  const handleLogout = () => {
    signOut();
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
      <div className="container mx-auto px-3 sm:px-4 md:px-5 lg:px-6">
        <div className="flex items-center justify-between min-h-[4.5rem] sm:min-h-[5rem] md:min-h-[5.5rem] py-2 sm:py-3 md:py-3.5 gap-2 sm:gap-3 md:gap-4">
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
          <nav className="hidden lg:flex items-center gap-1.5 md:gap-2 flex-shrink-0">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="hidden lg:flex rounded-xl h-9 sm:h-10 w-9 sm:w-10 p-0" 
                    size="sm"
                  >
                    {role === 'admin' || role === 'uploader' ? (
                      // Dashboard button for admin/uploader
                      <div className="flex items-center justify-center w-full h-full rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
                        {role === 'admin' ? (
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        ) : (
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        )}
                      </div>
                    ) : (
                      // Avatar for regular users
                      <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                        <AvatarImage src="" alt={user.full_name || user.email} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                          {user.full_name 
                            ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-medium">{user.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                    {role && (
                      <span className="text-xs text-muted-foreground font-normal capitalize mt-1">
                        {role === 'admin' ? 'Administrator' : role === 'uploader' ? 'Content Uploader' : 'User'}
                      </span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role === 'admin' || role === 'uploader' ? (
                    <DropdownMenuItem asChild>
                      <Link to={role === 'admin' ? '/admin' : '/uploader'} className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                asChild 
                variant="default"
                className="hidden lg:inline-flex rounded-xl h-9 sm:h-10 px-4 gap-2" 
                size="sm"
              >
                <Link to="/auth" className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm font-medium">Login</span>
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="lg:hidden rounded-xl h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 bg-secondary/50 hover:bg-secondary border border-border/50"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

          {/* Mobile Navigation - Outside container for proper positioning */}
      {isMenuOpen && (
        <>
          {/* Overlay */}
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-[60] animate-in fade-in-0"
            onClick={closeMenu}
          />
          {/* Sidebar from right */}
          <nav className="lg:hidden fixed top-0 right-0 h-screen w-3/4 max-w-sm bg-background border-l border-border/50 shadow-xl z-[70] animate-slide-right safe-area-inset-right overflow-y-auto">
            <div className="flex flex-col gap-2 p-4 pt-20">
              <div className="px-4 py-2 mb-2 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Menu</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Navigate to different sections</p>
              </div>
              <Link 
                to="/" 
                onClick={closeMenu} 
                className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-colors min-h-[52px] ${
                  isActive('/') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <Home className="w-6 h-6 flex-shrink-0" />
                <span>Home</span>
              </Link>
              <Link 
                to="/favorites" 
                onClick={closeMenu} 
                className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-colors min-h-[52px] ${
                  isActive('/favorites') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <Heart className="w-6 h-6 flex-shrink-0" />
                <span>My Favorites</span>
              </Link>
              <Link 
                to="/calendar" 
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-colors min-h-[52px] ${
                  isActive('/calendar') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <Calendar className="w-6 h-6 flex-shrink-0" />
                <span>Events Calendar</span>
              </Link>
              <Link 
                to="/settings" 
                onClick={closeMenu} 
                className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-colors min-h-[52px] ${
                  isActive('/settings') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                }`}
              >
                <Settings className="w-6 h-6 flex-shrink-0" />
                <span>Reading Settings</span>
              </Link>
              {user ? (
                <>
                  <div className="border-t border-border pt-2 mt-2">
                    <p className="text-xs text-muted-foreground px-4 py-2 uppercase tracking-wide">Account</p>
                  </div>
                  <Link 
                    to="/profile" 
                    onClick={closeMenu} 
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-colors min-h-[52px] ${
                      isActive('/profile') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <User className="w-6 h-6 flex-shrink-0" />
                    <span>My Profile</span>
                  </Link>
                  {role === 'admin' && (
                    <Link 
                      to="/admin" 
                      onClick={closeMenu} 
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                        isActive('/admin') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <Shield className="w-5 h-5 flex-shrink-0" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                  {(role === 'uploader' || role === 'admin') && (
                    <Link 
                      to="/uploader" 
                      onClick={closeMenu} 
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                        isActive('/uploader') ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-foreground'
                      }`}
                    >
                      <Upload className="w-5 h-5 flex-shrink-0" />
                      <span>Upload Dashboard</span>
                    </Link>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => { handleLogout(); closeMenu(); }} 
                    className="justify-start px-4 py-4 text-destructive hover:text-destructive hover:bg-destructive/10 text-base font-medium min-h-[52px]"
                  >
                    <LogOut className="w-6 h-6 mr-3 flex-shrink-0" />
                    <span>Logout</span>
                  </Button>
                </>
              ) : (
                <Link 
                  to="/auth" 
                  onClick={closeMenu} 
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-base font-medium transition-opacity hover:opacity-90 mt-2"
                >
                  <LogIn className="w-5 h-5 flex-shrink-0" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}