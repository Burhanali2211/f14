import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, X, Sparkles, Heart } from 'lucide-react';

export function NotificationPermissionPrompt() {
  const { 
    permission, 
    isLoading,
    requestPermission 
  } = useNotifications();
  const [showDialog, setShowDialog] = useState(false);
  const [hasShownBefore, setHasShownBefore] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // Track user interaction to show prompt at the right moment
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
    };

    // Listen for any user interaction
    const events = ['click', 'scroll', 'touchstart', 'keydown'];
    events.forEach(event => {
      window.addEventListener(event, handleUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  useEffect(() => {
    // Check if we've shown this dialog before - if yes, NEVER show again
    const shownBefore = localStorage.getItem('notification-prompt-shown');
    setHasShownBefore(!!shownBefore);

    // If already shown before, don't show again
    if (shownBefore) {
      return;
    }

    // Check if notifications are blocked
    const blocked = 'Notification' in window && Notification.permission === 'denied';
    setIsBlocked(blocked);

    // Only show if:
    // 1. Notifications are supported
    // 2. Permission is default (not asked yet)
    // 3. We haven't shown it before (CRITICAL - only show once)
    // 4. Not loading
    // 5. Permission is not already granted
    if (
      'Notification' in window &&
      permission.state === 'default' &&
      !shownBefore &&
      permission.state !== 'granted' &&
      !isLoading
    ) {
      // Strategy: Show after page is fully loaded and user has had time to see content
      // Priority: User interaction (1.5s delay) > Page loaded (3s delay) > Fallback (4s delay)
      let delay = 4000; // Fallback: 4 seconds
      
      if (userInteracted) {
        delay = 1500; // 1.5s after user interaction (feels natural)
      } else if (document.readyState === 'complete') {
        delay = 3000; // 3s after page load
      }

      const timer = setTimeout(() => {
        // Double-check conditions before showing
        const stillShownBefore = localStorage.getItem('notification-prompt-shown');
        const currentPermission = 'Notification' in window ? Notification.permission : 'denied';
        if (!stillShownBefore && currentPermission === 'default' && !isLoading) {
          setShowDialog(true);
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [permission.state, isLoading, userInteracted]);

  const handleEnable = async () => {
    // Mark as shown immediately so it never appears again
    localStorage.setItem('notification-prompt-shown', 'true');
    setHasShownBefore(true);
    
    try {
      const granted = await requestPermission();
      setShowDialog(false);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setShowDialog(false);
    }
  };

  const handleDismiss = () => {
    // Mark as shown so it NEVER appears again
    localStorage.setItem('notification-prompt-shown', 'true');
    setHasShownBefore(true);
    setShowDialog(false);
    // User can still enable from Settings, but this popup won't show again
  };

  // Don't show if:
  // 1. Already shown before (CRITICAL - only show once)
  // 2. Permission is already granted
  // 3. Still loading
  // 4. Blocked (handled separately in settings)
  if (hasShownBefore || permission.state === 'granted' || isLoading || isBlocked) {
    return null;
  }

  // Beautiful, minimalistic, spiritual notification prompt
  return (
    <Dialog open={showDialog} onOpenChange={(open) => {
      if (!open) {
        handleDismiss();
      } else {
        setShowDialog(open);
      }
    }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-elevated">
        {/* Spiritual gradient background */}
        <div className="relative bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8">
          {/* Subtle geometric pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}
          />
          
          <div className="relative z-10">
            {/* Icon with spiritual glow */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30 backdrop-blur-sm">
                  <Bell className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Minimalistic title */}
            <DialogHeader className="text-center space-y-3 mb-6">
              <DialogTitle className="text-2xl font-display font-semibold text-foreground tracking-tight">
                Stay Connected
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Receive gentle reminders for important moments
              </DialogDescription>
            </DialogHeader>

            {/* Benefit-focused, spiritual messaging */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 text-left">
                <div className="mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary/70" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Never miss a blessed occasion
                </p>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <div className="mt-0.5">
                  <Heart className="w-4 h-4 text-primary/70" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Peaceful reminders that work quietly in the background
                </p>
              </div>
            </div>

            {/* Action buttons - Allow is prominent */}
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-3 px-0">
              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="w-full sm:w-auto order-2 sm:order-1 text-muted-foreground hover:text-foreground"
              >
                Not now
              </Button>
              <Button
                onClick={handleEnable}
                disabled={isLoading}
                className="w-full sm:w-auto order-1 sm:order-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 shadow-lg font-medium"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Bell className="w-4 h-4 mr-2 animate-pulse" />
                    Enabling...
                  </>
                ) : (
                  <>
                    Allow Notifications
                  </>
                )}
              </Button>
            </DialogFooter>

            {/* Subtle trust signal */}
            <p className="text-xs text-center text-muted-foreground/60 mt-6 pt-4 border-t border-border/50">
              You can change this anytime in settings
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
