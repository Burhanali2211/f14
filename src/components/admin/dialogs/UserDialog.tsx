import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserDialogProps } from '../types';

export const UserDialog = ({
  open,
  onOpenChange,
  editingUser,
  isAdding,
  form,
  onFormChange,
  onSave,
}: UserDialogProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAdding ? 'Add New User' : 'Edit User'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="user-email">Email {isAdding && <span className="text-destructive">*</span>}</Label>
            <Input 
              id="user-email"
              type="email"
              value={form.email} 
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
              disabled={!isAdding}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <Label htmlFor="user-password">
              Password {isAdding ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
            </Label>
            <div className="relative">
              <Input 
                id="user-password"
                type={showPassword ? "text" : "password"}
                value={form.password} 
                onChange={(e) => onFormChange({ ...form, password: e.target.value })}
                placeholder={isAdding ? "At least 6 characters" : "Enter new password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="user-name">Full Name</Label>
            <Input 
              id="user-name"
              value={form.full_name} 
              onChange={(e) => onFormChange({ ...form, full_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label htmlFor="user-phone">Phone Number</Label>
            <Input 
              id="user-phone"
              type="tel"
              value={form.phone_number} 
              onChange={(e) => onFormChange({ ...form, phone_number: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <Label htmlFor="user-address">Address</Label>
            <Input 
              id="user-address"
              value={form.address} 
              onChange={(e) => onFormChange({ ...form, address: e.target.value })}
              placeholder="123 Main St, City, State"
            />
          </div>
          <div>
            <Label htmlFor="user-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => onFormChange({ ...form, role: v as 'admin' | 'uploader' | 'user' })}
            >
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="uploader">Uploader</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>{isAdding ? 'Create User' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

