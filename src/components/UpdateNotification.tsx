/**
 * Update notification component that prompts users to refresh when new version is available
 * Also sends browser notifications when updates are detected
 */

import { useEffect, useState, useRef } from 'react';
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
import { getCurrentAppVersion, getStoredAppVersion, hasVersionChanged, storeAppVersion, clearAllCachesOnUpdate, hasVersionBeenShown, markVersionAsShown, getLatestShownVersion } from '@/lib/app-version';
import { logger } from '@/lib/logger';

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const INITIAL_CHECK_DELAY = 30 * 1000; // Check 30 seconds after page load
const AUTO_UPDATE_DELAY = 3000; // 3 seconds countdown before auto-update
const DISMISSED_VERSION_KEY = 'app_update_dismissed_version'; // Persist dismissed version in localStorage
const DIALOG_SHOWN_KEY = 'app_update_dialog_shown'; // Track if dialog was shown for current version

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<any>(null);
  const [countdown, setCountdown] = useState(3);
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);
  const notificationShownRef = useRef(false);
  const serviceWorkerRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const checkingVersionRef = useRef<string | null>(null); // Track which version we're currently checking
  const autoUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckTimeRef = useRef<number>(0); // Debounce checks
  const MIN_CHECK_INTERVAL = 30 * 1000; // Minimum 30 seconds between checks

  const getVersionId = (version: any): string => {
    return version?.buildHash || `v${version?.version}-${version?.buildTime}`;
  };

  const isVersionDismissed = (version: any): boolean => {
    try {
      const dismissedId = localStorage.getItem(DISMISSED_VERSION_KEY);
      if (!dismissedId) return false;
      return getVersionId(version) === dismissedId;
    } catch {
      return false;
    }
  };

  const wasDialogShownForVersion = (version: any): boolean => {
    try {
      const shownId = localStorage.getItem(DIALOG_SHOWN_KEY);
      if (!shownId) return false;
      return getVersionId(version) === shownId;
    } catch {
      return false;
    }
  };

  const markVersionDismissed = (version: any): void => {
    try {
      const versionId = getVersionId(version);
      localStorage.setItem(DISMISSED_VERSION_KEY, versionId);
      localStorage.setItem(DIALOG_SHOWN_KEY, versionId);
    } catch {}
  };

  const markDialogShownForVersion = (version: any): void => {
    try {
      localStorage.setItem(DIALOG_SHOWN_KEY, getVersionId(version));
    } catch {}
  };

  // Request notification permission if not already granted
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        logger.info('Notification permission:', permission);
        return permission === 'granted';
      } catch (error) {
        logger.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return Notification.permission === 'granted';
  };

  // Show browser notification for update (only once per version)
  const showBrowserNotification = async (version: any) => {
    // Check if this version has already been shown
    if (hasVersionBeenShown(version)) {
      logger.info('Version already shown, skipping notification:', version);
      return;
    }

    const hasPermission = await requestNotificationPermission();
    
    if (hasPermission && 'serviceWorker' in navigator && serviceWorkerRegistrationRef.current) {
      try {
        // Format version info for notification
        const versionInfo = version.buildHash 
          ? `v${version.version} (${version.buildHash.substring(0, 8)})`
          : `v${version.version}`;
        
        await serviceWorkerRegistrationRef.current.showNotification('Update Available', {
          body: `New version ${versionInfo} is available. Click to update now!`,
          icon: '/main.png',
          badge: '/main.png',
          tag: 'app-update', // Same tag ensures only one notification shows
          data: {
            type: 'app-update',
            version: version,
            url: window.location.origin,
          },
          requireInteraction: true,
          vibrate: [200, 100, 200],
          silent: false,
          actions: [
            {
              action: 'update',
              title: 'Update Now',
              icon: '/main.png'
            },
            {
              action: 'later',
              title: 'Later',
              icon: '/main.png'
            }
          ]
        });
        
        // Mark this version as shown
        markVersionAsShown(version);
        notificationShownRef.current = true;
        logger.info('Browser notification shown for update:', versionInfo);
      } catch (error) {
        logger.error('Error showing browser notification:', error);
      }
    }
  };

  const checkForUpdates = async () => {
    const now = Date.now();
    if (now - lastCheckTimeRef.current < MIN_CHECK_INTERVAL) {
      return;
    }
    
    if (isChecking || updateAvailable) return;
    
    lastCheckTimeRef.current = now;
    setIsChecking(true);
    try {
      const currentVersion = await getCurrentAppVersion();
      const storedVersion = getStoredAppVersion();

      if (!currentVersion) {
        return;
      }

      if (!storedVersion) {
        storeAppVersion(currentVersion);
        markVersionAsShown(currentVersion);
        markDialogShownForVersion(currentVersion);
        return;
      }

      if (hasVersionChanged(currentVersion, storedVersion)) {
        if (isVersionDismissed(currentVersion)) {
          logger.info('Version dismissed by user, skipping:', currentVersion);
          storeAppVersion(currentVersion);
          return;
        }

        if (wasDialogShownForVersion(currentVersion)) {
          logger.info('Dialog already shown for this version, skipping:', currentVersion);
          storeAppVersion(currentVersion);
          return;
        }

        if (hasVersionBeenShown(currentVersion)) {
          logger.info('Version already shown to user, skipping notification:', currentVersion);
          storeAppVersion(currentVersion);
          markDialogShownForVersion(currentVersion);
          return;
        }

        const latestShown = getLatestShownVersion();
        if (latestShown && currentVersion.buildTime <= latestShown.buildTime) {
          logger.info('Newer version already shown, skipping older version:', currentVersion);
          storeAppVersion(currentVersion);
          return;
        }

        logger.info('New app version detected', {
          current: currentVersion,
          stored: storedVersion,
        });
        
        const versionId = getVersionId(currentVersion);
        if (!updateAvailable && checkingVersionRef.current !== versionId) {
          checkingVersionRef.current = versionId;
          notificationShownRef.current = true;
          markDialogShownForVersion(currentVersion);
          setUpdateVersion(currentVersion);
          setUpdateAvailable(true);
          
          await showBrowserNotification(currentVersion);
        }
      }
    } catch (error) {
      logger.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    try {
      logger.info('Starting app update process...');
      
      // Clear all caches
      await clearAllCachesOnUpdate();

      // Unregister service worker to force update
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Unregister to force fresh service worker
            await registration.unregister();
            logger.info('Service worker unregistered');
          }
        } catch (error) {
          logger.error('Error unregistering service worker:', error);
        }
      }

      // Clear all caches again after unregistering
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        logger.info('All caches cleared');
      }

      // Clear localStorage version to force fresh check
      localStorage.removeItem('app_version');

      // Store new version and mark as shown
      const currentVersion = await getCurrentAppVersion();
      if (currentVersion) {
        markVersionAsShown(currentVersion);
        storeAppVersion(currentVersion);
      }

      // Reset notification flag
      notificationShownRef.current = false;

      // Force reload with cache bypass
      logger.info('Reloading page with cache bypass...');
      window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
    } catch (error) {
      logger.error('Error updating app:', error);
      // Still reload even if there's an error
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    // Clear auto-update timer
    if (autoUpdateTimerRef.current) {
      clearTimeout(autoUpdateTimerRef.current);
      autoUpdateTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setUpdateAvailable(false);
    setIsAutoUpdating(false);
    setCountdown(3);
    
    // Mark this version as dismissed AND shown so it won't show again
    if (updateVersion) {
      markVersionDismissed(updateVersion);
      markVersionAsShown(updateVersion);
      storeAppVersion(updateVersion);
    } else {
      // Fallback: update stored version to current
      getCurrentAppVersion().then((current) => {
        if (current) {
          markVersionDismissed(current);
          markVersionAsShown(current);
          storeAppVersion(current);
        }
      });
    }
    
    // Reset refs to allow checking again if a newer version comes
    checkingVersionRef.current = null;
  };

  // Start auto-update countdown when update is available
  useEffect(() => {
    if (updateAvailable && !isAutoUpdating) {
      setIsAutoUpdating(true);
      setCountdown(3);
      
      // Countdown interval
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Auto-update after delay
      autoUpdateTimerRef.current = setTimeout(() => {
        logger.info('Auto-updating app...');
        handleUpdate();
      }, AUTO_UPDATE_DELAY);
    }
    
    return () => {
      if (autoUpdateTimerRef.current) {
        clearTimeout(autoUpdateTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [updateAvailable]);

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

  // Handle service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Get service worker registration
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          serviceWorkerRegistrationRef.current = registration;
          
          // Check for updates
          registration.update();

          // Listen for service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is ready
                  logger.info('New service worker installed');
                  checkForUpdates();
                }
              });
            }
          });
        }
      });

      // Listen for messages from service worker
        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'APP_UPDATE_AVAILABLE') {
            logger.info('Update available message from service worker:', event.data);
            const version = event.data.version;
            
            if (isVersionDismissed(version)) {
              logger.info('Version dismissed, ignoring service worker message:', version);
              storeAppVersion(version);
              return;
            }
            
            if (wasDialogShownForVersion(version)) {
              logger.info('Dialog already shown for this version, ignoring:', version);
              storeAppVersion(version);
              return;
            }
            
            if (hasVersionBeenShown(version)) {
              logger.info('Version already shown, ignoring service worker message:', version);
              storeAppVersion(version);
              markDialogShownForVersion(version);
              return;
            }
            
            if (updateAvailable) {
              return;
            }
            
            const versionId = getVersionId(version);
            if (checkingVersionRef.current !== versionId) {
              checkingVersionRef.current = versionId;
              notificationShownRef.current = true;
              markDialogShownForVersion(version);
              setUpdateVersion(version);
              setUpdateAvailable(true);
              
              await showBrowserNotification(version);
            }
          } else if (event.data?.type === 'FORCE_APP_UPDATE') {
            logger.info('Force update message from service worker');
            await handleUpdate();
          } else if (event.data?.type === 'SERVICE_WORKER_ACTIVATED') {
            logger.info('Service worker activated, checking for updates');
            setTimeout(checkForUpdates, 2000);
          }
        };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      // Periodic service worker update check
      const checkServiceWorkerUpdate = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
          }
        } catch (error) {
          logger.error('Error checking service worker update:', error);
        }
      };

      const swInterval = setInterval(checkServiceWorkerUpdate, CHECK_INTERVAL);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        clearInterval(swInterval);
      };
    }
  }, []);

  // Handle notification clicks (when app is already open)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleNotificationClick = () => {
        // Check if we should show the update dialog
        if (updateAvailable) {
          // Dialog is already shown via state
          return;
        }
      };

      // Request notification permission on mount
      requestNotificationPermission();

      return () => {
        // Cleanup if needed
      };
    }
  }, [updateAvailable]);

  if (!updateAvailable) {
    return null;
  }

  return (
    <AlertDialog open={updateAvailable} onOpenChange={(open) => {
      if (!open) {
        handleDismiss();
      }
    }}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            Update Available
          </AlertDialogTitle>
          <div className="text-sm text-muted-foreground">
            <p>A new version is available. Updating automatically in <span className="font-bold text-primary">{countdown}</span> seconds...</p>
            {updateVersion && (
              <div className="mt-3 space-y-1">
                <div className="font-medium text-foreground">
                  Version: {updateVersion.version}
                </div>
                <div>
                  Build: {new Date(updateVersion.buildTime).toLocaleString()}
                </div>
                {updateVersion.buildHash && (
                  <div className="font-mono text-xs">
                    Hash: {updateVersion.buildHash.substring(0, 12)}...
                  </div>
                )}
              </div>
            )}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleDismiss} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Skip This Update
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
