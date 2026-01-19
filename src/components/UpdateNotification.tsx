/**
 * Silent background update component - no UI dialogs
 * Updates happen automatically in the background
 */

import { useEffect, useRef } from 'react';
import { getCurrentAppVersion, getStoredAppVersion, hasVersionChanged, storeAppVersion, clearAllCachesOnUpdate, markVersionAsShown } from '@/lib/app-version';
import { logger } from '@/lib/logger';

const CHECK_INTERVAL = 5 * 60 * 1000;
const INITIAL_CHECK_DELAY = 30 * 1000;
const MIN_CHECK_INTERVAL = 30 * 1000;

export function UpdateNotification() {
  const lastCheckTimeRef = useRef<number>(0);
  const isUpdatingRef = useRef(false);

  const performSilentUpdate = async () => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    try {
      logger.info('Performing silent background update...');
      
      await clearAllCachesOnUpdate();

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch (error) {
          logger.error('Error updating service worker:', error);
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }

      const currentVersion = await getCurrentAppVersion();
      if (currentVersion) {
        markVersionAsShown(currentVersion);
        storeAppVersion(currentVersion);
      }

      logger.info('Silent update complete, reloading...');
      window.location.reload();
    } catch (error) {
      logger.error('Error in silent update:', error);
      isUpdatingRef.current = false;
    }
  };

  const checkForUpdates = async () => {
    const now = Date.now();
    if (now - lastCheckTimeRef.current < MIN_CHECK_INTERVAL) {
      return;
    }
    
    if (isUpdatingRef.current) return;
    
    lastCheckTimeRef.current = now;

    try {
      const currentVersion = await getCurrentAppVersion();
      const storedVersion = getStoredAppVersion();

      if (!currentVersion) return;

      if (!storedVersion) {
        storeAppVersion(currentVersion);
        markVersionAsShown(currentVersion);
        return;
      }

      if (hasVersionChanged(currentVersion, storedVersion)) {
        logger.info('New version detected, auto-updating silently', {
          current: currentVersion,
          stored: storedVersion,
        });
        await performSilentUpdate();
      }
    } catch (error) {
      logger.error('Error checking for updates:', error);
    }
  };

  useEffect(() => {
    const initialTimeout = setTimeout(checkForUpdates, INITIAL_CHECK_DELAY);
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  logger.info('New service worker installed, auto-updating...');
                  performSilentUpdate();
                }
              });
            }
          });
        }
      });

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'APP_UPDATE_AVAILABLE') {
          logger.info('Update available from service worker, auto-updating...');
          await performSilentUpdate();
        } else if (event.data?.type === 'FORCE_APP_UPDATE') {
          await performSilentUpdate();
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  return null;
}
