import { TrendingUp } from 'lucide-react';
import { PieceCard } from '@/components/PieceCard';
import type { Piece } from '@/lib/supabase-types';

interface PopularPiecesSectionProps {
  pieces: Piece[];
}

export function PopularPiecesSection({ pieces }: PopularPiecesSectionProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Most Popular</h2>
            <p className="text-sm text-muted-foreground">Top viewed recitations</p>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-5">
        {pieces.map((piece, i) => (
          <PieceCard key={piece.id} piece={piece} index={i} />
        ))}
      </div>
    </section>
  );
}
