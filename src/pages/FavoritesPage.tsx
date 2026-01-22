import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, ChevronLeft, Trash2, BookOpen } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PieceCard } from '@/components/PieceCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFavorites } from '@/hooks/use-favorites';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import type { Piece } from '@/lib/supabase-types';

export default function FavoritesPage() {
  const { favorites, recentlyViewed, clearRecentlyViewed } = useFavorites();
  const [favoritePieces, setFavoritePieces] = useState<Piece[]>([]);
  const [recentPieces, setRecentPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

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
          className={`inline-flex items-center gap-2 ${isMobile ? 'text-base' : 'text-sm'} text-muted-foreground hover:text-foreground transition-colors mb-6 min-h-[44px] touch-manipulation`}
        >
          <ChevronLeft className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          Back to Home
        </Link>

        <h1 className={`font-display ${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground mb-6`}>
          My Collection
        </h1>

        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList className={`bg-card ${isMobile ? 'w-full grid grid-cols-2' : ''}`}>
            <TabsTrigger value="favorites" className={`${isMobile ? 'gap-2 h-12 text-base' : 'gap-2'}`}>
              <Heart className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
              <span className={isMobile ? 'font-semibold' : ''}>
                Favorites {!isMobile && `(${favoritePieces.length})`}
              </span>
              {isMobile && (
                <Badge variant="secondary" className="ml-1">
                  {favoritePieces.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent" className={`${isMobile ? 'gap-2 h-12 text-base' : 'gap-2'}`}>
              <Clock className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
              <span className={isMobile ? 'font-semibold' : ''}>
                Recent {!isMobile && `(${recentPieces.length})`}
              </span>
              {isMobile && (
                <Badge variant="secondary" className="ml-1">
                  {recentPieces.length}
                </Badge>
              )}
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
              <div className="text-center py-12 sm:py-16 bg-card rounded-2xl border border-dashed border-border">
                <Heart className={`${isMobile ? 'w-16 h-16' : 'w-12 h-12'} text-muted-foreground mx-auto mb-4`} />
                <h3 className={`${isMobile ? 'text-xl' : 'text-lg'} font-semibold text-foreground mb-2`}>
                  No favorites yet
                </h3>
                <p className={`${isMobile ? 'text-base' : 'text-sm'} text-muted-foreground mb-6 px-4`}>
                  Start adding recitations to your favorites while reading. Tap the heart icon on any piece to save it.
                </p>
                <Button asChild size={isMobile ? 'lg' : 'default'} className={isMobile ? 'h-12 px-8' : ''}>
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
                    size={isMobile ? 'lg' : 'sm'}
                    onClick={clearRecentlyViewed}
                    className={`${isMobile ? 'h-12 px-4' : ''} text-muted-foreground touch-manipulation`}
                  >
                    <Trash2 className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} mr-2`} />
                    <span className={isMobile ? 'text-base' : ''}>Clear history</span>
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {recentPieces.map((piece, i) => (
                    <PieceCard key={piece.id} piece={piece} index={i} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 sm:py-16 bg-card rounded-2xl border border-dashed border-border">
                <Clock className={`${isMobile ? 'w-16 h-16' : 'w-12 h-12'} text-muted-foreground mx-auto mb-4`} />
                <h3 className={`${isMobile ? 'text-xl' : 'text-lg'} font-semibold text-foreground mb-2`}>
                  No reading history
                </h3>
                <p className={`${isMobile ? 'text-base' : 'text-sm'} text-muted-foreground mb-6 px-4`}>
                  Recitations you read will appear here automatically. Start reading to build your history.
                </p>
                <Button asChild size={isMobile ? 'lg' : 'default'} className={isMobile ? 'h-12 px-8' : ''}>
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
