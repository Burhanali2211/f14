import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { TeleprompterSegment, TeleprompterSession, TeleprompterState } from '@/lib/teleprompter-types';
import {
  getSession,
  getSessionById,
  createSession,
  saveSession,
  updateSessionSegments,
  updateSessionSettings,
  getProgress,
  updateProgress,
  markSegmentCompleted,
  incrementPracticeCount,
  findSegmentIndexAtTime,
  undo,
  redo,
  canUndo,
  canRedo,
} from '@/lib/teleprompter-storage';

interface UseTeleprompterOptions {
  pieceId: string;
  audioUrl?: string | null;
  textContent?: string;
  onSegmentChange?: (index: number, segment: TeleprompterSegment | null) => void;
  onPlaybackEnd?: () => void;
  autoScroll?: boolean;
}

export function useTeleprompter(options: UseTeleprompterOptions) {
  const { pieceId, audioUrl, textContent, onSegmentChange, onPlaybackEnd, autoScroll = true } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const practiceStartRef = useRef<number | null>(null);

  const [session, setSession] = useState<TeleprompterSession | null>(null);
  const [state, setState] = useState<TeleprompterState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentSegmentIndex: -1,
    isFullscreen: false,
    volume: 1,
    isMuted: false,
    playbackSpeed: 1,
    isLooping: false,
    loopStart: null,
    loopEnd: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let existingSession = getSession(pieceId);
    
    if (!existingSession) {
      existingSession = createSession(pieceId, audioUrl);
    } else if (audioUrl && !existingSession.audioUrl) {
      existingSession.audioUrl = audioUrl;
      saveSession(existingSession);
    }
    
    setSession(existingSession);

    const progress = getProgress(existingSession.id);
    if (progress) {
      setState(prev => ({
        ...prev,
        currentTime: progress.currentTime,
        currentSegmentIndex: progress.currentSegment,
      }));
    }
  }, [pieceId, audioUrl]);

  useEffect(() => {
    if (!session?.audioUrl) return;

    const audio = new Audio();
    audio.preload = 'metadata';
    
    const handleLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration }));
      setIsLoaded(true);
      setError(null);
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoaded(false);
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      if (practiceStartRef.current && session) {
        const practiceTime = Math.floor((Date.now() - practiceStartRef.current) / 1000);
        incrementPracticeCount(session.id, practiceTime);
        practiceStartRef.current = null;
      }
      onPlaybackEnd?.();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    audio.src = session.audioUrl;
    audioRef.current = audio;

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [session?.audioUrl, session?.id, onPlaybackEnd]);

  const updateCurrentSegment = useCallback((time: number) => {
    if (!session?.segments.length) return;

    const newIndex = findSegmentIndexAtTime(session.segments, time);
    
    if (newIndex !== state.currentSegmentIndex) {
      setState(prev => ({ ...prev, currentSegmentIndex: newIndex }));
      
      if (session) {
        updateProgress(session.id, {
          currentTime: time,
          currentSegment: newIndex,
        });
      }
      
      onSegmentChange?.(newIndex, session.segments[newIndex] || null);
    }
  }, [session, state.currentSegmentIndex, onSegmentChange]);

  const updatePlaybackLoop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.isPlaying) return;

    const currentTime = audio.currentTime;
    
    if (state.isLooping && state.loopEnd !== null && currentTime >= state.loopEnd) {
      audio.currentTime = state.loopStart || 0;
    }

    setState(prev => ({ ...prev, currentTime }));
    updateCurrentSegment(currentTime);

    animationFrameRef.current = requestAnimationFrame(updatePlaybackLoop);
  }, [state.isPlaying, state.isLooping, state.loopStart, state.loopEnd, updateCurrentSegment]);

  useEffect(() => {
    if (state.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackLoop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, updatePlaybackLoop]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.play().then(() => {
      setState(prev => ({ ...prev, isPlaying: true }));
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
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedTime = Math.max(0, Math.min(time, state.duration));
    audio.currentTime = clampedTime;
    setState(prev => ({ ...prev, currentTime: clampedTime }));
    updateCurrentSegment(clampedTime);
  }, [state.duration, updateCurrentSegment]);

  const seekToSegment = useCallback((index: number) => {
    if (!session?.segments[index]) return;
    seek(session.segments[index].startTime);
  }, [session?.segments, seek]);

  const goToNextSegment = useCallback(() => {
    if (!session?.segments.length) return;
    const nextIndex = Math.min(state.currentSegmentIndex + 1, session.segments.length - 1);
    seekToSegment(nextIndex);
    
    if (state.currentSegmentIndex >= 0 && session) {
      markSegmentCompleted(session.id, state.currentSegmentIndex);
    }
  }, [session, state.currentSegmentIndex, seekToSegment]);

  const goToPreviousSegment = useCallback(() => {
    if (!session?.segments.length) return;
    const prevIndex = Math.max(state.currentSegmentIndex - 1, 0);
    seekToSegment(prevIndex);
  }, [session, state.currentSegmentIndex, seekToSegment]);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    audio.volume = clampedVolume;
    setState(prev => ({ ...prev, volume: clampedVolume, isMuted: clampedVolume === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newMuted = !state.isMuted;
    audio.muted = newMuted;
    setState(prev => ({ ...prev, isMuted: newMuted }));
  }, [state.isMuted]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedSpeed = Math.max(0.25, Math.min(2, speed));
    audio.playbackRate = clampedSpeed;
    setState(prev => ({ ...prev, playbackSpeed: clampedSpeed }));
    
    if (session) {
      updateSessionSettings(session.id, { playbackSpeed: clampedSpeed });
    }
  }, [session]);

  const setLoop = useCallback((start: number | null, end: number | null) => {
    setState(prev => ({
      ...prev,
      isLooping: start !== null && end !== null,
      loopStart: start,
      loopEnd: end,
    }));
  }, []);

  const loopCurrentSegment = useCallback(() => {
    if (!session?.segments[state.currentSegmentIndex]) return;
    const segment = session.segments[state.currentSegmentIndex];
    setLoop(segment.startTime, segment.endTime);
  }, [session, state.currentSegmentIndex, setLoop]);

  const clearLoop = useCallback(() => {
    setLoop(null, null);
  }, [setLoop]);

  const skipForward = useCallback((seconds: number = 5) => {
    seek(state.currentTime + seconds);
  }, [state.currentTime, seek]);

  const skipBackward = useCallback((seconds: number = 5) => {
    seek(state.currentTime - seconds);
  }, [state.currentTime, seek]);

  const updateSegments = useCallback((segments: TeleprompterSegment[]) => {
    if (!session) return;
    const updated = updateSessionSegments(session.id, segments);
    if (updated) {
      setSession(updated);
    }
  }, [session]);

  const updateSettings = useCallback((settings: Partial<Pick<TeleprompterSession, 'scrollBehavior' | 'highlightMode' | 'fontSize' | 'audioUrl'>>) => {
    if (!session) return;
    const updated = updateSessionSettings(session.id, settings);
    if (updated) {
      setSession(updated);
    }
  }, [session]);

  const handleUndo = useCallback(() => {
    if (!session) return null;
    const undone = undo(session.id);
    if (undone) {
      setSession(undone);
    }
    return undone;
  }, [session]);

  const handleRedo = useCallback(() => {
    if (!session) return null;
    const redone = redo(session.id);
    if (redone) {
      setSession(redone);
    }
    return redone;
  }, [session]);

  const currentSegment = useMemo(() => {
    if (!session?.segments.length || state.currentSegmentIndex < 0) return null;
    return session.segments[state.currentSegmentIndex] || null;
  }, [session?.segments, state.currentSegmentIndex]);

  const progress = useMemo(() => {
    if (!state.duration) return 0;
    return (state.currentTime / state.duration) * 100;
  }, [state.currentTime, state.duration]);

  const segmentProgress = useMemo(() => {
    if (!currentSegment) return 0;
    const segmentDuration = currentSegment.endTime - currentSegment.startTime;
    const elapsed = state.currentTime - currentSegment.startTime;
    return Math.max(0, Math.min(100, (elapsed / segmentDuration) * 100));
  }, [currentSegment, state.currentTime]);

  return {
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
    
    setLoop,
    loopCurrentSegment,
    clearLoop,
    
    skipForward,
    skipBackward,
    
    updateSegments,
    updateSettings,
    
    handleUndo,
    handleRedo,
    canUndo: session ? canUndo(session.id) : false,
    canRedo: session ? canRedo(session.id) : false,
  };
}
