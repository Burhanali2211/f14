import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Video, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTextAlignmentClass, getTextDirection, getKarbalaPlaceholder } from '@/lib/utils';
import type { Piece } from '@/lib/supabase-types';

interface PieceCardProps {
  piece: Piece;
  index?: number;
  compact?: boolean;
}

export const PieceCard = memo(function PieceCard({ piece, index = 0, compact = false }: PieceCardProps) {
  const hasVideo = !!piece.video_url;
  const hasImage = !!piece.image_url;
  const isRTL = getTextDirection(piece.title) === 'rtl';
  const textAlign = getTextAlignmentClass(piece.title);
  
  if (compact) {
    return (
      <Link
        to={`/piece/${piece.id}`}
        className="group relative overflow-hidden bg-card rounded-xl md:rounded-2xl shadow-md border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-slide-up opacity-0"
        style={{ animationDelay: `${index * 0.04}s` }}
      >
        {/* Cover Image */}
        <div className="relative h-40 sm:h-48 md:h-52 overflow-hidden bg-secondary">
          <img 
            src={hasImage ? piece.image_url! : getKarbalaPlaceholder(piece.id)} 
            alt={piece.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getKarbalaPlaceholder(piece.id);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
        </div>
        
        <div className="relative z-10 p-4 md:p-5 pt-3">
          {/* Background gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            {/* Title */}
            <h3 
              className={`font-arabic text-base sm:text-lg md:text-xl font-bold text-foreground mb-2 md:mb-3 group-hover:text-primary transition-colors duration-300 leading-relaxed line-clamp-2 ${textAlign}`}
              dir={getTextDirection(piece.title)}
            >
              {piece.title}
            </h3>
            
            {/* Meta badges */}
            <div className={`flex flex-wrap items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {piece.reciter && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {piece.reciter}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {piece.language}
              </Badge>
            </div>
            
            {/* Footer */}
            <div className={`flex items-center justify-between pt-3 border-t border-border/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 md:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {hasVideo && (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-all duration-300 group-hover:scale-110" title="Has Video">
                    <Video className="w-4 h-4 text-accent group-hover:text-accent-foreground" />
                  </div>
                )}
                {piece.view_count > 0 && (
                  <span className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{piece.view_count.toLocaleString()}</span>
                  </span>
                )}
              </div>
              
              <ArrowUpRight className={`w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-primary transition-all duration-300 opacity-0 group-hover:opacity-100 ${isRTL ? 'transform translate-x-[4px] group-hover:translate-x-0' : 'transform translate-x-[-4px] group-hover:translate-x-0'}`} />
            </div>
          </div>
        </div>
      </Link>
    );
  }
  
  return (
    <Link
      to={`/piece/${piece.id}`}
      className="group relative overflow-hidden bg-card rounded-xl md:rounded-2xl shadow-md transition-all duration-500 hover:shadow-xl hover:-translate-y-1 animate-slide-up opacity-0"
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Cover Image */}
      <div className="relative h-44 sm:h-48 md:h-52 lg:h-56 overflow-hidden bg-secondary">
        <img 
          src={hasImage ? piece.image_url! : getKarbalaPlaceholder(piece.id)} 
          alt={piece.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getKarbalaPlaceholder(piece.id);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
      </div>
      
      <div className="relative z-10 p-5 md:p-6 pt-4">
        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          {/* Header row */}
          <div className={`flex items-start justify-between gap-3 md:gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 min-w-0">
              <h3 
                className={`font-arabic text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2.5 md:mb-3 group-hover:text-primary transition-colors duration-300 leading-relaxed line-clamp-2 ${textAlign}`}
                dir={getTextDirection(piece.title)}
              >
                {piece.title}
              </h3>
              
              {/* Meta badges */}
              <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {piece.reciter && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {piece.reciter}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {piece.language}
                </Badge>
              </div>
            </div>
            
            {/* Media indicators */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {hasVideo && (
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-all duration-300 group-hover:scale-110" title="Has Video">
                  <Video className="w-4 h-4 md:w-5 md:h-5 text-accent group-hover:text-accent-foreground" />
                </div>
              )}
              {!hasVideo && !hasImage && (
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary transition-all duration-300 group-hover:scale-110">
                  <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-primary-foreground" />
                </div>
              )}
            </div>
          </div>
          
          {/* Preview text - show when no actual image or when image is placeholder */}
          {!hasImage && piece.text_content && (
            <p 
              className={`text-sm md:text-base text-muted-foreground font-arabic line-clamp-2 leading-relaxed mb-4 ${getTextAlignmentClass(piece.text_content)}`}
              dir={getTextDirection(piece.text_content)}
            >
              {piece.text_content.slice(0, 150)}...
            </p>
          )}
          
          {/* Footer */}
          <div className={`flex items-center justify-between pt-4 border-t border-border/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
              {piece.view_count > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{piece.view_count.toLocaleString()} views</span>
                </span>
              )}
            </div>
            
            <span className={`text-xs md:text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>Read now</span>
              <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});
