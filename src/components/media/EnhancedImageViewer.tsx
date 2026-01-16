import { memo, useState, useCallback } from 'react';
import { Download, Maximize2, Share2, ChevronLeft, ChevronRight, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface EnhancedImageViewerProps {
  images: string[];
  title: string;
  currentIndex?: number;
  onOpenFullscreen?: (index: number) => void;
}

export const EnhancedImageViewer = memo(function EnhancedImageViewer({
  images,
  title,
  currentIndex: externalIndex,
  onOpenFullscreen,
}: EnhancedImageViewerProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const currentIndex = externalIndex ?? internalIndex;
  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    setInternalIndex(newIndex);
    setImageLoaded(false);
    setImageError(false);
  }, [currentIndex, images.length]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    setInternalIndex(newIndex);
    setImageLoaded(false);
    setImageError(false);
  }, [currentIndex, images.length]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(currentImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = currentImage.split('.').pop()?.split('?')[0] || 'jpg';
      link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${currentIndex + 1}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Download started' });
    } catch {
      window.open(currentImage, '_blank');
      toast({ title: 'Opening image in new tab' });
    }
  }, [currentImage, title, currentIndex]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: window.location.href });
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied!' });
    }
  }, [title]);

  const handleFullscreen = useCallback(() => {
    if (onOpenFullscreen) {
      onOpenFullscreen(currentIndex);
    }
  }, [onOpenFullscreen, currentIndex]);

  if (images.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="w-4 h-4" />
          {hasMultipleImages ? (
            <span>Image {currentIndex + 1} of {images.length}</span>
          ) : (
            <span>Image</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-9 px-3 rounded-lg gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="h-9 px-3 rounded-lg gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleFullscreen}
            className="h-9 px-3 rounded-lg gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Fullscreen</span>
          </Button>
        </div>
      </div>

      <div className="relative bg-muted/30 rounded-2xl overflow-hidden border border-border">
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/90 hover:bg-background shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/90 hover:bg-background shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        <div 
          className="relative w-full cursor-pointer min-h-[300px] flex items-center justify-center"
          onClick={handleFullscreen}
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-5">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}
          
          {imageError ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
              <p className="mb-4">Image could not be loaded</p>
              <Button onClick={() => window.open(currentImage, '_blank')} variant="outline">
                Open in New Tab
              </Button>
            </div>
          ) : (
            <img
              src={currentImage}
              alt={`${title}${hasMultipleImages ? ` - Image ${currentIndex + 1}` : ''}`}
              className={`w-full h-auto max-h-[70vh] object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoaded(false);
                setImageError(true);
              }}
              loading="eager"
            />
          )}
        </div>
      </div>

      {hasMultipleImages && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setInternalIndex(index);
                setImageLoaded(false);
                setImageError(false);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});
