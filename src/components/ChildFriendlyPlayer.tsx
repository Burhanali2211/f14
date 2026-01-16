import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { playTapSound } from './ChildFriendlyNav';

interface ChildFriendlyPlayerProps {
  audioUrl?: string;
  videoUrl?: string;
  title: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  soundEnabled?: boolean;
}

export function ChildFriendlyPlayer({
  audioUrl,
  videoUrl,
  title,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  soundEnabled = true,
}: ChildFriendlyPlayerProps) {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPressed, setIsPressed] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('ended', handleEnded);
      
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
          audioRef.current.removeEventListener('ended', handleEnded);
        }
      };
    }
  }, [audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(percent || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handlePlayPause = () => {
    setIsPressed('play');
    if (soundEnabled) playTapSound();

    setTimeout(() => {
      setIsPressed(null);
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    }, 150);
  };

  const handlePrevious = () => {
    if (!hasPrevious) return;
    setIsPressed('prev');
    if (soundEnabled) playTapSound();
    setTimeout(() => {
      setIsPressed(null);
      onPrevious?.();
    }, 150);
  };

  const handleNext = () => {
    if (!hasNext) return;
    setIsPressed('next');
    if (soundEnabled) playTapSound();
    setTimeout(() => {
      setIsPressed(null);
      onNext?.();
    }, 150);
  };

  const handleHome = () => {
    setIsPressed('home');
    if (soundEnabled) playTapSound();
    setTimeout(() => {
      setIsPressed(null);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      navigate('/');
    }, 150);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-4 pb-6 px-4">
        <div className="w-full h-3 bg-secondary rounded-full mb-6 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-6 max-w-md mx-auto">
          <button
            onClick={handlePrevious}
            disabled={!hasPrevious}
            className={`
              w-14 h-14 sm:w-16 sm:h-16
              rounded-full
              bg-secondary/90
              flex items-center justify-center
              shadow-lg
              transition-all duration-150
              ${!hasPrevious ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}
              ${isPressed === 'prev' ? 'scale-90 bg-primary/20' : hasPrevious ? 'hover:scale-105' : ''}
            `}
            aria-label="Previous"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-foreground" />
          </button>

          <button
            onClick={handlePlayPause}
            className={`
              w-24 h-24 sm:w-28 sm:h-28
              rounded-full
              ${isPlaying ? 'bg-accent' : 'bg-primary'}
              flex items-center justify-center
              shadow-xl
              transition-all duration-150
              active:scale-90
              ${isPressed === 'play' ? 'scale-90' : 'hover:scale-105'}
            `}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-12 h-12 sm:w-14 sm:h-14 text-white" fill="white" />
            ) : (
              <Play className="w-12 h-12 sm:w-14 sm:h-14 text-white ml-1" fill="white" />
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={`
              w-14 h-14 sm:w-16 sm:h-16
              rounded-full
              bg-secondary/90
              flex items-center justify-center
              shadow-lg
              transition-all duration-150
              ${!hasNext ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}
              ${isPressed === 'next' ? 'scale-90 bg-primary/20' : hasNext ? 'hover:scale-105' : ''}
            `}
            aria-label="Next"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-foreground" />
          </button>

          <button
            onClick={handleHome}
            className={`
              w-14 h-14 sm:w-16 sm:h-16
              rounded-full
              bg-gradient-to-br from-emerald-400 to-emerald-600
              flex items-center justify-center
              shadow-lg
              transition-all duration-150
              active:scale-90
              ${isPressed === 'home' ? 'scale-90' : 'hover:scale-105'}
            `}
            aria-label="Home"
          >
            <Home className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChildFriendlyPlayButton({
  isPlaying,
  onToggle,
  soundEnabled = true,
  size = 'large',
}: {
  isPlaying: boolean;
  onToggle: () => void;
  soundEnabled?: boolean;
  size?: 'medium' | 'large' | 'xlarge';
}) {
  const [isPressed, setIsPressed] = useState(false);

  const sizeClasses = {
    medium: 'w-20 h-20',
    large: 'w-28 h-28',
    xlarge: 'w-36 h-36',
  };

  const iconSizes = {
    medium: 'w-10 h-10',
    large: 'w-14 h-14',
    xlarge: 'w-18 h-18',
  };

  const handleTap = () => {
    setIsPressed(true);
    if (soundEnabled) playTapSound();
    setTimeout(() => {
      setIsPressed(false);
      onToggle();
    }, 150);
  };

  return (
    <button
      onClick={handleTap}
      className={`
        ${sizeClasses[size]}
        rounded-full
        ${isPlaying ? 'bg-accent' : 'bg-primary'}
        flex items-center justify-center
        shadow-2xl shadow-primary/30
        transition-all duration-150
        active:scale-90
        ${isPressed ? 'scale-90' : 'hover:scale-105'}
      `}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? (
        <Pause className={`${iconSizes[size]} text-white`} fill="white" strokeWidth={3} />
      ) : (
        <Play className={`${iconSizes[size]} text-white ml-1`} fill="white" strokeWidth={3} />
      )}
    </button>
  );
}

export function ChildFriendlyProgress({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="w-full h-4 sm:h-5 bg-secondary rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-primary via-emerald-400 to-accent rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${Math.max(2, progress)}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-primary" />
        </div>
      </div>
    </div>
  );
}
