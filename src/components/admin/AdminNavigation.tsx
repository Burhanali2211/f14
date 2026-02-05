import { Link } from 'react-router-dom';
import { 
  FileText, FolderOpen, Users, Mic, Calendar, 
  UserCog, Wallet, Upload, Bell, Mail, Settings 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminNavigationProps {
  piecesCount: number;
  categoriesCount: number;
  imamsCount: number;
  artistesCount: number;
  eventsCount: number;
  usersCount: number;
}

export const AdminNavigation = ({
  piecesCount,
  categoriesCount,
  imamsCount,
  artistesCount,
  eventsCount,
  usersCount,
}: AdminNavigationProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
      <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 w-full h-auto bg-transparent p-0">
        <TabsTrigger 
          value="pieces" 
          className="flex flex-col items-center justify-center gap-2 px-4 py-4 sm:py-5 text-sm font-medium h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
        >
          <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Recitations</span>
          <span className="text-xs text-muted-foreground data-[state=active]:text-primary-foreground/80">{piecesCount}</span>
        </TabsTrigger>
        <TabsTrigger 
          value="categories" 
          className="flex flex-col items-center justify-center gap-2 px-4 py-4 sm:py-5 text-sm font-medium h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
        >
          <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Categories</span>
          <span className="text-xs text-muted-foreground data-[state=active]:text-primary-foreground/80">{categoriesCount}</span>
        </TabsTrigger>
        <TabsTrigger 
          value="imams" 
          className="flex flex-col items-center justify-center gap-2 px-4 py-4 sm:py-5 text-sm font-medium h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
        >
          <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Ahlulbayt</span>
          <span className="text-xs text-muted-foreground data-[state=active]:text-primary-foreground/80">{imamsCount}</span>
        </TabsTrigger>
        <TabsTrigger 
          value="artistes" 
          className="flex flex-col items-center justify-center gap-2 px-4 py-4 sm:py-5 text-sm font-medium h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
        >
          <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Artistes</span>
          <span className="text-xs text-muted-foreground data-[state=active]:text-primary-foreground/80">{artistesCount}</span>
        </TabsTrigger>
        <TabsTrigger 
          value="events" 
          className="flex flex-col items-center justify-center gap-2 px-4 py-4 sm:py-5 text-sm font-medium h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
        >
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Events</span>
          <span className="text-xs text-muted-foreground data-[state=active]:text-primary-foreground/80">{eventsCount}</span>
        </TabsTrigger>
        <TabsTrigger 
          value="users" 
          className="flex flex-col items-center justify-center gap-2 px-4 py-4 sm:py-5 text-sm font-medium h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
        >
          <UserCog className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Users</span>
          <span className="text-xs text-muted-foreground data-[state=active]:text-primary-foreground/80">{usersCount}</span>
        </TabsTrigger>
        <TabsTrigger 
          value="earnings" 
          className="flex flex-col items-center justify-center gap-2 px-4 py-4 sm:py-5 text-sm font-medium h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
        >
          <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Earnings</span>
          <span className="text-xs text-muted-foreground data-[state=active]:text-primary-foreground/80">Settings</span>
        </TabsTrigger>
      </TabsList>
      
        {/* Additional Actions */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Link to="/admin/announcements" title="Manage announcements" className="w-full">
            <Button variant="outline" className="w-full justify-center gap-2">
              <Bell className="w-4 h-4" />
              <span>Announcements</span>
            </Button>
          </Link>
          <Link to="/admin/contact-submissions" title="View contact messages" className="w-full">
            <Button variant="outline" className="w-full justify-center gap-2">
              <Mail className="w-4 h-4" />
              <span>Contact Messages</span>
            </Button>
          </Link>
          <Link to="/admin/site-settings" title="Site settings" className="w-full">
            <Button variant="outline" className="w-full justify-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Button>
          </Link>
        </div>
    </div>
  );
};

