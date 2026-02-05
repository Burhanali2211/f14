import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, FileText, Music, Layers, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getFirstImageUrl, getKarbalaPlaceholder, normalizeImageUrl, getProxiedImageUrl } from '@/lib/utils';

export interface StudioPieceCardItem {
  id: string;
  title: string;
  image_url?: string | string[] | null;
  imageUrls?: string[];
  pdfUrl?: string | null;
  audio_url?: string | null;
  audioUrl?: string | null;
  text_content?: string | null;
}

interface StudioPieceCardProps {
  item: StudioPieceCardItem;
  hasImageSegments?: boolean;
  isOfflineDraft?: boolean;
  onOpen?: (id: string) => void;
}

function getThumbnailUrl(item: StudioPieceCardItem): string | null {
  if (item.imageUrls && item.imageUrls.length > 0) {
    const firstImage = item.imageUrls.find((u) => !u.toLowerCase().endsWith('.pdf'));
    return firstImage || item.imageUrls[0] || null;
  }
  const urls = normalizeImageUrl(item.image_url);
  const firstImage = urls.find((u) => !u.toLowerCase().endsWith('.pdf'));
  return firstImage || (urls[0] ?? null);
}

function hasPdf(item: StudioPieceCardItem): boolean {
  if (item.pdfUrl) return true;
  const urls = normalizeImageUrl(item.image_url);
  return urls.some((u) => u.toLowerCase().endsWith('.pdf'));
}

function hasAudio(item: StudioPieceCardItem): boolean {
  return !!(item.audio_url || item.audioUrl);
}

function hasImages(item: StudioPieceCardItem): boolean {
  const urls = item.imageUrls ?? normalizeImageUrl(item.image_url);
  return urls.some((u) => !u.toLowerCase().endsWith('.pdf'));
}

export function StudioPieceCard({
  item,
  hasImageSegments = false,
  isOfflineDraft = false,
  onOpen,
}: StudioPieceCardProps) {
  const navigate = useNavigate();
  const thumbnailUrl = getThumbnailUrl(item);
  const placeholderUrl = getKarbalaPlaceholder(item.id);

  const handleOpen = () => {
    if (onOpen) {
      onOpen(item.id);
    } else if (!isOfflineDraft) {
      navigate(`/piece/${item.id}/teleprompter/studio`);
    }
  };

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
      <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-border bg-muted">
        <img
          src={getProxiedImageUrl(thumbnailUrl) || placeholderUrl}
          alt={item.title || 'Piece thumbnail'}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = placeholderUrl;
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium truncate">{item.title || 'Untitled'}</h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {hasImages(item) && (
            <Badge variant="secondary" className="text-xs gap-1">
              <ImageIcon className="w-3 h-3" />
              Images
            </Badge>
          )}
          {hasPdf(item) && (
            <Badge variant="secondary" className="text-xs gap-1">
              <FileText className="w-3 h-3" />
              PDF
            </Badge>
          )}
          {hasAudio(item) && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Music className="w-3 h-3" />
              Audio
            </Badge>
          )}
          {hasImageSegments && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Layers className="w-3 h-3" />
              Segments
            </Badge>
          )}
          {isOfflineDraft && (
            <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-500/30">
              <CloudOff className="w-3 h-3" />
              Pending sync
            </Badge>
          )}
        </div>
      </div>
      {!isOfflineDraft && (
        <Button
          size="sm"
          onClick={handleOpen}
          className="shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
          aria-label={`Open ${item.title} in studio`}
        >
          Open
        </Button>
      )}
    </div>
  );
}
