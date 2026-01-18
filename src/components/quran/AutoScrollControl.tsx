import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, X, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

const SPEEDS = [
  { label: '0.5x', value: 0.5, interval: 100, step: 1 },
  { label: '1x', value: 1, interval: 50, step: 1 },
  { label: '2x', value: 2, interval: 30, step: 2 },
  { label: '3x', value: 3, interval: 20, step: 3 },
  { label: '5x', value: 5, interval: 15, step: 5 },
];

export function AutoScrollControl() {
  const [isActive, setIsActive] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollInterval = useRef<number | null>(null);
  const lastScrollY = useRef(0);
  const userScrollTimeout = useRef<number | null>(null);
  const isUserScrolling = useRef(false);
  const location = useLocation();

  const currentSpeed = SPEEDS[speedIndex];

  const isQuranContentPage = /^\/quran\/(surah|para)\/.*$/.test(location.pathname);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      if (isActive) {
        setIsVisible(true);
        return;
      }
      
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleUserScroll = (e: WheelEvent | TouchEvent) => {
      isUserScrolling.current = true;
      setIsPaused(true);
      
      if (userScrollTimeout.current) {
        clearTimeout(userScrollTimeout.current);
      }
      
      userScrollTimeout.current = window.setTimeout(() => {
        isUserScrolling.current = false;
        setIsPaused(false);
      }, 500);
    };

    window.addEventListener('wheel', handleUserScroll, { passive: true });
    window.addEventListener('touchmove', handleUserScroll, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
      if (userScrollTimeout.current) {
        clearTimeout(userScrollTimeout.current);
      }
    };
  }, [isActive]);

  const startScrolling = useCallback(() => {
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    
    scrollInterval.current = window.setInterval(() => {
      if (isUserScrolling.current) return;
      
      window.scrollBy({
        top: currentSpeed.step,
        behavior: 'auto'
      });
      if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 50) {
        setIsActive(false);
      }
    }, currentSpeed.interval);
  }, [currentSpeed]);

  const stopScrolling = useCallback(() => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }
  }, []);

  // Restart scrolling when speed changes while active
  useEffect(() => {
    if (isActive) {
      stopScrolling();
      startScrolling();
    }
  }, [speedIndex, isActive, startScrolling, stopScrolling]);

  useEffect(() => {
    if (isActive) {
      startScrolling();
    } else {
      stopScrolling();
    }
    return () => stopScrolling();
  }, [isActive, startScrolling, stopScrolling]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsActive(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isQuranContentPage) return null;

  if (isMinimized && !isMobile) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-12 rounded-full shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setIsMinimized(false)}
        >
          <Gauge className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  // Mobile Dock Version
  if (isMobile) {
    return (
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[100] pb-safe transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-8px_30px_rgb(0,0,0,0.12)] p-3 px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isActive ? "bg-primary animate-pulse" : "bg-muted"
              )} />
              <span className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
                Auto Scroll {isActive && `(${currentSpeed.label})`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isActive && (
                <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  Scrolling...
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={isActive ? "default" : "secondary"}
              size="lg"
              className={cn(
                "h-14 flex-1 rounded-2xl transition-all active:scale-95 text-lg font-bold shadow-lg",
                isActive ? "bg-primary shadow-primary/25" : "bg-muted"
              )}
              onClick={() => setIsActive(!isActive)}
            >
              {isActive ? (
                <><Pause className="h-6 w-6 mr-2 fill-current" /> Pause</>
              ) : (
                <><Play className="h-6 w-6 mr-2 fill-current" /> Start Reading</>
              )}
            </Button>

            <div className="flex items-center gap-1 bg-muted/50 p-1.5 rounded-2xl">
              {SPEEDS.map((s, index) => (
                <button
                  key={s.value}
                  onClick={() => setSpeedIndex(index)}
                  className={cn(
                    "px-3 py-2.5 text-sm font-black rounded-xl transition-all whitespace-nowrap min-w-[44px]",
                    speedIndex === index 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground active:bg-primary/10"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Floating Version
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <div className={cn(
        "bg-card/95 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-2xl flex items-center gap-4 transition-all duration-300",
        isActive && "ring-2 ring-primary/20"
      )}>
        <Button
          variant={isActive ? "default" : "secondary"}
          size="icon"
          className={cn(
            "h-12 w-12 rounded-xl transition-all",
            isActive && "scale-105 shadow-lg shadow-primary/20"
          )}
          onClick={() => setIsActive(!isActive)}
        >
          {isActive ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
        </Button>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Speed</span>
            <span className="text-xs font-bold text-primary">{currentSpeed.label}</span>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            {SPEEDS.map((s, index) => (
              <button
                key={s.value}
                onClick={() => setSpeedIndex(index)}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded-md transition-all",
                  speedIndex === index 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-primary/10 text-muted-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsMinimized(true)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {isActive && (
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </div>
        )}
      </div>
      {!isActive && <span className="text-[10px] text-muted-foreground mr-2 opacity-50">Press Space to Play/Pause</span>}
    </div>
  );
}
