/**
 * React Query adapter for localStorage cache integration
 */

import { QueryFunction, QueryKey } from '@tanstack/react-query';
import { getCachedData, setCachedData, getCacheKey, invalidateCache } from './data-cache';
import { getTableVersion } from './cache-change-detector';
import { logger } from './logger';

export interface CachedQueryOptions {
  /** Query name for cache key generation */
  queryName: string;
  /** Table name(s) for version checking */
  tables?: string[];
  /** Custom cache key (overrides queryName) */
  cacheKey?: string;
  /** Force refresh (skip cache) */
  forceRefresh?: boolean;
  /** Custom TTL override */
  ttl?: number;
}

/**
 * Create a cached query function that wraps a regular query function
 * Checks localStorage first, then falls back to API
 */
export function createCachedQueryFn<TData = any>(
  queryFn: QueryFunction<TData>,
  options: CachedQueryOptions
): QueryFunction<TData> {
  return async ({ queryKey, signal }): Promise<TData> => {
    const { queryName, tables, cacheKey, forceRefresh, ttl } = options;
    
    // Generate cache key
    const key = cacheKey || getCacheKey(queryName, queryKey[1] as Record<string, any>);
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData<TData>(key);
      
      if (cached) {
        // Check if cache is stale based on table versions
        if (tables && tables.length > 0) {
          let isStale = false;
          
          for (const table of tables) {
            const currentVersion = await getTableVersion(table);
            if (currentVersion && cached.version && currentVersion > cached.version) {
              isStale = true;
              logger.debug(`Cache stale for ${key} (table ${table} changed)`);
              break;
            }
          }
          
          if (!isStale) {
            logger.debug(`Cache hit for ${key}`);
            return cached.data;
          }
        } else {
          // No version checking, use cached data if not expired
          logger.debug(`Cache hit for ${key}`);
          return cached.data;
        }
      }
    }
    
    // Cache miss or stale - fetch from API
    logger.debug(`Cache miss for ${key}, fetching from API`);
    const data = await queryFn({ queryKey, signal });
    
    // Store in cache after successful fetch
    if (data !== undefined && data !== null) {
      // Get latest version from tables
      let version: string | null = null;
      if (tables && tables.length > 0) {
        // Get the latest version from all tables
        const versions = await Promise.all(
          tables.map(table => getTableVersion(table))
        );
        version = versions
          .filter((v): v is string => v !== null)
          .sort()
          .reverse()[0] || null;
      }
      
      setCachedData(key, data, version, ttl);
    }
    
    return data;
  };
}

/**
 * Helper to create a cached query with automatic cache key generation
 */
export function cachedQuery<TData = any>(
  queryName: string,
  queryFn: QueryFunction<TData>,
  options?: Omit<CachedQueryOptions, 'queryName' | 'queryFn'>
): QueryFunction<TData> {
  return createCachedQueryFn(queryFn, {
    queryName,
    ...options,
  });
}

/**
 * Invalidate React Query cache and localStorage cache
 */
export function invalidateQueryCache(
  queryClient: any,
  pattern: string,
  exact?: boolean
): void {
  // Invalidate localStorage cache
  invalidateCache(pattern);
  
  // Invalidate React Query cache
  if (queryClient) {
    if (exact) {
      queryClient.invalidateQueries({ queryKey: [pattern] });
    } else {
      queryClient.invalidateQueries({ 
        queryKey: [pattern],
        exact: false,
      });
    }
  }
}

/**
 * Prefetch data into cache
 */
export async function prefetchCache<TData = any>(
  queryName: string,
  queryFn: () => Promise<TData>,
  params?: Record<string, any>,
  tables?: string[]
): Promise<void> {
  const key = getCacheKey(queryName, params);
  
  // Check if already cached
  const cached = getCachedData<TData>(key);
  if (cached) {
    return; // Already cached
  }
  
  try {
    // Fetch and cache
    const data = await queryFn();
    
    if (data !== undefined && data !== null) {
      let version: string | null = null;
      if (tables && tables.length > 0) {
        const versions = await Promise.all(
          tables.map(table => getTableVersion(table))
        );
        version = versions
          .filter((v): v is string => v !== null)
          .sort()
          .reverse()[0] || null;
      }
      
      setCachedData(key, data, version);
    }
  } catch (error) {
    logger.error(`Error prefetching cache for ${queryName}:`, error);
  }
}
