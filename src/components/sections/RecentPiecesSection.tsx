import { Sparkles, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getTextDirection, getTextAlignmentClass, getKarbalaPlaceholder, getFirstImageUrl, getProxiedImageUrl } from '@/lib/utils';
import type { Piece } from '@/lib/supabase-types';

interface RecentPiecesSectionProps {
  pieces: Piece[];
}

export function RecentPiecesSection({ pieces }: RecentPiecesSectionProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-emerald-500/10">
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Recently Added
          </h2>
        </div>
        <Link 
          to="/category/all?sort=recent" 
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
          title="View all recently added recitations"
        >
          View all
        </Link>
      </div>
      
      <div className="space-y-2">
        {pieces.slice(0, 8).map((piece, i) => (
          <RecentItem key={piece.id} piece={piece} index={i} />
        ))}
      </div>
    </section>
  );
}

function RecentItem({ piece, index }: { piece: Piece; index: number }) {
  const firstImageUrl = getFirstImageUrl(piece.image_url);
  const hasImage = !!firstImageUrl;
  
  const daysSinceAdded = piece.created_at 
    ? Math.floor((Date.now() - new Date(piece.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
    
  const timeLabel = daysSinceAdded === 0 
    ? 'Today' 
    : daysSinceAdded === 1 
      ? 'Yesterday'
      : daysSinceAdded < 7
        ? `${daysSinceAdded}d ago`
        : `${Math.floor(daysSinceAdded / 7)}w ago`;

  return (
    <Link
      to={`/piece/${piece.id}`}
      className="group flex items-center gap-3 p-2 sm:p-2.5 rounded-lg hover:bg-muted/50 transition-colors animate-slide-up opacity-0"
      style={{ animationDelay: `${index * 0.04}s` }}
      title={`Read ${piece.title}${piece.reciter ? ` by ${piece.reciter}` : ''}`}
    >
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        <img 
          src={getProxiedImageUrl(firstImageUrl, { width: 96, height: 96 }) || getKarbalaPlaceholder(piece.id)} 
          alt={piece.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getKarbalaPlaceholder(piece.id);
          }}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 
          className={`font-arabic-heading text-sm sm:text-base font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors ${getTextAlignmentClass(piece.title)}`}
          style={{ fontFamily: "'Noto Nastaliq Urdu', 'Lateef', sans-serif" }}
          dir={getTextDirection(piece.title)}
        >
          {piece.title}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          {piece.reciter && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{piece.reciter}</span>
          )}
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{piece.language}</span>
        </div>
      </div>
      
      <Badge 
        variant={daysSinceAdded === 0 ? "default" : "secondary"} 
        className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 ${daysSinceAdded === 0 ? 'bg-emerald-500/90' : ''}`}
      >
        {daysSinceAdded === 0 && <Sparkles className="w-2.5 h-2.5 mr-0.5" />}
        {timeLabel}
      </Badge>
    </Link>
  );
}
