import { memo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTextAlignmentClass, getTextDirection, getKarbalaPlaceholder } from '@/lib/utils';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import type { Piece } from '@/lib/supabase-types';

interface ContinueReadingCardProps {
  piece: Piece;
  index?: number;
}

export const ContinueReadingCard = memo(function ContinueReadingCard({ piece, index = 0 }: ContinueReadingCardProps) {
  const { getProgress } = useReadingProgress();
  const progress = getProgress(piece.id);
  const hasVideo = !!piece.video_url;
  const hasImage = !!piece.image_url;
  const isRTL = getTextDirection(piece.title) === 'rtl';
  const textAlign = getTextAlignmentClass(piece.title);
  
  const hasProgress = progress && (progress.scrollPosition > 0 || progress.currentVerse > 0);
  const progressPercent = progress?.completed 
    ? 100 
    : hasProgress 
      ? Math.min(90, Math.max(10, progress.currentVerse > 0 ? (progress.currentVerse * 5) : 25))
      : 0;

  return (
    <Link
      to={`/piece/${piece.id}`}
      className="group relative flex gap-3 sm:gap-4 bg-card rounded-lg border border-border/50 hover:border-border hover:shadow-sm transition-all duration-200 animate-slide-up opacity-0 p-3 sm:p-4"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        willChange: 'transform, opacity',
      }}
      tabIndex={0}
      aria-label={`Continue reading ${piece.title}`}
    >
      {/* Image - Compact square */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden rounded-md bg-muted/20">
        <img 
          src={hasImage ? piece.image_url! : getKarbalaPlaceholder(piece.id)} 
          alt={piece.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getKarbalaPlaceholder(piece.id);
          }}
        />
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Content - Tight, efficient layout */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Title - Primary hierarchy */}
        <h3 
          className={`font-arabic-heading text-base sm:text-lg font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors duration-200 leading-[1.75] line-clamp-2 break-words ${textAlign}`}
          style={{
            wordSpacing: '0.15em',
            letterSpacing: '0.03em',
            fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
          }}
          dir={getTextDirection(piece.title)}
        >
          {piece.title}
        </h3>
        
        {/* Meta - Secondary hierarchy */}
        <div className={`flex items-center gap-2 mb-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {piece.reciter && (
            <span className="text-xs text-muted-foreground truncate">{piece.reciter}</span>
          )}
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{piece.language}</span>
          {hasVideo && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <Video className="w-3 h-3 text-muted-foreground" />
            </>
          )}
        </div>
        
        {/* Progress - Tertiary hierarchy */}
        {progressPercent > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {progress?.completed ? 'Done' : `${Math.round(progressPercent)}%`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
});
