import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, BookOpen, Music, Heart, Mic2, MessageCircle, Star, Moon, Sun, Sparkles } from 'lucide-react';
import { playTapSound } from './ChildFriendlyNav';
import type { Category } from '@/lib/supabase-types';

interface ChildFriendlyCategoryGridProps {
  categories: Category[];
  soundEnabled?: boolean;
}

const categoryIcons: Record<string, typeof Headphones> = {
  naat: Music,
  noha: Heart,
  manqabat: Star,
  dua: MessageCircle,
  marsiya: Moon,
  munajat: Sun,
  salam: Sparkles,
  default: BookOpen,
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  naat: { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', text: 'text-white' },
  noha: { bg: 'bg-gradient-to-br from-rose-400 to-rose-600', text: 'text-white' },
  manqabat: { bg: 'bg-gradient-to-br from-amber-400 to-amber-600', text: 'text-white' },
  dua: { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', text: 'text-white' },
  marsiya: { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', text: 'text-white' },
  munajat: { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', text: 'text-white' },
  salam: { bg: 'bg-gradient-to-br from-teal-400 to-teal-600', text: 'text-white' },
  default: { bg: 'bg-gradient-to-br from-slate-400 to-slate-600', text: 'text-white' },
};

export function ChildFriendlyCategoryGrid({ categories, soundEnabled = true }: ChildFriendlyCategoryGridProps) {
  return (
    <section className="py-8 px-4" id="categories">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
        {categories.map((category, index) => (
          <ChildFriendlyCategoryCard
            key={category.id}
            category={category}
            soundEnabled={soundEnabled}
            delay={index * 80}
          />
        ))}
      </div>
    </section>
  );
}

interface ChildFriendlyCategoryCardProps {
  category: Category;
  soundEnabled?: boolean;
  delay?: number;
}

function ChildFriendlyCategoryCard({ category, soundEnabled = true, delay = 0 }: ChildFriendlyCategoryCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  const slug = category.slug?.toLowerCase() || '';
  const Icon = categoryIcons[slug] || categoryIcons.default;
  const colors = categoryColors[slug] || categoryColors.default;

  const handleTouchStart = () => {
    setIsPressed(true);
    if (soundEnabled) playTapSound();
  };

  const handleTouchEnd = () => {
    setTimeout(() => setIsPressed(false), 150);
  };

  return (
    <Link
      to={`/category/${category.slug}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        aspect-square
        rounded-3xl
        ${colors.bg}
        flex flex-col items-center justify-center
        gap-2 sm:gap-3
        p-4
        shadow-lg
        border-4 border-white/20
        transition-all duration-200 ease-out
        animate-slide-up opacity-0
        active:scale-90
        ${isPressed ? 'scale-90 shadow-md brightness-95' : 'hover:scale-105 hover:shadow-xl'}
      `}
      style={{ 
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
      }}
      aria-label={category.name}
    >
      <div className={`
        ${isPressed ? 'scale-90' : 'scale-100'}
        transition-transform duration-150
      `}>
        <Icon className={`w-12 h-12 sm:w-16 sm:h-16 ${colors.text} drop-shadow-sm`} strokeWidth={2} />
      </div>
      
      <span className={`
        text-sm sm:text-base md:text-lg font-bold ${colors.text}
        text-center leading-tight
        ${isPressed ? 'opacity-70' : 'opacity-100'}
        transition-opacity duration-150
      `}>
        {category.name}
      </span>
      
      {category.description && (
        <span className={`
          text-xs ${colors.text} opacity-80
          text-center line-clamp-1
          hidden sm:block
        `}>
          {category.description}
        </span>
      )}
    </Link>
  );
}

interface ChildFriendlyPieceGridProps {
  pieces: Array<{
    id: string;
    title: string;
    reciter?: string;
    image_url?: string;
  }>;
  soundEnabled?: boolean;
}

export function ChildFriendlyPieceGrid({ pieces, soundEnabled = true }: ChildFriendlyPieceGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto px-4">
      {pieces.map((piece, index) => (
        <ChildFriendlyPieceCard
          key={piece.id}
          piece={piece}
          soundEnabled={soundEnabled}
          delay={index * 80}
        />
      ))}
    </div>
  );
}

interface ChildFriendlyPieceCardProps {
  piece: {
    id: string;
    title: string;
    reciter?: string;
    image_url?: string;
  };
  soundEnabled?: boolean;
  delay?: number;
}

function ChildFriendlyPieceCard({ piece, soundEnabled = true, delay = 0 }: ChildFriendlyPieceCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    setIsPressed(true);
    if (soundEnabled) playTapSound();
  };

  const handleTouchEnd = () => {
    setTimeout(() => setIsPressed(false), 150);
  };

  const firstImageUrl = piece.image_url?.split(',')[0]?.trim();

  return (
    <Link
      to={`/piece/${piece.id}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        flex items-center gap-4
        p-4 sm:p-5
        rounded-2xl
        bg-card
        border-4 border-border/50
        shadow-lg
        transition-all duration-200 ease-out
        animate-slide-up opacity-0
        active:scale-95
        ${isPressed ? 'scale-95 shadow-md bg-secondary' : 'hover:scale-[1.02] hover:shadow-xl hover:border-primary/30'}
      `}
      style={{ 
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
      }}
      aria-label={piece.title}
    >
      {firstImageUrl ? (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
          <img
            src={firstImageUrl}
            alt={piece.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
          <Headphones className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h3 
          className="text-base sm:text-lg font-bold text-foreground line-clamp-2 leading-relaxed"
          dir="rtl"
          style={{ fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif" }}
        >
          {piece.title}
        </h3>
        {piece.reciter && (
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {piece.reciter}
          </p>
        )}
      </div>
      
      <div className={`
        w-12 h-12 sm:w-14 sm:h-14
        rounded-full
        bg-primary
        flex items-center justify-center
        flex-shrink-0
        transition-transform duration-150
        ${isPressed ? 'scale-90' : ''}
      `}>
        <Headphones className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
      </div>
    </Link>
  );
}
