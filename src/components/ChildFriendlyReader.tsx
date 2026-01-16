import { useState } from 'react';
import { Plus, Minus, Eye, EyeOff, Sun, Moon, Contrast } from 'lucide-react';
import { playTapSound } from './ChildFriendlyNav';

interface ChildFriendlyReaderProps {
  content: string;
  title: string;
  soundEnabled?: boolean;
  onFontSizeChange?: (size: number) => void;
  fontSize?: number;
}

export function ChildFriendlyReader({
  content,
  title,
  soundEnabled = true,
  onFontSizeChange,
  fontSize = 20,
}: ChildFriendlyReaderProps) {
  const [currentFontSize, setCurrentFontSize] = useState(fontSize);
  const [highContrast, setHighContrast] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);

  const lines = content.split('\n').filter(line => line.trim());

  const handleIncreaseFontSize = () => {
    if (soundEnabled) playTapSound();
    const newSize = Math.min(40, currentFontSize + 4);
    setCurrentFontSize(newSize);
    onFontSizeChange?.(newSize);
  };

  const handleDecreaseFontSize = () => {
    if (soundEnabled) playTapSound();
    const newSize = Math.max(14, currentFontSize - 4);
    setCurrentFontSize(newSize);
    onFontSizeChange?.(newSize);
  };

  const handleToggleContrast = () => {
    if (soundEnabled) playTapSound();
    setHighContrast(!highContrast);
  };

  return (
    <div className={`${highContrast ? 'bg-black text-yellow-300' : 'bg-card'} rounded-3xl overflow-hidden`}>
      <div className={`flex items-center justify-center gap-4 p-4 ${highContrast ? 'bg-gray-900' : 'bg-secondary/50'}`}>
        <button
          onClick={handleDecreaseFontSize}
          disabled={currentFontSize <= 14}
          className={`
            w-14 h-14 sm:w-16 sm:h-16
            rounded-full
            ${highContrast ? 'bg-gray-800 text-yellow-300' : 'bg-secondary text-foreground'}
            ${currentFontSize <= 14 ? 'opacity-40' : ''}
            flex items-center justify-center
            shadow-lg
            transition-all duration-150
            active:scale-90
          `}
          aria-label="Decrease font size"
        >
          <Minus className="w-8 h-8" strokeWidth={3} />
        </button>

        <div className={`
          px-6 py-3 rounded-2xl 
          ${highContrast ? 'bg-gray-800 text-yellow-300' : 'bg-card text-foreground'}
          font-bold text-xl
        `}>
          {currentFontSize}px
        </div>

        <button
          onClick={handleIncreaseFontSize}
          disabled={currentFontSize >= 40}
          className={`
            w-14 h-14 sm:w-16 sm:h-16
            rounded-full
            ${highContrast ? 'bg-gray-800 text-yellow-300' : 'bg-secondary text-foreground'}
            ${currentFontSize >= 40 ? 'opacity-40' : ''}
            flex items-center justify-center
            shadow-lg
            transition-all duration-150
            active:scale-90
          `}
          aria-label="Increase font size"
        >
          <Plus className="w-8 h-8" strokeWidth={3} />
        </button>

        <button
          onClick={handleToggleContrast}
          className={`
            w-14 h-14 sm:w-16 sm:h-16
            rounded-full
            ${highContrast ? 'bg-yellow-500 text-black' : 'bg-secondary text-foreground'}
            flex items-center justify-center
            shadow-lg
            transition-all duration-150
            active:scale-90
          `}
          aria-label={highContrast ? "Normal contrast" : "High contrast"}
        >
          <Contrast className="w-8 h-8" strokeWidth={2} />
        </button>
      </div>

      <div 
        className="p-6 sm:p-8 overflow-y-auto max-h-[60vh]"
        dir="rtl"
      >
        {lines.map((line, index) => (
          <p
            key={index}
            className={`
              mb-6 leading-[2.4] transition-all duration-300
              ${currentLine === index && autoScroll ? (highContrast ? 'bg-yellow-500/20' : 'bg-primary/10') : ''}
              rounded-xl px-4 py-2
            `}
            style={{
              fontSize: `${currentFontSize}px`,
              fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

interface ChildFriendlyFontControlsProps {
  fontSize: number;
  onIncrease: () => void;
  onDecrease: () => void;
  highContrast?: boolean;
  onContrastToggle?: () => void;
  soundEnabled?: boolean;
}

export function ChildFriendlyFontControls({
  fontSize,
  onIncrease,
  onDecrease,
  highContrast = false,
  onContrastToggle,
  soundEnabled = true,
}: ChildFriendlyFontControlsProps) {
  const [pressed, setPressed] = useState<string | null>(null);

  const handleIncrease = () => {
    setPressed('plus');
    if (soundEnabled) playTapSound();
    setTimeout(() => {
      setPressed(null);
      onIncrease();
    }, 100);
  };

  const handleDecrease = () => {
    setPressed('minus');
    if (soundEnabled) playTapSound();
    setTimeout(() => {
      setPressed(null);
      onDecrease();
    }, 100);
  };

  const handleContrast = () => {
    setPressed('contrast');
    if (soundEnabled) playTapSound();
    setTimeout(() => {
      setPressed(null);
      onContrastToggle?.();
    }, 100);
  };

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <button
        onClick={handleDecrease}
        className={`
          w-12 h-12 sm:w-14 sm:h-14
          rounded-full
          bg-secondary
          flex items-center justify-center
          shadow-md
          transition-all duration-100
          ${pressed === 'minus' ? 'scale-90 bg-primary/20' : 'active:scale-90'}
        `}
        aria-label="Smaller text"
      >
        <Minus className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" strokeWidth={3} />
      </button>

      <div className="px-4 py-2 bg-card rounded-xl border border-border font-bold text-lg min-w-[60px] text-center">
        {fontSize}
      </div>

      <button
        onClick={handleIncrease}
        className={`
          w-12 h-12 sm:w-14 sm:h-14
          rounded-full
          bg-secondary
          flex items-center justify-center
          shadow-md
          transition-all duration-100
          ${pressed === 'plus' ? 'scale-90 bg-primary/20' : 'active:scale-90'}
        `}
        aria-label="Larger text"
      >
        <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" strokeWidth={3} />
      </button>

      {onContrastToggle && (
        <button
          onClick={handleContrast}
          className={`
            w-12 h-12 sm:w-14 sm:h-14
            rounded-full
            ${highContrast ? 'bg-yellow-500 text-black' : 'bg-secondary text-foreground'}
            flex items-center justify-center
            shadow-md
            transition-all duration-100
            ${pressed === 'contrast' ? 'scale-90' : 'active:scale-90'}
          `}
          aria-label={highContrast ? "Normal mode" : "High contrast mode"}
        >
          <Contrast className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
