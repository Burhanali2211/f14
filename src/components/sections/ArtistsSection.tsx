import { Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Artist {
  name: string;
  count: number;
  image_url: string | null;
}

interface ArtistsSectionProps {
  artists: Artist[];
}

export function ArtistsSection({ artists }: ArtistsSectionProps) {
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
  );
}
