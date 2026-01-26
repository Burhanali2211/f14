import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
    Repeat, Maximize2, Minimize2, Settings, Clock,
    RotateCcw, RotateCw, Gauge, Home, Edit2, ArrowLeft, Loader2,
PlayCircle, X, Timer, ChevronDown, Smartphone, Upload, CheckCircle2, Trash2, Download, Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { TeleprompterSegment } from '@/lib/teleprompter-types';
import {
  getSession,
  createSession,
  updateProgress,
    markSegmentCompleted,
    incrementPracticeCount,
    findSegmentIndexAtTime,
    formatTime,
    finishTeleprompterTask,
  } from '@/lib/teleprompter-storage';
import { UnifiedTeleprompterPlayer } from '@/components/media/UnifiedTeleprompterPlayer';
import { AirSendDialog } from '@/components/media/AirSendDialog';
import { R2AudioUploadDialog } from '@/components/media/R2AudioUploadDialog';
import { toast } from '@/hooks/use-toast';
import type { ImageRegion } from '@/components/media/ImageSegmentEditor';
import { useR2Audio, AudioFile } from '@/hooks/useR2Audio';

async function fetchPiece(id: string) {
  const { data, error } = await supabase
    .from('pieces')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export default function TeleprompterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoplayRequested = searchParams.get('autoplay') === 'true';

  const { data: piece, isLoading: pieceLoading, error: pieceError } = useQuery({
    queryKey: ['piece', id],
    queryFn: () => fetchPiece(id!),
    enabled: !!id,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const practiceStartRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef(0);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [fontSize, setFontSize] = useState(28);
  const [imageZoom, setImageZoom] = useState(100);
  const [highlightMode, setHighlightMode] = useState<'background' | 'border' | 'scale' | 'glow'>('background');
  const [scrollBehavior, setScrollBehavior] = useState<'smooth' | 'instant'>('smooth');
  const [showSettings, setShowSettings] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const segments = useMemo(() => session?.segments || [], [session]);

  const [imageRegions, setImageRegions] = useState<ImageRegion[]>([]);
  const [showAirSend, setShowAirSend] = useState(false);
  const [showR2Upload, setShowR2Upload] = useState(false);
  const [airSendAudioUrl, setAirSendAudioUrl] = useState<string | null>(null);
  const [airSendAudioName, setAirSendAudioName] = useState<string | null>(null);
  const [cloudAudio, setCloudAudio] = useState<AudioFile | null>(null);
  const [cloudAudioStreamUrl, setCloudAudioStreamUrl] = useState<string | null>(null);

  const { getStreamUrl, getUserAudioFiles } = useR2Audio();

  const audioUrl = cloudAudioStreamUrl || airSendAudioUrl || piece?.audio_url;

  const pdfUrl = useMemo(() => {
    const urls = normalizeImageUrl(piece?.image_url);
    return urls.find(u => u.toLowerCase().endsWith('.pdf')) || null;
  }, [piece?.image_url]);

  const imageUrls = useMemo(() => {
    const urls = normalizeImageUrl(piece?.image_url);
    return urls.filter(u => !u.toLowerCase().endsWith('.pdf'));
  }, [piece?.image_url]);

  const textContent = piece?.text_content || null;

  useEffect(() => {
    if (!id) return;
    
    let existingSession = getSession(id);
    if (!existingSession) {
      existingSession = createSession(id, audioUrl);
    }
    setSession(existingSession);
  }, [id, audioUrl]);

  useEffect(() => {
    if (!id) return;
    
    const loadRegions = async () => {
      try {
        const { data } = await supabase
          .from('piece_image_segments')
          .select('regions')
          .eq('piece_id', id)
          .single();

        if (data?.regions) {
          const regions = data.regions as unknown as ImageRegion[];
          setImageRegions(regions.sort((a, b) => a.startTime - b.startTime));
          return;
        }
      } catch {
      }

      try {
        const stored = localStorage.getItem(`image-regions-${id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const regions = parsed.regions || parsed;
          if (Array.isArray(regions)) {
            setImageRegions(regions.sort((a, b) => a.startTime - b.startTime));
          }
        }
      } catch {
        setImageRegions([]);
      }
    };

    loadRegions();
  }, [id]);

    useEffect(() => {
      if (!audioUrl) {
        setIsLoaded(false);
        return;
      }

      const audio = new Audio();
    audio.preload = 'metadata';
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      setError(null);
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoaded(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (practiceStartRef.current && session) {
        const practiceTime = Math.floor((Date.now() - practiceStartRef.current) / 1000);
        incrementPracticeCount(session.id, practiceTime);
        practiceStartRef.current = null;
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    audio.src = audioUrl;
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioUrl, session]);

  const updateCurrentSegment = useCallback((time: number) => {
    if (!segments.length) return;

    const newIndex = findSegmentIndexAtTime(segments, time);
    
    if (newIndex !== currentSegmentIndex) {
      setCurrentSegmentIndex(newIndex);
      
      if (session) {
        updateProgress(session.id, {
          currentTime: time,
          currentSegment: newIndex,
        });
      }
    }
  }, [segments, currentSegmentIndex, session]);

  const currentTimeDisplayRef = useRef(0);

  const updatePlaybackLoop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    const time = audio.currentTime;
    currentTimeRef.current = time;
    
    if (isLooping && loopEnd !== null && time >= loopEnd) {
      audio.currentTime = loopStart || 0;
      currentTimeRef.current = loopStart || 0;
    }

    if (Math.abs(time - currentTimeDisplayRef.current) >= 0.05) {
      currentTimeDisplayRef.current = time;
      setCurrentTimeDisplay(time);
    }
    
    updateCurrentSegment(time);

    animationFrameRef.current = requestAnimationFrame(updatePlaybackLoop);
  }, [isPlaying, isLooping, loopStart, loopEnd, updateCurrentSegment]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackLoop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlaybackLoop]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.play().then(() => {
      setIsPlaying(true);
      if (!practiceStartRef.current) {
        practiceStartRef.current = Date.now();
      }
    }).catch(err => {
      console.error('Playback failed:', err);
      setError('Playback failed. Please try again.');
    });
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedTime = Math.max(0, Math.min(time, duration));
    audio.currentTime = clampedTime;
    currentTimeRef.current = clampedTime;
    setCurrentTimeDisplay(clampedTime);
    updateCurrentSegment(clampedTime);
  }, [duration, updateCurrentSegment]);

  const seekToSegment = useCallback((index: number) => {
    if (!segments[index]) return;
    seek(segments[index].startTime);
  }, [segments, seek]);

  const goToNextSegment = useCallback(() => {
    if (!segments.length) return;
    const nextIndex = Math.min(currentSegmentIndex + 1, segments.length - 1);
    seekToSegment(nextIndex);
    
    if (currentSegmentIndex >= 0 && session) {
      markSegmentCompleted(session.id, currentSegmentIndex);
    }
  }, [segments, currentSegmentIndex, seekToSegment, session]);

  const goToPreviousSegment = useCallback(() => {
    if (!segments.length) return;
    const prevIndex = Math.max(currentSegmentIndex - 1, 0);
    seekToSegment(prevIndex);
  }, [segments, currentSegmentIndex, seekToSegment]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    audio.volume = clampedVolume;
    setVolume(clampedVolume);
    setIsMuted(clampedVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newMuted = !isMuted;
    audio.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  const handleSetPlaybackSpeed = useCallback((speed: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedSpeed = Math.max(0.25, Math.min(2, speed));
    audio.playbackRate = clampedSpeed;
    setPlaybackSpeedState(clampedSpeed);
  }, []);

  const loopCurrentSegment = useCallback(() => {
    if (!segments[currentSegmentIndex]) return;
    const segment = segments[currentSegmentIndex];
    setLoopStart(segment.startTime);
    setLoopEnd(segment.endTime);
    setIsLooping(true);
  }, [segments, currentSegmentIndex]);

  const clearLoop = useCallback(() => {
    setIsLooping(false);
    setLoopStart(null);
    setLoopEnd(null);
  }, []);

  const skipForward = useCallback((seconds: number = 5) => {
    seek(currentTimeRef.current + seconds);
  }, [seek]);

  const skipBackward = useCallback((seconds: number = 5) => {
    seek(currentTimeRef.current - seconds);
  }, [seek]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const handleFinishTask = useCallback(() => {
    if (!id) return;
    finishTeleprompterTask(id);
    toast({
      title: 'Task completed',
      description: 'All teleprompter data for this piece has been deleted.',
    });
    navigate(`/piece/${id}`);
  }, [id, navigate]);

  const enterPlaybackMode = useCallback(async (delaySeconds?: number) => {
    setIsPlaybackMode(true);
    try {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } catch {
    }
    
    if (delaySeconds && delaySeconds > 0) {
      setCountdown(delaySeconds);
      setIsCountingDown(true);
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setIsCountingDown(false);
            play();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      play();
    }
  }, [play]);

  const exitPlaybackMode = useCallback(async () => {
    setIsPlaybackMode(false);
    setIsCountingDown(false);
    setCountdown(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    pause();
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen?.();
      } catch {}
    }
    setIsFullscreen(false);
  }, [pause]);

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
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyL':
          e.preventDefault();
          if (isLooping) {
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
          if (isPlaybackMode) {
            exitPlaybackMode();
          } else if (isFullscreen) {
            toggleFullscreen();
          } else {
            navigate(`/piece/${id}`);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isLooping, isFullscreen, isPlaybackMode, id, exitPlaybackMode, toggleFullscreen, navigate, togglePlay, goToPreviousSegment, goToNextSegment, skipBackward, skipForward, handleVolumeChange, toggleMute, loopCurrentSegment, clearLoop]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && isPlaybackMode) {
        setIsPlaybackMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isPlaybackMode]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * duration);
  };

  const handleAirSendAudioReceived = useCallback((url: string, name: string) => {
    setAirSendAudioUrl(url);
    setAirSendAudioName(name);
  }, []);

  useEffect(() => {
    if (!id) return;
    
    const loadCloudAudio = async () => {
      try {
        const audioFiles = await getUserAudioFiles(id);
        if (audioFiles.length > 0) {
          const latestAudio = audioFiles[0];
          setCloudAudio(latestAudio);
          const streamUrl = await getStreamUrl(latestAudio.id);
          setCloudAudioStreamUrl(streamUrl);
        }
      } catch (err) {
        console.error('Failed to load cloud audio:', err);
      }
    };
    
    loadCloudAudio();
  }, [id, getUserAudioFiles, getStreamUrl]);

  const handleCloudAudioUploaded = useCallback(async (audioFile: AudioFile) => {
    setCloudAudio(audioFile);
    try {
      const streamUrl = await getStreamUrl(audioFile.id);
      setCloudAudioStreamUrl(streamUrl);
    } catch (err) {
      console.error('Failed to get stream URL:', err);
    }
  }, [getStreamUrl]);

  useEffect(() => {
    if (autoplayRequested && isLoaded && audioUrl && !isPlaybackMode) {
      enterPlaybackMode();
      navigate(`/piece/${id}/teleprompter`, { replace: true });
    }
  }, [autoplayRequested, isLoaded, audioUrl, isPlaybackMode, enterPlaybackMode, navigate, id]);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return (currentTimeDisplay / duration) * 100;
  }, [currentTimeDisplay, duration]);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  if (pieceLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pieceError || !piece) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Piece Not Found</h1>
        <Button asChild>
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-screen bg-background flex flex-col",
        isFullscreen && "fixed inset-0 z-50",
        isPlaybackMode && "bg-black"
      )}
    >
{isPlaybackMode ? (
          <>
            {isCountingDown && countdown !== null && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90">
                <div className="text-center">
                  <div className="relative">
                    <div 
                      className="text-[200px] font-bold text-white leading-none animate-pulse"
                      style={{ 
                        textShadow: '0 0 60px rgba(255,255,255,0.5), 0 0 120px rgba(255,255,255,0.3)',
                      }}
                    >
                      {countdown}
                    </div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - (countdown % 1 || 1))}`}
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                  </div>
                  <p className="text-white/70 text-xl mt-8">Starting soon...</p>
                  <Button
                    variant="ghost"
                    className="mt-6 text-white/50 hover:text-white hover:bg-white/10"
                    onClick={exitPlaybackMode}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <header className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
            <Button
              variant="ghost"
              size="icon"
              onClick={exitPlaybackMode}
              className="text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>
            
              <h1 
                className="text-lg font-semibold text-white overflow-visible text-center flex-1 mx-4 py-2"
                dir="rtl"
                style={{ 
                  fontFamily: "'AlMajeed', 'Noto Nastaliq Urdu', 'Cairo', sans-serif",
                  lineHeight: '1.6'
                }}
              >
              {piece.title}
            </h1>

            <div className="flex items-center gap-2">
              <Popover open={showSettings} onOpenChange={setShowSettings}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <Settings className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium">Display Settings</h4>
                    
                    <div>
                      <label className="text-sm text-muted-foreground">Font Size: {fontSize}px</label>
                      <Slider
                        value={[fontSize]}
                        onValueChange={([v]) => setFontSize(v)}
                        min={16}
                        max={48}
                        step={2}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Zoom: {imageZoom}%</label>
                      <Slider
                        value={[imageZoom]}
                        onValueChange={([v]) => setImageZoom(v)}
                        min={50}
                        max={200}
                        step={10}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Highlight Style</label>
                      <Select value={highlightMode} onValueChange={(v: any) => setHighlightMode(v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="background">Background</SelectItem>
                          <SelectItem value="border">Border</SelectItem>
                          <SelectItem value="scale">Scale</SelectItem>
                          <SelectItem value="glow">Glow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <main className="absolute inset-0 overflow-hidden">
                    <UnifiedTeleprompterPlayer
                      pieceId={id!}
                      title={piece.title}
                      imageUrls={imageUrls}
                      pdfUrl={pdfUrl}
                      textContent={textContent}
                      segments={segments}
                      imageRegions={imageRegions}
                      currentTime={currentTimeDisplay}
                      duration={duration}
                      isPlaying={isPlaying}
                      fontSize={fontSize}
                      imageZoom={imageZoom}
                      isPlaybackMode={isPlaybackMode}
                      scrollBehavior={scrollBehavior}
                      highlightMode={highlightMode}
                      onSeekToSegment={seekToSegment}
                      onNavigateToImageEditor={() => navigate(`/piece/${id}/teleprompter/image-edit`)}
                    />
          </main>

          <footer className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div
              className="h-2 bg-white/20 cursor-pointer group mx-4"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-primary relative group-hover:h-3 transition-all"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

              <div className="p-4">
                <div className="flex items-center justify-center max-w-4xl mx-auto relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2" style={{ contain: 'layout size style', isolation: 'isolate' }}>
                    <div className="flex items-center gap-1.5 text-sm text-white/70" style={{ width: '140px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontVariantNumeric: 'tabular-nums' }}>
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span style={{ minWidth: '45px', display: 'inline-block', textAlign: 'right' }}>{formatTime(currentTimeDisplay)}</span>
                      <span>/</span>
                      <span style={{ minWidth: '45px', display: 'inline-block' }}>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPreviousSegment}
                    disabled={currentSegmentIndex <= 0 || segments.length === 0}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skipBackward(5)}
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>

                  <Button
                    size="lg"
                    className="rounded-full w-14 h-14 bg-white text-black hover:bg-white/90"
                    onClick={togglePlay}
                    disabled={!isLoaded}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skipForward(5)}
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCw className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextSegment}
                    disabled={currentSegmentIndex >= segments.length - 1 || segments.length === 0}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant={isLooping ? "default" : "ghost"}
                    size="icon"
                    onClick={isLooping ? clearLoop : loopCurrentSegment}
                    disabled={segments.length === 0}
                    className={cn(!isLooping && "text-white hover:bg-white/20")}
                  >
                    <Repeat className="w-4 h-4" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                        {isMuted || volume === 0 ? (
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
                            {Math.round(volume * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[volume * 100]}
                          onValueChange={([v]) => handleVolumeChange(v / 100)}
                          max={100}
                          step={1}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={toggleMute}
                        >
                          {isMuted ? 'Unmute' : 'Mute'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
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
                              variant={playbackSpeed === speed ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleSetPlaybackSpeed(speed)}
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
          </footer>
        </>
      ) : (
        <>
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
              <div className="max-w-[1600px] mx-auto px-4 min-h-[5rem] md:min-h-[6rem] py-2 grid grid-cols-3 items-center">
                {/* Left: Navigation & Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/piece/${id}`)}
                    className="h-10 w-10 rounded-full hover:bg-accent/50 shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  
                    <div className="flex flex-col min-w-0 hidden lg:flex">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Teleprompter</span>
                        {audioUrl && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                            <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">Active</span>
                          </div>
                        )}
                      </div>
                      {audioUrl && (
                          <div className="flex items-center gap-2 group max-w-[280px]">
                            <div className="flex items-center gap-2 px-2 py-0.5 bg-accent/30 rounded-md border border-border/50 transition-colors group-hover:bg-accent/50 overflow-hidden min-w-0">
                              {cloudAudioStreamUrl ? (
                                <Cloud className="w-3 h-3 text-blue-500 shrink-0" />
                              ) : (
                                <Smartphone className="w-3 h-3 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-[10px] font-semibold text-foreground/70 truncate">
                                {cloudAudio?.filename ? 
                                  (cloudAudio.filename.length > 15 ? `${cloudAudio.filename.substring(0, 10)}...${cloudAudio.filename.split('.').pop()}` : cloudAudio.filename) :
                                  airSendAudioName ? 
                                  (airSendAudioName.length > 15 ? `${airSendAudioName.substring(0, 10)}...${airSendAudioName.split('.').pop()}` : airSendAudioName) : 
                                  (typeof audioUrl === 'string' ? 
                                    (() => {
                                      const name = decodeURIComponent(audioUrl.split('/').pop() || '').replace(/^\d+-\d+\./, '');
                                      return name.length > 15 ? `${name.substring(0, 10)}...${name.split('.').pop()}` : name;
                                    })() : 'Active Audio'
                                  )
                                }
                              </span>
                              {cloudAudioStreamUrl && (
                                <span className="text-[8px] px-1 py-0.5 bg-blue-500/10 text-blue-600 rounded font-bold">CLOUD</span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md hover:bg-accent"
                                onClick={() => {
                                  if (audioUrl) {
                                    const a = document.createElement('a');
                                    a.href = audioUrl;
                                    a.download = cloudAudio?.filename || airSendAudioName || 'audio-file';
                                    a.click();
                                  }
                                }}
                                title="Download audio"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md hover:bg-red-50 text-red-500"
                                onClick={() => {
                                  if (cloudAudioStreamUrl) {
                                    setCloudAudioStreamUrl(null);
                                    setCloudAudio(null);
                                  } else {
                                    setAirSendAudioUrl(null);
                                    setAirSendAudioName(null);
                                  }
                                  toast({ title: 'Audio cleared' });
                                }}
                                title="Clear audio"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md hover:bg-blue-50 text-blue-600"
                                onClick={() => setShowR2Upload(true)}
                                title="Upload to cloud"
                              >
                                <Cloud className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md hover:bg-accent"
                                onClick={() => setShowAirSend(true)}
                                title="AirSend from phone"
                              >
                                <Smartphone className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                      )}
                      {!audioUrl && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1.5 text-xs"
                            onClick={() => setShowR2Upload(true)}
                          >
                            <Cloud className="w-3 h-3" />
                            Cloud
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 gap-1.5 text-xs"
                            onClick={() => setShowAirSend(true)}
                          >
                            <Smartphone className="w-3 h-3" />
                            AirSend
                          </Button>
                        </div>
                      )}
                    </div>
                </div>
  
                {/* Center: Title & Main Control */}
                  <div className="flex flex-col items-center gap-2 min-w-0 px-2">
                    <h1 
                      className="text-lg md:text-xl font-bold tracking-tight text-center overflow-visible w-full max-w-[400px] py-1"
                      dir="rtl"
                      style={{ 
                        fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif",
                        lineHeight: '1.6'
                      }}
                    >
                      {piece.title}
                    </h1>
                  
                  {audioUrl && isLoaded && (
                    <div className="flex items-center shadow-lg shadow-primary/10 rounded-full bg-primary overflow-hidden h-9">
                      <Button
                        size="sm"
                        className="rounded-none h-full px-5 hover:bg-primary/90 transition-colors font-bold text-[11px] uppercase tracking-wider"
                        onClick={() => enterPlaybackMode()}
                      >
                        <PlayCircle className="w-3.5 h-3.5 mr-2" />
                        Start
                      </Button>
                      <div className="w-px h-4 bg-primary-foreground/20" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="rounded-none h-full px-2 hover:bg-primary/90 transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-48">
                          <DropdownMenuItem onClick={() => enterPlaybackMode()} className="gap-2">
                            <Play className="w-4 h-4" />
                            <span>Start Now</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => enterPlaybackMode(3)} className="gap-2">
                            <Timer className="w-4 h-4" />
                            <span>Start in 3s</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => enterPlaybackMode(5)} className="gap-2">
                            <Timer className="w-4 h-4" />
                            <span>Start in 5s</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => enterPlaybackMode(10)} className="gap-2">
                            <Timer className="w-4 h-4" />
                            <span>Start in 10s</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
  
                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-1">
                  <Popover open={showSettings} onOpenChange={setShowSettings}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-accent">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 mt-2" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-bold text-sm uppercase tracking-wider">Display Settings</h4>
                          <Settings className="w-4 h-4 text-muted-foreground" />
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase text-muted-foreground">Font Size</label>
                            <span className="text-xs font-mono">{fontSize}px</span>
                          </div>
                          <Slider
                            value={[fontSize]}
                            onValueChange={([v]) => setFontSize(v)}
                            min={16}
                            max={48}
                            step={2}
                          />
                        </div>
  
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase text-muted-foreground">Zoom Level</label>
                            <span className="text-xs font-mono">{imageZoom}%</span>
                          </div>
                          <Slider
                            value={[imageZoom]}
                            onValueChange={([v]) => setImageZoom(v)}
                            min={50}
                            max={200}
                            step={10}
                          />
                        </div>
  
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase text-muted-foreground">Highlight Style</label>
                          <Select value={highlightMode} onValueChange={(v: any) => setHighlightMode(v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="background">Background</SelectItem>
                              <SelectItem value="border">Border</SelectItem>
                              <SelectItem value="scale">Scale</SelectItem>
                              <SelectItem value="glow">Glow</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
  
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase text-muted-foreground">Scroll Behavior</label>
                          <Select value={scrollBehavior} onValueChange={(v: any) => setScrollBehavior(v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="smooth">Smooth</SelectItem>
                              <SelectItem value="instant">Instant</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-accent"
                    onClick={() => navigate(`/piece/${id}/teleprompter/image-edit`)}
                  >
                    <Edit2 className="w-5 h-5 text-muted-foreground" />
                  </Button>
  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-green-50 text-green-600 hover:text-green-700"
                    onClick={() => setShowFinishDialog(true)}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </Button>
  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-accent hidden md:flex"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Maximize2 className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </header>

      <main className="flex-1 overflow-hidden">
        <UnifiedTeleprompterPlayer
          pieceId={id!}
          title={piece.title}
          imageUrls={imageUrls}
          pdfUrl={pdfUrl}
          textContent={textContent}
          segments={segments}
          imageRegions={imageRegions}
          currentTime={currentTimeDisplay}
          isPlaying={isPlaying}
          fontSize={fontSize}
          imageZoom={imageZoom}
          scrollBehavior={scrollBehavior}
          highlightMode={highlightMode}
          onSeekToSegment={seekToSegment}
          onNavigateToEditor={() => navigate(`/piece/${id}/teleprompter/edit`)}
          onNavigateToImageEditor={() => navigate(`/piece/${id}/teleprompter/image-edit`)}
        />
      </main>

      {audioUrl && (
        <footer className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border">
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
                  <span>{formatTime(currentTimeDisplay)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousSegment}
                  disabled={currentSegmentIndex <= 0 || segments.length === 0}
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
                  {isPlaying ? (
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
                  disabled={currentSegmentIndex >= segments.length - 1 || segments.length === 0}
                  title="Next segment (Shift+Right)"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-2 min-w-[100px] justify-end">
                <Button
                  variant={isLooping ? "default" : "ghost"}
                  size="icon"
                  onClick={isLooping ? clearLoop : loopCurrentSegment}
                  disabled={segments.length === 0}
                  title="Loop segment (L)"
                >
                  <Repeat className="w-4 h-4" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="Volume">
                      {isMuted || volume === 0 ? (
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
                          {Math.round(volume * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[volume * 100]}
                        onValueChange={([v]) => handleVolumeChange(v / 100)}
                        max={100}
                        step={1}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={toggleMute}
                      >
                        {isMuted ? 'Unmute' : 'Mute'}
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
                            variant={playbackSpeed === speed ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSetPlaybackSpeed(speed)}
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
        </footer>
      )}



        <AirSendDialog
          open={showAirSend}
          onOpenChange={setShowAirSend}
          pieceId={id!}
          onAudioReceived={handleAirSendAudioReceived}
          onCloudAudioUploaded={handleCloudAudioUploaded}
        />

        <R2AudioUploadDialog
          open={showR2Upload}
          onOpenChange={setShowR2Upload}
          pieceId={id!}
          onAudioUploaded={handleCloudAudioUploaded}
          existingAudio={cloudAudio}
        />

        <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finish Task & Clean Up?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all teleprompter segments, progress, and local data for this piece. 
                Use this only after the video is created and you no longer need the teleprompter work.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFinishTask}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                Finish & Delete Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </>
      )}
    </div>
  );
}
