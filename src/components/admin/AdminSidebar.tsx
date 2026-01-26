import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, FolderOpen, Users, Mic, Calendar, 
  UserCog, Wallet, Upload, Bell, Mail, Settings, 
    Home, Shield, Plus, BarChart3, CircleHelp
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { DashboardProfileSection } from '@/components/shared/DashboardProfileSection';

export type AdminActiveSection = 
  | 'recitations' 
  | 'categories' 
  | 'imams' 
  | 'artistes' 
  | 'events' 
  | 'users' 
    | 'earnings'
    | 'uploader-tracking'
    | 'fiqh';

interface AdminSidebarProps {

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
}

export const AdminSidebar = ({ 
  activeSection, 
  setActiveSection, 
  counts 
}: AdminSidebarProps) => {
  const navigate = useNavigate();
  
  const menuItems: Array<{
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
      icon: Mic, 
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
      icon: UserCog, 
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
      { 
          id: 'fiqh', 
          label: 'Fiqh Jafaria', 
          sublabel: 'Q&A management',
          icon: CircleHelp, 
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-500/20'
        },
    ];


    const quickActions = [
      { 
        label: 'Add Recitation', 
        icon: Plus, 
        onClick: () => navigate('/admin/piece/new'),
        primary: true
      },
    ];

  const additionalLinks = [
    { label: 'Announcements', icon: Bell, to: '/admin/announcements' },
    { label: 'Contact Messages', icon: Mail, to: '/admin/contact-submissions' },
    { label: 'Site Settings', icon: Settings, to: '/admin/site-settings' },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive to-destructive/70 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-sidebar-foreground">Admin</h2>
            <p className="text-xs text-sidebar-foreground/60">Control Panel</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2">
            Manage Content
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={isActive}
                      onClick={() => setActiveSection(item.id)}
                      className="h-12 rounded-xl gap-3 px-3"
                      tooltip={item.label}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? item.bgColor : 'bg-sidebar-accent/50'}`}>
                        <Icon className={`w-4 h-4 ${isActive ? item.iconColor : 'text-sidebar-foreground/70'}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-medium">{item.label}</span>
                        <p className="text-xs text-sidebar-foreground/60">{item.sublabel}</p>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator className="my-3" />
        
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <SidebarMenuItem key={action.label}>
                    <SidebarMenuButton 
                      onClick={action.onClick}
                      className={`h-11 rounded-xl gap-3 px-3 ${action.primary ? 'bg-primary/10 hover:bg-primary/20' : ''}`}
                      tooltip={action.label}
                    >
                      <Icon className={`w-4 h-4 ${action.primary ? 'text-primary' : 'text-sidebar-foreground/70'}`} />
                      <span className={`font-medium ${action.primary ? 'text-primary' : ''}`}>{action.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator className="my-3" />
        
        {/* Additional Links */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2">
            More Options
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {additionalLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <SidebarMenuItem key={link.to}>
                    <SidebarMenuButton 
                      asChild
                      className="h-10 rounded-xl gap-3 px-3"
                      tooltip={link.label}
                    >
                      <Link to={link.to}>
                        <Icon className="w-4 h-4 text-sidebar-foreground/70" />
                        <span className="text-sm">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border">
        {/* Profile Section */}
        <DashboardProfileSection variant="sidebar" />
        
        {/* Back to Home */}
        <div className="px-3 pb-3">
          <Link 
            to="/" 
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground text-sm"
          >
            <Home className="w-4 h-4" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

