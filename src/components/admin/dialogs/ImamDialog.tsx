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
import type { ImamDialogProps } from '../types';

export const ImamDialog = ({
  open,
  onOpenChange,
  editingImam,
  form,
  onFormChange,
  onSave,
}: ImamDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              placeholder="e.g., Imam Ali (AS)"
            />
          </div>
          <div>
            <Label htmlFor="imam-slug">Slug</Label>
            <Input
              id="imam-slug"
              value={form.slug}
              onChange={(e) => onFormChange({ ...form, slug: e.target.value })}
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
              onChange={(e) => onFormChange({ ...form, order_index: Math.max(parseInt(e.target.value) || 1, 1) })}
              placeholder="e.g., 1, 2, 3, 4..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set the display order (1, 2, 3, 4...). Lower numbers appear first. Starts from 1.
            </p>
          </div>
          <div>
            <Label htmlFor="imam-title">Title (optional)</Label>
            <Input
              id="imam-title"
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              placeholder="e.g., Commander of the Faithful"
            />
          </div>
          <div>
            <Label htmlFor="imam-desc">Description</Label>
            <Textarea
              id="imam-desc"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              placeholder="Brief description..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

