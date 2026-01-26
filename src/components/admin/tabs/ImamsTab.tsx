import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import type { ImamsTabProps } from '../types';

export const ImamsTab = ({ imams, onOpenDialog, onDelete }: ImamsTabProps) => {
  return (
    <TabsContent value="imams" className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => onOpenDialog()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Add Holy Personality</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="grid gap-3">
        {imams.map((imam) => (
          <div
            key={imam.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
          >
            <div className="min-w-0 flex-1 flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">{imam.order_index || 1}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{imam.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{imam.description || imam.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenDialog(imam)}
                className="h-9 w-9 sm:h-10 sm:w-10"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete('imam', imam.id)}
                className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {imams.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No Holy Personalities yet. Add your first one!
          </div>
        )}
      </div>
    </TabsContent>
  );
};

