import { TrendingUp } from 'lucide-react';
import { PopularPieceCard } from '@/components/cards/PopularPieceCard';
import type { Piece } from '@/lib/supabase-types';

interface PopularPiecesSectionProps {
  pieces: Piece[];
}

export function PopularPiecesSection({ pieces }: PopularPiecesSectionProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="py-8 sm:py-12 md:py-16">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">
            Most Popular
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 ml-8">
          Widely read recitations
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {pieces.map((piece, i) => (
          <PopularPieceCard 
            key={piece.id} 
            piece={piece} 
            index={i}
            totalItems={pieces.length}
          />
        ))}
      </div>
    </section>
  );
}
