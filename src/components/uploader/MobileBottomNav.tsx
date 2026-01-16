import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, FileText, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActiveSection } from './types';
import type { UploaderEarnings } from '@/lib/uploader-earnings';

interface MobileBottomNavProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  earnings?: UploaderEarnings | null;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  isActive?: boolean;
  badge?: string | number;
  isCenter?: boolean;
}

export const UploaderMobileBottomNav = ({
  activeSection,
  setActiveSection,
  earnings,
}: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check current page
  const isHomePage = location.pathname === '/';
  const isProfilePage = location.pathname === '/profile';
  const isUploadPage = location.pathname === '/uploader/piece/new' || location.pathname.includes('/uploader/piece/');
  const isOnUploaderDashboard = location.pathname === '/uploader';

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      action: () => navigate('/'),
      isActive: isHomePage,
    },
    {
      id: 'earnings',
      label: 'Dashboard',
      icon: LayoutDashboard,
      action: () => {
        navigate('/uploader');
        setActiveSection('earnings');
      },
      isActive: activeSection === 'earnings' && isOnUploaderDashboard,
      badge: earnings?.pendingPayout ? `₹${Math.floor(earnings.pendingPayout)}` : undefined,
    },
    {
      id: 'add',
      label: 'Add',
      icon: Plus,
      action: () => navigate('/uploader/piece/new'),
      isActive: isUploadPage,
      isCenter: true,
    },
    {
      id: 'recitations',
      label: 'Recitations',
      icon: FileText,
      action: () => {
        navigate('/uploader');
        setActiveSection('recitations');
      },
      isActive: activeSection === 'recitations' && isOnUploaderDashboard,
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
      aria-label="Mobile navigation"
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
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  'active:scale-95'
                )}
                aria-label={item.label}
                tabIndex={0}
              >
                {/* Elevated circle button */}
                <div className={cn(
                  'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200',
                  'bg-primary text-primary-foreground',
                  'hover:shadow-xl hover:scale-105',
                  isActive && 'ring-4 ring-primary/30'
                )}>
                  <Icon className="w-7 h-7" strokeWidth={2.5} />
                </div>
                
                {/* Label below the circle */}
                <span className="text-[10px] font-semibold text-primary mt-1">
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
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={0}
            >
              {/* Badge */}
              {item.badge && (
                <span className="absolute top-1 right-1/4 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {item.badge}
                </span>
              )}
              
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
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
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
