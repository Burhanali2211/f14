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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(`${VERSION_FILE_PATH}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const version: AppVersion = await response.json();
    return version;
  } catch (error) {
    // Only log error in development or if it's not an abort/network error
    if (import.meta.env.DEV) {
      console.warn('App version check skipped or failed:', error);
    }
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
 * Force clear all possible caches and reload the page
 */
export async function forceClearCacheAndReload(): Promise<void> {
  try {
    console.log('Force clearing all caches...');
    
    // Clear localStorage
    try {
      const keysToKeep = ['sb-auth-token']; // Keep auth if possible
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch {}

    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch {}

    // Clear Cache Storage
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      } catch {}
    }

    // Unregister Service Workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      } catch {}
    }

    // Clear indexedDB
    try {
      const dbs = ['app-version-db', 'supabase-cache'];
      dbs.forEach(db => {
        try {
          indexedDB.deleteDatabase(db);
        } catch {}
      });
    } catch {}

    console.log('All caches cleared. Reloading...');
    
    // Force reload with cache bypass query param
    window.location.href = window.location.origin + '/?v=' + Date.now() + '&force=true';
  } catch (error) {
    console.error('Error during force clear:', error);
    window.location.reload();
  }
}

export async function clearAllCachesOnUpdate(): Promise<void> {
  try {
    try {
      const { clearAllCache } = await import('./data-cache');
      clearAllCache();
    } catch {}

    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => {
          // Keep the sacred-static cache if possible to avoid re-downloading everything
          // but clear the dynamic ones
          if (cacheName.includes('sacred-recitations')) {
            return caches.delete(cacheName);
          }
          return Promise.resolve(false);
        }));
      } catch {}
    }

    try {
      sessionStorage.clear();
    } catch {}
  } catch {}
}

