import { memo, useState } from 'react';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { supabase } from '@/integrations/supabase/client';
import { authenticatedQuery } from '@/lib/db-utils';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { invalidateCache } from '@/lib/data-cache';
import type { Imam } from '@/lib/supabase-types';

export const AdminImamsSection = memo(() => {
  const { imams, handleDelete, fetchData } = useAdmin();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingImam, setEditingImam] = useState<Imam | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', title: '', order_index: 1 });

  const openDialog = (imam?: Imam) => {
    if (imam) {
      setEditingImam(imam);
      setForm({
        name: imam.name,
        slug: imam.slug,
        description: imam.description || '',
        title: imam.title || '',
        order_index: imam.order_index || 1,
      });
    } else {
      const maxOrder = imams.length > 0 
        ? Math.max(...imams.map(i => i.order_index || 0), 0) 
        : 0;
      setEditingImam(null);
      setForm({ name: '', slug: '', description: '', title: '', order_index: Math.max(maxOrder + 1, 1) });
    }
    setDialogOpen(true);
  };

  const saveImam = async () => {
    if (!form.name || !form.slug) {
      toast({ title: 'Error', description: 'Name and slug are required', variant: 'destructive' });
      return;
    }

    const data = {
      name: form.name,
      slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
      description: form.description || null,
      title: form.title || null,
      order_index: Math.max(Number(form.order_index) || 1, 1),
    };

    if (editingImam) {
      const { error } = await authenticatedQuery(async () =>
        await supabase.from('imams').update(data).eq('id', editingImam.id)
      );
      if (error) {
        logger.error('Error updating imam:', error);
        toast({ title: 'Error', description: error.message || 'Failed to update', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Holy Personality updated' });
    } else {
      const { error } = await authenticatedQuery(async () =>
        await supabase.from('imams').insert([data])
      );
      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to create', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Holy Personality created' });
    }

    invalidateCache('imams:*');
    invalidateCache('index:*');
    invalidateCache('admin:data');
    setDialogOpen(false);
    fetchData();
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await handleDelete('imam', deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openDialog()} className="w-full sm:w-auto gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Holy Personality</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
      
      <div className="grid gap-3">
        {imams.map((imam) => (
          <div
            key={imam.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-emerald-600">{imam.order_index || 1}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground truncate">{imam.name}</h3>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{imam.description || imam.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openDialog(imam)}
                className="h-10 w-10 rounded-xl"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(imam.id)}
                className="text-destructive hover:text-destructive h-10 w-10 rounded-xl"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {imams.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No Holy Personalities yet</p>
            <p className="text-sm text-muted-foreground/80">Add your first one</p>
          </div>
        )}
      </div>

      {/* Imam Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingImam ? 'Edit Holy Personality' : 'Add Holy Personality'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="imam-name">Name</Label>
              <Input
                id="imam-name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Imam Ali (AS)"
              />
            </div>
            <div>
              <Label htmlFor="imam-slug">Slug</Label>
              <Input
                id="imam-slug"
                value={form.slug}
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="e.g., imam-ali"
              />
            </div>
            <div>
              <Label htmlFor="imam-order">Order Index</Label>
              <Input
                id="imam-order"
                type="number"
                min="1"
                value={form.order_index}
                onChange={(e) => setForm(f => ({ ...f, order_index: Math.max(parseInt(e.target.value) || 1, 1) }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first</p>
            </div>
            <div>
              <Label htmlFor="imam-title">Title (optional)</Label>
              <Input
                id="imam-title"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Commander of the Faithful"
              />
            </div>
            <div>
              <Label htmlFor="imam-desc">Description</Label>
              <Textarea
                id="imam-desc"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveImam}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holy Personality?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this entry.
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

AdminImamsSection.displayName = 'AdminImamsSection';

