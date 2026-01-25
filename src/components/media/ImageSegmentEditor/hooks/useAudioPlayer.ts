import { useState, useCallback, useRef, useEffect } from 'react';
import type { AudioState } from '../types';

interface UseAudioPlayerOptions {
  audioUrl?: string;
  onTimeUpdate?: (time: number) => void;
}

export function useAudioPlayer({ audioUrl, onTimeUpdate }: UseAudioPlayerOptions) {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    isLooping: false,
    loopStart: null,
    loopEnd: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        const currentTime = audioRef.current.currentTime;
        setState(prev => ({ ...prev, currentTime }));
        onTimeUpdate?.(currentTime);

        if (state.isLooping && state.loopEnd !== null && currentTime >= state.loopEnd) {
          audioRef.current.currentTime = state.loopStart ?? 0;
        }
      }
      if (state.isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (state.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, state.isLooping, state.loopStart, state.loopEnd, onTimeUpdate]);

  const play = useCallback(() => {
    audioRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [state.isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    const clampedTime = Math.max(0, Math.min(time, state.duration));
    audioRef.current.currentTime = clampedTime;
    setState(prev => ({ ...prev, currentTime: clampedTime }));
  }, [state.duration]);

  const seekRelative = useCallback((delta: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(state.currentTime + delta, state.duration));
    audioRef.current.currentTime = newTime;
    setState(prev => ({ ...prev, currentTime: newTime }));
  }, [state.currentTime, state.duration]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (!audioRef.current) return;
    const clampedRate = Math.max(0.25, Math.min(2, rate));
    audioRef.current.playbackRate = clampedRate;
    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  const setLoop = useCallback((start: number | null, end: number | null) => {
    setState(prev => ({
      ...prev,
      isLooping: start !== null && end !== null,
      loopStart: start,
      loopEnd: end,
    }));
  }, []);

  const playRegion = useCallback((startTime: number, endTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = startTime;
    setLoop(startTime, endTime);
    audioRef.current.play();
  }, [setLoop]);

  const clearLoop = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLooping: false,
      loopStart: null,
      loopEnd: null,
    }));
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    clearLoop();
  }, [clearLoop]);

  return {
    ...state,
    audioRef,
    play,
    pause,
    stop,
    togglePlayPause,
    seekTo,
    seekRelative,
    setPlaybackRate,
    setLoop,
    playRegion,
    clearLoop,
    hasAudio: !!audioUrl,
  };
}
