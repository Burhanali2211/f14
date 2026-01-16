import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAddRecitation: () => void;
}

export const EmptyState = ({ hasFilters, onClearFilters, onAddRecitation }: EmptyStateProps) => {
  return (
    <div className="text-center py-16" role="status" aria-live="polite">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
        <FileText className="w-10 h-10 text-muted-foreground/50" />
      </div>
      {hasFilters ? (
        <>
          <p className="text-xl font-semibold mb-2">No recitations found</p>
          <p className="text-muted-foreground mb-6">Try adjusting your search or filters</p>
          <Button 
            variant="outline" 
            onClick={onClearFilters}
            className="rounded-xl"
          >
            Clear All Filters
          </Button>
        </>
      ) : (
        <>
          <p className="text-xl font-semibold mb-2">No recitations yet</p>
          <p className="text-muted-foreground mb-6">Add your first recitation to get started!</p>
          <Button 
            onClick={onAddRecitation}
            className="rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Your First Recitation
          </Button>
        </>
      )}
    </div>
  );
};

