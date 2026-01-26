import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdmin } from '@/contexts/AdminContext';
import { getKarbalaPlaceholder, getFirstImageUrl } from '@/lib/utils';

export const AdminRecitationsSection = memo(() => {
  const navigate = useNavigate();
  const { pieces, categories, imams, handleDelete } = useAdmin();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await handleDelete('piece', deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate('/admin/piece/new')} className="w-full sm:w-auto gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Recitation</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
      
      <div className="grid gap-3 w-full max-w-full overflow-hidden">
        {pieces.map((piece) => {
          const category = categories.find(c => c.id === piece.category_id);
          const imam = imams.find(f => f.id === piece.imam_id);
          return (
            <div
              key={piece.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden w-full max-w-full"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 overflow-hidden">
                <img 
                  src={getFirstImageUrl(piece.image_url) || getKarbalaPlaceholder(piece.id)} 
                  alt={piece.title}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getKarbalaPlaceholder(piece.id);
                  }}
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{piece.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                    {category?.name} {imam && `• ${imam.name}`} • {piece.language} {piece.reciter && `• ${piece.reciter}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/admin/piece/${piece.id}/edit`)}
                  className="h-10 w-10 rounded-xl"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(piece.id)}
                  className="text-destructive hover:text-destructive h-10 w-10 rounded-xl"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {pieces.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No recitations yet</p>
            <p className="text-sm text-muted-foreground/80">Add your first recitation to get started</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this recitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

AdminRecitationsSection.displayName = 'AdminRecitationsSection';

