import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import type { EventsTabProps } from '../types';
import type { EventType } from '@/lib/supabase-types';

export const EventsTab = ({ events, imams, onOpenDialog, onDelete }: EventsTabProps) => {
  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case 'birthday':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'death':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'martyrdom':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    }
  };

  const getEventTypeLabel = (type: EventType) => {
    switch (type) {
      case 'birthday':
        return 'Birthday';
      case 'death':
        return 'Death';
      case 'martyrdom':
        return 'Martyrdom';
      default:
        return 'Other';
    }
  };

  return (
    <TabsContent value="events" className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => onOpenDialog()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Add Event</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="grid gap-3">
        {events.map((event) => {
          const imam = imams.find(i => i.id === event.imam_id);
          const eventDate = new Date(event.event_date);
          const formattedDate = eventDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Extract Hijri date from description
          const hijriMatch = event.description?.match(/Hijri:\s*(.+)/i);
          const hijriDate = hijriMatch ? hijriMatch[1].trim() : '';

          return (
            <div
              key={event.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{event.event_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getEventTypeColor(event.event_type)}`}>
                    {getEventTypeLabel(event.event_type)}
                  </span>
                  {event.is_annual && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Annual
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {formattedDate}
                    {hijriDate && ` • ${hijriDate}`}
                  </p>
                  {imam && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {imam.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenDialog(event)}
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete('event', event.id)}
                  className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No events yet. Add your first event!</p>
          </div>
        )}
      </div>
    </TabsContent>
  );
};

