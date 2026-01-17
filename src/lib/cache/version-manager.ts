export const APP_VERSION = '1.0.0';
export const BUILD_TIMESTAMP = import.meta.env.PROD 
  ? new Date().toISOString() 
  : 'development';

export const CACHE_VERSION_KEY = 'app_cache_version';

export function checkAndClearOutdatedCache(): boolean {
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    const currentVersion = `${APP_VERSION}-${BUILD_TIMESTAMP}`;
    
    if (storedVersion !== currentVersion) {
      localStorage.setItem(CACHE_VERSION_KEY, currentVersion);
      
      if (storedVersion && import.meta.env.PROD) {
        clearAllCachesOnVersionChange();
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking cache version:', error);
    return false;
  }
}

async function clearAllCachesOnVersionChange(): Promise<void> {
  try {
    const keysToKeep = [CACHE_VERSION_KEY, 'favorites', 'theme', 'fontSize', 'settings'];
    
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (!keysToKeep.some(k => key.startsWith(k))) {
        localStorage.removeItem(key);
      }
    });

    if ('indexedDB' in window) {
      const deleteRequest = indexedDB.deleteDatabase('tajpoint-cache');
      deleteRequest.onerror = () => console.warn('Error deleting IndexedDB cache');
      deleteRequest.onsuccess = () => console.debug('IndexedDB cache cleared on version update');
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('tajpoint-'))
          .map(name => caches.delete(name))
      );
    }

    console.debug('Caches cleared due to version update');
  } catch (error) {
    console.warn('Error clearing caches on version change:', error);
  }
}

export function getAppVersion(): string {
  return APP_VERSION;
}

export function getBuildInfo(): { version: string; timestamp: string } {
  return {
    version: APP_VERSION,
    timestamp: BUILD_TIMESTAMP,
  };
}
