import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BulkSelectionBarProps } from './types';

export const BulkSelectionBar = ({ 
  selectedCount, 
  onCancel, 
  onDelete, 
  isDeleting 
}: BulkSelectionBarProps) => {
  if (selectedCount === 0) return null;
  
  return (
    <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} recitation{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-lg">
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleting} className="rounded-lg gap-2">
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

