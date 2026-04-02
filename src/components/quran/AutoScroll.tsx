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
          "mx-auto bg-card/60 backdrop-blur-2xl border-x border-t border-border/40 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 ease-in-out",
          isPlaying 
            ? "w-[80px] rounded-t-3xl pt-2 pb-6 px-4" // Mini mode
            : "w-full max-w-[420px] rounded-t-[2.5rem] px-6 pt-3 pb-7 sm:pb-6" // Full mode
        )}
      >
        {/* Compact Drag Handle / Accent */}
        {!isPlaying && <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-2" />}

        <div className={cn(
          "w-full flex items-center gap-4 transition-all duration-500",
          isPlaying ? "justify-center" : "justify-between"
        )}>
          {/* Play/Pause Button - Premium Styled */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "rounded-2xl transition-all flex-shrink-0 animate-in zoom-in-50 duration-500 shadow-lg ring-1 ring-border/5",
              isPlaying 
                ? "w-14 h-14 bg-primary text-primary-foreground hover:bg-primary/90 scale-100 hover:scale-110" 
                : "w-12 h-12 bg-muted/90 hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {isPlaying 
              ? <Pause className="w-7 h-7 fill-current transition-transform duration-300" /> 
              : <Play className="w-6 h-6 ml-0.5 fill-current transition-transform duration-300" />
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
                      ? "bg-background text-primary shadow-sm ring-1 ring-primary/20 scale-105" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                  )}
                >
                  {s.label.replace('x', '')}
                </button>
              ))}
            </div>
          )}

          {/* Hidden Status Tag when playing - for cleaner UI */}
          {isPlaying && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-primary/10 backdrop-blur-md rounded-full border border-primary/20 animate-in slide-in-from-bottom-2 duration-700">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">SCROLLING</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


