/**
 * Realtime subscription manager for cache invalidation
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { invalidateCachesForTable } from './cache-change-detector';

let cacheChannel: ReturnType<typeof supabase.channel> | null = null;
let isSubscribed = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize Realtime subscriptions for cache invalidation
 */
export function initializeCacheRealtimeSubscriptions(): () => void {
  if (cacheChannel) {
    // Already initialized
    return () => {
      if (cacheChannel) {
        supabase.removeChannel(cacheChannel);
        cacheChannel = null;
        isSubscribed = false;
      }
    };
  }
  
  // Create a single channel for all cache invalidation events
  cacheChannel = supabase.channel('cache-invalidation-channel');
  
  // Subscribe to pieces table changes
  cacheChannel.on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'pieces',
    },
    (payload) => {
      // Only log in development mode to reduce console noise
      if (import.meta.env.DEV) {
        logger.debug('Pieces table changed, invalidating cache', payload);
      }
      invalidateCachesForTable('pieces');
    }
  );
  
  // Subscribe to categories table changes
  cacheChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'categories',
    },
    (payload) => {
      if (import.meta.env.DEV) {
        logger.debug('Categories table changed, invalidating cache', payload);
      }
      invalidateCachesForTable('categories');
    }
  );
  
  // Subscribe to imams table changes
  cacheChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'imams',
    },
    (payload) => {
      if (import.meta.env.DEV) {
        logger.debug('Imams table changed, invalidating cache', payload);
      }
      invalidateCachesForTable('imams');
    }
  );
  
  // Subscribe to site_settings table changes
  cacheChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'site_settings',
    },
    (payload) => {
      if (import.meta.env.DEV) {
        logger.debug('Site settings table changed, invalidating cache', payload);
      }
      invalidateCachesForTable('site_settings');
    }
  );
  
  // Subscribe to artistes table changes
  cacheChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'artistes',
    },
    (payload) => {
      if (import.meta.env.DEV) {
        logger.debug('Artistes table changed, invalidating cache', payload);
      }
      invalidateCachesForTable('artistes');
    }
  );
  
  // Handle subscription status
  cacheChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      isSubscribed = true;
      reconnectAttempts = 0;
    } else if (status === 'CHANNEL_ERROR') {
      isSubscribed = false;
      attemptReconnect();
    } else if (status === 'TIMED_OUT') {
      isSubscribed = false;
      attemptReconnect();
    } else if (status === 'CLOSED') {
      isSubscribed = false;
    }
  });
  
  return () => {
    if (cacheChannel) {
      supabase.removeChannel(cacheChannel);
      cacheChannel = null;
      isSubscribed = false;
      reconnectAttempts = 0;
    }
  };
}

/**
 * Attempt to reconnect Realtime subscription
 */
function attemptReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    if (import.meta.env.DEV) {
      logger.debug('Max reconnect attempts reached for cache invalidation Realtime - will retry on next page load');
    }
    return;
  }
  
  reconnectAttempts++;
  const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
  
  logger.debug(`Attempting to reconnect cache invalidation Realtime in ${delay}ms (attempt ${reconnectAttempts})`);
  
  setTimeout(() => {
    if (cacheChannel && !isSubscribed) {
      cacheChannel.subscribe();
    }
  }, delay);
}

/**
 * Check if Realtime subscription is active
 */
export function isCacheRealtimeActive(): boolean {
  return isSubscribed && cacheChannel !== null;
}

/**
 * Manually trigger cache invalidation (for testing or manual refresh)
 */
export function triggerCacheInvalidation(table: string): void {
  invalidateCachesForTable(table);
}
