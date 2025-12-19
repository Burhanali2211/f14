import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, Droplet, Hand, Moon, Users, Book, ArrowRight } from 'lucide-react';
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

const gradientMap: Record<string, string> = {
  heart: 'from-rose-500/15 to-pink-500/5',
  star: 'from-amber-500/15 to-yellow-500/5',
  droplet: 'from-blue-500/15 to-cyan-500/5',
  hand: 'from-emerald-500/15 to-teal-500/5',
  moon: 'from-violet-500/15 to-purple-500/5',
  users: 'from-orange-500/15 to-amber-500/5',
  book: 'from-primary/15 to-emerald-light/5',
};

const iconColorMap: Record<string, string> = {
  heart: 'text-rose-500',
  star: 'text-amber-500',
  droplet: 'text-blue-500',
  hand: 'text-emerald-500',
  moon: 'text-violet-500',
  users: 'text-orange-500',
  book: 'text-primary',
};

interface CategoryCardProps {
  category: Category;
  index?: number;
}

export const CategoryCard = memo(function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  const Icon = iconMap[category.icon] || Book;
  const gradient = gradientMap[category.icon] || gradientMap.book;
  const iconColor = iconColorMap[category.icon] || iconColorMap.book;
  
  // Get image display settings with defaults
  const imagePosition = category.bg_image_position || 'center';
  const imageSize = category.bg_image_size || 'cover';
  const imageOpacity = category.bg_image_opacity ?? 0.3;
  const imageBlur = category.bg_image_blur ?? 8;
  const imageScale = category.bg_image_scale ?? 1.1;
  
  // Convert position to object-position values
  const positionMap: Record<string, string> = {
    'center': 'center',
    'top': 'center top',
    'bottom': 'center bottom',
    'left': 'left center',
    'right': 'right center',
    'top-left': 'left top',
    'top-right': 'right top',
    'bottom-left': 'left bottom',
    'bottom-right': 'right bottom',
  };
  const objectPosition = positionMap[imagePosition] || 'center';
  
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card p-4 sm:p-5 md:p-6 shadow-sm sm:shadow-soft transition-all duration-500 hover:shadow-lg sm:hover:shadow-elevated active:scale-[0.98] sm:hover:-translate-y-2 animate-slide-up opacity-0 min-h-[140px] sm:min-h-[160px] md:min-h-[180px] lg:min-h-[200px] flex flex-col justify-between"
      style={{ 
        animationDelay: `${index * 0.08}s`,
        willChange: 'transform, opacity', // GPU acceleration hint
      }}
      tabIndex={0}
      aria-label={`Explore ${category.name} category`}
    >
      {/* Background image with configurable settings - only shown if bg_image_url exists */}
      {category.bg_image_url && (
        <div className="absolute inset-0 overflow-hidden rounded-xl sm:rounded-2xl z-0" style={{ zIndex: 0 }}>
          <img
            src={category.bg_image_url}
            alt={category.name}
            className="absolute inset-0 w-full h-full transition-opacity duration-500"
            style={{
              objectFit: imageSize as 'cover' | 'contain' | 'fill',
              objectPosition: objectPosition,
              transform: `scale(${imageScale})`,
              filter: `blur(${imageBlur}px)`,
              opacity: imageOpacity,
              zIndex: 0,
              pointerEvents: 'none', // Allow clicks to pass through
            }}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          {/* Overlay to blend with gradient - reduced opacity so image shows through better */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-opacity duration-500`}
            style={{ 
              opacity: 0.3, // Reduced from 0.5 to let image show through
              zIndex: 1,
              pointerEvents: 'none'
            }}
          />
        </div>
      )}
      
      {/* Gradient background on hover - only if no bg_image_url */}
      {!category.bg_image_url && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 group-active:opacity-50 transition-opacity duration-500`} />
      )}
      
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-accent/10 to-transparent rounded-bl-[60px] sm:rounded-bl-[80px] opacity-60" />
      
      <div className="relative flex-1 flex flex-col" style={{ zIndex: 10, position: 'relative' }}>
        {/* Icon container */}
        <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 group-active:scale-105 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${iconColor}`} />
        </div>
        
        {/* Content */}
        <h3 className="font-display text-base sm:text-lg md:text-xl font-bold text-foreground mb-1.5 sm:mb-2 group-hover:text-primary group-active:text-primary transition-colors duration-300 leading-tight">
          {category.name}
        </h3>
        
        {category.description && (
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground line-clamp-2 sm:line-clamp-3 leading-relaxed flex-1">
            {category.description}
          </p>
        )}
        
        {/* Explore indicator */}
        <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-300 translate-x-[-8px] group-hover:translate-x-0 group-active:translate-x-0">
          <span>Explore</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
      
      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-primary via-accent to-primary scale-x-0 group-hover:scale-x-100 group-active:scale-x-100 transition-transform duration-500 origin-left" />
    </Link>
  );
});
