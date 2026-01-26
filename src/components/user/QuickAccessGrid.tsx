import { Link } from 'react-router-dom';
import { 
  Home, Heart, Calendar, Settings, Upload, Plus, 
  Shield, Bell, FolderOpen 
} from 'lucide-react';
import type { QuickAccessGridProps } from './types';

interface QuickAccessItem {
  to: string;
  icon: React.ElementType;
  label: string;
  iconClassName?: string;
}

export const QuickAccessGrid = ({ role }: QuickAccessGridProps) => {
  const commonLinks: QuickAccessItem[] = [
    { to: '/', icon: Home, label: 'Browse' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const uploaderLinks: QuickAccessItem[] = (role === 'uploader' || role === 'admin') ? [
    { to: '/uploader', icon: Upload, label: 'Upload' },
    { to: '/uploader/piece/new', icon: Plus, label: 'New Piece' },
  ] : [];

  const adminLinks: QuickAccessItem[] = role === 'admin' ? [
    { to: '/admin', icon: Shield, label: 'Admin', iconClassName: 'bg-destructive/10 group-hover:bg-destructive/20' },
    { to: '/admin/site-settings', icon: Settings, label: 'Site Settings' },
    { to: '/admin/announcements', icon: Bell, label: 'Announcements' },
    { to: '/admin/category/new', icon: FolderOpen, label: 'New Category' },
  ] : [];

  const allLinks = [...commonLinks, ...uploaderLinks, ...adminLinks];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Quick Access</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {allLinks.map((item) => {
          const Icon = item.icon;
          const isDestructive = item.iconClassName?.includes('destructive');
          
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-colors ${
                isDestructive 
                  ? 'bg-destructive/10 group-hover:bg-destructive/20' 
                  : 'bg-primary/10 group-hover:bg-primary/20'
              }`}>
                <Icon className={`w-5 h-5 ${isDestructive ? 'text-destructive' : 'text-primary'}`} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

