/**
 * Auto-updates the PWA when a new version is deployed.
 * No manual refresh needed - updates apply automatically.
 */

import { useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const INITIAL_CHECK_DELAY = 30 * 1000; // Check 30 seconds after page load

export function UpdateNotification() {
  const [isChecking, setIsChecking] = useState(false);
  const serviceWorkerRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const checkingVersionRef = useRef<string | null>(null);

  const handleUpdate = async () => {
    try {
      logger.info('Auto-updating app...');
      const { getCurrentAppVersion, storeAppVersion, clearAllCachesOnUpdate, markVersionAsShown } = await import('@/lib/app-version');
      await clearAllCachesOnUpdate();
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) await registration.unregister();
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      localStorage.removeItem('app_version');
      const currentVersion = await getCurrentAppVersion();
      if (currentVersion) {
        markVersionAsShown(currentVersion);
        storeAppVersion(currentVersion);
      }
      window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
    } catch (error) {
      logger.error('Error auto-updating:', error);
      window.location.reload();
    }
  };

  const checkForUpdates = async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      const { getCurrentAppVersion, getStoredAppVersion, storeAppVersion, markVersionAsShown, hasVersionChanged } = await import('@/lib/app-version');
      const currentVersion = await getCurrentAppVersion();
      const storedVersion = getStoredAppVersion();

      if (!currentVersion) {
        // Version file not available, skip check
        return;
      }

      // If no stored version, store current one and mark as shown (first load)
      if (!storedVersion) {
        storeAppVersion(currentVersion);
        markVersionAsShown(currentVersion);
        return;
      }

      // Check if version changed - auto-apply update
      if (hasVersionChanged(currentVersion, storedVersion)) {
        logger.info('New app version detected, auto-updating', {
          current: currentVersion,
          stored: storedVersion,
        });

        // Auto-apply update - no manual refresh needed
        const versionId = currentVersion.buildHash || `v${currentVersion.version}-${currentVersion.buildTime}`;
        if (checkingVersionRef.current !== versionId) {
          checkingVersionRef.current = versionId;
          await handleUpdate();
        }
      }
    } catch (error) {
      logger.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
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

  // Handle service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Get service worker registration
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          serviceWorkerRegistrationRef.current = registration;
          
          // Skip update in dev (SW often disabled) and when registration may be stale - avoids "object no longer usable" error
          if (!import.meta.env.DEV && registration.scope && typeof registration.update === 'function') {
            registration.update().catch((err) => {
              logger.error('Error updating service worker registration:', err);
            });
          }

          // Listen for service worker updates
          try {
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  try {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      logger.info('New service worker installed');
                      checkForUpdates().catch((err) => {
                        logger.error('Error in checkForUpdates:', err);
                      });
                    }
                  } catch (err) {
                    logger.error('Error in service worker statechange:', err);
                  }
                });
              }
            });
          } catch (err) {
            logger.error('Error adding updatefound listener:', err);
          }
        }
      }).catch((err) => {
        logger.error('Error getting service worker registration:', err);
      });

      // Listen for messages from service worker
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'APP_UPDATE_AVAILABLE') {
          logger.info('Update available from service worker, auto-updating:', event.data);
          const version = event.data.version;
          const versionId = version?.buildHash || (version ? `v${version.version}-${version.buildTime}` : 'unknown');
          if (checkingVersionRef.current !== versionId) {
            checkingVersionRef.current = versionId;
            await handleUpdate();
          }
        } else if (event.data?.type === 'FORCE_APP_UPDATE') {
          // Service worker is forcing an update
          logger.info('Force update message from service worker');
          await handleUpdate();
        } else if (event.data?.type === 'SERVICE_WORKER_ACTIVATED') {
          // Service worker activated, check for updates
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

  return null;
}

