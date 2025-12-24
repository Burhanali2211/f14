import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTextAlignmentClass, getTextDirection, getKarbalaPlaceholder } from '@/lib/utils';
import type { Piece } from '@/lib/supabase-types';

interface PopularPieceCardProps {
  piece: Piece;
  index: number;
  totalItems: number;
}

export const PopularPieceCard = memo(function PopularPieceCard({ piece, index, totalItems }: PopularPieceCardProps) {
  const hasVideo = !!piece.video_url;
  const hasImage = !!piece.image_url;
  const isRTL = getTextDirection(piece.title) === 'rtl';
  const textAlign = getTextAlignmentClass(piece.title);

  return (
    <Link
      to={`/piece/${piece.id}`}
      className="group relative overflow-hidden bg-card rounded-xl border border-border/60 hover:border-border shadow-md hover:shadow-lg transition-all duration-300 animate-slide-up opacity-0"
      style={{ 
        animationDelay: `${index * 0.08}s`,
        willChange: 'transform, opacity',
      }}
      tabIndex={0}
      aria-label={piece.title}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40" />
      
      {/* Image Section */}
      <div className="relative w-full h-52 sm:h-60 md:h-64 overflow-hidden bg-muted/30">
        <img 
          src={hasImage ? piece.image_url! : getKarbalaPlaceholder(piece.id)} 
          alt={piece.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getKarbalaPlaceholder(piece.id);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
      </div>
      
      {/* Content Section */}
      <div className="p-5 md:p-6">
        {/* Title */}
        <h3 
          className={`font-arabic-heading text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-3 group-hover:text-primary/90 transition-colors duration-200 leading-[1.75] sm:leading-[1.8] md:leading-[1.85] line-clamp-2 break-words ${textAlign}`}
          style={{
            wordSpacing: '0.15em',
            letterSpacing: '0.03em',
            fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
          }}
          dir={getTextDirection(piece.title)}
        >
          {piece.title}
        </h3>
        
        {/* Meta badges */}
        <div className={`flex flex-wrap items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {piece.reciter && (
            <Badge variant="secondary" className="text-xs font-normal">
              {piece.reciter}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-normal">
            {piece.language}
          </Badge>
          {hasVideo && (
            <Badge variant="outline" className="text-xs font-normal">
              <Video className="w-3 h-3 mr-1" />
            </Badge>
          )}
        </div>
        
        {/* Footer with view count */}
        <div className={`flex items-center gap-2 pt-4 border-t border-border/30 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {piece.view_count?.toLocaleString() || 0} views
          </span>
        </div>
      </div>
    </Link>
  );
});
