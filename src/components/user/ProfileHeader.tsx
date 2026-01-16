import { Edit2, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProfileHeaderProps } from './types';

export const ProfileHeader = ({ 
  isEditing, 
  loading, 
  onEdit, 
  onCancel, 
  onSave 
}: ProfileHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="font-display text-3xl font-bold text-foreground">
        My Profile
      </h1>
      {!isEditing ? (
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

