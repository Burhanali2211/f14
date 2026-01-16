import { Sparkles } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { getGradientStyles } from '@/hooks/use-hero-gradient';
import { useImageBrightness } from '@/hooks/use-image-brightness';
import { useTheme } from '@/hooks/use-theme';
import type { SiteSettings, Piece } from '@/lib/supabase-types';

interface HeroSectionProps {
  siteSettings: SiteSettings | null;
  stats: { categories: number; pieces: number };
  recentPiecesCount: number;
  searchQuery: string;
  searchResults: Piece[];
  isSearching: boolean;
  onSearch: (query: string) => void;
}

// Helper function to get font family based on font name
const getArabicFontFamily = (fontName: string | null | undefined): string => {
  switch (fontName) {
    case 'noto-nastaliq':
      return "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif";
    case 'lateef':
      return "'Lateef', 'Noto Nastaliq Urdu', 'Cairo', sans-serif";
    case 'cairo':
      return "'Cairo', 'Tajawal', sans-serif";
    case 'tajawal':
      return "'Tajawal', 'Cairo', sans-serif";
    case 'amiri':
      return "'Amiri', serif";
    case 'noto-sans-arabic':
      return "'Noto Sans Arabic', 'Cairo', sans-serif";
    case 'ibm-plex-sans-arabic':
      return "'IBM Plex Sans Arabic', 'Cairo', sans-serif";
    default:
      return "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif";
  }
};

export function HeroSection({
  siteSettings,
  stats,
  recentPiecesCount,
  searchQuery,
  searchResults,
  isSearching,
  onSearch,
}: HeroSectionProps) {
  const { getTextColorClass } = useImageBrightness(siteSettings);
  const { theme } = useTheme();
  const arabicFontFamily = getArabicFontFamily(siteSettings?.hero_arabic_font);

  // Determine if we need a dark overlay for light mode
  const needsOverlay = theme === 'light' && (!siteSettings?.hero_image_url || getTextColorClass().includes('white'));
  
  return (
    <section 
      className={`relative overflow-hidden ${siteSettings?.hero_image_url ? '' : 'hero-pattern'} ${
        theme === 'light' && !siteSettings?.hero_image_url ? 'bg-gradient-to-br from-background via-background/95 to-background/90' : ''
      }`}
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
      
      {/* Light mode overlay for better text readability when image is present */}
      {needsOverlay && siteSettings?.hero_image_url && (
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background/60 via-background/40 to-background/70 dark:hidden" />
      )}
      
      <div className="container pt-8 pb-16 md:pt-12 md:pb-20 lg:py-24 relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className={`text-center max-w-4xl mx-auto animate-fade-in px-4 sm:px-6 md:px-8 ${getTextColorClass()}`}>
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border shadow-soft text-xs sm:text-sm mb-6 sm:mb-8 ${
            getTextColorClass().includes('white') 
              ? 'bg-black/30 dark:bg-black/30 backdrop-blur-sm border-white/20' 
              : theme === 'light'
              ? 'bg-card/95 backdrop-blur-sm border-border/60 shadow-lg'
              : 'bg-card border-border/50'
          }`}>
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className={
              getTextColorClass().includes('white') 
                ? 'text-white/90' 
                : theme === 'light'
                ? 'text-foreground'
                : 'text-muted-foreground'
            }>
              {siteSettings?.hero_badge_text || 'Your Spiritual Companion'}
            </span>
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
          </div>
          
          {/* Heading */}
          <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight ${
            getTextColorClass().includes('white') 
              ? 'text-white' 
              : theme === 'light'
              ? 'text-foreground'
              : getTextColorClass()
          }`}>
            {siteSettings?.hero_heading_line1 || 'Discover the Beauty of'}
            <span className="block text-gradient mt-1 sm:mt-2">
              {siteSettings?.hero_heading_line2 || 'islamic poetry'}
            </span>
          </h1>
          
          {/* Description */}
          <p 
            className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed ${
              getTextColorClass().includes('white') 
                ? 'text-white/90' 
                : theme === 'light'
                ? 'text-foreground/80'
                : 'text-muted-foreground'
            }`}
            style={{ fontFamily: arabicFontFamily }}
            dir="auto"
          >
            {siteSettings?.hero_description || 'Explore Naat, Manqabat, Noha, Dua, Marsiya, and more. Read, listen, and connect with your spiritual heritage.'}
          </p>

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
                getTextColorClass().includes('white') 
                  ? 'text-white/80' 
                  : theme === 'light'
                  ? 'text-foreground/70'
                  : 'text-muted-foreground'
              }`}>Categories</p>
            </div>
            <div className={`w-px h-10 sm:h-12 ${
              getTextColorClass().includes('white') 
                ? 'bg-white/30' 
                : theme === 'light'
                ? 'bg-border/60'
                : 'bg-border'
            }`} />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-gold">{recentPiecesCount}+</p>
              <p className={`text-xs sm:text-sm ${
                getTextColorClass().includes('white') 
                  ? 'text-white/80' 
                  : theme === 'light'
                  ? 'text-foreground/70'
                  : 'text-muted-foreground'
              }`}>Recitations</p>
            </div>
            <div className={`w-px h-10 sm:h-12 ${
              getTextColorClass().includes('white') 
                ? 'bg-white/30' 
                : theme === 'light'
                ? 'bg-border/60'
                : 'bg-border'
            }`} />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient">∞</p>
              <p className={`text-xs sm:text-sm ${
                getTextColorClass().includes('white') 
                  ? 'text-white/80' 
                  : theme === 'light'
                  ? 'text-foreground/70'
                  : 'text-muted-foreground'
              }`}>Blessings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements - adjusted for light mode */}
      <div className={`absolute top-20 left-10 w-64 h-64 rounded-full blur-3xl animate-float ${
        theme === 'light' ? 'bg-primary/10' : 'bg-primary/5'
      }`} />
      <div className={`absolute bottom-20 right-10 w-80 h-80 rounded-full blur-3xl animate-float ${
        theme === 'light' ? 'bg-accent/10' : 'bg-accent/5'
      }`} style={{ animationDelay: '2s' }} />
    </section>
  );
}
