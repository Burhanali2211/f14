import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Maximize2, Minimize2,
  Clock, Music, RotateCcw, RotateCw, Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTeleprompter } from '@/hooks/use-teleprompter';
import type { TeleprompterSegment } from '@/lib/teleprompter-types';
import { formatTime } from '@/lib/teleprompter-storage';

interface TeleprompterPlayerProps {
  pieceId: string;
  audioUrl?: string | null;
  segments: TeleprompterSegment[];
  fontSize?: number;
  highlightMode?: 'background' | 'border' | 'scale' | 'glow';
  scrollBehavior?: 'smooth' | 'instant' | 'auto';
  className?: string;
  onSegmentClick?: (segment: TeleprompterSegment) => void;
  onClose?: () => void;
}

export function TeleprompterPlayer({
  pieceId,
  audioUrl,
  segments,
  fontSize = 24,
  highlightMode = 'background',
  scrollBehavior = 'smooth',
  className,
  onSegmentClick,
  onClose,
}: TeleprompterPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    session,
    state,
    isLoaded,
    error,
    currentSegment,
    progress,
    segmentProgress,
    play,
    pause,
    togglePlay,
    seek,
    seekToSegment,
    goToNextSegment,
    goToPreviousSegment,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    loopCurrentSegment,
    clearLoop,
    skipForward,
    skipBackward,
  } = useTeleprompter({
    pieceId,
    audioUrl,
    onSegmentChange: (index) => {
      scrollToSegment(index);
    },
  });

  const scrollToSegment = useCallback((index: number) => {
    const element = segmentRefs.current.get(index);
    if (!element || !containerRef.current) return;

    const container = containerRef.current;
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const scrollTop = element.offsetTop - containerRect.height / 2 + elementRect.height / 2;

    container.scrollTo({
      top: scrollTop,
      behavior: scrollBehavior === 'instant' ? 'auto' : 'smooth',
    });
  }, [scrollBehavior]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            goToPreviousSegment();
          } else {
            skipBackward(5);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            goToNextSegment();
          } else {
            skipForward(5);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(state.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(state.volume - 0.1);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyL':
          e.preventDefault();
          if (state.isLooping) {
            clearLoop();
          } else {
            loopCurrentSegment();
          }
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay, goToPreviousSegment, goToNextSegment, skipBackward, skipForward,
    setVolume, state.volume, toggleMute, state.isLooping, clearLoop, loopCurrentSegment, isFullscreen
  ]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (state.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [state.isPlaying]);

  const getHighlightClass = (isActive: boolean) => {
    if (!isActive) return '';
    switch (highlightMode) {
      case 'background':
        return 'bg-primary/20 dark:bg-primary/30';
      case 'border':
        return 'border-2 border-primary';
      case 'scale':
        return 'scale-105 bg-primary/10';
      case 'glow':
        return 'shadow-lg shadow-primary/30 bg-primary/10';
      default:
        return 'bg-primary/20';
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * state.duration);
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <Music className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Audio Error</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={onClose} variant="outline">Close</Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-background",
        isFullscreen ? "fixed inset-0 z-50" : "relative",
        className
      )}
      onMouseMove={handleMouseMove}
    >
      <div
        className={cn(
          "flex-1 overflow-y-auto px-4 py-8 md:px-8 lg:px-16",
          isFullscreen && "pt-16"
        )}
        dir="rtl"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {segments.map((segment, index) => {
            const isActive = state.currentSegmentIndex === index;
            const isPast = index < state.currentSegmentIndex;
            
            return (
              <div
                key={segment.id}
                ref={(el) => {
                  if (el) segmentRefs.current.set(index, el);
                  else segmentRefs.current.delete(index);
                }}
                onClick={() => {
                  seekToSegment(index);
                  onSegmentClick?.(segment);
                }}
                className={cn(
                  "relative p-4 md:p-6 rounded-xl transition-all duration-300 cursor-pointer",
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
                  {isActive && state.isLooping && (
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> Loop
                    </span>
                  )}
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
        </div>
      </div>

      <div
        className={cn(
          "sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border transition-opacity duration-300",
          !showControls && state.isPlaying && "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="h-2 bg-muted cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary relative group-hover:h-3 transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
              <Clock className="w-4 h-4" />
              <span>{formatTime(state.currentTime)}</span>
              <span>/</span>
              <span>{formatTime(state.duration)}</span>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousSegment}
                disabled={state.currentSegmentIndex <= 0}
                title="Previous segment (Shift+Left)"
              >
                <SkipBack className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipBackward(5)}
                title="Rewind 5s (Left)"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>

              <Button
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={togglePlay}
                disabled={!isLoaded}
                title="Play/Pause (Space)"
              >
                {state.isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipForward(5)}
                title="Forward 5s (Right)"
              >
                <RotateCw className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextSegment}
                disabled={!session || state.currentSegmentIndex >= segments.length - 1}
                title="Next segment (Shift+Right)"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 min-w-[100px] justify-end">
              <Button
                variant={state.isLooping ? "default" : "ghost"}
                size="icon"
                onClick={state.isLooping ? clearLoop : loopCurrentSegment}
                title="Loop segment (L)"
              >
                <Repeat className="w-4 h-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" title="Volume">
                    {state.isMuted || state.volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Volume</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(state.volume * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[state.volume * 100]}
                      onValueChange={([v]) => setVolume(v / 100)}
                      max={100}
                      step={1}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={toggleMute}
                    >
                      {state.isMuted ? 'Unmute' : 'Mute'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" title="Playback speed">
                    <Gauge className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40" align="end">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Speed</span>
                    <div className="grid grid-cols-3 gap-1">
                      {speedOptions.map((speed) => (
                        <Button
                          key={speed}
                          variant={state.playbackSpeed === speed ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPlaybackSpeed(speed)}
                        >
                          {speed}x
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {session && segments.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>
                Segment {state.currentSegmentIndex + 1} of {segments.length}
              </span>
              {currentSegment && (
                <span className="text-primary font-medium truncate max-w-[200px]">
                  {currentSegment.text.substring(0, 30)}...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
