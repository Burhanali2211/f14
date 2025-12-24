import { forwardRef } from 'react';
import { sanitizeYouTubeUrl, sanitizeUrl } from '@/lib/sanitize';

interface VideoPlayerProps {
  src: string;
  title?: string;
}

export const VideoPlayer = forwardRef<HTMLIFrameElement | HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer({ src, title }, ref) {
  // Sanitize and validate URL
  const sanitizedUrl = sanitizeYouTubeUrl(src) || sanitizeUrl(src);
  if (!sanitizedUrl) {
    return (
      <div className="bg-card rounded-xl p-8 text-center text-muted-foreground">
        Invalid video URL
      </div>
    );
  }

  // Check if it's a YouTube URL
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(sanitizedUrl);

  if (youtubeId) {
    // Note: YouTube's embedded player may generate console warnings/errors from their
    // third-party CSS and JavaScript files. These are harmless and cannot be fixed
    // from our codebase. A console filter in main.tsx suppresses most of these warnings.
    // To see all warnings for debugging, run: localStorage.setItem('showYoutubeWarnings', 'true')
    
    // Build YouTube embed URL with parameters to hide UI elements
    const embedParams = new URLSearchParams({
      autoplay: '0',
      controls: '1', // Keep controls but minimize other UI
      disablekb: '0', // Allow keyboard controls
      enablejsapi: '1',
      fs: '1', // Allow fullscreen
      iv_load_policy: '3', // Hide annotations
      modestbranding: '1', // Minimal YouTube branding
      playsinline: '1',
      rel: '0', // Don't show related videos
      showinfo: '0', // Hide video info (deprecated but still works)
      cc_load_policy: '0', // Hide captions by default
      origin: window.location.origin,
    });
    
    return (
      <div className="w-full rounded-xl overflow-hidden shadow-soft bg-black">
        <div className="aspect-video w-full">
          <iframe
            ref={ref as React.Ref<HTMLIFrameElement>}
            src={`https://www.youtube.com/embed/${youtubeId}?${embedParams.toString()}`}
            title={title || 'Video'}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full border-0"
            style={{ display: 'block' }}
            onError={() => {
              // Silently handle iframe errors - YouTube's player handles its own errors
            }}
          />
        </div>
      </div>
    );
  }

  // Direct video URL
  return (
    <div className="w-full rounded-xl overflow-hidden shadow-soft bg-black">
      <video
        ref={ref as React.Ref<HTMLVideoElement>}
        src={sanitizedUrl}
        controls
        className="w-full aspect-video"
        preload="metadata"
        onError={(e) => {
          const target = e.target as HTMLVideoElement;
          target.style.display = 'none';
          const errorDiv = document.createElement('div');
          errorDiv.className = 'bg-card rounded-xl p-8 text-center text-muted-foreground';
          errorDiv.textContent = 'Failed to load video. The URL may be invalid or the video may not be accessible.';
          target.parentElement?.appendChild(errorDiv);
        }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
});
