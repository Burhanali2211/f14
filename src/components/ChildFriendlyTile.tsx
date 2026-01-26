import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { playTapSound } from './ChildFriendlyNav';

interface ChildFriendlyTileProps {
  to: string;
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  soundEnabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  delay?: number;
}

export function ChildFriendlyTile({
  to,
  icon: Icon,
  label,
  color,
  bgColor,
  soundEnabled = true,
  size = 'medium',
  delay = 0,
}: ChildFriendlyTileProps) {
  const [isPressed, setIsPressed] = useState(false);

  const sizeClasses = {
    small: 'w-24 h-24 sm:w-28 sm:h-28',
    medium: 'w-32 h-32 sm:w-40 sm:h-40',
    large: 'w-40 h-40 sm:w-48 sm:h-48',
  };

  const iconSizes = {
    small: 'w-10 h-10 sm:w-12 sm:h-12',
    medium: 'w-14 h-14 sm:w-16 sm:h-16',
    large: 'w-16 h-16 sm:w-20 sm:h-20',
  };

  const handleTouchStart = () => {
    setIsPressed(true);
    if (soundEnabled) {
      playTapSound();
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => setIsPressed(false), 150);
  };

  return (
    <Link
      to={to}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        ${sizeClasses[size]}
        rounded-3xl
        ${bgColor}
        flex flex-col items-center justify-center
        gap-2 sm:gap-3
        shadow-lg
        border-4 border-white/20
        transition-all duration-200 ease-out
        animate-slide-up opacity-0
        active:scale-90
        ${isPressed ? 'scale-90 shadow-md brightness-95' : 'hover:scale-105 hover:shadow-xl'}
      `}
      style={{ 
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
      }}
      aria-label={label}
    >
      <div className={`
        ${isPressed ? 'scale-90' : 'scale-100'}
        transition-transform duration-150
      `}>
        <Icon className={`${iconSizes[size]} ${color} drop-shadow-sm`} strokeWidth={2.5} />
      </div>
      <span className={`
        text-sm sm:text-base font-bold ${color}
        text-center leading-tight
        ${isPressed ? 'opacity-70' : 'opacity-100'}
        transition-opacity duration-150
      `}>
        {label}
      </span>
    </Link>
  );
}

interface ChildFriendlyTileButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  soundEnabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  delay?: number;
  disabled?: boolean;
}

export function ChildFriendlyTileButton({
  onClick,
  icon: Icon,
  label,
  color,
  bgColor,
  soundEnabled = true,
  size = 'medium',
  delay = 0,
  disabled = false,
}: ChildFriendlyTileButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const sizeClasses = {
    small: 'w-24 h-24 sm:w-28 sm:h-28',
    medium: 'w-32 h-32 sm:w-40 sm:h-40',
    large: 'w-40 h-40 sm:w-48 sm:h-48',
  };

  const iconSizes = {
    small: 'w-10 h-10 sm:w-12 sm:h-12',
    medium: 'w-14 h-14 sm:w-16 sm:h-16',
    large: 'w-16 h-16 sm:w-20 sm:h-20',
  };

  const handleTouchStart = () => {
    if (disabled) return;
    setIsPressed(true);
    if (soundEnabled) {
      playTapSound();
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setTimeout(() => {
      setIsPressed(false);
      onClick();
    }, 150);
  };

  return (
    <button
      onClick={() => !disabled && onClick()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => setIsPressed(false)}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        rounded-3xl
        ${bgColor}
        flex flex-col items-center justify-center
        gap-2 sm:gap-3
        shadow-lg
        border-4 border-white/20
        transition-all duration-200 ease-out
        animate-slide-up opacity-0
        active:scale-90
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isPressed && !disabled ? 'scale-90 shadow-md brightness-95' : 'hover:scale-105 hover:shadow-xl'}
      `}
      style={{ 
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards',
      }}
      aria-label={label}
    >
      <div className={`
        ${isPressed ? 'scale-90' : 'scale-100'}
        transition-transform duration-150
      `}>
        <Icon className={`${iconSizes[size]} ${color} drop-shadow-sm`} strokeWidth={2.5} />
      </div>
      <span className={`
        text-sm sm:text-base font-bold ${color}
        text-center leading-tight
        ${isPressed ? 'opacity-70' : 'opacity-100'}
        transition-opacity duration-150
      `}>
        {label}
      </span>
    </button>
  );
}
