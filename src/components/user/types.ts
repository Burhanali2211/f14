import type { User } from '@/lib/auth-utils';

export interface ProfileFormData {
  full_name: string;
  phone_number: string;
  address: string;
}

export interface PersonalInfoCardProps {
  user: User;
  formData: ProfileFormData;
  isEditing: boolean;
  onFormChange: (data: ProfileFormData) => void;
}

export interface AccountInfoCardProps {
  user: User;
  formatDate: (date: string) => string;
}

export interface RoleCardProps {
  role: string;
  getRoleBadgeVariant: (role: string) => 'destructive' | 'default' | 'secondary';
  getRoleLabel: (role: string) => string;
}

export interface QuickLinksProps {
  role: string;
}

export interface ProfileHeaderProps {
  isEditing: boolean;
  loading: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export interface QuickAccessGridProps {
  role: string;
}

