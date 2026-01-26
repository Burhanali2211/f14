import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FileText, Plus, Wallet, Home } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { DashboardProfileSection } from '@/components/shared/DashboardProfileSection';
import type { UploaderSidebarProps } from './types';

export const UploaderSidebar = ({ 
  activeSection, 
  setActiveSection, 
  recitationCount, 
  earnings 
}: UploaderSidebarProps) => {
  const navigate = useNavigate();
  
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-sidebar-foreground">Uploader</h2>
            <p className="text-xs text-sidebar-foreground/60">Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeSection === 'earnings'}
                  onClick={() => setActiveSection('earnings')}
                  className="h-12 rounded-xl gap-3 px-3"
                  tooltip="Your Earnings"
                >
                  <div className={`p-2 rounded-lg ${activeSection === 'earnings' ? 'bg-emerald-500/20' : 'bg-sidebar-accent/50'}`}>
                    <Wallet className={`w-4 h-4 ${activeSection === 'earnings' ? 'text-emerald-600' : 'text-sidebar-foreground/70'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium">Earnings</span>
                    {earnings && (
                      <p className="text-xs text-sidebar-foreground/60">₹{earnings.pendingPayout.toFixed(0)} available</p>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeSection === 'recitations'}
                  onClick={() => setActiveSection('recitations')}
                  className="h-12 rounded-xl gap-3 px-3"
                  tooltip="My Recitations"
                >
                  <div className={`p-2 rounded-lg ${activeSection === 'recitations' ? 'bg-blue-500/20' : 'bg-sidebar-accent/50'}`}>
                    <FileText className={`w-4 h-4 ${activeSection === 'recitations' ? 'text-blue-600' : 'text-sidebar-foreground/70'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium">My Recitations</span>
                    <p className="text-xs text-sidebar-foreground/60">{recitationCount} items</p>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/uploader/piece/new')}
                  className="h-11 rounded-xl gap-3 px-3 bg-primary/10 hover:bg-primary/20"
                  tooltip="Add New Recitation"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">Add Recitation</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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

