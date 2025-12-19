import { Clock } from 'lucide-react';
import { RecentPieceCard } from '@/components/cards/RecentPieceCard';
import type { Piece } from '@/lib/supabase-types';

interface RecentPiecesSectionProps {
  pieces: Piece[];
}

export function RecentPiecesSection({ pieces }: RecentPiecesSectionProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="py-8 sm:py-12 md:py-16">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">
            Recently Added
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 ml-8">
          Latest additions to our collection
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {pieces.map((piece, i) => (
          <RecentPieceCard key={piece.id} piece={piece} index={i} />
        ))}
      </div>
    </section>
  );
}
