import { memo, useState } from 'react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import type { AhlulBaitEvent, EventType } from '@/lib/supabase-types';

export const AdminEventsSection = memo(() => {
  const { events, imams, handleDelete, fetchData } = useAdmin();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AhlulBaitEvent | null>(null);
  const [form, setForm] = useState({
    event_name: '',
    event_date: '',
    hijri_date: '',
    event_type: 'other' as EventType,
    imam_id: '',
    description: '',
    is_annual: true,
  });

  const openDialog = (event?: AhlulBaitEvent) => {
    if (event) {
      setEditingEvent(event);
      const hijriMatch = event.description?.match(/Hijri:\s*(.+?)(?:\n|$)/i);
      const hijriDate = hijriMatch ? hijriMatch[1].trim() : '';
      let cleanDescription = event.description || '';
      if (hijriMatch) {
        cleanDescription = cleanDescription.replace(/Hijri:\s*.+?(?:\n|$)/i, '').trim();
      }
      setForm({
        event_name: event.event_name,
        event_date: event.event_date,
        hijri_date: hijriDate,
        event_type: event.event_type,
        imam_id: event.imam_id,
        description: cleanDescription,
        is_annual: event.is_annual,
      });
    } else {
      setEditingEvent(null);
      setForm({
        event_name: '',
        event_date: '',
        hijri_date: '',
        event_type: 'other',
        imam_id: imams[0]?.id || '',
        description: '',
        is_annual: true,
      });
    }
    setDialogOpen(true);
  };

  const saveEvent = async () => {
    if (!form.event_name || !form.event_date) {
      toast({ title: 'Error', description: 'Event name and date are required', variant: 'destructive' });
      return;
    }

    let description = form.description?.trim() || '';
    if (form.hijri_date) {
      const hijriText = `Hijri: ${form.hijri_date.trim()}`;
      description = description ? `${description}\n${hijriText}` : hijriText;
    }

    const data = {
      event_name: form.event_name,
      event_date: form.event_date,
      event_type: form.event_type,
      imam_id: form.imam_id || imams[0]?.id,
      description: description || null,
      is_annual: form.is_annual,
    };

    if (editingEvent) {
      const { error } = await authenticatedQuery(async () =>
        await supabase.from('ahlul_bait_events').update(data).eq('id', editingEvent.id)
      );
      if (error) {
        logger.error('Error updating event:', error);
        toast({ title: 'Error', description: error.message || 'Failed to update', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Event updated' });
    } else {
      const { error } = await authenticatedQuery(async () =>
        await supabase.from('ahlul_bait_events').insert([data])
      );
      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to create', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Event created' });
    }

    invalidateCache('admin:data');
    setDialogOpen(false);
    fetchData();
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await handleDelete('event', deleteId);
      setDeleteId(null);
    }
  };

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case 'birthday': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'death': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'martyrdom': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default: return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    }
  };

  const getEventTypeLabel = (type: EventType) => {
    switch (type) {
      case 'birthday': return 'Birthday';
      case 'death': return 'Death';
      case 'martyrdom': return 'Martyrdom';
      default: return 'Other';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openDialog()} className="w-full sm:w-auto gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Event</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
      
      <div className="grid gap-3">
        {events.map((event) => {
          const imam = imams.find(i => i.id === event.imam_id);
          const eventDate = new Date(event.event_date);
          const formattedDate = eventDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          const hijriMatch = event.description?.match(/Hijri:\s*(.+)/i);
          const hijriDate = hijriMatch ? hijriMatch[1].trim() : '';

          return (
            <div
              key={event.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-pink-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium text-foreground truncate">{event.event_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getEventTypeColor(event.event_type)}`}>
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    {event.is_annual && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Annual</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formattedDate}{hijriDate && ` • ${hijriDate}`}{imam && ` • ${imam.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openDialog(event)} className="h-10 w-10 rounded-xl" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(event.id)} className="text-destructive hover:text-destructive h-10 w-10 rounded-xl" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No events yet</p>
            <p className="text-sm text-muted-foreground/80">Add your first event</p>
          </div>
        )}
      </div>

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
            <DialogDescription>Manage calendar events with dates and related information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-name">Event Name *</Label>
              <Input id="event-name" value={form.event_name} onChange={(e) => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="e.g., Birth of Imam Ali" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-date">Gregorian Date *</Label>
                <Input id="event-date" type="date" value={form.event_date} onChange={(e) => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="hijri-date">Hijri Date</Label>
                <Input id="hijri-date" value={form.hijri_date} onChange={(e) => setForm(f => ({ ...f, hijri_date: e.target.value }))} placeholder="e.g., 13 Rajab 1447" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-type">Event Type *</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm(f => ({ ...f, event_type: v as EventType }))}>
                  <SelectTrigger id="event-type"><SelectValue /></SelectTrigger>
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
                <Select value={form.imam_id} onValueChange={(v) => setForm(f => ({ ...f, imam_id: v }))}>
                  <SelectTrigger id="event-imam"><SelectValue placeholder="Select an imam" /></SelectTrigger>
                  <SelectContent>
                    {imams.map((imam) => (
                      <SelectItem key={imam.id} value={imam.id}>{imam.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea id="event-description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional information..." className="min-h-[100px]" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="event-annual" checked={form.is_annual} onCheckedChange={(checked) => setForm(f => ({ ...f, is_annual: !!checked }))} />
              <Label htmlFor="event-annual" className="text-sm font-normal cursor-pointer">Annual event (repeats every year)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEvent}>Save Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

AdminEventsSection.displayName = 'AdminEventsSection';

