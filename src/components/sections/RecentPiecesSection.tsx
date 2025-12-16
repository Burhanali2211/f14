import { Clock } from 'lucide-react';
import { PieceCard } from '@/components/PieceCard';
import type { Piece } from '@/lib/supabase-types';

interface RecentPiecesSectionProps {
  pieces: Piece[];
}

export function RecentPiecesSection({ pieces }: RecentPiecesSectionProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Recently Added</h2>
            <p className="text-sm text-muted-foreground">Latest additions to our collection</p>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pieces.map((piece, i) => (
          <PieceCard key={piece.id} piece={piece} index={i} />
        ))}
      </div>
    </section>
  );
}
