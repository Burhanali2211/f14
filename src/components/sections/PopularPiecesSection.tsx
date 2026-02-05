import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Eye, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getTextDirection, getTextAlignmentClass, getKarbalaPlaceholder, getFirstImageUrl, getProxiedImageUrl } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import type { Piece } from '@/lib/supabase-types';

const PAGE_SIZE = 6;

export function PopularPiecesSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  const piecesRef = useRef<Piece[]>([]);
  piecesRef.current = pieces;

  const fetchPopular = useCallback(async (append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const offset = append ? piecesRef.current.length : 0;
      const { data, error } = await safeQuery(async () => {
        const result = await supabase
          .from('pieces')
          .select('id, title, image_url, reciter, language, view_count, video_url, created_at, category_id')
          .gte('view_count', 30)
          .order('view_count', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        return result;
      });
      if (!error && data) {
        const newPieces = (data as Piece[]) || [];
        setPieces(prev => append ? [...prev, ...newPieces] : newPieces);
        setHasMore(newPieces.length === PAGE_SIZE);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);
  
  useEffect(() => {
    fetchPopular();
  }, []);
  
  const loadingMoreRef = useRef(false);
  loadingMoreRef.current = loadingMore;
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMore;

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      const nearEnd = scrollLeft >= scrollWidth - clientWidth - 50;
      if (nearEnd && hasMoreRef.current && !loadingMoreRef.current && piecesRef.current.length >= PAGE_SIZE) {
        fetchPopular(true);
      }
    }
  }, [fetchPopular]);
  
  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [pieces, checkScroll]);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      if (direction === 'right' && hasMoreRef.current && !loadingMoreRef.current && piecesRef.current.length >= PAGE_SIZE) {
        setTimeout(() => {
          if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            if (scrollLeft >= scrollWidth - clientWidth - 150) {
              fetchPopular(true);
            }
          }
        }, 400);
      }
    }
  };

  if (loading && pieces.length === 0) return null;

  return (
    <section className="py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-orange-500/10">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Most Popular
          </h2>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scroll('right')}
            disabled={!canScrollRight && !hasMore && !loadingMore}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="relative -mx-4 sm:-mx-5 md:-mx-6">
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-4 sm:px-5 md:px-6 pb-2 scrollbar-hide snap-x snap-mandatory"
        >
          {pieces.map((piece, i) => (
            <PopularCard key={piece.id} piece={piece} rank={i + 1} />
          ))}
          {loadingMore && (
            <div className="flex-shrink-0 w-[200px] sm:w-[220px] flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PopularCard({ piece, rank }: { piece: Piece; rank: number }) {
  const firstImageUrl = getFirstImageUrl(piece.image_url);
  const hasImage = !!firstImageUrl;
  const views = piece.view_count || 0;

  return (
    <Link
      to={`/piece/${piece.id}`}
      className="group relative flex-shrink-0 w-[200px] sm:w-[220px] snap-start animate-slide-up opacity-0"
      style={{ animationDelay: `${rank * 0.06}s` }}
      title={`Read ${piece.title}${piece.reciter ? ` by ${piece.reciter}` : ''}`}
    >
      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-card border border-border/40 hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
        <img 
          src={hasImage ? (getProxiedImageUrl(firstImageUrl) ?? firstImageUrl!) : getKarbalaPlaceholder(piece.id)} 
          alt={piece.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getKarbalaPlaceholder(piece.id);
          }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute top-3 left-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
            rank === 1 ? 'bg-yellow-500 text-yellow-950' :
            rank === 2 ? 'bg-slate-300 text-slate-800' :
            rank === 3 ? 'bg-amber-600 text-amber-50' :
            'bg-card/90 text-foreground'
          }`}>
            {rank}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 
            className={`font-arabic-heading text-sm sm:text-base font-semibold text-white mb-2 line-clamp-2 leading-relaxed ${getTextAlignmentClass(piece.title)}`}
            style={{ fontFamily: "'Noto Nastaliq Urdu', 'Lateef', sans-serif" }}
            dir={getTextDirection(piece.title)}
          >
            {piece.title}
          </h3>
          
          <div className="flex items-center gap-1.5 text-white/70">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-xs">{views >= 1000 ? `${(views/1000).toFixed(1)}k` : views}</span>
            {piece.reciter && (
              <>
                <span className="mx-1">•</span>
                <span className="text-xs truncate">{piece.reciter}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
