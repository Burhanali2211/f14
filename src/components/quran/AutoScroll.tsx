import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, Rewind, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AutoScrollProps {
  containerRef?: React.RefObject<HTMLElement>;
}

export const AutoScroll: React.FC<AutoScrollProps> = ({ containerRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // Pixels per frame (approx)
  const [isVisible, setIsVisible] = useState(true);
  
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const lastScrollYRef = useRef(0);
  const lastPausedTimeRef = useRef(0);

  const scrollAccumulatorRef = useRef(0);

  const speeds = [
    { label: '0.2x', value: 0.2 },
    { label: '0.5x', value: 0.5 },
    { label: '0.8x', value: 0.8 },
    { label: '1.0x', value: 1.0 },
    { label: '1.2x', value: 1.2 },
    { label: '1.5x', value: 1.5 },
    { label: '2.0x', value: 2.0 },
    { label: '3.0x', value: 3.0 },
    { label: '5.0x', value: 5.0 },
  ];

  // Handle auto-scroll animation
  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      // Calculate how much we should scroll in this frame
      const scrollAmount = (speed * deltaTime) / 16;
      
      // Accumulate the sub-pixel scroll amount
      scrollAccumulatorRef.current += scrollAmount;
      
      // Only scroll by whole pixels to avoid browser rounding issues at slow speeds
      const pixelsToScroll = Math.floor(scrollAccumulatorRef.current);
      if (pixelsToScroll >= 1) {
        window.scrollBy(0, pixelsToScroll);
        scrollAccumulatorRef.current -= pixelsToScroll;
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = undefined;
      scrollAccumulatorRef.current = 0; // Reset on start
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastPausedTimeRef.current = Date.now();
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, speed]);

  // Handle visibility on scroll (Hide on scroll down, show on scroll up)
  useEffect(() => {
    // CRITICAL PERFORMANCE OPTIMIZATION: 
    // Disable the scroll listener entirely while autoscrolling.
    // This stops the CPU from calculating direction on every single frame on mobile.
    if (isPlaying) {
      if (!isVisible) setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      const timeSincePause = Date.now() - lastPausedTimeRef.current;
      
      if (currentScrollY < 100) {
        if (!isVisible) setIsVisible(true);
      } else {
        if (currentScrollY > lastScrollY) {
          if (isVisible && !isPlaying && timeSincePause > 500) {
            setIsVisible(false);
          }
        } else if (currentScrollY < lastScrollY) {
          if (!isVisible) setIsVisible(true);
        }
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isVisible, isPlaying]);

  useEffect(() => {
    if (isPlaying) setIsVisible(true);
  }, [isPlaying]);

  return (
    <div 
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 transition-all duration-300 ease-in-out",
        (isVisible || isPlaying) ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* ── Background Bar ── */}
      <div 
        className={cn(
          "mx-auto bg-card/95 backdrop-blur-xl border-t border-border/40 shadow-2xl transition-all duration-500 ease-in-out flex flex-col items-center",
          "w-full sm:max-w-[200px] sm:rounded-t-[1.75rem] sm:border-x px-5 h-14" // Increased height to h-14
        )}
      >
        <div className="w-full flex items-center justify-between h-full">
          
          {/* Play/Pause Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const nextPlaying = !isPlaying;
              setIsPlaying(nextPlaying);
              if (!nextPlaying) setIsVisible(true);
            }}
            className={cn(
              "rounded-full transition-all duration-300 w-10 h-10", // Slightly larger target
              isPlaying 
                ? "bg-primary/20 text-primary hover:bg-primary/30" 
                : "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {isPlaying 
              ? <Pause className="w-5 h-5 fill-current" /> 
              : <Play className="w-5 h-5 ml-0.5 fill-current" />
            }
          </Button>

          <div className="h-5 w-px bg-border/40" />

          {/* Speed Dropdown Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="flex items-center gap-2 px-3.5 h-10 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors border border-border/10"
              >
                <span className="text-[11px] font-black text-foreground">{speeds.find(s => s.value === speed)?.label.replace('x', '')}</span>
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="min-w-[100px] rounded-2xl border-border/40 bg-card/98 backdrop-blur-2xl mb-3 p-1.5">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground text-center py-2 font-bold uppercase tracking-tight">Scroll Speed</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/30" />
              <div className="max-h-[300px] overflow-y-auto">
                {speeds.slice().reverse().map((s) => (
                  <DropdownMenuItem 
                    key={s.label}
                    onSelect={() => setSpeed(s.value)} // Use onSelect instead of onClick for mobile
                    className={cn(
                      "text-[11px] font-black justify-center h-10 rounded-xl focus:bg-primary/10 focus:text-primary transition-all cursor-pointer mb-1 last:mb-0",
                      speed === s.value && "bg-primary/10 text-primary"
                    )}
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </div>
  );
};



