import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { useState, useCallback } from 'react';

interface ChildFriendlyNavProps {
  showBack?: boolean;
  soundEnabled?: boolean;
  onSoundToggle?: (enabled: boolean) => void;
}

const playTapSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
  }
};

export function ChildFriendlyNav({ showBack = true, soundEnabled = true, onSoundToggle }: ChildFriendlyNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPressed, setIsPressed] = useState<string | null>(null);
  const isHome = location.pathname === '/';

  const handleTap = useCallback((action: () => void, buttonId: string) => {
    setIsPressed(buttonId);
    if (soundEnabled) {
      playTapSound();
    }
    setTimeout(() => {
      setIsPressed(null);
      action();
    }, 150);
  }, [soundEnabled]);

  const handleHome = () => {
    handleTap(() => navigate('/'), 'home');
  };

  const handleBack = () => {
    handleTap(() => navigate(-1), 'back');
  };

  const handleSoundToggle = () => {
    handleTap(() => {
      onSoundToggle?.(!soundEnabled);
    }, 'sound');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      <div className="bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4 px-4">
        <div className="flex items-center justify-center gap-6 max-w-md mx-auto">
          {showBack && !isHome && (
            <button
              onClick={handleBack}
              onTouchStart={() => setIsPressed('back')}
              onTouchEnd={() => setTimeout(() => setIsPressed(null), 150)}
              className={`
                w-16 h-16 sm:w-20 sm:h-20 
                rounded-full 
                bg-secondary/90 backdrop-blur-sm
                border-4 border-border/50
                flex items-center justify-center
                shadow-lg
                transition-all duration-150 ease-out
                active:scale-90
                ${isPressed === 'back' ? 'scale-90 bg-primary/20' : 'hover:scale-105'}
              `}
              aria-label="Go back"
            >
              <ArrowLeft className={`w-8 h-8 sm:w-10 sm:h-10 text-foreground transition-colors ${isPressed === 'back' ? 'text-primary' : ''}`} />
            </button>
          )}

          <button
            onClick={handleHome}
            className={`
              w-20 h-20 sm:w-24 sm:h-24 
              rounded-full 
              bg-primary
              border-4 border-primary/30
              flex items-center justify-center
              shadow-xl shadow-primary/30
              transition-all duration-150 ease-out
              active:scale-90
              ${isPressed === 'home' ? 'scale-90 bg-primary/80' : 'hover:scale-105'}
            `}
            aria-label="Go home"
          >
            <Home className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground" />
          </button>

          {onSoundToggle && (
            <button
              onClick={handleSoundToggle}
              onTouchStart={() => setIsPressed('sound')}
              onTouchEnd={() => setTimeout(() => setIsPressed(null), 150)}
              className={`
                w-16 h-16 sm:w-20 sm:h-20 
                rounded-full 
                bg-secondary/90 backdrop-blur-sm
                border-4 border-border/50
                flex items-center justify-center
                shadow-lg
                transition-all duration-150 ease-out
                active:scale-90
                ${isPressed === 'sound' ? 'scale-90 bg-accent/20' : 'hover:scale-105'}
              `}
              aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"}
            >
              {soundEnabled ? (
                <Volume2 className={`w-8 h-8 sm:w-10 sm:h-10 text-accent transition-colors`} />
              ) : (
                <VolumeX className={`w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground transition-colors`} />
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export { playTapSound };
