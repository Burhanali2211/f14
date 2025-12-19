import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTextAlignmentClass, getTextDirection, getKarbalaPlaceholder } from '@/lib/utils';
import type { Piece } from '@/lib/supabase-types';

interface RecentPieceCardProps {
  piece: Piece;
  index?: number;
}

export const RecentPieceCard = memo(function RecentPieceCard({ piece, index = 0 }: RecentPieceCardProps) {
  const hasVideo = !!piece.video_url;
  const hasImage = !!piece.image_url;
  const isRTL = getTextDirection(piece.title) === 'rtl';
  const textAlign = getTextAlignmentClass(piece.title);
  
  // Calculate days since creation
  const daysSinceAdded = piece.created_at 
    ? Math.floor((Date.now() - new Date(piece.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Link
      to={`/piece/${piece.id}`}
      className="group relative overflow-hidden bg-card rounded-xl border-l-2 border-l-accent/50 hover:border-l-accent shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up opacity-0"
      style={{ 
        animationDelay: `${index * 0.06}s`,
        willChange: 'transform, opacity',
      }}
      tabIndex={0}
      aria-label={piece.title}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        {/* Image Section - Smaller, square */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted/30">
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
        </div>
        
        {/* Content Section */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 
            className={`font-arabic text-base sm:text-lg font-semibold text-foreground mb-2 group-hover:text-primary/90 transition-colors duration-200 leading-relaxed line-clamp-2 ${textAlign}`}
            dir={getTextDirection(piece.title)}
          >
            {piece.title}
          </h3>
          
          {/* Meta badges */}
          <div className={`flex flex-wrap items-center gap-1.5 mb-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {piece.reciter && (
              <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0.5">
                {piece.reciter}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-normal px-1.5 py-0.5">
              {piece.language}
            </Badge>
            {hasVideo && (
              <Badge variant="outline" className="text-xs font-normal px-1.5 py-0.5">
                <Video className="w-3 h-3" />
              </Badge>
            )}
          </div>
          
          {/* Time indicator */}
          <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {daysSinceAdded === 0 
                ? 'Added today' 
                : daysSinceAdded === 1 
                  ? 'Added yesterday'
                  : `Added ${daysSinceAdded} days ago`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});
