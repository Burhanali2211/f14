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

export function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  const Icon = iconMap[category.icon] || Book;
  const gradient = gradientMap[category.icon] || gradientMap.book;
  const iconColor = iconColorMap[category.icon] || iconColorMap.book;
  
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group relative overflow-hidden rounded-2xl bg-card p-5 shadow-soft transition-all duration-500 hover:shadow-elevated hover:-translate-y-2 animate-slide-up opacity-0"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Gradient background on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/10 to-transparent rounded-bl-[80px] opacity-60" />
      
      <div className="relative z-10">
        {/* Icon container */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
        
        {/* Content */}
        <h3 className="font-display text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors duration-300">
          {category.name}
        </h3>
        
        {category.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        )}
        
        {/* Explore indicator */}
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-8px] group-hover:translate-x-0">
          <span>Explore</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
      
      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </Link>
  );
}
