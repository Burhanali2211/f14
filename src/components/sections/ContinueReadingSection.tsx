import { History } from 'lucide-react';
import { ContinueReadingCard } from '@/components/cards/ContinueReadingCard';
import type { Piece } from '@/lib/supabase-types';

interface ContinueReadingSectionProps {
  pieces: Piece[];
}

export function ContinueReadingSection({ pieces }: ContinueReadingSectionProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="py-8 sm:py-12 md:py-16">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">
            Continue Reading
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 ml-8">
          Pick up where you left off
        </p>
      </div>
      
      <div className="flex flex-col gap-3 sm:gap-4 md:gap-5 lg:grid lg:grid-cols-2 lg:gap-6">
        {pieces.map((piece, i) => (
          <ContinueReadingCard key={piece.id} piece={piece} index={i} />
        ))}
      </div>
    </section>
  );
}
