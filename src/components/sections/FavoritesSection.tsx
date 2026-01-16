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
    <section className="py-12 sm:py-14 md:py-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Your Favorites</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Recitations you've saved</p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-xl self-start sm:self-auto">
          <Link to="/favorites">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
        {pieces.map((piece, i) => (
          <PieceCard key={piece.id} piece={piece} index={i} />
        ))}
      </div>
    </section>
  );
}
