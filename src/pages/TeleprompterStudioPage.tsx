import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImageUrl } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth-utils';
import { useUserRole } from '@/hooks/use-user-role';
import { toast } from '@/hooks/use-toast';
import { StudioHeader } from '@/components/teleprompter-studio/StudioHeader';
import { StudioUploadZone, type StudioDraft } from '@/components/teleprompter-studio/StudioUploadZone';
import { StudioContentRouter } from '@/components/teleprompter-studio/StudioContentRouter';
import { StudioFeaturesOverview } from '@/components/teleprompter-studio/StudioFeaturesOverview';
import { StudioPiecesList } from '@/components/teleprompter-studio/StudioPiecesList';
import { OfflineBanner } from '@/components/teleprompter-studio/OfflineBanner';

async function fetchPiece(id: string) {
  const { data, error } = await supabase.from('pieces').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function createPieceFromDraft(draft: StudioDraft): Promise<string> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('You must be signed in to create a piece');
  }

  const { data: categories } = await supabase.from('categories').select('id').order('name').limit(1);
  const categoryId = categories?.[0]?.id;
  if (!categoryId) {
    throw new Error('No category found. An admin must create a category first.');
  }

  const imageUrlArray = [...draft.imageUrls];
  if (draft.pdfUrl) imageUrlArray.push(draft.pdfUrl);

  const { data: piece, error } = await supabase
    .from('pieces')
    .insert({
      title: draft.title,
      category_id: categoryId,
      text_content: '',
      image_url: imageUrlArray.length > 0 ? imageUrlArray : null,
      audio_url: draft.audioUrl,
      user_id: user.id,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!piece?.id) throw new Error('Failed to create piece');
  return piece.id;
}

export default function TeleprompterStudioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUserRole();
  const isNewDraft = !id;

  const [content, setContent] = useState<{
    imageUrls: string[];
    pdfUrl: string | null;
    audioUrl: string | null;
  } | null>(null);

  const handleContentReady = useCallback(
    (c: { imageUrls: string[]; pdfUrl: string | null; audioUrl: string | null }) => {
      setContent(c);
    },
    []
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />
      <StudioHeader
        title={isNewDraft ? 'Teleprompter Studio' : 'Edit Teleprompter'}
        pieceId={id}
        onBack={() => (isNewDraft ? navigate('/') : navigate(`/piece/${id}/teleprompter`))}
      />
      <main className="flex-1 p-4 space-y-10">
        {isNewDraft ? (
          <>
            <StudioFeaturesOverview />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Create new piece</h2>
              <StudioUploadZone
                pieceId={null}
                onContentReady={handleContentReady}
                onSaveDraft={user ? createPieceFromDraft : undefined}
              />
            </div>
            <StudioPiecesList />
          </>
        ) : (
          <StudioUploadZoneWithRouter
            pieceId={id!}
            onContentReady={handleContentReady}
          />
        )}
      </main>
    </div>
  );
}

interface StudioUploadZoneWithRouterProps {
  pieceId: string;
  onContentReady: (content: { imageUrls: string[]; pdfUrl: string | null; audioUrl: string | null }) => void;
}

function StudioUploadZoneWithRouter({ pieceId, onContentReady }: StudioUploadZoneWithRouterProps) {
  const navigate = useNavigate();
  const { data: piece, isLoading, error } = useQuery({
    queryKey: ['piece', pieceId],
    queryFn: () => fetchPiece(pieceId),
    enabled: !!pieceId,
  });

  if (error || (!isLoading && !piece)) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <h3 className="text-lg font-semibold">Piece not found</h3>
        <p className="text-muted-foreground text-sm">
          This piece may have been deleted or you don't have access to it.
        </p>
        <Button onClick={() => navigate('/')}>Go home</Button>
      </div>
    );
  }

  if (isLoading || !piece) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const allUrls = normalizeImageUrl(piece.image_url);
  const imageUrls = allUrls.filter((u) => !u.toLowerCase().endsWith('.pdf'));
  const pdfUrl = allUrls.find((u) => u.toLowerCase().endsWith('.pdf')) || null;
  const audioUrl = piece.audio_url
    ? piece.audio_url.startsWith('audio/')
      ? `/api/r2-audio-proxy?key=${encodeURIComponent(piece.audio_url)}`
      : piece.audio_url
    : null;

  const hasVisualContent = imageUrls.length > 0 || pdfUrl;
  const hasTextContent = !!piece.text_content?.trim();

  if (hasVisualContent || hasTextContent) {
    return (
      <div className="space-y-8">
        <StudioUploadZone pieceId={pieceId} onContentReady={onContentReady} />
        <StudioContentRouter
          pieceId={pieceId}
          pieceTitle={piece.title}
          imageUrls={imageUrls}
          pdfUrl={pdfUrl}
          audioUrl={audioUrl}
          textContent={piece.text_content}
        />
      </div>
    );
  }

  return <StudioUploadZone pieceId={pieceId} onContentReady={onContentReady} />;
}
