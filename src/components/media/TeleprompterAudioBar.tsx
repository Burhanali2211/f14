import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/teleprompter-storage';

interface TeleprompterAudioBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

export function TeleprompterAudioBar({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
}: TeleprompterAudioBarProps) {
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  return (
    <div className="flex items-center gap-4 p-2 bg-accent/30 backdrop-blur-sm rounded-xl border border-border/50">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPlayPause}
        className="h-10 w-10 rounded-full bg-background/50 shadow-sm"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </Button>

      <div className="flex-1">
        <div
          className="h-1.5 bg-muted rounded-full cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full relative group-hover:bg-primary/80 transition-colors"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>
        </div>
      </div>

      <div className="text-[11px] font-mono text-muted-foreground min-w-[90px] text-center bg-background/50 px-2 py-1 rounded-md">
        {formatTime(currentTime)} <span className="opacity-30">/</span> {formatTime(duration)}
      </div>
    </div>
  );
}
