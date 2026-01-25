import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { Trash2, Copy, X, CheckSquare, Timer, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { ImageRegion } from '../types';
import { formatTimeDisplay } from '../types';

interface SelectionToolbarProps {
  selectedCount: number;
  selectedRegion?: ImageRegion | null;
  audioUrl?: string;
  onDelete: () => void;
  onCopy: () => void;
  onDeselectAll: () => void;
  onSelectAll: () => void;
  onShiftTime: (delta: number) => void;
  totalCount: number;
}

function MiniPlayer({ 
  region, 
  audioUrl 
}: { 
  region: ImageRegion; 
  audioUrl: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(region.startTime);
  const progressRef = useRef<HTMLDivElement>(null);

  const duration = region.endTime - region.startTime;
  const progress = duration > 0 ? ((currentTime - region.startTime) / duration) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      if (time >= region.endTime) {
        audio.pause();
        audio.currentTime = region.startTime;
        setIsPlaying(false);
        setCurrentTime(region.startTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(region.startTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [region.startTime, region.endTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = region.startTime;
      setCurrentTime(region.startTime);
      setIsPlaying(false);
      audio.pause();
    }
  }, [region.id, region.startTime]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.currentTime < region.startTime || audio.currentTime >= region.endTime) {
        audio.currentTime = region.startTime;
      }
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying, region.startTime, region.endTime]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clampedTime = Math.max(region.startTime, Math.min(region.endTime, time));
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [region.startTime, region.endTime]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = region.startTime + (duration * percent);
    seekTo(time);
  }, [region.startTime, duration, seekTo]);

  const restart = useCallback(() => {
    seekTo(region.startTime);
    if (!isPlaying) {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  }, [region.startTime, seekTo, isPlaying]);

  return (
    <div className="flex items-center gap-2 px-3 border-l">
      <audio ref={audioRef} src={audioUrl} preload="auto" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={restart}
        className="h-7 w-7 p-0"
        title="Restart segment"
      >
        <SkipBack className="w-3.5 h-3.5" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        className={cn(
          "h-8 w-8 p-0 rounded-full",
          isPlaying && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        title={isPlaying ? "Pause" : "Play segment"}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </Button>
      
      <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
  );
}

function SelectionToolbarComponent({
  selectedCount,
  selectedRegion,
  audioUrl,
  onDelete,
  onCopy,
  onDeselectAll,
  onSelectAll,
  onShiftTime,
  totalCount,
}: SelectionToolbarProps) {
  if (selectedCount === 0) return null;

  const showMiniPlayer = selectedCount === 1 && selectedRegion && audioUrl;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-card border rounded-xl shadow-2xl px-4 py-2">
        <div className="flex items-center gap-2 pr-3 border-r">
          <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
            {selectedCount}
          </div>
          <span className="text-sm font-medium">
            {selectedCount === 1 ? 'segment' : 'segments'} selected
          </span>
        </div>

        {showMiniPlayer && (
          <MiniPlayer region={selectedRegion} audioUrl={audioUrl} />
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShiftTime(-1)}
            title="Shift time -1s"
            className="h-8 px-2"
          >
            <Timer className="w-4 h-4 mr-1" />
            -1s
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShiftTime(1)}
            title="Shift time +1s"
            className="h-8 px-2"
          >
            <Timer className="w-4 h-4 mr-1" />
            +1s
          </Button>
        </div>

          <div className="flex items-center gap-1 border-l pl-2">
            {selectedCount < totalCount && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              title="Select all"
              className="h-8 px-2"
            >
              <CheckSquare className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            title="Deselect all (Esc)"
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const SelectionToolbar = memo(SelectionToolbarComponent);
