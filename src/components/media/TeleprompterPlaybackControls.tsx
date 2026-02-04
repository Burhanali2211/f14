import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, RotateCcw, RotateCw, Clock, Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/teleprompter-storage';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface TeleprompterPlaybackControlsProps {
  currentTime: number;
  duration: number;
  progress: number;
  isPlaying: boolean;
  isLoaded: boolean;
  isLooping: boolean;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  segmentsLength: number;
  currentSegmentIndex: number;
  onProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTogglePlay: () => void;
  onPreviousSegment: () => void;
  onNextSegment: () => void;
  onSkipBackward: (seconds?: number) => void;
  onSkipForward: (seconds?: number) => void;
  onLoopToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSpeedChange: (speed: number) => void;
  variant?: 'default' | 'playback';
}

export function TeleprompterPlaybackControls({
  currentTime,
  duration,
  progress,
  isPlaying,
  isLoaded,
  isLooping,
  volume,
  isMuted,
  playbackSpeed,
  segmentsLength,
  currentSegmentIndex,
  onProgressClick,
  onTogglePlay,
  onPreviousSegment,
  onNextSegment,
  onSkipBackward,
  onSkipForward,
  onLoopToggle,
  onVolumeChange,
  onMuteToggle,
  onSpeedChange,
  variant = 'default',
}: TeleprompterPlaybackControlsProps) {
  const isPlayback = variant === 'playback';
  const buttonClass = isPlayback ? "text-white hover:bg-white/20 h-8 w-8" : "";
  const timeClass = isPlayback ? "text-xs text-white/70" : "text-sm text-muted-foreground";
  const progressBarClass = isPlayback ? "h-1 bg-white/20 mx-4" : "h-2 bg-muted";
  const playButtonClass = isPlayback
    ? "rounded-full w-10 h-10 bg-white text-black hover:bg-white/90"
    : "rounded-full w-14 h-14";
  const iconSize = isPlayback ? "w-4 h-4" : "w-5 h-5";

  return (
    <>
      <div
        className={cn("cursor-pointer group", progressBarClass)}
        onClick={onProgressClick}
      >
        <div
          className={cn(
            "h-full bg-primary relative transition-all",
            isPlayback ? "group-hover:h-2" : "group-hover:h-3"
          )}
          style={{ width: `${progress}%` }}
        >
          <div
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 bg-primary rounded-full transition-opacity",
              isPlayback ? "w-3 h-3 opacity-0 group-hover:opacity-100" : "w-4 h-4 opacity-0 group-hover:opacity-100"
            )}
          />
        </div>
      </div>

      <div className={isPlayback ? "p-2" : "p-3 md:p-4"}>
        <div className="flex items-center justify-center max-w-4xl mx-auto relative">
          <div className={cn("flex items-center gap-2 min-w-[100px]", isPlayback && "absolute left-0 top-1/2 -translate-y-1/2")}>
            <Clock className={cn(iconSize, "flex-shrink-0")} />
            <span className={timeClass}>{formatTime(currentTime)}</span>
            <span className={timeClass}>/</span>
            <span className={timeClass}>{formatTime(duration)}</span>
          </div>

          <div className={cn("flex items-center gap-2", isPlayback ? "gap-1 md:gap-2" : "md:gap-4")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onPreviousSegment}
              disabled={currentSegmentIndex <= 0 || segmentsLength === 0}
              className={buttonClass}
              title="Previous segment (Left)"
            >
              <SkipBack className={iconSize} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSkipBackward(5)}
              className={buttonClass}
              title="Rewind 5s (Shift+Left)"
            >
              <RotateCcw className={iconSize} />
            </Button>
            <Button
              size={isPlayback ? "default" : "lg"}
              className={cn(playButtonClass)}
              onClick={onTogglePlay}
              disabled={!isLoaded}
              title="Play/Pause (Space)"
            >
              {isPlaying ? (
                <Pause className={isPlayback ? "w-5 h-5" : "w-6 h-6"} />
              ) : (
                <Play className={cn(isPlayback ? "w-5 h-5 ml-0.5" : "w-6 h-6 ml-0.5")} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSkipForward(5)}
              className={buttonClass}
              title="Forward 5s (Shift+Right)"
            >
              <RotateCw className={iconSize} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNextSegment}
              disabled={currentSegmentIndex >= segmentsLength - 1 || segmentsLength === 0}
              className={buttonClass}
              title="Next segment (Right)"
            >
              <SkipForward className={iconSize} />
            </Button>
          </div>

          <div className={cn("flex items-center gap-2 min-w-[100px] justify-end", isPlayback && "absolute right-0 top-1/2 -translate-y-1/2")}>
            <Button
              variant={isLooping ? "default" : "ghost"}
              size="icon"
              onClick={onLoopToggle}
              disabled={segmentsLength === 0}
              className={cn(buttonClass, !isLooping && isPlayback && "text-white hover:bg-white/20")}
              title="Loop segment (L)"
            >
              <Repeat className={iconSize} />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={buttonClass} title="Volume">
                  {isMuted || volume === 0 ? (
                    <VolumeX className={iconSize} />
                  ) : (
                    <Volume2 className={iconSize} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Volume</span>
                    <span className="text-sm text-muted-foreground">{Math.round(volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[volume * 100]}
                    onValueChange={([v]) => onVolumeChange(v / 100)}
                    max={100}
                    step={1}
                  />
                  <Button variant="ghost" size="sm" className="w-full" onClick={onMuteToggle}>
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={buttonClass} title="Playback speed">
                  <Gauge className={iconSize} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40" align="end">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Speed</span>
                  <div className="grid grid-cols-3 gap-1">
                    {SPEED_OPTIONS.map((speed) => (
                      <Button
                        key={speed}
                        variant={playbackSpeed === speed ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSpeedChange(speed)}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </>
  );
}
