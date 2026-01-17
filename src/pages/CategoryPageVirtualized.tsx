import { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Link } from 'react-router-dom';
import { PieceCard } from '@/components/PieceCard';
import type { Piece } from '@/lib/supabase-types';
import { getTextAlignmentClass, getTextDirection, getKarbalaPlaceholder, getFirstImageUrl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Video, Eye, ArrowUpRight } from 'lucide-react';

interface VirtualizedPieceListProps {
  pieces: Piece[];
  viewMode: 'grid' | 'list';
  itemHeight?: number;
}

/**
 * Virtualized list component for CategoryPage
 * Only renders visible items for better performance with large lists
 */
export function VirtualizedPieceList({ 
  pieces, 
  viewMode, 
  itemHeight = 200 
}: VirtualizedPieceListProps) {
  // Calculate container height based on viewport
  const containerHeight = useMemo(() => {
    if (typeof window === 'undefined') return 600;
    return Math.min(window.innerHeight - 300, 800);
  }, []);

  // Row component for list view
  const ListRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const piece = pieces[index];
    if (!piece) return null;
    
    const isRTL = getTextDirection(piece.title) === 'rtl';
    const textAlign = getTextAlignmentClass(piece.title);
    
    return (
      <div style={style}>
        <Link
          to={`/piece/${piece.id}`}
          className="group flex items-center gap-3 md:gap-4 p-3 md:p-4 lg:p-5 rounded-xl md:rounded-2xl bg-card hover:bg-secondary/50 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 mx-2"
        >
          {/* Image */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-lg md:rounded-xl overflow-hidden flex-shrink-0 shadow-md group-hover:shadow-lg transition-all duration-300">
            <img 
              src={getFirstImageUrl(piece.image_url) || getKarbalaPlaceholder(piece.id)} 
              alt={piece.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = getKarbalaPlaceholder(piece.id);
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 md:gap-3 mb-2">
              <h3 
                className={`font-arabic-heading text-lg sm:text-xl md:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors leading-[2.2] sm:leading-[2.2] md:leading-[2.2] flex-1 line-clamp-2 break-words py-0.5 ${textAlign}`}
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
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                {piece.video_url && (
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-all duration-300 group-hover:scale-110" title="Has Video">
                    <Video className="w-4 h-4 md:w-4.5 md:h-4.5 text-accent group-hover:text-accent-foreground" />
                  </div>
                )}
              </div>
            </div>
            
            <div className={`flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              {piece.reciter && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {piece.reciter}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {piece.language}
              </Badge>
              {piece.view_count > 0 && (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{piece.view_count.toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Arrow */}
          <ArrowUpRight className={`w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary transition-all duration-300 flex-shrink-0 opacity-0 group-hover:opacity-100 ${isRTL ? 'transform translate-x-[4px] group-hover:translate-x-0' : 'transform translate-x-[-4px] group-hover:translate-x-0'}`} />
        </Link>
      </div>
    );
  };

  if (pieces.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
        <p className="text-muted-foreground">No recitations found</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <List
        itemCount={pieces.length}
        itemSize={itemHeight}
        className="scrollbar-hide"
        height={containerHeight}
        width="100%"
        overscanCount={3}
      >
        {ListRow}
      </List>
    );
  }

  // Grid view - rendered normally for now
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {pieces.slice(0, 100).map((piece, i) => (
        <PieceCard key={piece.id} piece={piece} index={i} compact={true} />
      ))}
    </div>
  );
}
