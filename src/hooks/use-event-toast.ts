import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';

/**
 * Hook to show upcoming event toast notification
 */
export function useEventToast() {
  const showUpcomingEventToast = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await safeQuery(async () =>
        await (supabase as any)
          .from('ahlul_bait_events')
          .select(`
            *,
            imam:imams(*)
          `)
          .eq('is_annual', true)
          .order('event_date', { ascending: true })
          .limit(10)
      );

      if (error) {
        logger.error('Error fetching upcoming event for toast:', error);
        return;
      }

      if (data && data.length > 0) {
        // Find the next upcoming event
        const eventsWithNextOccurrence = data
          .map((event: any) => {
            const eventDate = new Date(event.event_date);
            const currentYear = today.getFullYear();
            
            let eventThisYear = new Date(currentYear, eventDate.getMonth(), eventDate.getDate());
            
            if (eventThisYear < today) {
              eventThisYear = new Date(currentYear + 1, eventDate.getMonth(), eventDate.getDate());
            }
            
            const daysUntil = Math.ceil((eventThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            return {
              ...event,
              nextOccurrence: eventThisYear,
              daysUntil
            };
          })
          .filter((event: any) => event.daysUntil >= 0 && event.daysUntil <= 30) // Show events within next 30 days
          .sort((a: any, b: any) => a.daysUntil - b.daysUntil);

        if (eventsWithNextOccurrence.length > 0) {
          const nextEvent = eventsWithNextOccurrence[0];
          const eventDate = new Date(nextEvent.event_date);
          const currentYear = today.getFullYear();
          let eventThisYear = new Date(currentYear, eventDate.getMonth(), eventDate.getDate());
          
          if (eventThisYear < today) {
            eventThisYear = new Date(currentYear + 1, eventDate.getMonth(), eventDate.getDate());
          }

          const formatDate = (date: Date) => {
            return date.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            });
          };

          const getDaysUntilText = (days: number) => {
            if (days === 0) return 'Today';
            if (days === 1) return 'Tomorrow';
            return `In ${days} days`;
          };

          // Check if toast was already shown today
          const lastShownDate = localStorage.getItem('upcomingEventToastDate');
          const todayStr = today.toDateString();
          
          if (lastShownDate !== todayStr) {
            // Show toast after 1-2 minutes (random delay between 60-120 seconds)
            const delayMinutes = 1 + Math.random(); // Random between 1-2 minutes
            const delayMs = delayMinutes * 60 * 1000;
            
            setTimeout(() => {
              toast({
                title: nextEvent.event_name,
                description: `${nextEvent.imam ? nextEvent.imam.name + ' • ' : ''}${formatDate(eventThisYear)} • ${getDaysUntilText(nextEvent.daysUntil)}`,
                duration: Infinity,
                variant: (
                  nextEvent.event_type === 'birthday' ? 'birthday' : 
                  nextEvent.event_type === 'martyrdom' ? 'martyrdom' : 
                  nextEvent.event_type === 'death' ? 'death' : 
                  'celebration'
                ) as any,
                className: "animate-in slide-in-from-right-full",
              });

              // Store that we showed the toast today
              localStorage.setItem('upcomingEventToastDate', todayStr);
            }, delayMs);
          }
        }
      }
    } catch (error) {
      logger.error('Unexpected error showing upcoming event toast:', error);
    }
  };

  return { showUpcomingEventToast };
}
