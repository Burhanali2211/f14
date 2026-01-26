import { History, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { getTextDirection, getTextAlignmentClass, getKarbalaPlaceholder, getFirstImageUrl } from '@/lib/utils';
import type { Piece } from '@/lib/supabase-types';

interface ContinueReadingSectionProps {
  pieces: Piece[];
}

export function ContinueReadingSection({ pieces }: ContinueReadingSectionProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10">
            <History className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Continue Reading
          </h2>
        </div>
      </div>
      
      <div className="relative -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {pieces.map((piece, i) => (
            <ContinueCard key={piece.id} piece={piece} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ContinueCard({ piece, index }: { piece: Piece; index: number }) {
  const { getProgress } = useReadingProgress();
  const progress = getProgress(piece.id);
  const firstImageUrl = getFirstImageUrl(piece.image_url);
  const hasImage = !!firstImageUrl;
  
  const hasProgressData = progress && (progress.scrollPosition > 0 || progress.currentVerse > 0);
  const progressPercent = progress?.completed 
    ? 100 
    : hasProgressData 
      ? Math.min(90, Math.max(10, progress.currentVerse > 0 ? (progress.currentVerse * 5) : 25))
      : 0;

  return (
    <Link
      to={`/piece/${piece.id}`}
      className="group relative flex-shrink-0 w-[280px] sm:w-[320px] snap-start animate-slide-up opacity-0"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="relative h-20 sm:h-24 rounded-xl overflow-hidden bg-card border border-border/40 hover:border-primary/40 transition-all">
        <div className="absolute inset-0">
          <img 
            src={firstImageUrl || getKarbalaPlaceholder(piece.id)} 
            alt=""
            className="w-full h-full object-cover opacity-30"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getKarbalaPlaceholder(piece.id);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/95 to-card/80" />
        </div>
        
        <div className="relative h-full flex items-center gap-3 p-3 sm:p-4">
          <div className="relative flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden ring-2 ring-primary/20">
                <img 
                  src={firstImageUrl || getKarbalaPlaceholder(piece.id)} 
                  alt={piece.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getKarbalaPlaceholder(piece.id);
                  }}
                />
              </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
              <Play className="w-2.5 h-2.5 text-primary-foreground fill-current" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 
              className={`font-arabic-heading text-sm sm:text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-relaxed ${getTextAlignmentClass(piece.title)}`}
              style={{ fontFamily: "'Noto Nastaliq Urdu', 'Lateef', sans-serif" }}
              dir={getTextDirection(piece.title)}
            >
              {piece.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                {progress?.completed ? 'Done' : `${Math.round(progressPercent)}%`}
              </span>
            </div>
          </div>
          
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}
