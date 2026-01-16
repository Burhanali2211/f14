import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { getKarbalaPlaceholder } from '@/lib/utils';
import type { RecitationsTabProps } from '../types';

export const RecitationsTab = ({ 
  pieces, 
  categories, 
  imams, 
  onNavigate, 
  onDelete 
}: RecitationsTabProps) => {
  return (
    <TabsContent value="pieces" className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => onNavigate('/admin/piece/new')} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Add Recitation</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="grid gap-3">
        {pieces.map((piece) => {
          const category = categories.find(c => c.id === piece.category_id);
          const imam = imams.find(f => f.id === piece.imam_id);
          return (
            <div
              key={piece.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <img 
                  src={getFirstImageUrl(piece.image_url) || getKarbalaPlaceholder(piece.id)} 
                  alt={piece.title}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getKarbalaPlaceholder(piece.id);
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{piece.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                    {category?.name} {imam && `• ${imam.name}`} • {piece.language} {piece.reciter && `• ${piece.reciter}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 sm:ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate(`/admin/piece/${piece.id}/edit`)}
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete('piece', piece.id)}
                  className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {pieces.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No recitations yet. Add your first recitation!
          </div>
        )}
      </div>
    </TabsContent>
  );
};

