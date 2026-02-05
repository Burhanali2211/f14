import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { getGradientStyles } from '@/hooks/use-hero-gradient';
import { useImageBrightness } from '@/hooks/use-image-brightness';
import { useTheme } from '@/hooks/use-theme';
import type { SiteSettings, Piece } from '@/lib/supabase-types';
import { getProxiedImageUrl } from '@/lib/utils';

interface HeroSectionProps {
  siteSettings: SiteSettings | null;
  stats: { categories: number; pieces: number };
  recentPiecesCount: number;
  searchQuery: string;
  searchResults: Piece[];
  isSearching: boolean;
  onSearch: (query: string) => void;
}

export function HeroSection({
  siteSettings,
  stats,
  recentPiecesCount,
  searchQuery,
  searchResults,
  isSearching,
  onSearch,
}: HeroSectionProps) {
  const { textColorClass: rawTextColorClass } = useImageBrightness(siteSettings);
  const { theme } = useTheme();

  // Memoize common values to avoid redundant calculations and re-renders
  const { textColorClass, isWhiteText, hasImage, heroGradientPreset } = useMemo(() => {
    return {
      textColorClass: rawTextColorClass,
      isWhiteText: rawTextColorClass.includes('white'),
      hasImage: !!siteSettings?.hero_image_url,
      heroGradientPreset: siteSettings?.hero_gradient_preset || 'default'
    };
  }, [rawTextColorClass, siteSettings?.hero_image_url, siteSettings?.hero_gradient_preset]);

  // Determine if we need a dark overlay for light mode
  const needsOverlay = theme === 'light' && (!hasImage || isWhiteText);
  
  const sectionStyles = useMemo(() => {
    if (hasImage && heroGradientPreset !== 'none') {
      return {
        backgroundImage: getGradientStyles(heroGradientPreset, siteSettings?.hero_gradient_opacity ?? 1.0),
        backgroundSize: heroGradientPreset === 'minimal' ? 'cover' : 'cover, cover, cover',
        backgroundPosition: 'center, center, center',
        backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
      };
    }
    return undefined;
  }, [hasImage, heroGradientPreset, siteSettings?.hero_gradient_opacity]);

  const bgImageStyles = useMemo(() => {
    if (!hasImage) return undefined;
    return {
      backgroundImage: `url(${getProxiedImageUrl(siteSettings?.hero_image_url) ?? siteSettings?.hero_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: siteSettings?.hero_image_opacity ?? 1.0,
    };
  }, [hasImage, siteSettings?.hero_image_url, siteSettings?.hero_image_opacity]);

  return (
    <section 
      className={`relative overflow-hidden ${hasImage ? '' : 'hero-pattern'} ${
        theme === 'light' && !hasImage ? 'bg-gradient-to-br from-background via-background/95 to-background/90' : ''
      }`}
      style={sectionStyles}
    >
      {/* Hero Background Image with opacity control */}
      {hasImage && (
        <div className="absolute inset-0 z-0" style={bgImageStyles} />
      )}
      
      {/* Light mode overlay for better text readability when image is present */}
      {needsOverlay && hasImage && (
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background/60 via-background/40 to-background/70 dark:hidden" />
      )}
      
      <div className="container pt-8 pb-16 md:pt-12 md:pb-20 lg:py-24 relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className={`text-center max-w-4xl mx-auto animate-fade-in px-4 sm:px-6 md:px-8 ${textColorClass}`}>
          {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-soft text-xs sm:text-sm mb-6 sm:mb-8 ${
              isWhiteText 
                ? 'bg-black/30 dark:bg-black/30 backdrop-blur-sm border-white/20' 
                : theme === 'light'
                ? 'bg-card/95 backdrop-blur-sm border-border/60 shadow-lg'
                : 'bg-card border-border/50'
            }`}>
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className={
                isWhiteText 
                  ? 'text-white/90' 
                  : theme === 'light'
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }>
                Your Spiritual Companion
              </span>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
            </div>
            
            {/* Heading */}
            <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 sm:mb-10 md:mb-12 leading-tight ${
              isWhiteText 
                ? 'text-white' 
                : theme === 'light'
                ? 'text-foreground'
                : textColorClass
            }`}>
              Discover the Beauty of
              <span className="block mt-1 sm:mt-2 opacity-90">
                islamic poetry
              </span>
            </h1>
            
            {/* Verse */}
            <div className="mb-10 sm:mb-12 md:mb-14 animate-fade-in px-2" style={{ animationDelay: '0.2s' }}>
              <p 
                className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-arabic leading-[1.8] transition-all duration-300 text-accent drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]`}
                style={{ 
                  fontFamily: "'AlMajeed', serif",
                  textShadow: '0 0 20px rgba(196, 160, 82, 0.15)'
                }}
                dir="rtl"
              >
                إِنَّ الْحُسَيْنَ مِصْبَاحُ الْهُدَىٰ وَسَفِينَةُ النَّجَاةِ
              </p>
              <div className={`mt-4 sm:mt-6 flex items-center justify-center gap-3 ${
                isWhiteText ? 'text-white/70' : 'text-muted-foreground'
              }`}>
                <div className="h-px w-6 sm:w-8 bg-current opacity-20" />
                <p className="text-[10px] sm:text-xs md:text-sm font-medium tracking-[0.25em] uppercase italic opacity-80">
                  The Lamp of Guidance & The Ship of Salvation
                </p>
                <div className="h-px w-6 sm:w-8 bg-current opacity-20" />
              </div>
            </div>

          {/* Search */}
          <div className="mb-8 sm:mb-10 md:mb-12">
            <SearchBar 
              onSearch={onSearch}
              placeholder="Search for Naat, Noha, Dua, reciter..."
              isLoading={isSearching}
              searchResults={searchResults}
              searchQuery={searchQuery}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 sm:gap-8 md:gap-10 lg:gap-12">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient">{stats.categories}</p>
              <p className={`text-xs sm:text-sm ${
                isWhiteText 
                  ? 'text-white/80' 
                  : theme === 'light'
                  ? 'text-foreground/70'
                  : 'text-muted-foreground'
              }`}>Categories</p>
            </div>
            <div className={`w-px h-10 sm:h-12 ${
              isWhiteText 
                ? 'bg-white/30' 
                : theme === 'light'
                ? 'bg-border/60'
                : 'bg-border'
            }`} />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-gold">{recentPiecesCount}+</p>
              <p className={`text-xs sm:text-sm ${
                isWhiteText 
                  ? 'text-white/80' 
                  : theme === 'light'
                  ? 'text-foreground/70'
                  : 'text-muted-foreground'
              }`}>Recitations</p>
            </div>
            <div className={`w-px h-10 sm:h-12 ${
              isWhiteText 
                ? 'bg-white/30' 
                : theme === 'light'
                ? 'bg-border/60'
                : 'bg-border'
            }`} />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient">∞</p>
              <p className={`text-xs sm:text-sm ${
                isWhiteText 
                  ? 'text-white/80' 
                  : theme === 'light'
                  ? 'text-foreground/70'
                  : 'text-muted-foreground'
              }`}>Blessings</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

