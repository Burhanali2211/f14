import { Sparkles } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { getGradientStyles } from '@/hooks/use-hero-gradient';
import { useImageBrightness } from '@/hooks/use-image-brightness';
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
  const arabicFontFamily = getArabicFontFamily(siteSettings?.hero_arabic_font);

  return (
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
          <p 
            className={`text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${
              getTextColorClass().includes('white') ? 'text-white/90' : 'text-muted-foreground'
            }`}
            style={{ fontFamily: arabicFontFamily }}
            dir="auto"
          >
            {siteSettings?.hero_description || 'Explore Naat, Manqabat, Noha, Dua, Marsiya, and more. Read, listen, and connect with your spiritual heritage.'}
          </p>

          {/* Search */}
          <div className="mb-12">
            <SearchBar 
              onSearch={onSearch}
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
              <p className="text-3xl md:text-4xl font-bold text-gradient-gold">{recentPiecesCount}+</p>
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
  );
}
