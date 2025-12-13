import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, ChevronLeft, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PieceCard } from '@/components/PieceCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFavorites } from '@/hooks/use-favorites';
import { supabase } from '@/integrations/supabase/client';
import type { Piece } from '@/lib/supabase-types';

export default function FavoritesPage() {
  const { favorites, recentlyViewed, clearRecentlyViewed } = useFavorites();
  const [favoritePieces, setFavoritePieces] = useState<Piece[]>([]);
  const [recentPieces, setRecentPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPieces();
  }, [favorites, recentlyViewed]);

  const fetchPieces = async () => {
    // Fetch favorite pieces
    if (favorites.length > 0) {
      const { data: favData } = await supabase
        .from('pieces')
        .select('*')
        .in('id', favorites);
      
      if (favData) {
        // Maintain favorites order
        const ordered = favorites
          .map(id => favData.find(p => p.id === id))
          .filter(Boolean) as Piece[];
        setFavoritePieces(ordered);
      }
    } else {
      setFavoritePieces([]);
    }

    // Fetch recently viewed pieces
    if (recentlyViewed.length > 0) {
      const { data: recentData } = await supabase
        .from('pieces')
        .select('*')
        .in('id', recentlyViewed);
      
      if (recentData) {
        // Maintain recent order
        const ordered = recentlyViewed
          .map(id => recentData.find(p => p.id === id))
          .filter(Boolean) as Piece[];
        setRecentPieces(ordered);
      }
    } else {
      setRecentPieces([]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container py-8 flex-1">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="font-display text-3xl font-bold text-foreground mb-8">
          My Collection
        </h1>

        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="w-4 h-4" />
              Favorites ({favoritePieces.length})
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="w-4 h-4" />
              Recently Viewed ({recentPieces.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites">
            {favoritePieces.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {favoritePieces.map((piece, i) => (
                  <PieceCard key={piece.id} piece={piece} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No favorites yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start adding recitations to your favorites while reading
                </p>
                <Button asChild>
                  <Link to="/">Browse Content</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent">
            {recentPieces.length > 0 ? (
              <>
                <div className="flex justify-end mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearRecentlyViewed}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear history
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {recentPieces.map((piece, i) => (
                    <PieceCard key={piece.id} piece={piece} index={i} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No reading history</h3>
                <p className="text-muted-foreground mb-4">
                  Recitations you read will appear here
                </p>
                <Button asChild>
                  <Link to="/">Start Reading</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
