import { RefreshCw, CircleHelp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { AdminActiveSection } from './AdminSidebar';

interface AdminHeaderProps {
  activeSection: AdminActiveSection;
  onRefresh: () => void;
  loading: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

const sectionTitles: Record<AdminActiveSection, string> = {
  recitations: 'Recitations',
  categories: 'Categories',
  imams: 'Ahlulbayt',
  artistes: 'Artistes',
  events: 'Events',
  users: 'Users',
  earnings: 'Earnings & Payouts',
  'uploader-tracking': 'Uploader Tracking',
};

const sectionDescriptions: Record<AdminActiveSection, string> = {
  recitations: 'Manage all recitations in the system',
  categories: 'Organize content into categories',
  imams: 'Manage holy personalities',
  artistes: 'Manage artists and their images',
  events: 'Manage calendar events',
  users: 'Manage user accounts and roles',
  earnings: 'Configure earnings and process payouts',
  'uploader-tracking': 'Track uploader activity and manage their uploads',
};

export const AdminHeader = ({ 
  activeSection,
  onRefresh,
  loading,
  searchQuery = '',
  onSearchChange,
  showSearch = false,
}: AdminHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <SidebarTrigger className="h-9 w-9 min-h-[44px] min-w-[44px]" />
      
      <div className="flex-1 flex items-center gap-4">
        <div>
          <h1 className="font-bold text-xl text-foreground">
            {sectionTitles[activeSection]}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {sectionDescriptions[activeSection]}
          </p>
        </div>
        
        {showSearch && onSearchChange && (
          <div className="hidden md:flex relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder={`Search ${sectionTitles[activeSection].toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-10 rounded-xl"
              aria-label={`Search ${sectionTitles[activeSection]}`}
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={onRefresh} 
                disabled={loading} 
                aria-label="Refresh data"
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Refresh data</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="Help"
                  className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl"
                >
                  <CircleHelp className="w-4 h-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Need help? Contact support</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
};

