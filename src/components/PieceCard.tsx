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
        className="group relative overflow-hidden bg-card rounded-lg md:rounded-xl shadow-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-slide-up opacity-0"
        style={{ 
          animationDelay: `${index * 0.04}s`,
          willChange: 'transform, opacity',
        }}
      >
        {/* Cover Image */}
        <div className="relative h-32 sm:h-36 md:h-40 overflow-hidden bg-secondary">
          <img 
            src={hasImage ? piece.image_url! : getKarbalaPlaceholder(piece.id)} 
            alt={piece.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ willChange: 'transform' }}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getKarbalaPlaceholder(piece.id);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
        </div>
        
        <div className="relative z-10 p-3 md:p-4 pt-2.5">
          {/* Background gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            {/* Title */}
            <h3 
              className={`font-arabic-heading text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300 leading-[2.0] line-clamp-2 break-words py-0.5 ${textAlign}`}
              style={{
                wordSpacing: '0.15em',
                letterSpacing: '0.03em',
                fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
                paddingTop: '0.25em',
                paddingBottom: '0.25em',
              }}
              dir={getTextDirection(piece.title)}
            >
              {piece.title}
            </h3>
            
            {/* Meta badges */}
            <div className={`flex flex-wrap items-center gap-1.5 mb-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {piece.reciter && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-normal">
                  {piece.reciter}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-normal">
                {piece.language}
              </Badge>
            </div>
            
            {/* Footer */}
            <div className={`flex items-center justify-between pt-2.5 border-t border-border/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {hasVideo && (
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-all duration-300" title="Has Video">
                    <Video className="w-3.5 h-3.5 text-accent group-hover:text-accent-foreground" />
                  </div>
                )}
                {piece.view_count > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{piece.view_count.toLocaleString()}</span>
                  </span>
                )}
              </div>
              
              <ArrowUpRight className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-300 opacity-0 group-hover:opacity-100 ${isRTL ? 'transform translate-x-[4px] group-hover:translate-x-0' : 'transform translate-x-[-4px] group-hover:translate-x-0'}`} />
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
      <div className="relative h-40 sm:h-44 md:h-48 lg:h-52 overflow-hidden bg-secondary">
          <img 
            src={hasImage ? piece.image_url! : getKarbalaPlaceholder(piece.id)} 
            alt={`${piece.title}${piece.reciter ? ` by ${piece.reciter}` : ''}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            title={piece.title}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getKarbalaPlaceholder(piece.id);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/50 to-transparent" />
      </div>
      
      <div className="relative z-10 p-4 md:p-5 pt-3">
        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          {/* Header row */}
          <div className={`flex items-start justify-between gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 min-w-0">
              <h3 
                className={`font-arabic-heading text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300 leading-[2.0] line-clamp-2 break-words py-0.5 ${textAlign}`}
                style={{
                  wordSpacing: '0.15em',
                  letterSpacing: '0.03em',
                  fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
                  paddingTop: '0.25em',
                  paddingBottom: '0.25em',
                }}
                dir={getTextDirection(piece.title)}
              >
                {piece.title}
              </h3>
              
              {/* Meta badges */}
              <div className={`flex flex-wrap items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {piece.reciter && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-normal">
                    {piece.reciter}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-normal">
                  {piece.language}
                </Badge>
              </div>
            </div>
            
            {/* Media indicators */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {hasVideo && (
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-all duration-300" title="Has Video">
                  <Video className="w-4 h-4 text-accent group-hover:text-accent-foreground" />
                </div>
              )}
              {!hasVideo && !hasImage && (
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary transition-all duration-300">
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground" />
                </div>
              )}
            </div>
          </div>
          
          {/* Preview text - show when no actual image or when image is placeholder */}
          {!hasImage && piece.text_content && (
            <p 
              className={`text-sm text-muted-foreground font-arabic line-clamp-2 leading-relaxed mb-3 ${getTextAlignmentClass(piece.text_content)}`}
              dir={getTextDirection(piece.text_content)}
            >
              {piece.text_content.slice(0, 150)}...
            </p>
          )}
          
          {/* Footer */}
          <div className={`flex items-center justify-between pt-3 border-t border-border/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
              {piece.view_count > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{piece.view_count.toLocaleString()} views</span>
                </span>
              )}
            </div>
            
            <span className={`text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>Read now</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});
