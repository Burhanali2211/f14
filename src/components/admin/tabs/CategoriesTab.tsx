import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import type { CategoriesTabProps } from '../types';

export const CategoriesTab = ({ categories, onOpenForm, onDelete }: CategoriesTabProps) => {
  return (
    <TabsContent value="categories" className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => onOpenForm()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Add Category</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="grid gap-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{category.name}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">/{category.slug}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenForm(category)}
                className="h-9 w-9 sm:h-10 sm:w-10"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete('category', category.id)}
                className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </TabsContent>
  );
};

