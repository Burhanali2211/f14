import { useState, memo } from 'react';
import { Loader2 } from 'lucide-react';
import { sanitizeYouTubeUrl, sanitizeUrl } from '@/lib/sanitize';

interface SimpleVideoPlayerProps {
  src: string;
  title?: string;
}

export const SimpleVideoPlayer = memo(function SimpleVideoPlayer({ src, title }: SimpleVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  const sanitizedUrl = sanitizeYouTubeUrl(src) || sanitizeUrl(src);
  if (!sanitizedUrl) {
    return (
      <div className="bg-card rounded-3xl p-8 text-center text-muted-foreground">
        Video unavailable
      </div>
    );
  }

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(sanitizedUrl);

  if (youtubeId) {
    const embedParams = new URLSearchParams({
      autoplay: '0',
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
      <div className="w-full rounded-3xl overflow-hidden shadow-xl bg-black">
        <div className="aspect-video w-full relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?${embedParams.toString()}`}
            title={title || 'Video'}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-xl bg-black">
      <video
        src={sanitizedUrl}
        controls
        className="w-full aspect-video"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
});
