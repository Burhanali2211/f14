/**
 * Core cache manager for localStorage-based data caching
 */

import { logger } from './logger';
import { getCachePolicy, CACHE_KEY_PREFIX, MAX_TOTAL_CACHE_SIZE } from './cache-config';
import { getCurrentUser } from './auth-utils';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  version?: string; // MAX(updated_at) from related tables
  expiresAt: number;
  queryKey: string;
  userId?: string; // For user-specific caches
}

export interface CacheStats {
  totalKeys: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * Generate a cache key from query name and parameters
 */
export function getCacheKey(queryName: string, params?: Record<string, any>): string {
  const baseKey = `${CACHE_KEY_PREFIX}${queryName}`;
  
  if (!params || Object.keys(params).length === 0) {
    return baseKey;
  }
  
  // Sort params for consistent key generation
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${baseKey}:${sortedParams}`;
}

/**
 * Get cached data if valid
 */
export function getCachedData<T = any>(key: string): CacheEntry<T> | null {
  try {
    const fullKey = key.startsWith(CACHE_KEY_PREFIX) ? key : `${CACHE_KEY_PREFIX}${key}`;
    const cached = localStorage.getItem(fullKey);
    
    if (!cached) {
      return null;
    }
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(fullKey);
      return null;
    }
    
    // Check if user-specific cache matches current user
    if (entry.userId) {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.id !== entry.userId) {
        // User changed, invalidate this cache
        localStorage.removeItem(fullKey);
        return null;
      }
    }
    
    return entry;
  } catch (error) {
    logger.error('Error reading cache:', error);
    // Corrupted cache - remove it
    try {
      const fullKey = key.startsWith(CACHE_KEY_PREFIX) ? key : `${CACHE_KEY_PREFIX}${key}`;
      localStorage.removeItem(fullKey);
    } catch (e) {
      // Ignore removal errors
    }
    return null;
  }
}

/**
 * Set cached data
 */
export function setCachedData<T = any>(
  key: string,
  data: T,
  version?: string,
  customTtl?: number
): boolean {
  try {
    const fullKey = key.startsWith(CACHE_KEY_PREFIX) ? key : `${CACHE_KEY_PREFIX}${key}`;
    const policy = getCachePolicy(key.replace(CACHE_KEY_PREFIX, ''));
    const ttl = customTtl || policy.ttl;
    
    const currentUser = getCurrentUser();
    const userId = policy.userSpecific && currentUser ? currentUser.id : undefined;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version,
      expiresAt: Date.now() + ttl,
      queryKey: key,
      userId,
    };
    
    const serialized = JSON.stringify(entry);
    const size = new Blob([serialized]).size;
    
    // Check if we're exceeding total cache size
    const currentStats = getCacheStats();
    if (currentStats.totalSize + size > MAX_TOTAL_CACHE_SIZE) {
      // Clear oldest entries to make room
      clearOldestCacheEntries(size);
    }
    
    localStorage.setItem(fullKey, serialized);
    return true;
  } catch (error: any) {
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      logger.warn('localStorage quota exceeded, clearing oldest entries');
      clearOldestCacheEntries();
      
      // Retry once
      try {
        const fullKey = key.startsWith(CACHE_KEY_PREFIX) ? key : `${CACHE_KEY_PREFIX}${key}`;
        const policy = getCachePolicy(key.replace(CACHE_KEY_PREFIX, ''));
        const ttl = customTtl || policy.ttl;
        
        const currentUser = getCurrentUser();
        const userId = policy.userSpecific && currentUser ? currentUser.id : undefined;
        
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          version,
          expiresAt: Date.now() + ttl,
          queryKey: key,
          userId,
        };
        
        localStorage.setItem(fullKey, JSON.stringify(entry));
        return true;
      } catch (retryError) {
        logger.error('Failed to cache data after clearing:', retryError);
        return false;
      }
    }
    
    logger.error('Error caching data:', error);
    return false;
  }
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern: string): number {
  let invalidated = 0;
  
  try {
    const keysToRemove: string[] = [];
    const prefix = pattern.includes('*') 
      ? pattern.replace(/\*/g, '')
      : pattern;
    
    // If pattern doesn't start with prefix, add it
    const searchPrefix = prefix.startsWith(CACHE_KEY_PREFIX) 
      ? prefix 
      : `${CACHE_KEY_PREFIX}${prefix}`;
    
    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Check if key matches pattern
      if (pattern.includes('*')) {
        // Wildcard pattern
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/:/g, '\\:'));
        if (regex.test(key)) {
          keysToRemove.push(key);
        }
      } else {
        // Exact match or prefix match
        if (key === searchPrefix || key.startsWith(searchPrefix + ':')) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove matching keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      invalidated++;
    });
    
    if (invalidated > 0) {
      logger.debug(`Invalidated ${invalidated} cache entries matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error('Error invalidating cache:', error);
  }
  
  return invalidated;
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): number {
  let cleared = 0;
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) continue;
      
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;
        
        const entry: CacheEntry = JSON.parse(cached);
        
        // Check if expired
        if (Date.now() > entry.expiresAt) {
          keysToRemove.push(key);
        }
        
        // Check if user-specific cache is for different user
        if (entry.userId) {
          const currentUser = getCurrentUser();
          if (!currentUser || currentUser.id !== entry.userId) {
            keysToRemove.push(key);
          }
        }
      } catch (error) {
        // Corrupted entry - remove it
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      cleared++;
    });
    
    if (cleared > 0) {
      logger.debug(`Cleared ${cleared} expired cache entries`);
    }
  } catch (error) {
    logger.error('Error clearing expired cache:', error);
  }
  
  return cleared;
}

/**
 * Clear oldest cache entries to make room
 */
function clearOldestCacheEntries(minBytesToFree?: number): void {
  try {
    const entries: Array<{ key: string; timestamp: number; size: number }> = [];
    let totalSize = 0;
    
    // Collect all cache entries with their sizes
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) continue;
      
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;
        
        const size = new Blob([cached]).size;
        const entry: CacheEntry = JSON.parse(cached);
        
        entries.push({
          key,
          timestamp: entry.timestamp,
          size,
        });
        
        totalSize += size;
      } catch (error) {
        // Corrupted entry - remove it
        localStorage.removeItem(key);
      }
    }
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until we have enough space
    let freed = 0;
    const targetFree = minBytesToFree || MAX_TOTAL_CACHE_SIZE * 0.2; // Free 20% by default
    
    for (const entry of entries) {
      if (freed >= targetFree) break;
      
      localStorage.removeItem(entry.key);
      freed += entry.size;
    }
    
    if (freed > 0) {
      logger.debug(`Freed ${freed} bytes from cache by removing oldest entries`);
    }
  } catch (error) {
    logger.error('Error clearing oldest cache entries:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  const stats: CacheStats = {
    totalKeys: 0,
    totalSize: 0,
    oldestEntry: null,
    newestEntry: null,
  };
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) continue;
      
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;
        
        const size = new Blob([cached]).size;
        const entry: CacheEntry = JSON.parse(cached);
        
        stats.totalKeys++;
        stats.totalSize += size;
        
        if (stats.oldestEntry === null || entry.timestamp < stats.oldestEntry) {
          stats.oldestEntry = entry.timestamp;
        }
        
        if (stats.newestEntry === null || entry.timestamp > stats.newestEntry) {
          stats.newestEntry = entry.timestamp;
        }
      } catch (error) {
        // Skip corrupted entries
      }
    }
  } catch (error) {
    logger.error('Error getting cache stats:', error);
  }
  
  return stats;
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    logger.debug(`Cleared all cache entries (${keysToRemove.length} keys)`);
  } catch (error) {
    logger.error('Error clearing all cache:', error);
  }
}

/**
 * Check if cache entry exists and is valid
 */
export function hasValidCache(key: string): boolean {
  return getCachedData(key) !== null;
}
