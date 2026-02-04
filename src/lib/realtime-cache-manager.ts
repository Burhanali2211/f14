/**
 * Realtime subscription manager for cache invalidation
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { invalidateCachesForTable } from './cache-change-detector';

let cacheChannel: ReturnType<typeof supabase.channel> | null = null;
let isSubscribed = false;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECT_ATTEMPTS = 5;

function cleanupChannel(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (cacheChannel) {
    supabase.removeChannel(cacheChannel);
    cacheChannel = null;
  }
  isSubscribed = false;
  reconnectAttempts = 0;
}

/**
 * Initialize Realtime subscriptions for cache invalidation
 */
export function initializeCacheRealtimeSubscriptions(): () => void {
  // ALWAYS cleanup existing channel first (fixes memory leak / duplicate handlers)
  if (cacheChannel) {
    if (import.meta.env.DEV) {
      logger.debug('Cleaning up existing cache channel before reinitializing');
    }
    cleanupChannel();
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
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      isSubscribed = false;
      attemptReconnect();
    } else if (status === 'CLOSED') {
      isSubscribed = false;
    }
  });

  return () => {
    cleanupChannel();
  };
}

/**
 * Attempt to reconnect Realtime subscription
 */
function attemptReconnect(): void {
  // Cancel any pending reconnect (prevents duplicate subscriptions)
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    if (import.meta.env.DEV) {
      logger.debug('Max reconnect attempts reached for cache invalidation Realtime - will retry on next page load');
    }
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), 30000); // Exponential backoff, max 30s

  if (import.meta.env.DEV) {
    logger.debug(`Reconnecting cache invalidation Realtime in ${delay}ms (attempt ${reconnectAttempts})`);
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
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
