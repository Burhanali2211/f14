import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { PieceCard } from '@/components/PieceCard';
import { Button } from '@/components/ui/button';
import type { Piece } from '@/lib/supabase-types';

interface FavoritesSectionProps {
  pieces: Piece[];
}

export function FavoritesSection({ pieces }: FavoritesSectionProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Your Favorites</h2>
            <p className="text-sm text-muted-foreground">Recitations you've saved</p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/favorites">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-5">
        {pieces.map((piece, i) => (
          <PieceCard key={piece.id} piece={piece} index={i} />
        ))}
      </div>
    </section>
  );
}
