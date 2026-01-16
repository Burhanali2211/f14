import { memo, useState } from 'react';
import { User, Mail, Phone, MapPin, Edit2, Save, X, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUserRole } from '@/hooks/use-user-role';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { saveSession, signOut } from '@/lib/auth-utils';
import type { User as UserType } from '@/lib/auth-utils';
import { useNavigate } from 'react-router-dom';

interface DashboardProfileSectionProps {
  variant?: 'sidebar' | 'card';
}

export const DashboardProfileSection = memo(({ variant = 'sidebar' }: DashboardProfileSectionProps) => {
  const navigate = useNavigate();
  const { user, role, refresh } = useUserRole();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address: '',
  });

  const openEditDialog = () => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
      });
    }
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name || null,
          phone_number: formData.phone_number || null,
          address: formData.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (updatedUser) {
        const { password_hash, ...userWithoutPassword } = updatedUser;
        saveSession(userWithoutPassword as UserType);
      }

      await refresh();
      toast({ title: 'Profile updated', description: 'Your profile has been successfully updated.' });
      setEditDialogOpen(false);
    } catch (error: any) {
      logger.error('Error updating profile:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setLoggingOut(true);
    try {
      signOut();
      toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
      navigate('/auth');
    } catch (error: any) {
      logger.error('Error logging out:', error);
      toast({ title: 'Error', description: 'Failed to log out', variant: 'destructive' });
    } finally {
      setLoggingOut(false);
    }
  };

  const getRoleBadgeColor = (userRole: string) => {
    switch (userRole) {
      case 'admin': return 'bg-red-500/20 text-red-600 dark:text-red-400';
      case 'uploader': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  const getRoleLabel = (userRole: string) => {
    switch (userRole) {
      case 'admin': return 'Administrator';
      case 'uploader': return 'Uploader';
      default: return 'User';
    }
  };

  if (!user) return null;

  if (variant === 'card') {
    return (
      <div className="bg-card rounded-xl border p-4 space-y-4">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold">
            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{user.full_name || 'User'}</h3>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <Badge className={`mt-1 text-xs ${getRoleBadgeColor(role || 'user')}`}>
              {getRoleLabel(role || 'user')}
            </Badge>
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-2 pt-2 border-t">
          {user.phone_number && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="truncate">{user.phone_number}</span>
            </div>
          )}
          {user.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{user.address}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={openEditDialog} className="flex-1 gap-2 rounded-xl">
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            disabled={loggingOut}
            className="gap-2 text-destructive hover:text-destructive rounded-xl"
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          </Button>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your address"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Sidebar variant (compact)
  return (
    <div className="p-3 space-y-3">
      {/* Compact Profile */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
          {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-sidebar-foreground truncate">{user.full_name || 'User'}</p>
          <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={openEditDialog} 
          className="flex-1 h-9 gap-2 text-xs rounded-xl hover:bg-sidebar-accent"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          disabled={loggingOut}
          className="h-9 gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
        >
          {loggingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sidebar-full_name">Full Name</Label>
              <Input
                id="sidebar-full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="sidebar-phone_number">Phone Number</Label>
              <Input
                id="sidebar-phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="sidebar-address">Address</Label>
              <Input
                id="sidebar-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter your address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

DashboardProfileSection.displayName = 'DashboardProfileSection';

