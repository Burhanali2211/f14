/**
 * App version management and update detection
 */

export interface AppVersion {
  version: string;
  buildTime: number;
  buildHash?: string;
}

const VERSION_STORAGE_KEY = 'app_version';
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
 * Clear all app caches when version changes
 */
export async function clearAllCachesOnUpdate(): Promise<void> {
  try {
    // Clear localStorage cache (data cache)
    const { clearAllCache } = await import('./data-cache');
    clearAllCache();

    // Clear service worker cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }

    // Clear IndexedDB if needed (for future use)
    if ('indexedDB' in window) {
      // You can add IndexedDB cleanup here if needed
    }

    console.log('All caches cleared due to app update');
  } catch (error) {
    console.error('Error clearing caches on update:', error);
  }
}

