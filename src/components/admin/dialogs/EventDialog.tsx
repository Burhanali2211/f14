import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EventDialogProps } from '../types';
import type { EventType } from '@/lib/supabase-types';

export const EventDialog = ({
  open,
  onOpenChange,
  editingEvent,
  form,
  onFormChange,
  onSave,
  imams,
}: EventDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          <DialogDescription>
            Manage calendar events with dates and related information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="event-name">Event Name *</Label>
            <Input
              id="event-name"
              value={form.event_name}
              onChange={(e) => onFormChange({ ...form, event_name: e.target.value })}
              placeholder="e.g., Birth of Imam Ali"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-date">Gregorian Date *</Label>
              <Input
                id="event-date"
                type="date"
                value={form.event_date}
                onChange={(e) => onFormChange({ ...form, event_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="hijri-date">Hijri Date</Label>
              <Input
                id="hijri-date"
                value={form.hijri_date}
                onChange={(e) => onFormChange({ ...form, hijri_date: e.target.value })}
                placeholder="e.g., 13 Rajab 1447"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-type">Event Type *</Label>
              <Select
                value={form.event_type}
                onValueChange={(v) => onFormChange({ ...form, event_type: v as EventType })}
              >
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="martyrdom">Martyrdom</SelectItem>
                  <SelectItem value="death">Death</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event-imam">Imam / Personality</Label>
              <Select
                value={form.imam_id}
                onValueChange={(v) => onFormChange({ ...form, imam_id: v })}
              >
                <SelectTrigger id="event-imam">
                  <SelectValue placeholder="Select an imam" />
                </SelectTrigger>
                <SelectContent>
                  {imams.map((imam) => (
                    <SelectItem key={imam.id} value={imam.id}>
                      {imam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              placeholder="Additional information about the event..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Note: Hijri date will be automatically added to the description if provided above.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="event-annual"
              checked={form.is_annual}
              onCheckedChange={(checked) => onFormChange({ ...form, is_annual: !!checked })}
            />
            <Label
              htmlFor="event-annual"
              className="text-sm font-normal cursor-pointer"
            >
              Annual event (repeats every year)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save Event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

