import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Mic } from 'lucide-react';
import { Header } from '@/components/Header';
import { PieceCard } from '@/components/PieceCard';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { Piece, Artiste } from '@/lib/supabase-types';

export default function ArtistPage() {
  const { reciterName } = useParams<{ reciterName: string }>();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [artiste, setArtiste] = useState<Artiste | null>(null);
  const [loading, setLoading] = useState(true);
  const [artistName, setArtistName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!reciterName) return;

      // Decode the reciter name (URL encoded)
      const decodedName = decodeURIComponent(reciterName);
      setArtistName(decodedName);

      // Fetch artiste data and pieces in parallel
      const [artisteRes, piecesRes] = await Promise.all([
        safeQuery(async () =>
          await (supabase as any)
            .from('artistes')
            .select('*')
            .eq('name', decodedName)
            .maybeSingle()
        ),
        safeQuery(async () =>
          await supabase
            .from('pieces')
            .select('*')
            .eq('reciter', decodedName)
            .order('created_at', { ascending: false })
        ),
      ]);

      if (artisteRes.error) {
        logger.error('Error fetching artiste:', artisteRes.error);
      } else if (artisteRes.data) {
        setArtiste(artisteRes.data as Artiste);
      }

      if (piecesRes.error) {
        logger.error('Error fetching artist recitations:', piecesRes.error);
      } else if (piecesRes.data) {
        setPieces(piecesRes.data as Piece[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [reciterName]);

  // Generate initials from name
  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

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
            {artiste?.image_url ? (
              <img
                src={artiste.image_url}
                alt={artistName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-elevated"
                loading="eager"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-elevated">
                {getInitials(artistName)}
              </div>
            )}
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                {artistName}
              </h1>
              <p className="text-muted-foreground mt-1">Reciter & Artist</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {pieces.length} recitation{pieces.length !== 1 ? 's' : ''} by {artistName}
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
            <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recitations found for {artistName} yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}
