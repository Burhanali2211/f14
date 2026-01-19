/**
 * PWA Install Prompt Component
 * Compact bottom banner for mobile users to install the app
 */

import { useEffect, useState, useRef } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_PROMPT_DISMISSED_KEY = 'pwa-install-dismissed';
const INSTALL_PROMPT_DELAY = 2000;

export function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const checkIfInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
    };

    if (checkIfInstalled()) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 2) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      
      logger.info('PWA install prompt available');
      
      setTimeout(() => {
        if (deferredPromptRef.current && !isInstalled) {
          setShowBanner(true);
        }
      }, INSTALL_PROMPT_DELAY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      localStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
      logger.info('App installed successfully');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) {
      logger.warn('Install prompt not available');
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === 'accepted') {
        logger.info('User accepted install');
        setIsInstalled(true);
        closeBanner();
      } else {
        logger.info('User dismissed install');
        closeBanner();
      }

      deferredPromptRef.current = null;
    } catch (error) {
      logger.error('Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const closeBanner = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowBanner(false);
      setIsClosing(false);
    }, 300);
  };

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, Date.now().toString());
    closeBanner();
    deferredPromptRef.current = null;
  };

  if (isInstalled || !showBanner) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed bottom-16 sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 md:left-auto md:right-4 md:max-w-sm z-50",
        "bg-gradient-to-r from-primary/95 to-primary/85 backdrop-blur-lg",
        "rounded-xl shadow-2xl border border-white/20",
        "transform transition-all duration-300 ease-out",
        isClosing ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm sm:text-base">
              Install App
            </h3>
            <p className="text-white/80 text-xs sm:text-sm mt-0.5 line-clamp-2">
              Add to home screen for quick access & offline use
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-1 h-9 text-white/90 hover:text-white hover:bg-white/10 border border-white/20 text-xs sm:text-sm"
          >
            Not Now
          </Button>
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 h-9 bg-white text-primary hover:bg-white/90 font-semibold text-xs sm:text-sm"
          >
            {isInstalling ? (
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 animate-bounce" />
                Installing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Install
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
