import { memo, useState } from 'react';
import { Play, Loader2, ExternalLink, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeYouTubeUrl, sanitizeUrl } from '@/lib/sanitize';

interface EnhancedVideoPlayerProps {
  src: string;
  title?: string;
}

export const EnhancedVideoPlayer = memo(function EnhancedVideoPlayer({ 
  src, 
  title = 'Video'
}: EnhancedVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [error, setError] = useState(false);
  
  const sanitizedUrl = sanitizeYouTubeUrl(src) || sanitizeUrl(src);

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = sanitizedUrl ? getYouTubeId(sanitizedUrl) : null;

  if (!sanitizedUrl) {
    return (
      <div className="w-full bg-muted/30 rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">Video unavailable</p>
      </div>
    );
  }

  if (youtubeId) {
    const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    const fallbackThumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    
    const embedParams = new URLSearchParams({
      autoplay: '1',
      controls: '1',
      enablejsapi: '1',
      fs: '1',
      iv_load_policy: '3',
      modestbranding: '1',
      playsinline: '1',
      rel: '0',
      origin: window.location.origin,
    });

    return (
      <div className="w-full">
        <div className="flex items-center justify-between gap-3 mb-3 px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Youtube className="w-4 h-4 text-red-500" />
            <span>YouTube Video</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank')}
            className="h-9 px-3 rounded-lg gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Open on YouTube</span>
          </Button>
        </div>

        <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-xl">
          <div className="aspect-video w-full relative">
            {!showPlayer ? (
              <button
                onClick={() => setShowPlayer(true)}
                className="absolute inset-0 w-full h-full group cursor-pointer"
                aria-label="Play video"
              >
                <img
                  src={thumbnailUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackThumbnail;
                  }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all group-hover:scale-110 shadow-2xl">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white text-sm sm:text-base font-medium line-clamp-2 drop-shadow-lg">
                    {title}
                  </p>
                </div>
              </button>
            ) : (
              <>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                  </div>
                )}
                
                {error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground">
                    <p className="mb-4">Could not load video</p>
                    <Button
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${youtubeId}`, '_blank')}
                    >
                      Watch on YouTube
                    </Button>
                  </div>
                ) : (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?${embedParams.toString()}`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="w-full h-full border-0"
                    onLoad={() => setIsLoading(false)}
                    onError={() => setError(true)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-3 px-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Play className="w-4 h-4" />
          <span>Video</span>
        </div>
      </div>

      <div className="w-full rounded-2xl overflow-hidden shadow-xl bg-black">
        <video
          src={sanitizedUrl}
          controls
          className="w-full aspect-video"
          preload="metadata"
          playsInline
          poster=""
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
});
