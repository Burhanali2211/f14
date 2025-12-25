/**
 * Update notification component that prompts users to refresh when new version is available
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { RefreshCw, X } from 'lucide-react';
import { getCurrentAppVersion, getStoredAppVersion, hasVersionChanged, storeAppVersion, clearAllCachesOnUpdate } from '@/lib/app-version';
import { logger } from '@/lib/logger';

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const INITIAL_CHECK_DELAY = 30 * 1000; // Check 30 seconds after page load

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdates = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      const currentVersion = await getCurrentAppVersion();
      const storedVersion = getStoredAppVersion();

      if (!currentVersion) {
        // Version file not available, skip check
        return;
      }

      // If no stored version, store current one
      if (!storedVersion) {
        storeAppVersion(currentVersion);
        return;
      }

      // Check if version changed
      if (hasVersionChanged(currentVersion, storedVersion)) {
        logger.info('New app version detected', {
          current: currentVersion,
          stored: storedVersion,
        });
        setUpdateAvailable(true);
      }
    } catch (error) {
      logger.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    try {
      // Clear all caches
      await clearAllCachesOnUpdate();

      // Store new version
      const currentVersion = await getCurrentAppVersion();
      if (currentVersion) {
        storeAppVersion(currentVersion);
      }

      // Reload the page to get new version
      window.location.reload();
    } catch (error) {
      logger.error('Error updating app:', error);
      // Still reload even if there's an error
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    // Update stored version to current to prevent repeated prompts
    getCurrentAppVersion().then((current) => {
      if (current) {
        storeAppVersion(current);
      }
    });
  };

  useEffect(() => {
    // Initial check after delay
    const initialTimeout = setTimeout(() => {
      checkForUpdates();
    }, INITIAL_CHECK_DELAY);

    // Periodic checks
    const interval = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL);

    // Check when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check when window regains focus
    const handleFocus = () => {
      checkForUpdates();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Also check for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const checkServiceWorkerUpdate = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Check for updates
            await registration.update();

            // Listen for service worker updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker is ready
                    setUpdateAvailable(true);
                  }
                });
              }
            });
          }
        } catch (error) {
          logger.error('Error checking service worker update:', error);
        }
      };

      // Check immediately and periodically
      checkServiceWorkerUpdate();
      const swInterval = setInterval(checkServiceWorkerUpdate, CHECK_INTERVAL);

      return () => clearInterval(swInterval);
    }
  }, []);

  if (!updateAvailable) {
    return null;
  }

  return (
    <AlertDialog open={updateAvailable} onOpenChange={setUpdateAvailable}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Update Available
          </AlertDialogTitle>
          <AlertDialogDescription>
            A new version of the app is available. Please refresh to get the latest features and improvements.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleDismiss} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Later
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleUpdate} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

