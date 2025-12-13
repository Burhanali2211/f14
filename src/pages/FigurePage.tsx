import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Users } from 'lucide-react';
import { Header } from '@/components/Header';
import { PieceCard } from '@/components/PieceCard';
import { supabase } from '@/integrations/supabase/client';
import type { Piece, Imam } from '@/lib/supabase-types';

export default function FigurePage() {
  const { slug } = useParams<{ slug: string }>();
  const [imam, setImam] = useState<Imam | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      // Get imam
      const { data: imamData } = await supabase
        .from('imams')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (imamData) {
        setImam(imamData as Imam);

        // Get pieces for this imam
        const { data: piecesData } = await supabase
          .from('pieces')
          .select('*')
          .eq('imam_id', imamData.id)
          .order('created_at', { ascending: false });

        if (piecesData) setPieces(piecesData as Piece[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!imam) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Holy Personality not found</h1>
            <Link to="/" className="text-primary hover:underline">
              Go back home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                {imam.name}
              </h1>
              {(imam.description || imam.title) && (
                <p className="text-muted-foreground mt-1">{imam.description || imam.title}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {pieces.length} recitation{pieces.length !== 1 ? 's' : ''} in honor of {imam.name}
          </p>
        </div>

        {/* Pieces Grid */}
        {pieces.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pieces.map((piece, index) => (
              <PieceCard key={piece.id} piece={piece} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No recitations found for {imam.name} yet.
          </div>
        )}
      </main>
    </div>
  );
}
