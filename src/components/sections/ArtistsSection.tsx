import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getProxiedImageUrl } from '@/lib/utils';

interface Artist {
  name: string;
  count: number;
  image_url: string | null;
}

interface ArtistsSectionProps {
  artists: Artist[];
}

export function ArtistsSection({ artists }: ArtistsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [artists]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.7;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (artists.length === 0) return null;

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

  return (
    <section className="py-12 sm:py-14 md:py-16">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Browse by Artists</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Discover recitations by your favorite artists</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 scrollbar-hide snap-x snap-mandatory touch-pan-x"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        <div className="flex gap-4 sm:gap-5 md:gap-6 min-w-max pb-2">
          {artists.map((artist, i) => {
            const colorIndex = artist.name.charCodeAt(0) % colors.length;
            const gradient = colors[colorIndex];

            return (
              <Link
                key={artist.name}
                to={`/artist/${encodeURIComponent(artist.name)}`}
                className="group flex flex-col items-center transition-all duration-300 animate-slide-up opacity-0 flex-shrink-0 snap-start"
                title={`Browse recitations by ${artist.name}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Avatar */}
                <div className="relative mb-2">
                  <Avatar className="w-16 h-16 group-hover:scale-110 transition-transform duration-300">
                    {artist.image_url ? (
                      <img
                        src={getProxiedImageUrl(artist.image_url) ?? artist.image_url}
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
  );
}
