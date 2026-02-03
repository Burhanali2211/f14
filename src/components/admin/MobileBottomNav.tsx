import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, FolderOpen, Users, User, FileText, Calendar, Wallet, BarChart3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminActiveSection } from './AdminSidebar';

interface AdminMobileBottomNavProps {
  activeSection: AdminActiveSection;
  setActiveSection: (section: AdminActiveSection) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  isActive?: boolean;
  isCenter?: boolean;
}

export const AdminMobileBottomNav = ({
  activeSection,
  setActiveSection,
}: AdminMobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check current page
  const isHomePage = location.pathname === '/';
  const isProfilePage = location.pathname === '/profile';
  const isOnAdminPage = location.pathname.startsWith('/admin');
  const isAddPage = location.pathname === '/admin/piece/new' || location.pathname.includes('/admin/piece/');
  const isStudioPage = location.pathname === '/teleprompter/studio';

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      action: () => navigate('/'),
      isActive: isHomePage,
    },
    {
      id: 'recitations',
      label: 'Content',
      icon: LayoutDashboard,
      action: () => {
        navigate('/admin');
        setActiveSection('recitations');
      },
      isActive: activeSection === 'recitations' && isOnAdminPage && !isProfilePage && !isAddPage,
    },
    {
      id: 'add',
      label: 'Studio',
      icon: Plus,
      action: () => navigate('/teleprompter/studio'),
      isActive: isAddPage || isStudioPage,
      isCenter: true,
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      action: () => {
        navigate('/admin');
        setActiveSection('users');
      },
      isActive: activeSection === 'users' && isOnAdminPage && !isProfilePage && !isAddPage,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      action: () => navigate('/profile'),
      isActive: isProfilePage,
    },
  ];

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom"
      role="navigation"
      aria-label="Admin mobile navigation"
    >
      <div className="flex items-end justify-around h-16 px-1 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          const isCenter = item.isCenter;

          if (isCenter) {
            // Center elevated button for Add
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={cn(
                  'relative flex flex-col items-center justify-center -mt-5 transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
                  'active:scale-95'
                )}
                aria-label={item.label}
                tabIndex={0}
              >
                {/* Elevated circle button */}
                <div className={cn(
                  'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200',
                  'bg-destructive text-destructive-foreground',
                  'hover:shadow-xl hover:scale-105',
                  isActive && 'ring-4 ring-destructive/30'
                )}>
                  <Icon className="w-7 h-7" strokeWidth={2.5} />
                </div>
                
                {/* Label below the circle */}
                <span className="text-[10px] font-semibold text-destructive mt-1">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.action}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all duration-200',
                'focus:outline-none focus-visible:bg-muted/50',
                'active:bg-muted/30',
                isActive
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={0}
            >
              {/* Icon */}
              <div className={cn(
                'flex items-center justify-center w-6 h-6 transition-transform duration-200',
                isActive && 'scale-110'
              )}>
                <Icon 
                  className="w-5 h-5" 
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              
              {/* Label */}
              <span className={cn(
                'text-[10px] font-medium leading-tight',
                isActive ? 'font-semibold' : ''
              )}>
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-destructive" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Home indicator bar for iOS */}
      <div className="flex justify-center pb-1">
        <div className="w-28 h-1 bg-foreground/20 rounded-full" />
      </div>
    </nav>
  );
};

// Extended mobile navigation with more options in a sheet
interface AdminMobileNavSheetProps {
  activeSection: AdminActiveSection;
  setActiveSection: (section: AdminActiveSection) => void;
  counts: {
    pieces: number;
    categories: number;
    imams: number;
    artistes: number;
    events: number;
    users: number;
    uploaders: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const AdminMobileNavSheet = ({
  activeSection,
  setActiveSection,
  counts,
  isOpen,
  onClose,
}: AdminMobileNavSheetProps) => {
  const navigate = useNavigate();

  const allSections: Array<{
    id: AdminActiveSection;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
  }> = [
    { 
      id: 'recitations', 
      label: 'Recitations', 
      sublabel: `${counts.pieces} items`,
      icon: FileText, 
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-500/20'
    },
    { 
      id: 'categories', 
      label: 'Categories', 
      sublabel: `${counts.categories} items`,
      icon: FolderOpen, 
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-500/20'
    },
    { 
      id: 'imams', 
      label: 'Ahlulbayt', 
      sublabel: `${counts.imams} items`,
      icon: Users, 
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-500/20'
    },
    { 
      id: 'artistes', 
      label: 'Artistes', 
      sublabel: `${counts.artistes} items`,
      icon: Users, 
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-500/20'
    },
    { 
      id: 'events', 
      label: 'Events', 
      sublabel: `${counts.events} items`,
      icon: Calendar, 
      iconColor: 'text-pink-600',
      bgColor: 'bg-pink-500/20'
    },
    { 
      id: 'users', 
      label: 'Users', 
      sublabel: `${counts.users} items`,
      icon: Users, 
      iconColor: 'text-cyan-600',
      bgColor: 'bg-cyan-500/20'
    },
    { 
      id: 'earnings', 
      label: 'Earnings', 
      sublabel: 'Settings & Payouts',
      icon: Wallet, 
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-500/20'
    },
    { 
      id: 'uploader-tracking', 
      label: 'Uploader Tracking', 
      sublabel: `${counts.uploaders} uploaders`,
      icon: BarChart3, 
      iconColor: 'text-violet-600',
      bgColor: 'bg-violet-500/20'
    },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Navigate To</h2>
          <p className="text-sm text-muted-foreground">Select a section to manage</p>
        </div>

        {/* Navigation Grid */}
        <div className="p-4 overflow-y-auto max-h-[calc(70vh-100px)]">
          <div className="grid grid-cols-2 gap-3">
            {allSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    onClose();
                  }}
                  className={cn(
                    'flex flex-col items-start gap-2 p-4 rounded-2xl border transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive',
                    'active:scale-[0.98]',
                    isActive 
                      ? 'bg-destructive/10 border-destructive/30' 
                      : 'bg-muted/30 border-transparent hover:bg-muted/50'
                  )}
                >
                  <div className={cn('p-2 rounded-xl', section.bgColor)}>
                    <Icon className={cn('w-5 h-5', section.iconColor)} />
                  </div>
                  <div className="text-left">
                    <span className={cn(
                      'font-medium text-sm',
                      isActive ? 'text-destructive' : 'text-foreground'
                    )}>
                      {section.label}
                    </span>
                    <p className="text-xs text-muted-foreground">{section.sublabel}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigate('/admin/piece/new');
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-destructive text-destructive-foreground rounded-xl font-medium text-sm active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Add Recitation
              </button>
              <button
                onClick={() => {
                  navigate('/');
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-muted text-foreground rounded-xl font-medium text-sm active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>

        {/* Safe area padding */}
        <div className="h-safe-area-bottom" />
      </div>
    </div>
  );
};
