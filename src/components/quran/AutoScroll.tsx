import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronUp, ChevronDown } from 'lucide-react';
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
  const scrollAccumulatorRef = useRef(0);
  const isUserInteractingRef = useRef(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const speeds = [
    { label: '0.1x', value: 0.1 },
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

  // ── Interaction Handling ───────────────────────────────────────────────
  
  const handleUserInteraction = useCallback((e: Event) => {
    if (!isPlaying) return;
    
    // If the click happened inside the AutoScroll control pill, ignore it.
    // We only care about interactions on the content area.
    if (e.target instanceof Node) {
      const controls = document.getElementById('auto-scroll-controls');
      if (controls && controls.contains(e.target)) return;
    }

    // Flag that user is touching/scrolling content
    isUserInteractingRef.current = true;
    
    // Clear existing timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    
    // Resume auto-scroll after a short delay of no activity
    interactionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
      lastTimeRef.current = performance.now(); // Reset time to avoid jump
    }, 1500); // 1.5s delay after touching
  }, [isPlaying]);

  // ── Core Animation Logic ───────────────────────────────────────────────

  const animate = useCallback((time: number) => {
    if (!isMountedRef.current || !isPlaying) return;

    if (!isUserInteractingRef.current && containerRef?.current) {
      if (lastTimeRef.current !== undefined) {
        const deltaTime = time - lastTimeRef.current;
        
        // Calculate scroll amount: speed (px) per 16.6ms (1 frame at 60fps)
        const scrollAmount = (speed * deltaTime) / 16.666;
        
        // High-precision sub-pixel accumulation
        scrollAccumulatorRef.current += scrollAmount;
        
        const pixelsToScroll = Math.floor(scrollAccumulatorRef.current);
        if (pixelsToScroll >= 1) {
          containerRef.current.scrollTop += pixelsToScroll;
          scrollAccumulatorRef.current -= pixelsToScroll;
        }
      }
      lastTimeRef.current = time;
    } else {
      lastTimeRef.current = undefined;
    }
    
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, speed, containerRef]);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    // Listen for manual interactions on the actual scroll container
    const events = ['wheel', 'touchstart', 'mousedown'];
    events.forEach(event => {
      container.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        container.removeEventListener(event, handleUserInteraction);
      });
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, [containerRef, handleUserInteraction]);

  useEffect(() => {
    if (isPlaying) {
      // Disable smooth scrolling to prevent jitter 'legs'
      const container = containerRef?.current;
      if (container) container.style.scrollBehavior = 'auto';
      
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      setIsPlaying(false);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, [isPlaying, animate, containerRef]);

  // Visibility logic (Hide on scroll down, show on up) - logic for the Pill UI
  useEffect(() => {
    const container = containerRef?.current;
    if (!container || isPlaying) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      const lastScrollY = lastScrollYRef.current;
      
      if (currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY + 10) {
        if (isVisible) setIsVisible(false);
      } else if (currentScrollY < lastScrollY - 20) {
        if (!isVisible) setIsVisible(true);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isVisible, isPlaying, containerRef]);

  // Dedicated unmount safeguard
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div 
      className={cn(
        "fixed bottom-6 inset-x-0 z-50 transition-all duration-500 ease-out flex justify-center pointer-events-none px-4",
        (isVisible || isPlaying) ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      )}
    >
      {/* ── Floating Responsive Pill ── */}
      <div 
        id="auto-scroll-controls"
        className={cn(
          "pointer-events-auto bg-card/80 backdrop-blur-2xl border border-border/40 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center gap-1 p-1.5 rounded-full",
          "h-14 min-w-[140px] px-2 transition-transform active:scale-95 duration-300",
          isPlaying && "border-primary/40 ring-4 ring-primary/5"
        )}
      >
        {/* Play/Pause Area */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
          className={cn(
            "rounded-full w-11 h-11 transition-all duration-300",
            isPlaying 
              ? "bg-primary text-primary-foreground shadow-lg scale-110" 
              : "bg-muted/80 hover:bg-muted text-foreground"
          )}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
        </Button>

        <div className="h-6 w-px bg-border/40 mx-1" />

        {/* Speed Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className={cn(
                "flex items-center justify-between gap-2 px-4 h-11 rounded-full bg-muted/40 hover:bg-muted/60 transition-all border border-transparent",
                isPlaying && "bg-primary/10 border-primary/20"
              )}
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-0.5">Speed</span>
                <span className="text-sm font-black text-foreground leading-none">{speeds.find(s => s.value === speed)?.label}</span>
              </div>
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="center" 
            className="w-48 rounded-2xl border-border/40 bg-card/95 backdrop-blur-xl p-1.5 mb-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2"
          >
            <DropdownMenuLabel className="text-[10px] text-muted-foreground text-center py-2 font-black uppercase tracking-widest">Select Scroll Speed</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/20" />
            <div className="grid grid-cols-2 gap-1 p-1 max-h-[280px] overflow-y-auto">
              {speeds.map((s) => (
                <DropdownMenuItem 
                  key={s.label}
                  onSelect={() => setSpeed(s.value)}
                  className={cn(
                    "text-xs font-bold justify-center h-10 rounded-xl transition-all cursor-pointer",
                    speed === s.value ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
                  )}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User feedback indicator */}
        {isUserInteractingRef.current && isPlaying && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-primary/90 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-md animate-pulse">
            PAUSED BY TOUCH
          </div>
        )}
      </div>
    </div>
  );
};
