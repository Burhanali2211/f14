import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageRegion } from './ImageSegmentEditor';
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
  const [currentRegion, setCurrentRegion] = useState<ImageRegion | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Map<number, HTMLImageElement>>(new Map());

  const allImages = useMemo(() => {
    if (pdfPages.length > 0) return pdfPages;
    return imageUrls;
  }, [pdfPages, imageUrls]);

  const sortedRegions = useMemo(() => {
    return [...regions].sort((a, b) => a.startTime - b.startTime);
  }, [regions]);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (sortedRegions.length === 0) return;

    const activeRegion = sortedRegions.find(
      (r) => currentTime >= r.startTime && currentTime < r.endTime
    );

    if (activeRegion && activeRegion.id !== currentRegion?.id) {
      setCurrentRegion(activeRegion);
    } else if (!activeRegion && currentRegion) {
      setCurrentRegion(null);
    }
  }, [currentTime, sortedRegions, currentRegion]);

  useEffect(() => {
    if (!currentRegion || !containerRef.current) return;

    const container = containerRef.current;
    const imageIndex = currentRegion.imageIndex;
    const img = imageRefs.current.get(imageIndex);
    
    if (!img) return;

    const containerHeight = container.clientHeight;
    const imgRect = img.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const imgTop = imgRect.top - containerRect.top + container.scrollTop;
    const naturalHeight = img.naturalHeight;
    const displayHeight = img.height;
    const scale = displayHeight / naturalHeight;

    const regionTop = imgTop + (currentRegion.y * scale);
    const regionHeight = currentRegion.height * scale;

    const targetScroll = regionTop - (containerHeight / 2) + (regionHeight / 2);
    
    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth',
    });

    setScrollPosition(targetScroll);
  }, [currentRegion]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleRestart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play();
    setIsPlaying(true);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const goToNextRegion = useCallback(() => {
    const nextRegion = sortedRegions.find((r) => r.startTime > currentTime);
    if (nextRegion) {
      seekTo(nextRegion.startTime);
    }
  }, [currentTime, sortedRegions, seekTo]);

  const goToPrevRegion = useCallback(() => {
    const prevRegions = sortedRegions.filter((r) => r.startTime < currentTime - 0.5);
    if (prevRegions.length > 0) {
      seekTo(prevRegions[prevRegions.length - 1].startTime);
    } else {
      seekTo(0);
    }
  }, [currentTime, sortedRegions, seekTo]);

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
        onClose();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, goToPrevRegion, goToNextRegion, toggleMute, onClose]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      <header className="flex items-center justify-between p-4 bg-black/80 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-white font-semibold">{pieceTitle}</h1>
            <p className="text-white/60 text-sm">Preview Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentRegion && (
            <div className="px-3 py-1 bg-primary/20 rounded text-primary text-sm font-medium">
              {currentRegion.label || `Segment ${sortedRegions.indexOf(currentRegion) + 1}`}
            </div>
          )}
        </div>
      </header>

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-4xl mx-auto p-4">
          {allImages.map((imgSrc, index) => {
            const pageRegions = sortedRegions.filter((r) => r.imageIndex === index);
            
            return (
              <div key={index} className="relative mb-4">
                <img
                  ref={(el) => {
                    if (el) imageRefs.current.set(index, el);
                  }}
                  src={imgSrc}
                  alt={`Page ${index + 1}`}
                  className="w-full rounded-lg"
                  crossOrigin="anonymous"
                />
                
                {pageRegions.map((region) => {
                  const img = imageRefs.current.get(index);
                  if (!img) return null;

                  const scale = img.clientHeight / img.naturalHeight || 1;
                  const isActive = currentRegion?.id === region.id;

                  return (
                    <div
                      key={region.id}
                      className={`absolute left-0 right-0 pointer-events-none transition-all duration-300 ${
                        isActive 
                          ? 'ring-4 ring-primary bg-primary/10' 
                          : 'bg-transparent'
                      }`}
                      style={{
                        top: `${region.y * scale}px`,
                        height: `${region.height * scale}px`,
                      }}
                    >
                      {isActive && (
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {audioUrl && (
        <footer className="bg-black/80 border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto">
            <div 
              className="h-2 bg-white/20 rounded-full mb-4 cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                seekTo(percentage * duration);
              }}
            >
              <div 
                className="h-full bg-primary rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transform -translate-x-1/2" />
              </div>
              
              {sortedRegions.map((region) => (
                <div
                  key={region.id}
                  className={`absolute top-0 h-full w-0.5 ${
                    currentRegion?.id === region.id ? 'bg-white' : 'bg-white/40'
                  }`}
                  style={{ left: `${(region.startTime / duration) * 100}%` }}
                  title={`${region.label || 'Segment'}: ${formatTime(region.startTime)}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevRegion}
                  className="text-white hover:bg-white/10"
                  title="Previous segment (←)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRestart}
                  className="text-white hover:bg-white/10"
                  title="Restart"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>

                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlayPause}
                  className="h-12 w-12"
                  title="Play/Pause (Space)"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextRegion}
                  className="text-white hover:bg-white/10"
                  title="Next segment (→)"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/10"
                  title="Mute (M)"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>

              <div className="text-white font-mono text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="text-white/60 text-sm">
                Segment {currentRegion ? sortedRegions.indexOf(currentRegion) + 1 : '-'} of {sortedRegions.length}
              </div>
            </div>
          </div>
        </footer>
      )}

      
    </div>
  );
}
