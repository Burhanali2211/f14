import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ImageRegion } from '../types';
import { formatTimeDisplay } from '../types';

interface WaveformTimelineProps {
  audioUrl?: string;
  regions: ImageRegion[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  isLooping: boolean;
  onTogglePlayPause: () => void;
  onSeekTo: (time: number) => void;
  onSeekRelative: (delta: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onRegionClick: (regionId: string) => void;
  onPlayRegion: (regionId: string) => void;
  selectedRegionId: string | null;
  activeRegionId?: string | null;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function WaveformTimeline({
  audioUrl,
  regions,
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  onTogglePlayPause,
  onSeekTo,
  onSeekRelative,
  onSetPlaybackRate,
  onRegionClick,
  onPlayRegion,
  selectedRegionId,
  activeRegionId,
}: WaveformTimelineProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const initAttemptedRef = useRef(false);

  const initWavesurfer = useCallback(async () => {
    if (!audioUrl || !waveformRef.current || initAttemptedRef.current) return;
    if (wavesurferRef.current) return;
    
    initAttemptedRef.current = true;
    setIsLoading(true);
    
    try {
      const WaveSurfer = (await import('wavesurfer.js')).default;
      
      if (!waveformRef.current) {
        setIsLoading(false);
        return;
      }

      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgba(139, 92, 246, 0.4)',
        progressColor: 'rgba(139, 92, 246, 0.8)',
        cursorColor: 'rgba(245, 158, 11, 1)',
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 60,
        normalize: true,
        backend: 'WebAudio',
      });

      wavesurferRef.current = ws;

      ws.on('ready', () => {
        setIsWaveformReady(true);
        setIsLoading(false);
      });

      ws.on('error', (err: Error) => {
        console.error('WaveSurfer error:', err);
        setIsLoading(false);
        setIsWaveformReady(false);
      });

      ws.on('interaction', () => {
        if (ws) {
          const time = ws.getCurrentTime();
          onSeekTo(time);
        }
      });

      ws.load(audioUrl);
    } catch (err) {
      console.error('Failed to init wavesurfer:', err);
      setIsLoading(false);
      initAttemptedRef.current = false;
    }
  }, [audioUrl, onSeekTo]);

  useEffect(() => {
    if (hasUserInteracted && audioUrl) {
      initWavesurfer();
    }
  }, [hasUserInteracted, audioUrl, initWavesurfer]);

  useEffect(() => {
    initAttemptedRef.current = false;
    setIsWaveformReady(false);
    setIsLoading(false);
    setHasUserInteracted(false);
    
    return () => {
      const ws = wavesurferRef.current;
      wavesurferRef.current = null;
      
      if (ws) {
        try {
          ws.unAll();
          ws.destroy();
        } catch (e) {
        }
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !isWaveformReady) return;
    
    const wsDuration = ws.getDuration();
    if (wsDuration > 0 && Math.abs(ws.getCurrentTime() - currentTime) > 0.1) {
      ws.seekTo(currentTime / wsDuration);
    }
  }, [currentTime, isWaveformReady]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeekTo(percentage * duration);
  }, [duration, onSeekTo, hasUserInteracted]);

  const handlePlayPause = useCallback(() => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
    onTogglePlayPause();
  }, [hasUserInteracted, onTogglePlayPause]);

  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    onSetPlaybackRate(PLAYBACK_RATES[nextIndex]);
  }, [playbackRate, onSetPlaybackRate]);

  if (!audioUrl) {
    return null;
  }

  return (
    <div className="border-b bg-card">
      <div className="flex items-center gap-3 p-3">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => onSeekRelative(-5)}
            title="Back 5s (Shift+←)"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button 
            variant="default" 
            size="icon" 
            className="h-10 w-10" 
            onClick={handlePlayPause}
            title="Play/Pause (Space)"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => onSeekRelative(5)}
            title="Forward 5s (Shift+→)"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-1">
          {hasUserInteracted && (
            <div 
              ref={waveformRef}
              className={cn(
                "w-full rounded-lg overflow-hidden bg-muted/50",
                isLoading && "animate-pulse"
              )}
            />
          )}
          
          {(!hasUserInteracted || (!isWaveformReady && !isLoading)) && (
            <div
              className="h-[60px] bg-muted rounded-lg cursor-pointer relative group"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-primary/30 rounded-l-lg transition-all relative"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-amber-500" />
              </div>
              
              {regions.map(region => (
                <div
                  key={region.id}
                  className={cn(
                    "absolute top-0 h-full rounded cursor-pointer",
                    activeRegionId === region.id 
                      ? "bg-green-500/40 ring-2 ring-green-500" 
                      : selectedRegionId === region.id 
                        ? "bg-primary/40 ring-2 ring-primary" 
                        : "bg-amber-500/20 hover:bg-amber-500/30"
                  )}
                  style={{ 
                    left: `${duration > 0 ? (region.startTime / duration) * 100 : 0}%`,
                    width: `${duration > 0 ? ((region.endTime - region.startTime) / duration) * 100 : 0}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegionClick(region.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onPlayRegion(region.id);
                  }}
                  title={`${region.label || 'Segment'}: ${formatTimeDisplay(region.startTime)} - ${formatTimeDisplay(region.endTime)}`}
                />
              ))}
              
              {!hasUserInteracted && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 text-sm text-muted-foreground">
                  Click to load waveform
                </div>
              )}
            </div>
          )}

          {isWaveformReady && (
            <div className="relative h-2">
              {regions.map(region => (
                <div
                  key={region.id}
                  className={cn(
                    "absolute top-0 h-full rounded-sm cursor-pointer",
                    activeRegionId === region.id 
                      ? "bg-green-500/80" 
                      : selectedRegionId === region.id 
                        ? "bg-primary/60" 
                        : "bg-amber-500/40 hover:bg-amber-500/60"
                  )}
                  style={{ 
                    left: `${duration > 0 ? (region.startTime / duration) * 100 : 0}%`,
                    width: `${duration > 0 ? ((region.endTime - region.startTime) / duration) * 100 : 0}%`,
                  }}
                  onClick={() => onRegionClick(region.id)}
                  onDoubleClick={() => onPlayRegion(region.id)}
                  title={region.label || 'Segment'}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs px-2 h-8 min-w-[48px]"
            onClick={cyclePlaybackRate}
            title="Playback speed"
          >
            {playbackRate}x
          </Button>
          
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm font-mono text-foreground min-w-[110px] text-center bg-muted px-2 py-1 rounded">
              {formatTimeDisplay(currentTime)} / {formatTimeDisplay(duration)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
