import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
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
import type { Category } from '@/lib/supabase-types';

export const AdminCategoriesSection = memo(() => {
  const navigate = useNavigate();
  const { categories, handleDelete } = useAdmin();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCategoryForm = (category?: Category) => {
    if (category) {
      navigate(`/admin/category/${category.id}/edit`);
    } else {
      navigate('/admin/category/new');
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await handleDelete('category', deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openCategoryForm()} className="w-full sm:w-auto gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Category</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
      
      <div className="grid gap-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground truncate">{category.name}</h3>
                <p className="text-sm text-muted-foreground truncate mt-0.5">/{category.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openCategoryForm(category)}
                className="h-10 w-10 rounded-xl"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(category.id)}
                className="text-destructive hover:text-destructive h-10 w-10 rounded-xl"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No categories yet</p>
            <p className="text-sm text-muted-foreground/80">Create your first category</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this category.
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

AdminCategoriesSection.displayName = 'AdminCategoriesSection';

