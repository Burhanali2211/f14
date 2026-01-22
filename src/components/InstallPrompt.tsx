/**
 * PWA Install Prompt Component
 * Prompts users to install the app directly without going through browser menu
 */

import { useEffect, useState, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, X, Smartphone } from 'lucide-react';
import { logger } from '@/lib/logger';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_PROMPT_SHOWN_KEY = 'pwa-install-prompt-shown';
const INSTALL_PROMPT_DELAY = 3000; // Show after 3 seconds of page load
const MIN_VISITS_BEFORE_PROMPT = 2; // Show after user visits at least 2 times

export function InstallPrompt() {
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const hasShownBeforeRef = useRef(false);

  // Check if app is already installed
  useEffect(() => {
    // Check if running in standalone mode (installed)
    const checkIfInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
    };

    if (checkIfInstalled()) {
      setIsInstalled(true);
      logger.info('App is already installed');
      return;
    }

    // Check if prompt was shown before
    const shownBefore = localStorage.getItem(INSTALL_PROMPT_SHOWN_KEY);
    if (shownBefore) {
      hasShownBeforeRef.current = true;
      return;
    }

    // Track visit count
    const visitCount = parseInt(localStorage.getItem('pwa-visit-count') || '0', 10);
    const newVisitCount = visitCount + 1;
    localStorage.setItem('pwa-visit-count', newVisitCount.toString());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      
      // Store the event for later use
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      
      logger.info('beforeinstallprompt event fired');
      
      // Only show if user has visited at least MIN_VISITS_BEFORE_PROMPT times
      // and we haven't shown it before
      if (newVisitCount >= MIN_VISITS_BEFORE_PROMPT && !hasShownBeforeRef.current) {
        // Show after a delay to not interrupt initial page load
        setTimeout(() => {
          if (deferredPromptRef.current && !isInstalled) {
            setShowDialog(true);
          }
        }, INSTALL_PROMPT_DELAY);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowDialog(false);
      logger.info('App was installed');
      
      // Mark as shown so it never appears again
      localStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, 'true');
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
      // Show the install prompt
      await deferredPromptRef.current.prompt();

      // Wait for user response
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === 'accepted') {
        logger.info('User accepted the install prompt');
        setIsInstalled(true);
        setShowDialog(false);
      } else {
        logger.info('User dismissed the install prompt');
      }

      // Mark as shown regardless of outcome
      localStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, 'true');
      hasShownBeforeRef.current = true;

      // Clear the deferred prompt
      deferredPromptRef.current = null;
    } catch (error) {
      logger.error('Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowDialog(false);
    // Mark as shown so it doesn't appear again (user can still install via browser menu)
    localStorage.setItem(INSTALL_PROMPT_SHOWN_KEY, 'true');
    hasShownBeforeRef.current = true;
    deferredPromptRef.current = null;
  };

  // Don't show if already installed or if we've shown before
  if (isInstalled || hasShownBeforeRef.current || !showDialog) {
    return null;
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Install App
          </AlertDialogTitle>
          <AlertDialogDescription>
            Install "Followers of 14" on your device for a better experience:
            <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
              <li>Quick access from your home screen</li>
              <li>Works offline with cached content</li>
              <li>Faster loading and smoother experience</li>
              <li>No need to open browser every time</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleDismiss} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Maybe Later
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleInstall} 
            disabled={isInstalling}
            className="w-full sm:w-auto"
          >
            {isInstalling ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-pulse" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Install Now
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

