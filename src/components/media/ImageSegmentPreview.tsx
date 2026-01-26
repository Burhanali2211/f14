import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, ChevronLeft, ChevronRight, Maximize, Minimize, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageRegion } from './ImageSegmentEditor';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ImageSegmentPreviewProps {
  imageUrls: string[];
  pdfUrl?: string;
  audioUrl?: string;
  regions: ImageRegion[];
  onClose: () => void;
  pieceTitle: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface SegmentDisplayProps {
  region: ImageRegion;
  imageSrc: string;
  isTransitioning: boolean;
}

const SegmentDisplay = memo(function SegmentDisplay({ region, imageSrc, isTransitioning }: SegmentDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setIsReady(true);
    };
    img.src = imageSrc;

    return () => {
      img.onload = null;
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!isReady || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const cropX = (region.x / 100) * imgWidth;
    const cropY = (region.y / 100) * imgHeight;
    const cropWidth = (region.width / 100) * imgWidth;
    const cropHeight = (region.height / 100) * imgHeight;

    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.7;

    let displayWidth = cropWidth;
    let displayHeight = cropHeight;

    const scaleX = maxWidth / cropWidth;
    const scaleY = maxHeight / cropHeight;
    const scale = Math.min(scaleX, scaleY, 2.5);

    displayWidth = cropWidth * scale;
    displayHeight = cropHeight * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      img,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, displayWidth, displayHeight
    );
  }, [isReady, region]);

  return (
    <div 
      className={cn(
        "flex items-center justify-center w-full h-full transition-opacity duration-300",
        isTransitioning ? "opacity-0" : "opacity-100"
      )}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full rounded-lg shadow-2xl"
        style={{
          boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.05)',
        }}
      />
    </div>
  );
});

interface SegmentIndicatorProps {
  region: ImageRegion;
  index: number;
  isActive: boolean;
  progress: number;
  onClick: () => void;
}

const SegmentIndicator = memo(function SegmentIndicator({ 
  region, 
  index, 
  isActive, 
  progress,
  onClick 
}: SegmentIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-2 rounded-full overflow-hidden transition-all duration-200 min-w-[20px]",
        isActive 
          ? "bg-primary/30 flex-grow" 
          : "bg-white/20 hover:bg-white/30 flex-shrink-0"
      )}
      style={{ 
        flex: isActive ? '1 1 auto' : '0 0 20px',
      }}
      title={`${region.label || `Segment ${index + 1}`}: ${formatTime(region.startTime)} - ${formatTime(region.endTime)}`}
    >
      {isActive && (
        <div 
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      )}
    </button>
  );
});

export function ImageSegmentPreview({
  imageUrls,
  pdfUrl,
  audioUrl,
  regions,
  onClose,
  pieceTitle,
}: ImageSegmentPreviewProps) {
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentRegionIndex, setCurrentRegionIndex] = useState<number>(-1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allImages = useMemo(() => {
    if (pdfPages.length > 0) return pdfPages;
    return imageUrls;
  }, [pdfPages, imageUrls]);

  const sortedRegions = useMemo(() => {
    return [...regions].sort((a, b) => a.startTime - b.startTime);
  }, [regions]);

  const currentRegion = useMemo(() => {
    if (currentRegionIndex >= 0 && currentRegionIndex < sortedRegions.length) {
      return sortedRegions[currentRegionIndex];
    }
    return null;
  }, [currentRegionIndex, sortedRegions]);

  const currentImageSrc = useMemo(() => {
    if (!currentRegion) return null;
    return allImages[currentRegion.imageIndex] || null;
  }, [currentRegion, allImages]);

  useEffect(() => {
    if (!pdfUrl) return;

    const loadPdf = async () => {
      try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const pages: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 2;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;
          pages.push(canvas.toDataURL('image/png'));
        }

        setPdfPages(pages);
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    };

    loadPdf();
  }, [pdfUrl]);

  const updateCurrentRegion = useCallback((time: number) => {
    if (sortedRegions.length === 0) {
      setCurrentRegionIndex(-1);
      return -1;
    }

    const newIndex = sortedRegions.findIndex(
      (r) => time >= r.startTime && time < r.endTime
    );

    if (newIndex !== currentRegionIndex) {
      if (newIndex >= 0) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentRegionIndex(newIndex);
          setIsTransitioning(false);
        }, 150);
      } else {
        setCurrentRegionIndex(-1);
      }
    }

    return newIndex;
  }, [sortedRegions, currentRegionIndex]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;

    const now = performance.now();
    if (now - lastUpdateTimeRef.current < 50) return;
    lastUpdateTimeRef.current = now;

    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    const activeIndex = updateCurrentRegion(time);

    if (activeIndex === -1 && sortedRegions.length > 0) {
      const nextRegion = sortedRegions.find(r => r.startTime > time);
      const prevRegion = [...sortedRegions].reverse().find(r => r.endTime <= time);
      
      if (prevRegion && nextRegion) {
        const gapDuration = nextRegion.startTime - prevRegion.endTime;
        if (gapDuration > 2) {
          audioRef.current.currentTime = nextRegion.startTime;
          setCurrentTime(nextRegion.startTime);
        }
      } else if (prevRegion && !nextRegion) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [sortedRegions, updateCurrentRegion]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentRegionIndex(-1);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !audioRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const tick = () => {
      handleTimeUpdate();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, handleTimeUpdate]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (sortedRegions.length > 0 && currentRegionIndex === -1) {
        const nextRegion = sortedRegions.find(r => r.startTime > currentTime);
        if (nextRegion) {
          audio.currentTime = nextRegion.startTime;
        } else if (currentTime >= duration - 0.1) {
          audio.currentTime = sortedRegions[0].startTime;
        }
      }
      audio.play();
    }
  }, [isPlaying, sortedRegions, currentRegionIndex, currentTime, duration]);

  const handleRestart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || sortedRegions.length === 0) return;

    audio.currentTime = sortedRegions[0].startTime;
    setCurrentTime(sortedRegions[0].startTime);
    setCurrentRegionIndex(0);
    audio.play();
  }, [sortedRegions]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const seekToRegion = useCallback((index: number) => {
    const audio = audioRef.current;
    if (!audio || index < 0 || index >= sortedRegions.length) return;

    const region = sortedRegions[index];
    audio.currentTime = region.startTime;
    setCurrentTime(region.startTime);
    setCurrentRegionIndex(index);
    
    if (!isPlaying) {
      audio.play();
    }
  }, [sortedRegions, isPlaying]);

  const goToNextRegion = useCallback(() => {
    const nextIndex = currentRegionIndex + 1;
    if (nextIndex < sortedRegions.length) {
      seekToRegion(nextIndex);
    }
  }, [currentRegionIndex, sortedRegions.length, seekToRegion]);

  const goToPrevRegion = useCallback(() => {
    const prevIndex = currentRegionIndex <= 0 ? 0 : currentRegionIndex - 1;
    seekToRegion(prevIndex);
  }, [currentRegionIndex, seekToRegion]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        goToPrevRegion();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        goToNextRegion();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, goToPrevRegion, goToNextRegion, toggleMute, toggleFullscreen, onClose, isFullscreen]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const segmentProgress = useMemo(() => {
    if (!currentRegion) return 0;
    const elapsed = currentTime - currentRegion.startTime;
    const total = currentRegion.endTime - currentRegion.startTime;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [currentTime, currentRegion]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col select-none"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      <header 
        className={cn(
          "absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="text-white hover:bg-white/10 backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-white font-semibold text-lg">{pieceTitle}</h1>
            <p className="text-white/60 text-sm">
              {currentRegion 
                ? `${currentRegion.label || `Segment ${currentRegionIndex + 1}`} of ${sortedRegions.length}`
                : 'Preview Mode'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10 backdrop-blur-sm"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8 pt-20 pb-32">
        {currentImageSrc && currentRegion ? (
          <SegmentDisplay
            region={currentRegion}
            imageSrc={currentImageSrc}
            isTransitioning={isTransitioning}
          />
        ) : (
          <div className="text-center text-white/60">
            <p className="text-xl mb-2">No active segment</p>
            <p className="text-sm">Press play to start, or click a segment below</p>
          </div>
        )}
      </div>

      {audioUrl && (
        <footer 
          className={cn(
            "absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-6 pt-12 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-1 mb-4">
              {sortedRegions.map((region, index) => (
                <SegmentIndicator
                  key={region.id}
                  region={region}
                  index={index}
                  isActive={index === currentRegionIndex}
                  progress={index === currentRegionIndex ? segmentProgress : (index < currentRegionIndex ? 100 : 0)}
                  onClick={() => seekToRegion(index)}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevRegion}
                  className="text-white hover:bg-white/10 h-10 w-10"
                  title="Previous segment (←)"
                  disabled={sortedRegions.length === 0}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRestart}
                  className="text-white hover:bg-white/10 h-10 w-10"
                  title="Restart"
                  disabled={sortedRegions.length === 0}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>

                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlayPause}
                  className="h-14 w-14 rounded-full"
                  title="Play/Pause (Space)"
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextRegion}
                  className="text-white hover:bg-white/10 h-10 w-10"
                  title="Next segment (→)"
                  disabled={currentRegionIndex >= sortedRegions.length - 1}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/10 h-10 w-10"
                  title="Mute (M)"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>

              <div className="text-white font-mono text-sm tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="text-white/60 text-sm hidden sm:block">
                <span className="text-white/40 text-xs">
                  Space: Play • ←→: Navigate • F: Fullscreen
                </span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
