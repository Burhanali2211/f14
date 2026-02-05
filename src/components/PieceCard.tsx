import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Video, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getTextAlignmentClass, getTextDirection, getKarbalaPlaceholder, getFirstImageUrl, getProxiedImageUrl } from '@/lib/utils';
import type { Piece } from '@/lib/supabase-types';

interface PieceCardProps {
  piece: Piece;
  index?: number;
  compact?: boolean;
}

export const PieceCard = memo(function PieceCard({ piece, index = 0, compact = false }: PieceCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const hasVideo = !!piece.video_url;
  const firstImageUrl = getFirstImageUrl(piece.image_url);
  const hasImage = !!firstImageUrl;
  const isRTL = getTextDirection(piece.title) === 'rtl';
  const textAlign = getTextAlignmentClass(piece.title);

  const handleTouchStart = () => setIsPressed(true);
  const handleTouchEnd = () => setTimeout(() => setIsPressed(false), 150);
  
  if (compact) {
    return (
      <Link
        to={`/piece/${piece.id}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={() => setIsPressed(false)}
        className={`group relative overflow-hidden bg-card rounded-2xl shadow-md border-2 border-border/40 hover:border-primary/40 transition-all duration-300 hover:shadow-lg active:scale-[0.98] animate-slide-up opacity-0 ${isPressed ? 'scale-[0.98] shadow-sm border-primary/50' : ''}`}
        style={{ 
          animationDelay: `${index * 0.04}s`,
          animationFillMode: 'forwards',
        }}
      >
        <div className="relative h-36 sm:h-40 md:h-44 overflow-hidden bg-secondary">
          <img 
            src={hasImage ? firstImageUrl! : getKarbalaPlaceholder(piece.id)} 
            alt={piece.title}
            className={`w-full h-full object-cover transition-transform duration-500 ${isPressed ? 'scale-100' : 'group-hover:scale-105'}`}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getKarbalaPlaceholder(piece.id);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          
          {hasVideo && (
            <div className="absolute top-3 right-3 flex gap-2">
              <div className="w-10 h-10 rounded-xl bg-accent/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                <Video className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>
        
        <div className="relative z-10 p-4 md:p-5">
          <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 transition-opacity duration-300 ${isPressed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
          
          <div className="relative z-10">
            <h3 
              className={`font-arabic-heading text-lg sm:text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300 leading-[2.0] line-clamp-2 ${textAlign}`}
              style={{
                fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
              }}
              dir={getTextDirection(piece.title)}
            >
              {piece.title}
            </h3>
            
            <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {piece.reciter && (
                <Badge variant="secondary" className="text-sm px-3 py-1 font-medium rounded-lg">
                  {piece.reciter}
                </Badge>
              )}
              <Badge variant="outline" className="text-sm px-3 py-1 font-medium rounded-lg">
                {piece.language}
              </Badge>
            </div>
            
            <div className={`flex items-center justify-between pt-4 mt-4 border-t border-border/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {piece.view_count > 0 && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{piece.view_count.toLocaleString()}</span>
                  </span>
                )}
              </div>
              
              <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all duration-300 ${isPressed ? 'bg-primary scale-90' : ''}`}>
                <Play className={`w-5 h-5 transition-colors duration-300 ${isPressed ? 'text-white' : 'text-primary group-hover:text-white'}`} fill="currentColor" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }
  
  return (
    <Link
      to={`/piece/${piece.id}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
      className={`group relative overflow-hidden bg-card rounded-2xl md:rounded-3xl shadow-lg border-2 border-border/40 hover:border-primary/40 transition-all duration-300 hover:shadow-xl active:scale-[0.98] animate-slide-up opacity-0 ${isPressed ? 'scale-[0.98] shadow-md border-primary/50' : ''}`}
      style={{ 
        animationDelay: `${index * 0.06}s`,
        animationFillMode: 'forwards',
      }}
    >
      <div className="relative h-44 sm:h-48 md:h-52 lg:h-56 overflow-hidden bg-secondary">
        <img 
          src={hasImage ? (getProxiedImageUrl(getFirstImageUrl(piece.image_url)) || getKarbalaPlaceholder(piece.id)) : getKarbalaPlaceholder(piece.id)} 
          alt={`${piece.title}${piece.reciter ? ` by ${piece.reciter}` : ''}`}
          className={`w-full h-full object-cover transition-transform duration-500 ${isPressed ? 'scale-100' : 'group-hover:scale-105'}`}
          loading="lazy"
          title={piece.title}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getKarbalaPlaceholder(piece.id);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        
          {hasVideo && (
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="w-12 h-12 rounded-xl bg-accent/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                <Video className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        
        <div className={`absolute bottom-4 left-4 right-4 flex items-center justify-center transition-all duration-300 ${isPressed ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}>
          <div className="w-16 h-16 rounded-full bg-primary shadow-xl flex items-center justify-center border-4 border-white/30">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>
      
      <div className="relative z-10 p-5 md:p-6">
        <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 transition-opacity duration-300 ${isPressed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
        
        <div className="relative z-10">
          <h3 
            className={`font-arabic-heading text-xl sm:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300 leading-[2.0] line-clamp-2 ${textAlign}`}
            style={{
              fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
            }}
            dir={getTextDirection(piece.title)}
          >
            {piece.title}
          </h3>
          
          <div className={`flex flex-wrap items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {piece.reciter && (
              <Badge variant="secondary" className="text-sm px-3 py-1.5 font-medium rounded-lg">
                {piece.reciter}
              </Badge>
            )}
            <Badge variant="outline" className="text-sm px-3 py-1.5 font-medium rounded-lg">
              {piece.language}
            </Badge>
          </div>
          
          {!hasImage && piece.text_content && (
            <p 
              className={`text-base text-muted-foreground font-arabic line-clamp-2 leading-relaxed mb-4 ${getTextAlignmentClass(piece.text_content)}`}
              dir={getTextDirection(piece.text_content)}
            >
              {piece.text_content.slice(0, 150)}...
            </p>
          )}
          
          <div className={`flex items-center justify-between pt-4 border-t border-border/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
              {piece.view_count > 0 && (
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{piece.view_count.toLocaleString()} views</span>
                </span>
              )}
            </div>
            
            <span className={`text-sm font-bold text-primary flex items-center gap-2 transition-all duration-300 ${isPressed ? 'translate-x-1' : 'group-hover:translate-x-1'} ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>Open</span>
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});
