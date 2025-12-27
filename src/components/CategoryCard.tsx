import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, Droplet, Hand, Moon, Users, Book, ArrowRight } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/lib/supabase-types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  star: Star,
  droplet: Droplet,
  hand: Hand,
  moon: Moon,
  users: Users,
  book: Book,
};

const iconColorMap: Record<string, string> = {
  heart: 'text-rose-600 dark:text-rose-400',
  star: 'text-amber-600 dark:text-amber-400',
  droplet: 'text-blue-600 dark:text-blue-400',
  hand: 'text-emerald-600 dark:text-emerald-400',
  moon: 'text-violet-600 dark:text-violet-400',
  users: 'text-orange-600 dark:text-orange-400',
  book: 'text-primary dark:text-primary',
};

const iconBgMap: Record<string, string> = {
  heart: 'bg-rose-500/15 dark:bg-rose-500/10 border-rose-500/30 dark:border-rose-500/20',
  star: 'bg-amber-500/15 dark:bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20',
  droplet: 'bg-blue-500/15 dark:bg-blue-500/10 border-blue-500/30 dark:border-blue-500/20',
  hand: 'bg-emerald-500/15 dark:bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20',
  moon: 'bg-violet-500/15 dark:bg-violet-500/10 border-violet-500/30 dark:border-violet-500/20',
  users: 'bg-orange-500/15 dark:bg-orange-500/10 border-orange-500/30 dark:border-orange-500/20',
  book: 'bg-primary/15 dark:bg-primary/10 border-primary/30 dark:border-primary/20',
};

interface CategoryCardProps {
  category: Category;
  index?: number;
}

export const CategoryCard = memo(function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  const { theme } = useTheme();
  const Icon = iconMap[category.icon] || Book;
  const iconColor = iconColorMap[category.icon] || iconColorMap.book;
  const iconBg = iconBgMap[category.icon] || iconBgMap.book;
  
  // Get background image settings from admin dashboard
  const bgImageUrl = category.bg_image_url;
  const bgImagePosition = category.bg_image_position || 'center';
  const bgImageSize = category.bg_image_size || 'cover';
  // Adjust opacity for light mode - need stronger overlay for better text readability
  const bgImageOpacity = category.bg_image_opacity ?? (theme === 'light' ? 0.5 : 0.4);
  const bgImageBlur = category.bg_image_blur ?? 12;
  const bgImageScale = category.bg_image_scale ?? 1.15;

  return (
    <Link
      to={`/category/${category.slug}`}
      className={`group relative block w-full overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-card via-card ${
        theme === 'light' 
          ? 'to-card border-border/70 shadow-lg hover:shadow-xl' 
          : 'to-card/80 dark:to-card/80 border-border/60 dark:border-border/40 shadow-lg dark:shadow-lg hover:shadow-xl dark:hover:shadow-xl'
      } transition-all duration-500 hover:-translate-y-2 active:scale-[0.98] animate-fade-in`}
      style={{ 
        animationDelay: `${index * 0.08}s`,
      }}
      tabIndex={0}
      aria-label={`Explore ${category.name} category`}
    >
      {/* Background Image Layer - from admin dashboard */}
      {bgImageUrl && (
        <>
          <div 
            className="absolute inset-0 transition-transform duration-1000 ease-out group-hover:scale-110"
            style={{
              backgroundImage: `url(${bgImageUrl})`,
              backgroundPosition: bgImagePosition,
              backgroundSize: bgImageSize,
              backgroundRepeat: 'no-repeat',
              transform: `scale(${bgImageScale})`,
            }}
          />
          {/* Dynamic blur overlay */}
          <div 
            className="absolute inset-0 transition-all duration-700 group-hover:backdrop-blur-[2px]"
            style={{
              backdropFilter: `blur(${bgImageBlur}px)`,
            }}
          />
          {/* Opacity overlay with gradient - stronger in light mode for better text readability */}
          <div 
            className={`absolute inset-0 bg-gradient-to-b transition-opacity duration-700 ${
              theme === 'light'
                ? 'from-background/95 via-background/85 to-background/75 group-hover:from-background/90 group-hover:via-background/80 group-hover:to-background/70'
                : 'from-background/85 dark:from-background/85 via-background/70 dark:via-background/70 to-background/60 dark:to-background/60 group-hover:from-background/75 dark:group-hover:from-background/75 group-hover:via-background/60 dark:group-hover:via-background/60 group-hover:to-background/45 dark:group-hover:to-background/45'
            }`}
            style={{
              opacity: bgImageOpacity,
            }}
          />
        </>
      )}

      {/* Fallback gradient if no background image - adjusted for light mode */}
      {!bgImageUrl && (
        <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-700 ${
          theme === 'light'
            ? 'from-primary/15 via-primary/8 to-accent/10'
            : 'from-primary/25 dark:from-primary/25 via-primary/12 dark:via-primary/12 to-accent/15 dark:to-accent/15'
        }`} />
      )}

      {/* Animated gradient overlay - stronger in light mode for better text readability */}
      <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-700 ${
        theme === 'light'
          ? 'from-background/98 via-background/75 to-transparent opacity-95 group-hover:opacity-85'
          : 'from-background dark:from-background via-background/40 dark:via-background/40 to-transparent opacity-90 dark:opacity-80 group-hover:opacity-75 dark:group-hover:opacity-60'
      }`} />

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-5 sm:p-6 md:p-5 lg:p-6 flex flex-col h-full min-h-[200px] sm:min-h-[220px] md:min-h-[200px] lg:min-h-[220px]">
        {/* Top section */}
        <div className="flex-1 flex flex-col">
          {/* Icon with modern glassmorphism - adjusted for light mode */}
          <div className={`w-14 h-14 sm:w-16 sm:h-16 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl ${iconBg} backdrop-blur-xl border-2 flex items-center justify-center mb-4 sm:mb-5 md:mb-4 lg:mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${
            theme === 'light'
              ? 'shadow-md group-hover:shadow-lg'
              : 'shadow-lg dark:shadow-lg group-hover:shadow-xl dark:group-hover:shadow-xl'
          }`}>
            <Icon className={`w-7 h-7 sm:w-8 sm:h-8 md:w-7 md:h-7 lg:w-8 lg:h-8 ${iconColor} transition-transform duration-500 group-hover:scale-110`} />
          </div>
          
          {/* Title - better contrast in light mode */}
          <h3 className={`text-xl sm:text-2xl md:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 md:mb-2 lg:mb-3 transition-colors duration-500 leading-tight ${
            theme === 'light'
              ? 'text-foreground group-hover:text-primary'
              : 'text-foreground dark:text-foreground group-hover:text-primary dark:group-hover:text-primary'
          }`}>
            {category.name}
          </h3>
          
          {/* Description - better contrast in light mode */}
          {category.description && (
            <p className={`text-xs sm:text-sm md:text-xs lg:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed mb-3 sm:mb-4 md:mb-3 lg:mb-4 transition-colors duration-500 ${
              theme === 'light'
                ? 'text-foreground/75 group-hover:text-foreground/90'
                : 'text-foreground/80 dark:text-muted-foreground group-hover:text-foreground dark:group-hover:text-foreground/80'
            }`}>
              {category.description}
            </p>
          )}
        </div>

        {/* Bottom CTA - better contrast in light mode */}
        <div className={`mt-auto pt-3 sm:pt-4 md:pt-3 lg:pt-4 border-t transition-colors duration-500 ${
          theme === 'light'
            ? 'border-border/60 group-hover:border-primary/60'
            : 'border-border/50 dark:border-border/30 group-hover:border-primary/50 dark:group-hover:border-primary/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs sm:text-sm md:text-xs lg:text-sm font-semibold transition-colors duration-500 ${
              theme === 'light'
                ? 'text-primary group-hover:text-primary/80'
                : 'text-primary dark:text-primary group-hover:text-primary/90 dark:group-hover:text-primary/90'
            }`}>
              Explore
            </span>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ${
              theme === 'light'
                ? 'bg-primary/20 group-hover:bg-primary/30 border border-primary/40 group-hover:border-primary/60'
                : 'bg-primary/15 dark:bg-primary/10 group-hover:bg-primary/25 dark:group-hover:bg-primary/20 border border-primary/30 dark:border-primary/20 group-hover:border-primary/50 dark:group-hover:border-primary/40'
            }`}>
              <ArrowRight className={`w-4 h-4 sm:w-4 sm:h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-transform duration-500 group-hover:translate-x-1 ${
                theme === 'light'
                  ? 'text-primary'
                  : 'text-primary dark:text-primary'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Decorative corner accent - adjusted for light mode */}
      <div className={`absolute top-0 right-0 w-24 h-24 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-bl rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl ${
        theme === 'light'
          ? 'from-primary/30 via-primary/20 to-transparent'
          : 'from-primary/25 dark:from-primary/20 via-primary/15 dark:via-primary/10 to-transparent'
      }`} />
      
      {/* Bottom glow effect - more visible in light mode */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-transparent to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center ${
        theme === 'light'
          ? 'via-primary/70'
          : 'via-primary/60 dark:via-primary/50'
      }`} />
    </Link>
  );
});
