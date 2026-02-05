import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play, Pause, SkipBack, SkipForward, Settings, Clock,
  Home, Edit2, ArrowLeft, Loader2, PlayCircle, X, Timer, ChevronDown, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, normalizeImageUrl, getProxiedImageUrls } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { TeleprompterSegment } from '@/lib/teleprompter-types';
import {
  getSession,
  createSession,
  resetProgress,
  findSegmentIndexAtTime,
  formatTime,
} from '@/lib/teleprompter-storage';
import { UnifiedTeleprompterPlayer } from '@/components/media/UnifiedTeleprompterPlayer';
import { TeleprompterDisplaySettings } from '@/components/media/TeleprompterDisplaySettings';
import { TeleprompterPlaybackControls } from '@/components/media/TeleprompterPlaybackControls';
import type { ImageRegion } from '@/components/media/ImageSegmentEditor';
import { useBufferedAudio } from '@/hooks/useBufferedAudio';

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
  const sessionRef = useRef<ReturnType<typeof getSession>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ scrollToCurrentSegment: () => void; container: HTMLDivElement | null } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef(0);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
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

  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const segments = useMemo(() => session?.segments || [], [session]);

  const [imageRegions, setImageRegions] = useState<ImageRegion[]>([]);
  const [prefetchProgress, setPrefetchProgress] = useState(0);
  const [isPrefetchReady, setIsPrefetchReady] = useState(false);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const [bufferHealth, setBufferHealth] = useState(100);

  const audioUrl = useMemo(() => {
    const audioR2Key = piece?.audio_url;
    if (!audioR2Key) return null;
    if (audioR2Key.startsWith('audio/')) {
      return `/api/r2-audio-proxy?key=${encodeURIComponent(audioR2Key)}`;
    }
    if (audioR2Key.startsWith('http://') || audioR2Key.startsWith('https://')) {
      return audioR2Key;
    }
    return null;
  }, [piece?.audio_url]);

  const { playbackUrl, isBuffering, bufferingError } = useBufferedAudio(audioUrl);

  useEffect(() => {
    setBufferHealth(isBuffering ? 0 : (playbackUrl ? 100 : 0));
  }, [isBuffering, playbackUrl]);

  const pdfUrl = useMemo(() => {
    const urls = normalizeImageUrl(piece?.image_url);
    return urls.find(u => u.toLowerCase().endsWith('.pdf')) || null;
  }, [piece?.image_url]);

  const imageUrls = useMemo(() => {
    const urls = normalizeImageUrl(piece?.image_url);
    const images = urls.filter(u => !u.toLowerCase().endsWith('.pdf'));
    return getProxiedImageUrls(images);
  }, [piece?.image_url]);

  const textContent = piece?.text_content || null;

  useEffect(() => {
    if (!id) return;

    let existingSession = getSession(id);
    if (!existingSession) {
      existingSession = createSession(id, audioUrl);
    }
    sessionRef.current = existingSession;
    setSession(existingSession);

    // Always start from the beginning when opening the teleprompter page
    resetProgress(existingSession.id);
  }, [id, audioUrl]);

  // Prefetch audio via service worker for smooth teleprompter playback
  useEffect(() => {
    if (!audioUrl) {
      setIsPrefetchReady(true);
      setPrefetchProgress(100);
      setPrefetchError(null);
      return;
    }
    if (!audioUrl.includes('/api/r2-audio-proxy')) {
      setIsPrefetchReady(true);
      setPrefetchProgress(100);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let fallbackId: ReturnType<typeof setTimeout> | undefined;
    const handler = (e: MessageEvent) => {
      if (cancelled) return;
      if (e.data?.type === 'PREFETCH_PROGRESS') {
        setPrefetchProgress(e.data.progress ?? 0);
        if (e.data.progress >= 100) setIsPrefetchReady(true);
      } else if (e.data?.type === 'PREFETCH_ERROR') {
        setPrefetchError(e.data.error ?? 'Prefetch failed');
        setIsPrefetchReady(true);
      }
    };

    setPrefetchProgress(0);
    setIsPrefetchReady(false);
    setPrefetchError(null);

    (async () => {
      try {
        if (!('serviceWorker' in navigator)) {
          setIsPrefetchReady(true);
          setPrefetchProgress(100);
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg?.active) {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          await navigator.serviceWorker.ready;
        }

        let fileSize = 0;
        try {
          const headRes = await fetch(audioUrl, { method: 'HEAD' });
          const cl = headRes.headers.get('Content-Length');
          if (cl) fileSize = parseInt(cl, 10) || 0;
        } catch {
          // Continue without fileSize - SW will do full fetch
        }

        navigator.serviceWorker.addEventListener('message', handler);

        const active = (await navigator.serviceWorker.ready).active;
        if (active) {
          active.postMessage({ type: 'PREFETCH_AUDIO', audioUrl, fileSize });
        } else {
          setIsPrefetchReady(true);
          setPrefetchProgress(100);
        }

        // Fallback: if SW doesn't support PREFETCH_AUDIO (e.g. workbox in prod), proceed after 3s
        fallbackId = setTimeout(() => {
          if (!cancelled) {
            setIsPrefetchReady(true);
            setPrefetchProgress(100);
          }
        }, 3000);

        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setIsPrefetchReady(true);
            setPrefetchProgress(100);
          }
        }, 60000);
      } catch (err) {
        if (!cancelled) {
          setPrefetchError(err instanceof Error ? err.message : 'Prefetch failed');
          setIsPrefetchReady(true);
          setPrefetchProgress(100);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (fallbackId) clearTimeout(fallbackId);
      navigator.serviceWorker.removeEventListener('message', handler);
    };
  }, [audioUrl]);

  // Reset playback state and scroll to top when opening the page
  useEffect(() => {
    if (!id) return;
    setCurrentTimeDisplay(0);
    setCurrentSegmentIndex(-1);
    currentTimeRef.current = 0;
    // Scroll player content to top (will run after player mounts)
    const scrollToTop = () => {
      playerRef.current?.container?.scrollTo({ top: 0, behavior: 'auto' });
    };
    scrollToTop();
    const t = setTimeout(scrollToTop, 100);
    return () => clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    
    const loadRegions = async () => {
      try {
        const { data } = await supabase
          .from('piece_image_segments')
          .select('regions')
          .eq('piece_id', id)
          .maybeSingle();

        if (data?.regions) {
          const regions = data.regions as unknown as ImageRegion[];
          setImageRegions(regions.sort((a, b) => a.startTime - b.startTime));
          return;
        }
      } catch {
        // Fall through to localStorage fallback
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
    if (!playbackUrl) {
      setIsLoaded(false);
      if (bufferingError) setError(bufferingError);
      return;
    }
    setError(null);

    const audio = new Audio();
    audio.preload = 'auto';

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      setError(null);
      audio.currentTime = 0;
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoaded(false);
    };

    const handleEnded = () => {
      // Playback loop handles stop/continuation
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    audio.src = playbackUrl;
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [playbackUrl, bufferingError]);

  const updateCurrentSegment = useCallback((time: number) => {
    if (!segments.length) return;

    const newIndex = findSegmentIndexAtTime(segments, time);
    
    if (newIndex !== currentSegmentIndex) {
      setCurrentSegmentIndex(newIndex);
    }
  }, [segments, currentSegmentIndex]);

  const currentTimeDisplayRef = useRef(0);

  const postAudioContinuationRef = useRef<number | null>(null);
  const postAudioStartRef = useRef<number | null>(null);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.play().then(() => {
      setIsPlaying(true);
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

  const sortedImageRegions = useMemo(
    () => [...imageRegions].sort((a, b) => a.startTime - b.startTime),
    [imageRegions]
  );

  const currentRegionIndex = useMemo(() => {
    if (!sortedImageRegions.length) return -1;
    const time = currentTimeDisplay;
    for (let i = 0; i < sortedImageRegions.length; i++) {
      if (time >= sortedImageRegions[i].startTime && time < sortedImageRegions[i].endTime) return i;
    }
    if (time < sortedImageRegions[0].startTime) return -1;
    return sortedImageRegions.length - 1;
  }, [sortedImageRegions, currentTimeDisplay]);

  const hasSegments = segments.length > 0;
  const hasImageRegions = sortedImageRegions.length > 0;
  const navigableCount = hasSegments ? segments.length : hasImageRegions ? sortedImageRegions.length : 0;
  const activeIndex = hasSegments ? currentSegmentIndex : hasImageRegions ? currentRegionIndex : -1;

  const lastSegmentEndTime = useMemo(() => {
    if (hasSegments && segments.length > 0) {
      return segments[segments.length - 1].endTime;
    }
    if (hasImageRegions && sortedImageRegions.length > 0) {
      return sortedImageRegions[sortedImageRegions.length - 1].endTime;
    }
    return null;
  }, [hasSegments, hasImageRegions, segments, sortedImageRegions]);

  const segmentTimeRemaining = useMemo(() => {
    if (activeIndex < 0 || navigableCount === 0) return null;
    const endTime = hasSegments && segments[activeIndex]
      ? segments[activeIndex].endTime
      : hasImageRegions && sortedImageRegions[activeIndex]
        ? sortedImageRegions[activeIndex].endTime
        : null;
    if (endTime == null) return null;
    const remaining = endTime - currentTimeDisplay;
    return Math.max(0, remaining);
  }, [activeIndex, navigableCount, hasSegments, hasImageRegions, segments, sortedImageRegions, currentTimeDisplay]);

  const seekToSegment = useCallback((index: number) => {
    if (hasSegments && segments[index]) {
      seek(segments[index].startTime);
    } else if (hasImageRegions && sortedImageRegions[index]) {
      seek(sortedImageRegions[index].startTime);
    }
  }, [segments, sortedImageRegions, hasSegments, hasImageRegions, seek]);

  const goToNextSegment = useCallback(() => {
    if (navigableCount === 0) return;
    const nextIndex = Math.min(activeIndex + 1, navigableCount - 1);
    seekToSegment(nextIndex);
  }, [navigableCount, activeIndex, seekToSegment]);

  const goToPreviousSegment = useCallback(() => {
    if (navigableCount === 0) return;
    const prevIndex = Math.max(activeIndex - 1, 0);
    seekToSegment(prevIndex);
  }, [navigableCount, activeIndex, seekToSegment]);

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

  const stopPlayback = useCallback(() => {
    pause();
    postAudioStartRef.current = null;
    setIsCountingDown(false);
    setCountdown(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (postAudioContinuationRef.current) {
      cancelAnimationFrame(postAudioContinuationRef.current);
      postAudioContinuationRef.current = null;
    }
    // Reset to beginning so next start begins from the start
    seek(0);
  }, [pause, seek]);

  const lastSegmentEndTimeRef = useRef<number | null>(null);
  lastSegmentEndTimeRef.current = lastSegmentEndTime;

  const updatePlaybackLoop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    const lastEnd = lastSegmentEndTimeRef.current;
    let time: number;

    // If audio ended before last segment end, continue advancing time until segment end
    if (
      audio.ended &&
      lastEnd != null &&
      audio.duration < lastEnd
    ) {
      if (postAudioStartRef.current == null) {
        postAudioStartRef.current = performance.now();
      }
      const elapsed = (performance.now() - postAudioStartRef.current) / 1000;
      time = Math.min(audio.duration + elapsed, lastEnd);
      currentTimeRef.current = time;

      if (time >= lastEnd) {
        postAudioStartRef.current = null;
        stopPlayback();
        return;
      }
      currentTimeDisplayRef.current = time;
      setCurrentTimeDisplay(time);
      updateCurrentSegment(time);
    } else {
      // Normal playback from audio
      postAudioStartRef.current = null;
      time = audio.currentTime;
      currentTimeRef.current = time;

      // Stop when audio ends and we have no segments, or when past last segment end
      if (audio.ended && lastEnd == null) {
        stopPlayback();
        return;
      }
      if (lastEnd != null && time >= lastEnd) {
        stopPlayback();
        return;
      }

      if (Math.abs(time - currentTimeDisplayRef.current) >= 0.05) {
        currentTimeDisplayRef.current = time;
        setCurrentTimeDisplay(time);
      }
      updateCurrentSegment(time);
    }

    animationFrameRef.current = requestAnimationFrame(updatePlaybackLoop);
  }, [isPlaying, updateCurrentSegment, stopPlayback]);

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

  const navigateAway = useCallback((path: string) => {
    stopPlayback();
    navigate(path);
  }, [stopPlayback, navigate]);

  const enterPlaybackMode = useCallback(async (delaySeconds?: number) => {
    setIsPlaybackMode(true);
    try {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } catch {
      // Fullscreen may fail (e.g. not user-initiated); continue without it
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
    stopPlayback();
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen?.();
      } catch {
        // Ignore exitFullscreen errors
      }
    }
    setIsFullscreen(false);
  }, [stopPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

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
            skipBackward(5);
          } else {
            goToPreviousSegment();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            skipForward(5);
          } else {
            goToNextSegment();
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
            navigateAway(`/piece/${id}`);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isFullscreen, isPlaybackMode, id, exitPlaybackMode, toggleFullscreen, navigateAway, togglePlay, goToPreviousSegment, goToNextSegment, skipBackward, skipForward, handleVolumeChange, toggleMute, stopPlayback]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && isPlaybackMode) {
        setIsPlaybackMode(false);
        stopPlayback();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isPlaybackMode, stopPlayback]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * duration);
  };

  const autoplayTriggeredRef = useRef(false);
  useEffect(() => {
    if (!autoplayRequested || !isLoaded || !audioUrl || isPlaybackMode || autoplayTriggeredRef.current) return;
    autoplayTriggeredRef.current = true;
    enterPlaybackMode();
    navigate(`/piece/${id}/teleprompter`, { replace: true });
  }, [autoplayRequested, isLoaded, audioUrl, isPlaybackMode, enterPlaybackMode, navigate, id]);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return (currentTimeDisplay / duration) * 100;
  }, [currentTimeDisplay, duration]);

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

  if (audioUrl && !isPrefetchReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
        <h2 className="text-xl font-semibold mb-2">Preparing audio for recitation</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Please wait for complete download to prevent interruptions during recitation.
        </p>
        <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${prefetchProgress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-3">{prefetchProgress}%</p>
        {prefetchError && (
          <p className="text-sm text-destructive mt-2">{prefetchError}</p>
        )}
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
            {!isCountingDown && segmentTimeRemaining != null && (
              <div
                className="absolute top-3 left-3 z-40 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10"
                title="Time left in this segment"
              >
                <Clock className="w-3 h-3 text-white/80 shrink-0" />
                <span className="text-[11px] font-medium tabular-nums text-white/90">
                  {formatTime(segmentTimeRemaining)}
                </span>
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
                <PopoverContent className="w-72 z-[100]" align="end" container={containerRef.current}>
                  <TeleprompterDisplaySettings
                    fontSize={fontSize}
                    onFontSizeChange={setFontSize}
                    imageZoom={imageZoom}
                    onImageZoomChange={setImageZoom}
                    highlightMode={highlightMode}
                    onHighlightModeChange={setHighlightMode}
                    scrollBehavior={scrollBehavior}
                    onScrollBehaviorChange={setScrollBehavior}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <main className="absolute inset-0 overflow-hidden">
                    <UnifiedTeleprompterPlayer
                      ref={playerRef}
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
                      onNavigateToImageEditor={() => navigateAway(`/piece/${id}/teleprompter/image-edit`)}
                    />
          </main>

          <footer className="absolute bottom-0 left-0 right-0 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none hover:pointer-events-auto">
              <div className="bg-gradient-to-t from-black/80 to-transparent pt-8">
                {audioUrl && (
                  <div className="px-4 pb-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          bufferHealth < 30 ? "bg-red-500" : bufferHealth < 60 ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${bufferHealth}%` }}
                      />
                    </div>
                    {bufferHealth < 30 && (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" title="Low buffer" />
                    )}
                  </div>
                )}
                <TeleprompterPlaybackControls
                  currentTime={currentTimeDisplay}
                  duration={duration}
                  progress={progress}
                  isPlaying={isPlaying}
                  isLoaded={isLoaded}
                  isLooping={false}
                  volume={volume}
                  isMuted={isMuted}
                  playbackSpeed={playbackSpeed}
                  segmentsLength={navigableCount}
                  currentSegmentIndex={activeIndex}
                  onProgressClick={handleProgressClick}
                  onTogglePlay={togglePlay}
                  onPreviousSegment={goToPreviousSegment}
                  onNextSegment={goToNextSegment}
                  onSkipBackward={skipBackward}
                  onSkipForward={skipForward}
                  onLoopToggle={() => {}}
                  onVolumeChange={handleVolumeChange}
                  onMuteToggle={toggleMute}
                  onSpeedChange={handleSetPlaybackSpeed}
                  variant="playback"
                />
              </div>
            </footer>
        </>
      ) : (
        <>
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <div className="max-w-[1600px] mx-auto px-4 min-h-[5rem] py-2 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateAway(`/piece/${id}`)}
                className="h-10 w-10 rounded-full hover:bg-accent/50 shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <h1
                className="text-lg md:text-xl font-bold tracking-tight text-center overflow-hidden flex-1 min-w-0 truncate px-2"
                dir="rtl"
                style={{ fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif", lineHeight: '1.6' }}
              >
                {piece.title}
              </h1>

              <div className="flex items-center gap-2 shrink-0">
                {((audioUrl && (isLoaded || isBuffering)) || segments.length > 0 || imageRegions.length > 0) && (
                  <div className="flex items-center gap-2">
                    {audioUrl && (
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden" title={`Buffer: ${bufferHealth}%`}>
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            bufferHealth < 30 ? "bg-red-500" : bufferHealth < 60 ? "bg-amber-500" : "bg-green-500"
                          )}
                          style={{ width: `${bufferHealth}%` }}
                        />
                      </div>
                    )}
                  <div className="flex items-center shadow-lg shadow-primary/10 rounded-full bg-primary overflow-hidden h-9">
                    {isBuffering ? (
                      <Button
                        size="sm"
                        disabled
                        className="rounded-none h-full px-5 font-bold text-[11px] uppercase tracking-wider opacity-90"
                      >
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        Buffering…
                      </Button>
                    ) : (
                      <>
                    <Button
                      size="sm"
                      className="rounded-none h-full px-5 hover:bg-primary/90 transition-colors font-bold text-[11px] uppercase tracking-wider"
                      onClick={() => enterPlaybackMode()}
                    >
                      <PlayCircle className="w-3.5 h-3.5 mr-2" />
                      Start
                    </Button>
                    {audioUrl && isLoaded && (
                      <>
                        <div className="w-px h-4 bg-primary-foreground/20" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" className="rounded-none h-full px-2 hover:bg-primary/90 transition-colors">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
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
                      </>
                    )}
                      </>
                    )}
                  </div>
                  </div>
                )}
                <Popover open={showSettings} onOpenChange={setShowSettings}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-accent">
                      <Settings className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 mt-2" align="end">
                    <TeleprompterDisplaySettings
                      fontSize={fontSize}
                      onFontSizeChange={setFontSize}
                      imageZoom={imageZoom}
                      onImageZoomChange={setImageZoom}
                      highlightMode={highlightMode}
                      onHighlightModeChange={setHighlightMode}
                      scrollBehavior={scrollBehavior}
                      onScrollBehaviorChange={setScrollBehavior}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-accent"
                  onClick={() => navigateAway(`/piece/${id}/teleprompter/image-edit`)}
                  title="Edit image regions"
                >
                  <Edit2 className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            <UnifiedTeleprompterPlayer
              ref={playerRef}
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
              onNavigateToEditor={() => navigateAway(`/piece/${id}/teleprompter/edit`)}
              onNavigateToImageEditor={() => navigateAway(`/piece/${id}/teleprompter/image-edit`)}
            />
          </main>
        </>
      )}
    </div>
  );
}
