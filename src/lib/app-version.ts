/**
 * App version management and update detection
 */

export interface AppVersion {
  version: string;
  buildTime: number;
  buildHash?: string;
}

const VERSION_STORAGE_KEY = 'app_version';
const SHOWN_VERSIONS_KEY = 'app_shown_versions'; // Track which versions have been shown
const VERSION_FILE_PATH = '/version.json';

/**
 * Get current app version from version.json file
 */
export async function getCurrentAppVersion(): Promise<AppVersion | null> {
  try {
    // Add cache-busting query parameter to ensure we get the latest version
    const response = await fetch(`${VERSION_FILE_PATH}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const version: AppVersion = await response.json();
    return version;
  } catch (error) {
    console.error('Error fetching app version:', error);
    return null;
  }
}

/**
 * Get stored app version from localStorage
 */
export function getStoredAppVersion(): AppVersion | null {
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading stored app version:', error);
    return null;
  }
}

/**
 * Store app version in localStorage
 */
export function storeAppVersion(version: AppVersion): void {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(version));
  } catch (error) {
    console.error('Error storing app version:', error);
  }
}

/**
 * Check if app version has changed
 * Returns true if version is different or buildTime is newer
 */
export function hasVersionChanged(
  current: AppVersion | null,
  stored: AppVersion | null
): boolean {
  if (!current) {
    return false; // Can't determine if changed
  }

  if (!stored) {
    return true; // No stored version means first load or cache cleared
  }

  // Check if version string changed
  if (current.version !== stored.version) {
    return true;
  }

  // Check if buildTime is newer (handles same version but new build)
  if (current.buildTime > stored.buildTime) {
    return true;
  }

  // Check if buildHash changed (if available)
  if (current.buildHash && stored.buildHash && current.buildHash !== stored.buildHash) {
    return true;
  }

  return false;
}

/**
 * Get list of versions that have already been shown to user
 */
export function getShownVersions(): string[] {
  try {
    const stored = localStorage.getItem(SHOWN_VERSIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading shown versions:', error);
    return [];
  }
}

/**
 * Mark a version as shown to user
 */
export function markVersionAsShown(version: AppVersion): void {
  try {
    const shownVersions = getShownVersions();
    // Use buildHash if available, otherwise use buildTime as unique identifier
    const versionId = version.buildHash || `v${version.version}-${version.buildTime}`;
    
    // Only add if not already in list
    if (!shownVersions.includes(versionId)) {
      shownVersions.push(versionId);
      // Keep only last 10 versions to prevent localStorage from growing too large
      if (shownVersions.length > 10) {
        shownVersions.shift();
      }
      localStorage.setItem(SHOWN_VERSIONS_KEY, JSON.stringify(shownVersions));
    }
  } catch (error) {
    console.error('Error marking version as shown:', error);
  }
}

/**
 * Check if a version has already been shown to user
 */
export function hasVersionBeenShown(version: AppVersion): boolean {
  try {
    const shownVersions = getShownVersions();
    const versionId = version.buildHash || `v${version.version}-${version.buildTime}`;
    return shownVersions.includes(versionId);
  } catch (error) {
    console.error('Error checking if version shown:', error);
    return false;
  }
}

/**
 * Get the latest shown version (highest buildTime)
 */
export function getLatestShownVersion(): AppVersion | null {
  try {
    const stored = localStorage.getItem(SHOWN_VERSIONS_KEY);
    if (!stored) return null;
    
    // Get all stored versions and find the one with highest buildTime
    const storedVersion = getStoredAppVersion();
    return storedVersion;
  } catch (error) {
    console.error('Error getting latest shown version:', error);
    return null;
  }
}

/**
 * Clear all app caches when version changes
 */
export async function clearAllCachesOnUpdate(): Promise<void> {
  try {
    console.log('[App Version] Starting cache clearing process...');
    
    // 1. Clear localStorage cache (data cache)
    try {
      const { clearAllCache } = await import('./data-cache');
      clearAllCache();
      console.log('[App Version] LocalStorage cache cleared');
    } catch (error) {
      console.warn('[App Version] Error clearing localStorage cache:', error);
    }

    // 2. Clear all service worker caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        console.log('[App Version] Found caches to delete:', cacheNames);
        
        const deletePromises = cacheNames.map(async (cacheName) => {
          try {
            const deleted = await caches.delete(cacheName);
            console.log(`[App Version] Cache ${cacheName} deleted:`, deleted);
            return deleted;
          } catch (error) {
            console.error(`[App Version] Error deleting cache ${cacheName}:`, error);
            return false;
          }
        });
        
        await Promise.all(deletePromises);
        console.log('[App Version] All service worker caches cleared');
      } catch (error) {
        console.error('[App Version] Error clearing service worker caches:', error);
      }
    }

    // 3. Clear IndexedDB caches
    if ('indexedDB' in window) {
      try {
        // Clear app-version-db (used by service worker)
        const deleteDB = (dbName: string) => {
          return new Promise<void>((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            deleteRequest.onsuccess = () => {
              console.log(`[App Version] IndexedDB ${dbName} deleted`);
              resolve();
            };
            deleteRequest.onerror = () => {
              console.warn(`[App Version] Error deleting IndexedDB ${dbName}:`, deleteRequest.error);
              resolve(); // Don't reject, just log
            };
            deleteRequest.onblocked = () => {
              console.warn(`[App Version] IndexedDB ${dbName} deletion blocked`);
              resolve(); // Don't reject, just log
            };
          });
        };

        await deleteDB('app-version-db');
        console.log('[App Version] IndexedDB caches cleared');
      } catch (error) {
        console.warn('[App Version] Error clearing IndexedDB:', error);
      }
    }

    // 4. Clear sessionStorage (optional, but ensures clean state)
    try {
      sessionStorage.clear();
      console.log('[App Version] SessionStorage cleared');
    } catch (error) {
      console.warn('[App Version] Error clearing sessionStorage:', error);
    }

    // 5. Unregister service worker to force fresh registration
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.unregister();
          console.log('[App Version] Service worker unregistered');
        }
      } catch (error) {
        console.warn('[App Version] Error unregistering service worker:', error);
      }
    }

    console.log('[App Version] All caches cleared successfully');
  } catch (error) {
    console.error('[App Version] Error clearing caches on update:', error);
    throw error;
  }
}

