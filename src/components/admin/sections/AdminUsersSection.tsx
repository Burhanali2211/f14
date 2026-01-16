import { memo, useState } from 'react';
import { Plus, Edit2, UserCog, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/integrations/supabase/client';
import { authenticatedQuery } from '@/lib/db-utils';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { invalidateCache } from '@/lib/data-cache';
import type { UserProfile } from '@/lib/supabase-types';

export const AdminUsersSection = memo(() => {
  const { userProfiles, currentUser, fetchData } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ 
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    address: '',
    role: 'user' as 'admin' | 'uploader' | 'user' 
  });

  const openDialog = (userProfile?: UserProfile) => {
    if (userProfile) {
      setEditingUser(userProfile);
      setIsAddingUser(false);
      setForm({ 
        email: userProfile.email || '',
        password: '',
        full_name: userProfile.full_name || '',
        phone_number: userProfile.phone_number || '',
        address: userProfile.address || '',
        role: userProfile.role 
      });
    } else {
      setEditingUser(null);
      setIsAddingUser(true);
      setForm({ email: '', password: '', full_name: '', phone_number: '', address: '', role: 'user' });
    }
    setDialogOpen(true);
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const saveUser = async () => {
    if (isAddingUser) {
      if (!form.email || !form.password) {
        toast({ title: 'Error', description: 'Email and password are required', variant: 'destructive' });
        return;
      }
      if (form.password.length < 6) {
        toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
        return;
      }

      try {
        const passwordHash = await hashPassword(form.password);
        const { error } = await authenticatedQuery(async () =>
          await supabase
            .from('users')
            .insert({
              email: form.email,
              password_hash: passwordHash,
              full_name: form.full_name || null,
              phone_number: form.phone_number || null,
              address: form.address || null,
              role: form.role,
              is_active: true,
            })
        );

        if (error) {
          logger.error('Error creating user:', error);
          if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
            toast({ title: 'Error', description: 'Email already exists', variant: 'destructive' });
          } else {
            toast({ title: 'Error', description: error.message || 'Failed to create user', variant: 'destructive' });
          }
          return;
        }

        toast({ title: 'Success', description: 'User created successfully' });
        setDialogOpen(false);
        fetchData();
      } catch (error: any) {
        logger.error('Unexpected error creating user:', error);
        toast({ title: 'Error', description: error.message || 'Failed to create user', variant: 'destructive' });
      }
    } else {
      if (!editingUser) {
        toast({ title: 'Error', description: 'No user selected', variant: 'destructive' });
        return;
      }

      const updateData: any = {
        role: form.role,
        full_name: form.full_name || null,
        phone_number: form.phone_number || null,
        address: form.address || null,
        updated_at: new Date().toISOString(),
      };

      if (form.password && form.password.length > 0) {
        if (form.password.length < 6) {
          toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
          return;
        }
        updateData.password_hash = await hashPassword(form.password);
      }

      const { error } = await authenticatedQuery(async () =>
        await supabase.from('users').update(updateData).eq('id', editingUser.id)
      );

      if (error) {
        logger.error('Error updating user:', error);
        toast({ title: 'Error', description: error.message || 'Failed to update user', variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'User updated successfully' });
      invalidateCache('admin:data');
      setDialogOpen(false);
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openDialog()} className="w-full sm:w-auto gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>
      
      <div className="grid gap-3">
        {userProfiles.map((userProfile) => {
          const isCurrentUser = currentUser && userProfile.id === currentUser.id;
          return (
            <div
              key={userProfile.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow ${
                isCurrentUser ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <UserCog className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground truncate">{userProfile.email}</h3>
                    {isCurrentUser && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        You
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      userProfile.role === 'admin' 
                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                        : userProfile.role === 'uploader'
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>
                      {userProfile.role}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {userProfile.full_name || 'No name provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDialog(userProfile)}
                  title="Edit"
                  className="h-10 w-10 rounded-xl"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {userProfiles.length === 0 && (
          <div className="text-center py-16">
            <UserCog className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No users yet</p>
            <p className="text-sm text-muted-foreground/80">Add your first user</p>
          </div>
        )}
      </div>

      {/* User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAddingUser ? 'Add New User' : 'Edit User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-email">Email {isAddingUser && <span className="text-destructive">*</span>}</Label>
              <Input 
                id="user-email"
                type="email"
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!isAddingUser}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="user-password">
                Password {isAddingUser ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
              </Label>
              <div className="relative">
                <Input 
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={isAddingUser ? "At least 6 characters" : "Enter new password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="user-name">Full Name</Label>
              <Input id="user-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <Label htmlFor="user-phone">Phone Number</Label>
              <Input id="user-phone" type="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+1 (555) 123-4567" />
            </div>
            <div>
              <Label htmlFor="user-address">Address</Label>
              <Input id="user-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City, State" />
            </div>
            <div>
              <Label htmlFor="user-role">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as 'admin' | 'uploader' | 'user' })}>
                <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="uploader">Uploader</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveUser}>{isAddingUser ? 'Create User' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

AdminUsersSection.displayName = 'AdminUsersSection';

