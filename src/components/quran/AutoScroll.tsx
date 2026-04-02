import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Rewind, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AutoScrollProps {
  containerRef?: React.RefObject<HTMLElement>;
}

export const AutoScroll: React.FC<AutoScrollProps> = ({ containerRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // Pixels per frame (approx)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const speeds = [
    { label: '0.2x', value: 0.2 },
    { label: '0.5x', value: 0.5 },
    { label: '0.8x', value: 0.8 },
    { label: '1x', value: 1.0 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2.0 },
  ];


  // Handle auto-scroll animation
  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      // Scroll approx 'speed' pixels per 16ms (60fps)
      const scrollAmount = (speed * deltaTime) / 16;
      window.scrollBy(0, scrollAmount);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = undefined;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, speed]);

  // Handle visibility on scroll (Hide on scroll down, show on scroll up)
  // CRITICAL: Always stay visible while playing to allow quick pause
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If at the very top, always show
      if (currentScrollY < 100) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // Detect scroll direction
      if (currentScrollY > lastScrollY && isVisible) {
        // Scrolling down - only hide if NOT playing
        if (!isPlaying) setIsVisible(false);
      } else if (currentScrollY < lastScrollY && !isVisible) {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isVisible, isPlaying]);

  // Ensure isVisible is true if isPlaying is toggled on manually
  useEffect(() => {
    if (isPlaying) setIsVisible(true);
  }, [isPlaying]);

  return (
    <div 
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 transition-all duration-700 ease-in-out",
        (isVisible || isPlaying) ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* ── Background Bar ── */}
      <div 
        className={cn(
          "mx-auto bg-card/60 backdrop-blur-2xl border-x border-t border-border/40 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] transition-all duration-700 ease-in-out flex flex-col items-center",
          isPlaying 
            ? "w-16 h-16 rounded-full mb-6 p-0 border" // Substantially reduced Mini mode (Floating Circle)
            : "w-full max-w-[420px] rounded-t-[2.5rem] px-6 pt-3 pb-7 sm:pb-6" // Full mode
        )}
      >
        {/* Compact Drag Handle (Only in Full Mode) */}
        {!isPlaying && <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-3" />}

        <div className={cn(
          "w-full flex items-center transition-all duration-700 h-full",
          isPlaying ? "justify-center" : "justify-between gap-4"
        )}>
          {/* Play/Pause Button - Sleek and Minimal */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "rounded-full transition-all duration-500 flex-shrink-0 shadow-lg ring-1 ring-border/5",
              isPlaying 
                ? "w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90 scale-100" 
                : "w-11 h-11 bg-muted/90 hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {isPlaying 
              ? <Pause className="w-6 h-6 fill-current" /> 
              : <Play className="w-5 h-5 ml-0.5 fill-current" />
            }
          </Button>

          {/* Speed Selector (Hide when Playing) */}
          {!isPlaying && (
            <div className="flex-1 flex items-center justify-between bg-muted/40 rounded-2xl p-1 border border-border/20 backdrop-blur-sm animate-in fade-in slide-in-from-right-4 duration-500">
              {speeds.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSpeed(s.value)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all",
                    speed === s.value 
                      ? "bg-background text-primary shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label.replace('x', '')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



