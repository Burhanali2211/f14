import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Cake, Heart, Flame, Info, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { AhlulBaitEvent, EventType } from '@/lib/supabase-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CalendarPage() {
  const [events, setEvents] = useState<Array<AhlulBaitEvent & { nextOccurrence: Date; daysUntil: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    fetchAllEvents();
  }, []);

  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('ahlul_bait_events')
          .select(`
            *,
            imam:imams(*)
          `)
          .eq('is_annual', true)
          .order('event_date', { ascending: true })
      );

      if (error) {
        logger.error('Error fetching events:', error);
      } else if (data) {
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
          .filter((event: any) => event.daysUntil >= 0)
          .sort((a: any, b: any) => a.daysUntil - b.daysUntil);
        
        setEvents(eventsWithNextOccurrence);
      }
    } catch (error) {
      logger.error('Unexpected error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: EventType) => {
    switch (eventType) {
      case 'birthday':
        return <Cake className="w-4 h-4" />;
      case 'death':
        return <Heart className="w-4 h-4" />;
      case 'martyrdom':
        return <Flame className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
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
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      weekday: 'long'
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getDaysUntilText = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
    return `In ${Math.floor(days / 30)} months`;
  };

  const filteredEvents = events.filter(event => {
    if (filterType !== 'all' && event.event_type !== filterType) return false;
    if (viewMode === 'calendar') {
      return event.nextOccurrence.getMonth() === selectedMonth && 
             event.nextOccurrence.getFullYear() === selectedYear;
    }
    return true;
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading events...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Islamic Events Calendar</h1>
              <p className="text-muted-foreground">Important dates of Ahlul Bait (AS)</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar')} className="w-full">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | 'all')}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="birthday">Birthdays</SelectItem>
              <SelectItem value="martyrdom">Martyrdom</SelectItem>
              <SelectItem value="death">Death Anniversaries</SelectItem>
              <SelectItem value="other">Other Events</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No events found for the selected filter.</p>
                </CardContent>
              </Card>
            ) : (
              filteredEvents.map((event) => (
                <Card 
                  key={event.id} 
                  className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-elevated ${getEventColor(event.event_type)}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${getEventColor(event.event_type)}`}>
                          {getEventIcon(event.event_type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-foreground mb-1">
                            {event.event_name}
                          </h3>
                          {event.imam && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.imam.name}
                              {event.imam.title && ` - ${event.imam.title}`}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{formatDate(event.nextOccurrence)}</span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-background/50">
                          {getDaysUntilText(event.daysUntil)}
                        </span>
                        {event.imam && (
                          <Button 
                            asChild 
                            variant="outline" 
                            size="sm"
                          >
                            <Link to={`/figure/${event.imam.slug}`}>
                              View Recitations
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-2xl font-bold text-foreground">
                {months[selectedMonth]} {selectedYear}
              </h2>
              <Button variant="outline" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEvents
                .filter(event => 
                  event.nextOccurrence.getMonth() === selectedMonth && 
                  event.nextOccurrence.getFullYear() === selectedYear
                )
                .map((event) => (
                    <Card 
                      key={event.id} 
                      className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-elevated ${getEventColor(event.event_type)}`}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg ${getEventColor(event.event_type)}`}>
                            {getEventIcon(event.event_type)}
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-background/50">
                            {formatShortDate(event.nextOccurrence)}
                          </span>
                        </div>
                        <CardTitle className="text-base mt-2">{event.event_name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {event.imam && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {event.imam.name}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {getDaysUntilText(event.daysUntil)}
                          </span>
                          {event.imam && (
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/figure/${event.imam.slug}`}>
                                View
                              </Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              {filteredEvents.filter(e => 
                e.nextOccurrence.getMonth() === selectedMonth && 
                e.nextOccurrence.getFullYear() === selectedYear
              ).length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No events in {months[selectedMonth]} {selectedYear}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}