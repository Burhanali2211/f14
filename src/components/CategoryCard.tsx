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

// Enhanced gradient backgrounds with creative patterns
const backgroundGradientMap: Record<string, string> = {
  heart: 'from-rose-50/80 via-pink-50/60 to-rose-100/40 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-rose-900/20',
  star: 'from-amber-50/80 via-yellow-50/60 to-amber-100/40 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-900/20',
  droplet: 'from-blue-50/80 via-cyan-50/60 to-blue-100/40 dark:from-blue-950/40 dark:via-cyan-950/30 dark:to-blue-900/20',
  hand: 'from-emerald-50/80 via-teal-50/60 to-emerald-100/40 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-900/20',
  moon: 'from-violet-50/80 via-purple-50/60 to-violet-100/40 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-violet-900/20',
  users: 'from-orange-50/80 via-amber-50/60 to-orange-100/40 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-orange-900/20',
  book: 'from-primary/10 via-primary/5 to-emerald-50/40 dark:from-primary/20 dark:via-primary/10 dark:to-emerald-950/20',
};

const hoverGradientMap: Record<string, string> = {
  heart: 'from-rose-100/40 via-pink-100/30 to-rose-200/20 dark:from-rose-900/30 dark:via-pink-900/20 dark:to-rose-800/15',
  star: 'from-amber-100/40 via-yellow-100/30 to-amber-200/20 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-amber-800/15',
  droplet: 'from-blue-100/40 via-cyan-100/30 to-blue-200/20 dark:from-blue-900/30 dark:via-cyan-900/20 dark:to-blue-800/15',
  hand: 'from-emerald-100/40 via-teal-100/30 to-emerald-200/20 dark:from-emerald-900/30 dark:via-teal-900/20 dark:to-emerald-800/15',
  moon: 'from-violet-100/40 via-purple-100/30 to-violet-200/20 dark:from-violet-900/30 dark:via-purple-900/20 dark:to-violet-800/15',
  users: 'from-orange-100/40 via-amber-100/30 to-orange-200/20 dark:from-orange-900/30 dark:via-amber-900/20 dark:to-orange-800/15',
  book: 'from-primary/20 via-primary/10 to-emerald-100/30 dark:from-primary/30 dark:via-primary/15 dark:to-emerald-900/20',
};

const iconGradientMap: Record<string, string> = {
  heart: 'from-rose-500/20 to-pink-500/10',
  star: 'from-amber-500/20 to-yellow-500/10',
  droplet: 'from-blue-500/20 to-cyan-500/10',
  hand: 'from-emerald-500/20 to-teal-500/10',
  moon: 'from-violet-500/20 to-purple-500/10',
  users: 'from-orange-500/20 to-amber-500/10',
  book: 'from-primary/20 to-emerald-light/10',
};

const iconColorMap: Record<string, string> = {
  heart: 'text-rose-600 dark:text-rose-400',
  star: 'text-amber-600 dark:text-amber-400',
  droplet: 'text-blue-600 dark:text-blue-400',
  hand: 'text-emerald-600 dark:text-emerald-400',
  moon: 'text-violet-600 dark:text-violet-400',
  users: 'text-orange-600 dark:text-orange-400',
  book: 'text-primary',
};

interface CategoryCardProps {
  category: Category;
  index?: number;
}

export const CategoryCard = memo(function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  const Icon = iconMap[category.icon] || Book;
  const bgGradient = backgroundGradientMap[category.icon] || backgroundGradientMap.book;
  const hoverGradient = hoverGradientMap[category.icon] || hoverGradientMap.book;
  const iconGradient = iconGradientMap[category.icon] || iconGradientMap.book;
  const iconColor = iconColorMap[category.icon] || iconColorMap.book;
  
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/50 p-4 sm:p-5 md:p-6 lg:p-7 shadow-sm sm:shadow-md transition-all duration-500 hover:shadow-xl hover:border-primary/30 active:scale-[0.98] sm:hover:-translate-y-1.5 animate-slide-up opacity-0 min-h-[150px] sm:min-h-[170px] md:min-h-[190px] lg:min-h-[210px] xl:min-h-[230px] flex flex-col justify-between"
      style={{ 
        animationDelay: `${index * 0.08}s`,
        willChange: 'transform, opacity',
      }}
      tabIndex={0}
      aria-label={`Explore ${category.name} category`}
    >
      {/* Base gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} transition-opacity duration-500`} />
      
      {/* Additional depth layer - creates warmth */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/8 via-transparent to-transparent dark:from-background/4 transition-opacity duration-500" />
      
      {/* Inner highlight for depth - subtle glow */}
      <div className="absolute inset-[1px] rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/8 via-transparent to-transparent dark:from-white/3 pointer-events-none transition-opacity duration-500" />
      
      {/* Hover gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${hoverGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      {/* Subtle pattern overlay - minimal decorative element */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.05] dark:group-hover:opacity-[0.08] transition-opacity duration-500"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      
      {/* Elegant decorative circles - responsive and warm, creating depth */}
      {/* Top-right large circle */}
      <div className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 md:-top-6 md:-right-6 lg:-top-7 lg:-right-7 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 rounded-full bg-gradient-to-br from-primary/12 via-accent/8 to-transparent opacity-50 group-hover:opacity-75 group-hover:scale-110 transition-all duration-700 blur-[12px] sm:blur-[16px] md:blur-[20px] lg:blur-[24px] xl:blur-[28px]" />
      
      {/* Bottom-left medium circle */}
      <div className="absolute -bottom-3 -left-3 sm:-bottom-4 sm:-left-4 md:-bottom-5 md:-left-5 lg:-bottom-6 lg:-left-6 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 rounded-full bg-gradient-to-tr from-accent/10 via-primary/6 to-transparent opacity-45 group-hover:opacity-65 group-hover:scale-110 transition-all duration-700 blur-[10px] sm:blur-[14px] md:blur-[18px] lg:blur-[22px] xl:blur-[26px]" />
      
      {/* Center-right small circle */}
      <div className="absolute top-1/3 right-1/4 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 rounded-full bg-gradient-to-br from-primary/8 to-accent/5 opacity-35 group-hover:opacity-55 group-hover:scale-125 transition-all duration-500 blur-[8px] sm:blur-[10px] md:blur-[12px] lg:blur-[14px] xl:blur-[16px]" />
      
      {/* Top-left tiny accent circle */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-accent/6 to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-500 blur-[6px] sm:blur-[8px] md:blur-[10px]" />
      
      {/* Elegant flowing lines - responsive and graceful, creating harmony */}
      <svg 
        className="absolute inset-0 w-full h-full opacity-[0.06] dark:opacity-[0.1] group-hover:opacity-[0.12] dark:group-hover:opacity-[0.16] transition-opacity duration-500 pointer-events-none overflow-visible"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* Flowing curved line - gentle and organic */}
        <path
          d="M 0,50 Q 80,35 160,60 Q 240,85 320,70 Q 360,65 400,75"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
          className="text-primary"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Gentle arc line - soft and welcoming */}
        <path
          d="M 30,180 Q 150,160 270,190 Q 330,200 370,185"
          stroke="currentColor"
          strokeWidth="0.9"
          fill="none"
          className="text-accent"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
        {/* Subtle flowing diagonal - adds movement */}
        <path
          d="M 0,140 Q 200,130 400,110"
          stroke="currentColor"
          strokeWidth="0.7"
          fill="none"
          className="text-primary"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Additional gentle curve for warmth */}
        <path
          d="M 50,220 Q 180,210 310,230"
          stroke="currentColor"
          strokeWidth="0.6"
          fill="none"
          className="text-accent"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      
      {/* Decorative corner accent - enhanced */}
      <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-primary/10 via-accent/6 to-transparent rounded-bl-[80px] sm:rounded-bl-[100px] md:rounded-bl-[120px] lg:rounded-bl-[140px] opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Subtle bottom accent */}
      <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 bg-gradient-to-tr from-accent/6 via-primary/3 to-transparent rounded-tr-[100px] sm:rounded-tr-[120px] md:rounded-tr-[140px] lg:rounded-tr-[160px] opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
      
      {/* Content container */}
      <div className="relative flex-1 flex flex-col z-10">
        {/* Icon container - enhanced */}
        <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br ${iconGradient} backdrop-blur-sm border border-border/20 flex items-center justify-center mb-3 sm:mb-4 md:mb-5 group-hover:scale-110 group-hover:rotate-3 group-active:scale-105 transition-all duration-300 shadow-sm group-hover:shadow-md`}>
          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 ${iconColor} transition-colors duration-300`} />
        </div>
        
        {/* Content */}
        <h3 className="font-display text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground mb-2 sm:mb-2.5 md:mb-3 group-hover:text-primary transition-colors duration-300 leading-tight">
          {category.name}
        </h3>
        
        {category.description && (
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground line-clamp-2 sm:line-clamp-3 leading-relaxed flex-1 mb-2 sm:mb-3">
            {category.description}
          </p>
        )}
        
        {/* Explore indicator - enhanced */}
        <div className="mt-auto pt-2 sm:pt-3 flex items-center gap-2 text-xs sm:text-sm md:text-base font-semibold text-primary opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 group-active:translate-x-0">
          <span>Explore</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
      
      {/* Bottom gradient line - enhanced */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:h-1 md:h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 group-active:scale-x-100 transition-transform duration-500 origin-center" />
      
      {/* Top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center delay-75" />
    </Link>
  );
});
