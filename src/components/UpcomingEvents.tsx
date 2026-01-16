import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Cake, Heart, Flame, Info, ChevronRight, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { AhlulBaitEvent, EventType } from '@/lib/supabase-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function UpcomingEvents() {
  const [upcomingEvents, setUpcomingEvents] = useState<AhlulBaitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<(AhlulBaitEvent & { nextOccurrence: Date; daysUntil: number }) | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Fetch all annual events
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('ahlul_bait_events')
          .select(`
            *,
            imam:imams(*)
          `)
          .eq('is_annual', true)
      );

      if (error) {
        logger.error('Error fetching upcoming events:', error);
      } else if (data) {
        // For annual events, calculate the next occurrence based on month/day
        const eventsWithNextOccurrence = data
          .map((event: any) => {
            const eventDate = new Date(event.event_date);
            const currentYear = today.getFullYear();
            
            // Create date for this year using the month and day from the stored date
            let eventThisYear = new Date(currentYear, eventDate.getMonth(), eventDate.getDate());
            
            // If the date has passed this year, use next year
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
          .filter((event: any) => event.daysUntil >= 0 && event.daysUntil <= 90) // Show events within next 90 days
          .sort((a: any, b: any) => a.daysUntil - b.daysUntil); // Show all upcoming events
        
        setUpcomingEvents(eventsWithNextOccurrence as AhlulBaitEvent[]);
      }
    } catch (error) {
      logger.error('Unexpected error fetching upcoming events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: EventType, size: 'sm' | 'md' = 'md') => {
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    switch (eventType) {
      case 'birthday':
        return <Cake className={iconSize} />;
      case 'death':
        return <Heart className={iconSize} />;
      case 'martyrdom':
        return <Flame className={iconSize} />;
      default:
        return <Info className={iconSize} />;
    }
  };

  const getEventColor = (eventType: EventType) => {
    switch (eventType) {
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilText = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  if (loading) {
    return (
      <section className="py-8">
        <div className="container">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
              <p className="text-sm text-muted-foreground">Important dates of Ahlul Bait (AS)</p>
            </div>
          </div>
          <div 
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory cursor-grab"
            style={{ 
              touchAction: 'pan-x pan-y',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              scrollPaddingLeft: '1rem',
              scrollPaddingRight: '1rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              maxWidth: '100%',
              contain: 'layout style paint',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
            onWheel={(e) => {
              // Detect scroll direction
              const deltaY = Math.abs(e.deltaY);
              const deltaX = Math.abs(e.deltaX);
              
              // If user is scrolling primarily vertically, allow page to scroll
              if (deltaY > deltaX) {
                return; // Allow page scroll
              }
              
              // For horizontal scrolling, let the browser handle it naturally
            }}
          >
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 w-64 flex-shrink-0 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Upcoming Events</h2>
              <p className="text-sm text-muted-foreground">Important dates of Ahlul Bait (AS)</p>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/calendar">
              View Full Calendar
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div 
          ref={scrollContainerRef}
          className={`flex gap-3 overflow-x-auto pb-2 scrollbar-hide select-none ${
            isDragging ? '' : 'snap-x snap-mandatory'
          } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ 
            WebkitUserSelect: 'none',
            userSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            touchAction: 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: isDragging ? 'auto' : 'smooth',
            scrollPaddingLeft: '1rem',
            scrollPaddingRight: '1rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            maxWidth: '100%',
            contain: 'layout style paint'
          }}
          onWheel={(e) => {
            // Detect scroll direction
            const deltaY = Math.abs(e.deltaY);
            const deltaX = Math.abs(e.deltaX);
            
            // If user is scrolling primarily vertically, allow page to scroll
            if (deltaY > deltaX) {
              const container = scrollContainerRef.current;
              
              // Check if horizontal container is at scroll boundaries
              if (container) {
                const isAtLeft = container.scrollLeft <= 1;
                const isAtRight = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
                
                // If at boundaries or clearly vertical scroll, don't interfere
                if (isAtLeft || isAtRight || deltaY > deltaX * 2) {
                  return; // Allow page scroll
                }
              } else {
                return; // Allow page scroll if container not ready
              }
            }
            
            // For horizontal scrolling, let the browser handle it naturally
            // The container will scroll horizontally, and if it can't, the event will bubble
          }}
          onMouseDown={(e) => {
            // Don't start drag if clicking on a button or link
            if ((e.target as HTMLElement).closest('button, a')) {
              return;
            }

            e.preventDefault(); // Prevent text selection immediately
            const element = e.currentTarget;
            const startX = e.clientX; // Use clientX for more accurate tracking
            const startScrollLeft = element.scrollLeft;
            let isDown = true;
            let hasMoved = false;
            let lastX = startX;

            // Add dragging state immediately
            isDraggingRef.current = true;
            setIsDragging(true);
            element.style.cursor = 'grabbing';
            element.style.scrollBehavior = 'auto'; // Disable smooth scroll during drag
            element.style.scrollSnapType = 'none'; // Disable snap during drag

            const handleMouseMove = (e: MouseEvent) => {
              if (!isDown || !element) return;
              
              const currentX = e.clientX;
              const deltaX = currentX - lastX; // Calculate relative movement
              
              // Mark as moved if we've moved more than 1px
              if (Math.abs(deltaX) > 1) {
                hasMoved = true;
              }
              
              // Always prevent default to stop text selection and smooth scrolling
              e.preventDefault();
              e.stopPropagation();
              
              // Update scroll position smoothly following mouse movement
              // Use relative movement for smoother tracking
              element.scrollLeft -= deltaX;
              
              // Update last position for next move
              lastX = currentX;
            };

            const handleMouseUp = (e: MouseEvent) => {
              isDown = false;
              isDraggingRef.current = false;
              setIsDragging(false);
              element.style.cursor = 'grab';
              element.style.scrollBehavior = 'smooth'; // Re-enable smooth scroll
              element.style.scrollSnapType = ''; // Re-enable snap
              
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              document.removeEventListener('mouseleave', handleMouseUp);
              
              // Prevent click if we dragged
              if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
              }
            };

            // Also handle mouse leave to clean up
            const handleMouseLeave = () => {
              if (isDown) {
                handleMouseUp(new MouseEvent('mouseup'));
              }
            };

            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mouseleave', handleMouseLeave);
            
            // Prevent text selection globally during drag
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            
            const cleanupSelection = () => {
              document.body.style.userSelect = '';
              document.body.style.webkitUserSelect = '';
            };
            
            document.addEventListener('mouseup', cleanupSelection, { once: true });
          }}
          onDragStart={(e) => {
            // Prevent default drag behavior
            e.preventDefault();
            return false;
          }}
        >
          {upcomingEvents.map((event, index) => {
            const eventDate = new Date(event.event_date);
            const currentYear = new Date().getFullYear();
            let eventThisYear = new Date(currentYear, eventDate.getMonth(), eventDate.getDate());
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (eventThisYear < today) {
              eventThisYear = new Date(currentYear + 1, eventDate.getMonth(), eventDate.getDate());
            }
            
            const daysUntil = Math.ceil((eventThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const eventWithDetails = { ...event, nextOccurrence: eventThisYear, daysUntil };

            return (
              <Card 
                key={event.id} 
                className={`flex-shrink-0 w-64 overflow-hidden border-2 select-none pointer-events-auto ${
                  isDragging ? '' : 'snap-start transition-all duration-300 hover:shadow-elevated'
                } ${getEventColor(event.event_type)}`}
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  pointerEvents: 'auto'
                }}
                onDragStart={(e) => {
                  e.preventDefault();
                  return false;
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${getEventColor(event.event_type)}`}>
                      {getEventIcon(event.event_type, 'sm')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-background/50">
                        {getDaysUntilText(daysUntil)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg pointer-events-auto"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(eventWithDetails);
                        }}
                        style={{ userSelect: 'auto' }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-bold text-foreground mb-1 line-clamp-1">
                    {event.event_name}
                  </h3>
                  
                  {event.imam && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {event.imam.name}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span className="line-clamp-1">{formatDate(eventThisYear)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Preview Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-3 rounded-xl ${selectedEvent ? getEventColor(selectedEvent.event_type) : ''}`}>
                  {selectedEvent && getEventIcon(selectedEvent.event_type)}
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-left">
                    {selectedEvent?.event_name}
                  </DialogTitle>
                  {selectedEvent?.imam && (
                    <DialogDescription className="text-left mt-1">
                      {selectedEvent.imam.name}
                      {selectedEvent.imam.title && ` - ${selectedEvent.imam.title}`}
                    </DialogDescription>
                  )}
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {selectedEvent && formatDate(selectedEvent.nextOccurrence)}
                </span>
                <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {selectedEvent && getDaysUntilText(selectedEvent.daysUntil)}
                </span>
              </div>
              
              {selectedEvent?.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.description}
                </p>
              )}
              
              {selectedEvent?.imam && (
                <Button 
                  asChild 
                  variant="outline" 
                  size="sm" 
                  className="w-full rounded-xl"
                >
                  <Link to={`/figure/${selectedEvent.imam.slug}`} onClick={() => setSelectedEvent(null)}>
                    View Recitations
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}