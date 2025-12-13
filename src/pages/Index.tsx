import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, ArrowRight, TrendingUp, Clock, Star, History, Heart, Users, Mic, Cake, Flame, Info, Calendar, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CategoryCard } from '@/components/CategoryCard';
import { PieceCard } from '@/components/PieceCard';
import { SearchBar } from '@/components/SearchBar';
import { UpcomingEvents } from '@/components/UpcomingEvents';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/use-favorites';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { toast } from '@/hooks/use-toast';
import type { Category, Piece, Imam, AhlulBaitEvent, SiteSettings } from '@/lib/supabase-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Index() {
  const { role, loading: roleLoading } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [searchResults, setSearchResults] = useState<Piece[]>([]);
  const [recentPieces, setRecentPieces] = useState<Piece[]>([]);
  const [popularPieces, setPopularPieces] = useState<Piece[]>([]);
  const [continueReadingPieces, setContinueReadingPieces] = useState<Piece[]>([]);
  const [favoritePieces, setFavoritePieces] = useState<Piece[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ categories: 0, pieces: 0 });
  const [artists, setArtists] = useState<Array<{ name: string; count: number; image_url: string | null }>>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [imageIsDark, setImageIsDark] = useState<boolean | null>(null);
  const { favorites } = useFavorites();
  const { getRecentlyRead } = useReadingProgress();
  
  // Helper function to get gradient styles based on preset
  const getGradientStyles = (preset: string, opacity: number = 1.0) => {
    const baseOpacity = opacity;
    switch (preset) {
      case 'emerald':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(162 70% 24% / ${baseOpacity * 0.15}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(160 55% 35% / ${baseOpacity * 0.1}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(162 70% 24% / ${baseOpacity * 0.08}), transparent)
        `;
      case 'gold':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(38 90% 50% / ${baseOpacity * 0.15}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(40 75% 62% / ${baseOpacity * 0.1}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(36 85% 40% / ${baseOpacity * 0.08}), transparent)
        `;
      case 'purple':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(270 70% 50% / ${baseOpacity * 0.15}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(280 60% 55% / ${baseOpacity * 0.1}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(260 75% 45% / ${baseOpacity * 0.08}), transparent)
        `;
      case 'blue':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(210 70% 50% / ${baseOpacity * 0.15}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(200 60% 55% / ${baseOpacity * 0.1}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(220 75% 45% / ${baseOpacity * 0.08}), transparent)
        `;
      case 'minimal':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(0 0% 0% / ${baseOpacity * 0.05}), transparent)
        `;
      case 'none':
        return 'none';
      case 'default':
      default:
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(var(--primary) / ${baseOpacity * 0.12}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(var(--accent) / ${baseOpacity * 0.08}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(var(--primary) / ${baseOpacity * 0.05}), transparent)
        `;
    }
  };
  
  // Auto-detect image brightness for text color
  useEffect(() => {
    if (siteSettings?.hero_image_url && siteSettings.hero_text_color_mode === 'auto') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let brightness = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              brightness += (r * 299 + g * 587 + b * 114) / 1000;
            }
            brightness = brightness / (data.length / 4);
            setImageIsDark(brightness < 128);
          }
        } catch (e) {
          setImageIsDark(false);
        }
      };
      img.onerror = () => setImageIsDark(false);
      img.src = siteSettings.hero_image_url;
    } else {
      setImageIsDark(null);
    }
  }, [siteSettings?.hero_image_url, siteSettings?.hero_text_color_mode]);
  
  // Determine text color class based on mode
  const getTextColorClass = () => {
    if (siteSettings?.hero_text_color_mode === 'auto') {
      return imageIsDark ? 'text-white' : 'text-foreground';
    }
    return siteSettings?.hero_text_color_mode === 'light' ? 'text-white' : 'text-foreground';
  };

  const showUpcomingEventToast = async () => {
    try {
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

          const getEventIcon = (eventType: string) => {
            switch (eventType) {
              case 'birthday':
                return <Cake className="w-5 h-5" />;
              case 'death':
                return <Heart className="w-5 h-5" />;
              case 'martyrdom':
                return <Flame className="w-5 h-5" />;
              default:
                return <Info className="w-5 h-5" />;
            }
          };

          const getEventTypeLabel = (eventType: string) => {
            switch (eventType) {
              case 'birthday':
                return 'Birthday';
              case 'death':
                return 'Death Anniversary';
              case 'martyrdom':
                return 'Martyrdom';
              default:
                return 'Event';
            }
          };

          const getCelebratoryMessage = (eventType: string, daysUntil: number, imamName: string) => {
            if (eventType === 'birthday') {
              if (daysUntil === 0) {
                return `🕊️ Today, the heavens rejoice as we honor the blessed birth of ${imamName}. May their light guide your heart and fill your soul with peace. ✨`;
              } else if (daysUntil === 1) {
                return `🌙 Tomorrow, we gather in remembrance of the blessed birth of ${imamName}. Prepare your heart to receive the divine blessings that flow on this sacred day. 💫`;
              } else if (daysUntil <= 7) {
                return `🌟 In ${daysUntil} days, we will celebrate the blessed birth of ${imamName}. A time of spiritual renewal, reflection, and connection with the divine awaits your heart. 🕊️`;
              } else {
                return `📿 The blessed birth of ${imamName} approaches. A sacred moment to draw closer, to reflect, and to seek the blessings that flow from this holy remembrance. ✨`;
              }
            } else if (eventType === 'martyrdom') {
              if (daysUntil === 0) {
                return `🕊️ Today we remember the martyrdom of ${imamName}. May their sacrifice inspire us. 💔`;
              } else if (daysUntil <= 7) {
                return `🕯️ In ${daysUntil} days, we commemorate the martyrdom of ${imamName}. A time for reflection and remembrance. 🌹`;
              } else {
                return `📿 Coming soon: We'll remember the martyrdom of ${imamName}. A moment to reflect on their sacrifice. 🕊️`;
              }
            } else {
              if (daysUntil === 0) {
                return `🌟 Today we honor ${imamName}. May their memory be a source of guidance. ✨`;
              } else {
                return `📅 In ${daysUntil} days, we'll honor ${imamName}. A special time to remember and reflect. 💚`;
              }
            }
          };

          // Check if toast was already shown today
          const lastShownDate = localStorage.getItem('upcomingEventToastDate');
          const todayStr = today.toDateString();
          
          if (lastShownDate !== todayStr) {
            // Show toast after a short delay for better UX
            setTimeout(() => {
              const celebratoryMessage = getCelebratoryMessage(
                nextEvent.event_type,
                nextEvent.daysUntil,
                nextEvent.imam?.name || 'Ahlul Bait'
              );

              toast({
                title: (
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 w-full min-w-0">
                    <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 ${
                      nextEvent.event_type === 'birthday' ? 'bg-gradient-to-br from-sky-400/30 to-emerald-400/30 dark:from-cyan-500/40 dark:to-emerald-500/40 text-sky-700 dark:text-cyan-300 shadow-sm' :
                      nextEvent.event_type === 'martyrdom' ? 'bg-purple-500/20 dark:bg-purple-500/30 text-purple-700 dark:text-purple-400' :
                      nextEvent.event_type === 'death' ? 'bg-slate-500/20 dark:bg-slate-500/30 text-slate-700 dark:text-slate-400' :
                      'bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {getEventIcon(nextEvent.event_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm sm:text-base text-foreground leading-tight">
                        {nextEvent.event_name}
                      </div>
                      {nextEvent.imam && (
                        <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                          {nextEvent.imam.name}
                          {nextEvent.imam.title && ` - ${nextEvent.imam.title}`}
                        </div>
                      )}
                    </div>
                  </div>
                ),
                description: (
                  <div className="space-y-2 sm:space-y-2 mt-2">
                    <p className="text-xs sm:text-sm leading-relaxed font-medium text-foreground">
                      {celebratoryMessage}
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pt-2 border-t border-border/30">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                        <span className="break-words">{formatDate(eventThisYear)}</span>
                      </div>
                      <div className={`px-2.5 sm:px-3 py-1 rounded-full font-semibold text-xs whitespace-nowrap ${
                        nextEvent.event_type === 'birthday' ? 'bg-gradient-to-r from-sky-400/25 to-emerald-400/25 dark:from-cyan-500/35 dark:to-emerald-500/35 text-sky-700 dark:text-cyan-300 border border-sky-300/30 dark:border-cyan-400/30' :
                        nextEvent.event_type === 'martyrdom' ? 'bg-purple-500/20 dark:bg-purple-500/30 text-purple-700 dark:text-purple-400' :
                        nextEvent.event_type === 'death' ? 'bg-slate-500/20 dark:bg-slate-500/30 text-slate-700 dark:text-slate-400' :
                        'bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {getDaysUntilText(nextEvent.daysUntil)}
                      </div>
                    </div>
                  </div>
                ),
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
            }, 1500); // Show after 1.5 seconds
          }
        }
      }
    } catch (error) {
      logger.error('Unexpected error showing upcoming event toast:', error);
    }
  };

  useEffect(() => {
    // Wait for role loading to complete before fetching data
    // This prevents race conditions after page refresh
    if (!roleLoading) {
      fetchData();
      showUpcomingEventToast();
    }
  }, [roleLoading]);

  // Fetch continue reading and favorite pieces when data is available
  useEffect(() => {
    const fetchContinueReading = async () => {
      const recentlyRead = getRecentlyRead(4);
      if (recentlyRead.length > 0) {
        const pieceIds = recentlyRead.map(r => r.pieceId);
        const { data, error } = await safeQuery(async () =>
          await supabase
            .from('pieces')
            .select('*')
            .in('id', pieceIds)
        );
        if (error) {
          logger.error('Error fetching continue reading:', error);
        } else if (data) {
          setContinueReadingPieces(data as Piece[]);
        }
      }
    };

    const fetchFavorites = async () => {
      if (favorites.length > 0) {
        const { data, error } = await safeQuery(async () =>
          await supabase
            .from('pieces')
            .select('*')
            .in('id', favorites.slice(0, 4))
        );
        if (error) {
          logger.error('Error fetching favorites:', error);
        } else if (data) {
          setFavoritePieces(data as Piece[]);
        }
      }
    };

    fetchContinueReading();
    fetchFavorites();
  }, [favorites, getRecentlyRead]);


  const fetchData = async () => {
    logger.debug('Index: Starting fetchData');
    try {
      logger.debug('Index: Executing queries');
      const [catRes, recentRes, popularRes, imamRes, artistsRes, siteSettingsRes] = await Promise.all([
        safeQuery(async () => await supabase.from('categories').select('*').order('name')),
        safeQuery(async () => await supabase.from('pieces').select('*').order('created_at', { ascending: false }).limit(6)),
        safeQuery(async () => await supabase.from('pieces').select('*').order('view_count', { ascending: false }).limit(4)),
        safeQuery(async () => await supabase.from('imams').select('*').order('order_index, name')),
        safeQuery(async () => await supabase.from('pieces').select('reciter').not('reciter', 'is', null)),
        safeQuery(async () => await supabase.from('site_settings').select('*').eq('id', '00000000-0000-0000-0000-000000000000').maybeSingle()),
      ]);
      
      logger.debug('Index: Queries completed', {
        categories: { hasData: !!catRes.data, hasError: !!catRes.error, count: catRes.data?.length },
        recent: { hasData: !!recentRes.data, hasError: !!recentRes.error, count: recentRes.data?.length },
        popular: { hasData: !!popularRes.data, hasError: !!popularRes.error, count: popularRes.data?.length },
        imams: { hasData: !!imamRes.data, hasError: !!imamRes.error, count: imamRes.data?.length },
      });

      if (catRes.error) {
        logger.error('Error fetching categories:', catRes.error);
      } else if (catRes.data) {
        setCategories(catRes.data as Category[]);
        setStats(prev => ({ ...prev, categories: catRes.data!.length }));
      }

      if (recentRes.error) {
        logger.error('Error fetching recent pieces:', recentRes.error);
      } else if (recentRes.data) {
        setRecentPieces(recentRes.data as Piece[]);
        setStats(prev => ({ ...prev, pieces: recentRes.data!.length }));
      }

      if (popularRes.error) {
        logger.error('Error fetching popular pieces:', popularRes.error);
      } else if (popularRes.data) {
        setPopularPieces(popularRes.data as Piece[]);
      }

      if (imamRes.error) {
        logger.error('Error fetching imams:', imamRes.error);
      } else if (imamRes.data) {
        setImams(imamRes.data as Imam[]);
      }

      // Process artists/reciters - get all unique reciters from pieces (source of truth)
      // Database triggers automatically sync to artistes table
      if (artistsRes.error) {
        logger.error('Error fetching artists:', artistsRes.error);
      } else if (artistsRes.data) {
        // Count pieces per reciter (from pieces table - this is the source of truth)
        const reciterCounts = new Map<string, number>();
        artistsRes.data.forEach((piece: any) => {
          if (piece.reciter && piece.reciter.trim() !== '') {
            reciterCounts.set(piece.reciter, (reciterCounts.get(piece.reciter) || 0) + 1);
          }
        });
        
        // Get all unique reciter names
        const uniqueReciters = Array.from(reciterCounts.keys());
        
        // Fetch artistes with images (triggers ensure they exist)
        const artistesRes = await safeQuery(async () => 
          await (supabase as any).from('artistes').select('name, image_url').in('name', uniqueReciters)
        );
        
        // Get artiste data for images
        const artistesMap = new Map<string, { image_url: string | null }>();
        if (artistesRes.data) {
          (artistesRes.data as any[]).forEach((artiste: any) => {
            artistesMap.set(artiste.name, { image_url: artiste.image_url });
          });
        }
        
        // Convert to array and sort by count (descending)
        // Show all artists who have recitations
        const artistsArray = Array.from(reciterCounts.entries())
          .map(([name, count]) => ({ 
            name, 
            count,
            image_url: artistesMap.get(name)?.image_url || null
          }))
          .sort((a, b) => b.count - a.count);
        
        setArtists(artistsArray);
      }

      if (siteSettingsRes.error) {
        logger.error('Error fetching site settings:', siteSettingsRes.error);
      } else if (siteSettingsRes.data) {
        setSiteSettings(siteSettingsRes.data as SiteSettings);
      }
    } catch (error) {
      logger.error('Unexpected error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    // Check rate limit
    if (!checkRateLimit(RATE_LIMITS.search, (remaining, resetTime) => {
      toast({
        title: 'Too many searches',
        description: `Please wait ${Math.ceil(resetTime / 1000)} seconds before searching again.`,
        variant: 'destructive',
      });
    })) {
      return;
    }

    setIsSearching(true);
    
    try {
      // Escape special characters in query for Supabase ilike pattern
      // Replace % and _ with escaped versions, and escape backslashes
      const escapedQuery = query.trim().replace(/[%_\\]/g, (match) => {
        if (match === '\\') return '\\\\';
        return '\\' + match;
      });
      
      // Build the search pattern with wildcards for ilike
      const searchPattern = `%${escapedQuery}%`;
      
      // Use proper Supabase .or() syntax: column.operator.value,column.operator.value
      // The format is: column1.operator.value,column2.operator.value
      const { data, error } = await safeQuery(async () => {
        return await supabase
          .from('pieces')
          .select('*')
          .or(`title.ilike.${searchPattern},text_content.ilike.${searchPattern},reciter.ilike.${searchPattern}`)
          .limit(20)
          .order('view_count', { ascending: false });
      });

      if (error) {
        // If .or() fails, try alternative approach with separate queries
        logger.warn('Primary search failed, trying alternative method:', error);
        
        const [titleRes, contentRes, reciterRes] = await Promise.all([
          safeQuery(async () => 
            await supabase
              .from('pieces')
              .select('*')
              .ilike('title', searchPattern)
              .limit(20)
          ),
          safeQuery(async () => 
            await supabase
              .from('pieces')
              .select('*')
              .ilike('text_content', searchPattern)
              .limit(20)
          ),
          safeQuery(async () => 
            await supabase
              .from('pieces')
              .select('*')
              .ilike('reciter', searchPattern)
              .limit(20)
          ),
        ]);

        // Combine results and remove duplicates
        const allResults = [
          ...(titleRes.data || []),
          ...(contentRes.data || []),
          ...(reciterRes.data || []),
        ];
        
        const uniqueResults = Array.from(
          new Map(allResults.map(piece => [piece.id, piece])).values()
        ).slice(0, 20);
        
        setSearchResults(uniqueResults as Piece[]);
        setIsSearching(false);
        return;
      }

      if (data) {
        setSearchResults(data as Piece[]);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      logger.error('Unexpected error in search:', err);
      toast({
        title: 'Search Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section 
        className={`relative overflow-hidden ${siteSettings?.hero_image_url ? '' : 'hero-pattern'}`}
        style={siteSettings?.hero_image_url && siteSettings.hero_gradient_preset !== 'none' ? {
          backgroundImage: getGradientStyles(siteSettings.hero_gradient_preset || 'default', siteSettings.hero_gradient_opacity ?? 1.0),
          backgroundSize: siteSettings.hero_gradient_preset === 'minimal' ? 'cover' : 'cover, cover, cover',
          backgroundPosition: 'center, center, center',
          backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
        } : siteSettings?.hero_image_url ? {} : undefined}
      >
        {/* Hero Background Image with opacity control */}
        {siteSettings?.hero_image_url && (
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${siteSettings.hero_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: siteSettings.hero_image_opacity ?? 1.0,
            }}
          />
        )}
        <div className="container pt-8 pb-16 md:py-24 relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className={`text-center max-w-4xl mx-auto animate-fade-in ${getTextColorClass()}`}>
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 shadow-soft text-sm mb-8 ${
              getTextColorClass().includes('white') ? 'bg-black/30 backdrop-blur-sm' : 'bg-card'
            }`}>
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className={getTextColorClass().includes('white') ? 'text-white/90' : 'text-muted-foreground'}>
                {siteSettings?.hero_badge_text || 'Your Spiritual Companion'}
              </span>
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            
            {/* Heading */}
            <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${getTextColorClass()}`}>
              {siteSettings?.hero_heading_line1 || 'Discover the Beauty of'}
              <span className="block text-gradient mt-2">
                {siteSettings?.hero_heading_line2 || 'islamic poetry'}
              </span>
            </h1>
            
            {/* Description */}
            <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${
              getTextColorClass().includes('white') ? 'text-white/90' : 'text-muted-foreground'
            }`}>
              {siteSettings?.hero_description || 'Explore Naat, Manqabat, Noha, Dua, Marsiya, and more. Read, listen, and connect with your spiritual heritage.'}
            </p>

            {/* Search */}
            <div className="mb-12">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search for Naat, Noha, Dua, reciter..."
                isLoading={isSearching}
                searchResults={searchResults}
                searchQuery={searchQuery}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 md:gap-12">
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gradient">{stats.categories}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gradient-gold">{recentPieces.length}+</p>
                <p className="text-sm text-muted-foreground">Recitations</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-gradient">∞</p>
                <p className="text-sm text-muted-foreground">Blessings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </section>

      <main className="container pb-20">
        {/* Upcoming Events Section */}
        <UpcomingEvents />

        {/* Main Content */}
        {!searchQuery.trim() && (
          <>
            {/* Categories Section */}
            <section className="py-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Browse Categories
                  </h2>
                  <p className="text-muted-foreground">Explore our collection of Islamic content</p>
                </div>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {categories.map((category, i) => (
                    <CategoryCard key={category.id} category={category} index={i} />
                  ))}
                </div>
              )}
            </section>

            {/* Browse by Ahlulbayt */}
            {imams.length > 0 && (
              <section className="py-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Browse by Ahlulbayt (AS)</h2>
                      <p className="text-sm text-muted-foreground">Recitations in honor of the Holy Personalities</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imams.slice(0, 8).map((imam, i) => (
                    <Link
                      key={imam.id}
                      to={`/figure/${imam.slug}`}
                      className="group p-4 rounded-xl bg-card hover:bg-secondary/50 transition-all duration-300 animate-slide-up opacity-0 text-center"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary group-hover:scale-105 transition-all duration-300">
                        <Users className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {imam.name}
                      </h3>
                      {(imam.description || imam.title) && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{imam.description || imam.title}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Browse by Artists */}
            {artists.length > 0 && (
              <section className="py-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Browse by Artists</h2>
                      <p className="text-sm text-muted-foreground">Discover recitations by your favorite artists</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 scrollbar-hide"
                  style={{
                    touchAction: 'pan-x pan-y',
                    maxWidth: '100%',
                    contain: 'layout style'
                  }}
                >
                  <div className="flex gap-6 min-w-max pb-2">
                    {artists.map((artist, i) => {
                      // Generate initials from name
                      const getInitials = (name: string) => {
                        const words = name.trim().split(/\s+/);
                        if (words.length >= 2) {
                          return (words[0][0] + words[words.length - 1][0]).toUpperCase();
                        }
                        return name.substring(0, 2).toUpperCase();
                      };

                      // Generate gradient color based on name
                      const colors = [
                        'from-primary to-accent',
                        'from-purple-500 to-pink-500',
                        'from-blue-500 to-cyan-500',
                        'from-emerald-500 to-teal-500',
                        'from-amber-500 to-orange-500',
                        'from-rose-500 to-pink-500',
                      ];
                      const colorIndex = artist.name.charCodeAt(0) % colors.length;
                      const gradient = colors[colorIndex];

                      return (
                        <Link
                          key={artist.name}
                          to={`/artist/${encodeURIComponent(artist.name)}`}
                          className="group flex flex-col items-center transition-all duration-300 animate-slide-up opacity-0 flex-shrink-0"
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          {/* Avatar */}
                          <div className="relative mb-2">
                            <Avatar className="w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                              {artist.image_url ? (
                                <img
                                  src={artist.image_url}
                                  alt={artist.name}
                                  className="w-full h-full object-cover rounded-full"
                                  loading="lazy"
                                />
                              ) : (
                                <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-bold text-lg`}>
                                  {getInitials(artist.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </div>
                          
                          {/* Name Text - Bottom of Avatar */}
                          <div className="text-xs font-semibold text-foreground text-center whitespace-nowrap max-w-[80px] truncate">
                            {artist.name}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Continue Reading */}
            {continueReadingPieces.length > 0 && (
              <section className="py-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <History className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Continue Reading</h2>
                      <p className="text-sm text-muted-foreground">Pick up where you left off</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-5">
                  {continueReadingPieces.map((piece, i) => (
                    <PieceCard key={piece.id} piece={piece} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Your Favorites */}
            {favoritePieces.length > 0 && (
              <section className="py-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Your Favorites</h2>
                      <p className="text-sm text-muted-foreground">Recitations you've saved</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/favorites">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-5">
                  {favoritePieces.map((piece, i) => (
                    <PieceCard key={piece.id} piece={piece} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Popular Pieces */}
            {popularPieces.length > 0 && (
              <section className="py-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Most Popular</h2>
                      <p className="text-sm text-muted-foreground">Top viewed recitations</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-5">
                  {popularPieces.map((piece, i) => (
                    <PieceCard key={piece.id} piece={piece} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Pieces */}
            {recentPieces.length > 0 && (
              <section className="py-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Recently Added</h2>
                      <p className="text-sm text-muted-foreground">Latest additions to our collection</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {recentPieces.map((piece, i) => (
                    <PieceCard key={piece.id} piece={piece} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* CTA Section */}
            <section className="py-12">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-emerald-light p-8 md:p-12">
                <div className="relative z-10 text-center">
                  <Star className="w-12 h-12 text-primary-foreground/80 mx-auto mb-4" />
                  <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
                    Contribute to Our Collection
                  </h2>
                  <p className="text-primary-foreground/80 max-w-xl mx-auto mb-6">
                    Help preserve and share islamic poetry. Add your favorite recitations to our growing library.
                  </p>
                  <Button asChild size="lg" className="rounded-xl bg-card text-foreground hover:bg-card/90 shadow-elevated">
                    <Link to="/auth">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
