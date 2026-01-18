/**
 * Realtime subscription manager for cache invalidation
 * Now uses unified realtime manager for better connection efficiency
 */

import { realtimeManager } from './unified-realtime-manager';
import { logger } from './logger';
import { invalidateCachesForTable } from './cache-change-detector';

let isInitialized = false;
let unsubscribe: (() => void) | null = null;

/**
 * Initialize Realtime subscriptions for cache invalidation
 */
export function initializeCacheRealtimeSubscriptions(): () => void {
  if (isInitialized) {
    // Already initialized
    return () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
        isInitialized = false;
      }
    };
  }

  // Subscribe to cache invalidation events from unified manager
  unsubscribe = realtimeManager.on('cache_invalidation', (payload: any) => {
    const { table } = payload;
    if (table) {
      if (import.meta.env.DEV) {
        logger.debug(`Cache invalidation for table: ${table}`);
      }
      invalidateCachesForTable(table);
    }
  });

  isInitialized = true;

  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      isInitialized = false;
    }
  };
}

/**
 * Check if Realtime subscription is active
 */
export function isCacheRealtimeActive(): boolean {
  return isInitialized && realtimeManager.getStatus().isConnected;
}

/**
 * Manually trigger cache invalidation (for testing or manual refresh)
 */
export function triggerCacheInvalidation(table: string): void {
  invalidateCachesForTable(table);

  // Broadcast to other clients via unified manager
  realtimeManager.send('cache_invalidation', { table });
}
