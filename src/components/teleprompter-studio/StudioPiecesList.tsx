import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, FileQuestion, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth-utils';
import { useUserRole } from '@/hooks/use-user-role';
import { getAllDrafts } from '@/lib/teleprompter-studio-storage';
import { StudioPieceCard, type StudioPieceCardItem } from './StudioPieceCard';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

async function fetchPiecesForUser(userId: string, isAdmin: boolean) {
  let query = supabase.from('pieces').select('id, title, image_url, audio_url, text_content').order('created_at', { ascending: false });
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchPieceIdsWithSegments(pieceIds: string[]): Promise<Set<string>> {
  if (pieceIds.length === 0) return new Set();
  try {
    const { data, error } = await supabase
      .from('piece_image_segments')
      .select('piece_id')
      .in('piece_id', pieceIds);
    if (error) return new Set();
    return new Set((data ?? []).map((r) => r.piece_id));
  } catch {
    return new Set();
  }
}

export function StudioPiecesList() {
  const { user, role, loading: roleLoading } = useUserRole();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineDrafts, setOfflineDrafts] = useState<Awaited<ReturnType<typeof getAllDrafts>>>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineDrafts = useCallback(async () => {
    try {
      const drafts = await getAllDrafts();
      setOfflineDrafts(drafts.filter((d) => !d.synced));
    } catch (err) {
      logger.error('Error loading offline drafts:', err);
      setOfflineDrafts([]);
    }
  }, []);

  useEffect(() => {
    if (!isOnline) {
      loadOfflineDrafts();
    }
  }, [isOnline, loadOfflineDrafts]);

  const canFetchPieces = Boolean(isOnline && user && (role === 'uploader' || role === 'admin'));

  const {
    data: pieces = [],
    isLoading: piecesLoading,
    error: piecesError,
  } = useQuery({
    queryKey: ['studio-pieces', user?.id, role, isOnline],
    queryFn: async () => {
      if (!user) return [];
      return fetchPiecesForUser(user.id, role === 'admin');
    },
    enabled: canFetchPieces,
    staleTime: 30_000,
  });

  const pieceIds = pieces.map((p) => p.id);
  const { data: segmentPieceIds = new Set<string>() } = useQuery({
    queryKey: ['studio-piece-segments', pieceIds.join(',')],
    queryFn: () => fetchPieceIdsWithSegments(pieceIds),
    enabled: Boolean(pieceIds.length > 0 && isOnline),
  });

  if (roleLoading) {
    return (
      <section aria-labelledby="studio-pieces-heading" className="max-w-2xl mx-auto">
        <h2 id="studio-pieces-heading" className="text-lg font-semibold mb-4">
          Open existing piece
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section aria-labelledby="studio-pieces-heading" className="max-w-2xl mx-auto">
        <h2 id="studio-pieces-heading" className="text-lg font-semibold mb-4">
          Open existing piece
        </h2>
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/30 text-center">
          <LogIn className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Sign in to create and manage your pieces.</p>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </section>
    );
  }

  const showOfflineDrafts = !isOnline && offlineDrafts.length > 0;
  const showPieces = isOnline && pieces.length > 0;
  const showEmpty = !showOfflineDrafts && !showPieces && !piecesLoading;

  if (showOfflineDrafts) {
    return (
      <section aria-labelledby="studio-pieces-heading" className="max-w-2xl mx-auto">
        <h2 id="studio-pieces-heading" className="text-lg font-semibold mb-4">
          Open existing piece
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Viewing offline drafts. Will sync when online.</p>
        <div className="space-y-3">
          {offlineDrafts.map((draft) => {
            const imageUrls = (draft.imageBlobs?.length ? draft.imageBlobs : draft.imageUrls) ?? [];
            const item: StudioPieceCardItem = {
              id: draft.id,
              title: draft.title,
              imageUrls,
              pdfUrl: draft.pdfBlob || draft.pdfUrl,
              audioUrl: draft.audioUrl,
            };
            return (
              <StudioPieceCard
                key={draft.id}
                item={item}
                isOfflineDraft
                onOpen={undefined}
              />
            );
          })}
        </div>
      </section>
    );
  }

  if (piecesLoading) {
    return (
      <section aria-labelledby="studio-pieces-heading" className="max-w-2xl mx-auto">
        <h2 id="studio-pieces-heading" className="text-lg font-semibold mb-4">
          Open existing piece
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (showEmpty || piecesError) {
    return (
      <section aria-labelledby="studio-pieces-heading" className="max-w-2xl mx-auto">
        <h2 id="studio-pieces-heading" className="text-lg font-semibold mb-4">
          Open existing piece
        </h2>
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/30 text-center">
          <FileQuestion className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No pieces yet. Create your first one above.</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="studio-pieces-heading" className="max-w-2xl mx-auto w-full">
      <h2 id="studio-pieces-heading" className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
        Open existing piece
      </h2>
      <div className="space-y-3">
        {pieces.map((piece) => (
          <StudioPieceCard
            key={piece.id}
            item={piece as StudioPieceCardItem}
            hasImageSegments={segmentPieceIds.has(piece.id)}
            onOpen={(id) => window.location.assign(`/piece/${id}/teleprompter/studio`)}
          />
        ))}
      </div>
    </section>
  );
}
