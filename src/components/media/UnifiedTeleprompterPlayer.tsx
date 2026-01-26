import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle, memo } from 'react';
import { FileText, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/teleprompter-storage';
import { EnhancedPDFViewer } from './EnhancedPDFViewer';
import type { TeleprompterSegment } from '@/lib/teleprompter-types';
import type { ImageRegion } from './ImageSegmentEditor';

export interface UnifiedPlayerProps {
  pieceId: string;
  title: string;
  imageUrls: string[];
  pdfUrl?: string | null;
  textContent?: string | null;
  segments: TeleprompterSegment[];
  imageRegions: ImageRegion[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  fontSize: number;
  imageZoom: number;
  isPlaybackMode?: boolean;
  scrollBehavior: 'smooth' | 'instant' | 'auto';
  highlightMode: 'background' | 'border' | 'scale' | 'glow';
  onSeekToSegment?: (index: number) => void;
  onNavigateToEditor?: () => void;
  onNavigateToImageEditor?: () => void;
}

export interface UnifiedPlayerHandle {
  scrollToCurrentSegment: () => void;
  container: HTMLDivElement | null;
}

export const UnifiedTeleprompterPlayer = memo(forwardRef<UnifiedPlayerHandle, UnifiedPlayerProps>(({
  pieceId,
  title,
  imageUrls,
  pdfUrl,
  textContent,
  segments,
  imageRegions,
  currentTime,
  duration,
  isPlaying,
  fontSize,
  imageZoom,
  isPlaybackMode,
  scrollBehavior,
  highlightMode,
  onSeekToSegment,
  onNavigateToEditor,
  onNavigateToImageEditor,
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Map<number, HTMLImageElement>>(new Map());
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const textRef = useRef<HTMLDivElement>(null);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentRegionIndex, setCurrentRegionIndex] = useState(-1);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [imageDimensions, setImageDimensions] = useState<Map<number, {width: number, height: number}>>(new Map());
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const updateSize = () => {
      setContainerSize({ width: container.clientWidth, height: container.clientHeight });
    };
    
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, []);

  const hasImages = imageUrls.length > 0;
  const hasPdf = !!pdfUrl;
  const hasText = !!textContent && textContent.trim().length > 0;
  const hasSegments = segments.length > 0;
  const hasImageRegions = imageRegions.length > 0;

  const contentType = useMemo(() => {
    if (hasImages && hasImageRegions) return 'images';
    if (hasSegments) return 'segments';
    if (hasImages) return 'images';
    if (hasPdf) return 'pdf';
    if (hasText) return 'text';
    return 'empty';
  }, [hasPdf, hasImages, hasSegments, hasText, hasImageRegions]);

  const findCurrentSegmentIndex = useCallback((time: number) => {
    if (!segments.length) return -1;
    for (let i = 0; i < segments.length; i++) {
      if (time >= segments[i].startTime && time < segments[i].endTime) {
        return i;
      }
    }
    if (time >= segments[segments.length - 1].endTime) {
      return segments.length - 1;
    }
    return -1;
  }, [segments]);

  const sortedRegions = useMemo(() => 
    [...imageRegions].sort((a, b) => a.startTime - b.startTime),
  [imageRegions]);

  const findCurrentRegionIndex = useCallback((time: number): number => {
    if (!sortedRegions.length) return -1;
    
    for (let i = 0; i < sortedRegions.length; i++) {
      if (time >= sortedRegions[i].startTime && time < sortedRegions[i].endTime) {
        return i;
      }
    }
    
    if (time < sortedRegions[0].startTime) {
      return 0;
    }
    
    if (time >= sortedRegions[sortedRegions.length - 1].endTime) {
      return sortedRegions.length - 1;
    }
    
    for (let i = 0; i < sortedRegions.length - 1; i++) {
      if (time >= sortedRegions[i].endTime && time < sortedRegions[i + 1].startTime) {
        return i;
      }
    }
    
    return 0;
  }, [sortedRegions]);

  useEffect(() => {
    if (contentType === 'segments' && hasSegments) {
      const newIndex = findCurrentSegmentIndex(currentTime);
      if (newIndex !== currentSegmentIndex) {
        setCurrentSegmentIndex(newIndex);
      }
    }
  }, [currentTime, contentType, hasSegments, findCurrentSegmentIndex, currentSegmentIndex]);

  useEffect(() => {
    if (contentType === 'images' && hasImageRegions && sortedRegions.length > 0) {
      const newIndex = findCurrentRegionIndex(currentTime);
      if (newIndex >= 0 && newIndex !== currentRegionIndex) {
        setCurrentRegionIndex(newIndex);
        const region = sortedRegions[newIndex];
        if (region && region.imageIndex !== currentImageIndex) {
          setCurrentImageIndex(region.imageIndex);
        }
      }
    }
  }, [currentTime, contentType, hasImageRegions, sortedRegions, findCurrentRegionIndex, currentRegionIndex, currentImageIndex]);

  const scrollToSegment = useCallback((index: number) => {
    const el = segmentRefs.current.get(index);
    if (el && containerRef.current) {
      const container = containerRef.current;
      const top = el.offsetTop - container.clientHeight / 3;
      container.scrollTo({
        top,
        behavior: scrollBehavior === 'auto' ? 'smooth' : scrollBehavior
      });
    }
  }, [scrollBehavior]);

  const scrollToRegion = useCallback((index: number) => {
    const region = sortedRegions[index];
    if (!region || !containerRef.current) return;

    const container = containerRef.current;
    if (isPlaybackMode) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const imageEl = imageRefs.current.get(region.imageIndex);
      if (imageEl) {
        const rect = imageEl.getBoundingClientRect();
        const scrollTarget = (region.y / 100) * rect.height + imageEl.offsetTop - (container.clientHeight / 2) + ((region.height / 100) * rect.height / 2);
        container.scrollTo({
          top: Math.max(0, scrollTarget),
          behavior: scrollBehavior === 'auto' ? 'smooth' : scrollBehavior
        });
      }
    }
  }, [sortedRegions, isPlaybackMode, scrollBehavior]);

  useEffect(() => {
    if (currentSegmentIndex >= 0 && isPlaying) {
      scrollToSegment(currentSegmentIndex);
    }
  }, [currentSegmentIndex, isPlaying, scrollToSegment]);

  useEffect(() => {
    if (currentRegionIndex >= 0 && isPlaying && contentType === 'images') {
      scrollToRegion(currentRegionIndex);
    }
  }, [currentRegionIndex, isPlaying, scrollToRegion, contentType]);

  useImperativeHandle(ref, () => ({
    scrollToCurrentSegment: () => {
      if (currentSegmentIndex >= 0) {
        scrollToSegment(currentSegmentIndex);
      }
    },
    container: containerRef.current
  }), [currentSegmentIndex, scrollToSegment]);

  const handleImageLoad = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions(prev => {
      const next = new Map(prev);
      next.set(index, { width: img.naturalWidth, height: img.naturalHeight });
      return next;
    });
  };

  const currentRegion = useMemo(() => {
    if (currentRegionIndex >= 0 && sortedRegions[currentRegionIndex]) {
      return sortedRegions[currentRegionIndex];
    }
    return null;
  }, [currentRegionIndex, sortedRegions]);

  const calculatedScale = useMemo(() => {
    if (!isPlaybackMode || !currentRegion) return imageZoom / 100;
    // Calculate scale to make the region fill ~90% of the viewport width
    const targetWidthPercent = 95;
    const scaleToFillWidth = targetWidthPercent / currentRegion.width;
    // Apply user's manual zoom on top of the auto-scale
    return scaleToFillWidth * (imageZoom / 100);
  }, [isPlaybackMode, currentRegion, imageZoom]);

  const segmentProgress = useMemo(() => {
    if (currentSegmentIndex < 0 || !segments[currentSegmentIndex]) return 0;
    const segment = segments[currentSegmentIndex];
    const duration = segment.endTime - segment.startTime;
    if (duration <= 0) return 0;
    const progress = ((currentTime - segment.startTime) / duration) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [currentTime, currentSegmentIndex, segments]);

  const getHighlightClass = (isActive: boolean) => {
    if (!isActive) return "bg-card border-transparent";
    
    switch (highlightMode) {
      case 'background': return "bg-primary/10 border-primary shadow-sm";
      case 'border': return "bg-card border-primary ring-1 ring-primary/20";
      case 'scale': return "bg-primary/5 border-primary scale-[1.02] z-10 shadow-md";
      case 'glow': return "bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--primary),0.15)]";
      default: return "bg-primary/10 border-primary";
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-smooth bg-background/50"
      style={{ scrollBehavior: scrollBehavior === 'smooth' ? 'smooth' : 'auto' }}
    >
      {contentType === 'empty' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Content Available</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            This piece doesn't have any images, PDF, or text content to display.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      )}

      {contentType === 'pdf' && pdfUrl && (
        <div className="w-full h-full min-h-[80vh]">
          <EnhancedPDFViewer 
            pdfUrl={pdfUrl} 
            title={title}
          />
        </div>
      )}

        {contentType === 'images' && (
          <div className={cn(
            "relative w-full min-h-full flex flex-col",
            isPlaybackMode ? "bg-black p-0" : "bg-black/5 py-8 items-center"
          )}>
            <div className={cn(
              "transition-all duration-500",
              isPlaybackMode ? "w-screen h-screen p-0" : "w-full max-w-5xl px-4 h-auto"
            )}>
              {hasImageRegions ? (
                <div className={cn(
                  "space-y-8",
                  isPlaybackMode && "h-full space-y-0"
                )}>
                  <div 
                    className={cn(
                      "relative w-full overflow-hidden transition-all duration-500",
                      isPlaybackMode ? "h-full bg-black rounded-none border-0 shadow-none" : "aspect-[3/4] bg-white shadow-2xl rounded-lg border"
                    )}
                  >
                  {imageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "absolute inset-0 transition-opacity duration-500",
                        currentImageIndex === idx ? "opacity-100 z-10" : "opacity-0 z-0"
                      )}
                    >
                      <img
                        ref={(el) => {
                          if (el) imageRefs.current.set(idx, el);
                          else imageRefs.current.delete(idx);
                        }}
                        src={url}
                        alt={`${title} - Page ${idx + 1}`}
                          className={cn(
                                "transition-all duration-700 ease-out",
                                isPlaybackMode 
                                  ? "absolute left-0 top-0" 
                                  : "w-full h-full object-contain"
                              )}
                              style={isPlaybackMode && currentRegion ? (() => {
                                const imgEl = imageRefs.current.get(currentImageIndex);
                                
                                if (!containerSize.width || !containerSize.height || !imgEl) {
                                  return { width: '100%', height: 'auto' };
                                }
                                
                                const imgNaturalWidth = imgEl.naturalWidth || 1;
                                const imgNaturalHeight = imgEl.naturalHeight || 1;
                                const imgAspect = imgNaturalWidth / imgNaturalHeight;
                                
                                const regionWidthFraction = (currentRegion.width || 100) / 100;
                                const regionHeightFraction = (currentRegion.height || 10) / 100;
                                const regionYFraction = (currentRegion.y || 0) / 100;
                                const regionXFraction = (currentRegion.x || 0) / 100;
                                
                                const scaleToFitWidth = containerSize.width / regionWidthFraction;
                                const imgHeightAtScaleWidth = scaleToFitWidth / imgAspect;
                                const regionHeightPxAtScaleWidth = regionHeightFraction * imgHeightAtScaleWidth;
                                const scaleToFitHeight = (containerSize.height * 0.9) / regionHeightPxAtScaleWidth;
                                
                                const scale = Math.min(1, scaleToFitHeight) * (imageZoom / 100);
                                
                                const scaledImgWidth = scaleToFitWidth * scale;
                                const scaledImgHeight = scaledImgWidth / imgAspect;
                                
                                const regionCenterYPx = (regionYFraction + regionHeightFraction / 2) * scaledImgHeight;
                                const regionCenterXPx = (regionXFraction + regionWidthFraction / 2) * scaledImgWidth;
                                
                                const translateX = (containerSize.width / 2) - regionCenterXPx;
                                const translateY = (containerSize.height / 2) - regionCenterYPx;
                                
                                return {
                                  width: `${scaledImgWidth}px`,
                                  height: `${scaledImgHeight}px`,
                                  transform: `translate(${translateX}px, ${translateY}px)`,
                                };
                              })() : {
                                transform: `scale(${calculatedScale})`,
                                transformOrigin: currentRegion ? `${currentRegion.x + currentRegion.width / 2}% ${currentRegion.y + currentRegion.height / 2}%` : 'center',
                              }}
                          onLoad={(e) => handleImageLoad(idx, e)}
                        />
                        
                        {currentImageIndex === idx && currentRegion && !isPlaybackMode && (
                          <div
                            className={cn(
                              "absolute transition-all duration-500 pointer-events-none",
                                highlightMode === 'background' && cn(
                                  "bg-primary/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.8)]",
                                  !isPlaybackMode && "border-2 border-primary"
                                ),
                                highlightMode === 'border' && cn(
                                  "shadow-[0_0_20px_rgba(var(--primary),0.5)]",
                                  !isPlaybackMode && "border-4 border-primary"
                                ),
                                highlightMode === 'glow' && cn(
                                  "shadow-[0_0_40px_rgba(var(--primary),0.3),0_0_0_9999px_rgba(0,0,0,0.7)]",
                                  !isPlaybackMode && "border-2 border-primary"
                                ),
                                highlightMode === 'scale' && cn(
                                  "bg-primary/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] scale-110",
                                  !isPlaybackMode && "border-2 border-primary"
                                )
                              )}
                            style={{
                              left: `${currentRegion.x}%`,
                              top: `${currentRegion.y}%`,
                              width: `${currentRegion.width}%`,
                              height: `${currentRegion.height}%`,
                              opacity: isPlaybackMode ? 1 : 0.8,
                            }}
                          />
                        )}
                    </div>
                  ))}

                  {!imageUrls[currentImageIndex] && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                      <p>Image not found</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-background/80 backdrop-blur-sm border rounded-xl p-4 sticky bottom-4 shadow-lg z-20">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentImageIndex === 0}
                      onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium tabular-nums">
                      Page {currentImageIndex + 1} of {imageUrls.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentImageIndex === imageUrls.length - 1}
                      onClick={() => setCurrentImageIndex(prev => Math.min(imageUrls.length - 1, prev + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {onNavigateToImageEditor && (
                      <Button variant="ghost" size="sm" onClick={onNavigateToImageEditor}>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Edit Regions
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="relative bg-white shadow-xl rounded-lg overflow-hidden border">
                    <img
                      src={url}
                      alt={`${title} - Page ${idx + 1}`}
                      className="w-full h-auto"
                    />
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
                      Page {idx + 1}
                    </div>
                  </div>
                ))}
                
                {onNavigateToImageEditor && (
                  <div className="p-8 bg-muted/50 rounded-xl border border-dashed flex flex-col items-center text-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-1">Image Sync Available</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                      Sync specific parts of these images with your audio playback.
                    </p>
                    <Button variant="outline" size="sm" onClick={onNavigateToImageEditor}>
                      Setup Image Sync
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

        {contentType === 'segments' && (
          <div className={cn(
            "mx-auto p-4 md:p-8 min-h-full transition-all duration-500",
            isPlaybackMode ? "max-w-none" : "max-w-4xl"
          )}>
          {segments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">No Segments Found</h3>
              <p className="text-muted-foreground mb-6">
                Text segments are required for synchronized teleprompter playback.
              </p>
              <Button onClick={onNavigateToEditor}>
                Create Segments
              </Button>
            </div>
          ) : (
            <div className="space-y-6" dir="rtl">
              {segments.map((segment, index) => {
                const isActive = currentSegmentIndex === index;
                const isPast = index < currentSegmentIndex;
                
                return (
                  <div
                    key={segment.id}
                    ref={(el) => {
                      if (el) segmentRefs.current.set(index, el);
                      else segmentRefs.current.delete(index);
                    }}
                    onClick={() => onSeekToSegment?.(index)}
                    className={cn(
                      "relative p-4 md:p-6 rounded-xl transition-all duration-300 cursor-pointer border",
                      getHighlightClass(isActive),
                      isPast && "opacity-50",
                      !isActive && !isPast && "hover:bg-muted/50"
                    )}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <div className="absolute top-2 left-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded-full">
                        {formatTime(segment.startTime)}
                      </span>
                    </div>

                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-100"
                          style={{ width: `${segmentProgress}%` }}
                        />
                      </div>
                    )}

                    <div
                      className="leading-relaxed whitespace-pre-wrap pt-6"
                      style={{
                        fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
                        lineHeight: 2.2,
                      }}
                    >
                      {segment.text}
                    </div>
                  </div>
                );
              })}

              {currentSegmentIndex >= 0 && (
                <div className="sticky bottom-4 mx-auto w-fit bg-background/95 backdrop-blur-sm border rounded-full px-4 py-2 shadow-lg">
                  <span className="text-sm font-medium">
                    Segment {currentSegmentIndex + 1}/{segments.length}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {contentType === 'text' && textContent && (
        <div className={cn(
          "mx-auto p-4 bg-background min-h-full transition-all duration-500",
          isPlaybackMode ? "max-w-none" : "max-w-4xl"
        )}>
          <div ref={textRef} dir="rtl" className="py-4">
            <div
              className="leading-loose whitespace-pre-wrap"
              style={{ 
                fontSize: `${fontSize}px`,
                fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
                lineHeight: 2.2,
              }}
            >
              {textContent}
            </div>
            
            {onNavigateToEditor && (
              <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Create segments to sync text with audio playback.
                </p>
                <Button variant="outline" size="sm" onClick={onNavigateToEditor}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Segments
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}));

UnifiedTeleprompterPlayer.displayName = 'UnifiedTeleprompterPlayer';
