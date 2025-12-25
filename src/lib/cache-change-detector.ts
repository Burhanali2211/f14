/**
 * Change detection system for cache invalidation
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { invalidateCache } from './data-cache';
import { safeQuery } from './db-utils';

export interface TableVersion {
  table: string;
  maxUpdatedAt: string | null;
  maxCreatedAt: string | null;
}

// Cache to track which tables have updated_at column (to avoid repeated 400 errors)
// undefined = not checked yet, true = exists, false = doesn't exist
const COLUMN_CACHE_KEY = 'column_cache_v1';
type ColumnCache = Record<string, { hasUpdatedAt?: boolean; hasCreatedAt?: boolean }>;

// Load cache from localStorage on initialization
function loadColumnCache(): Map<string, { hasUpdatedAt?: boolean; hasCreatedAt?: boolean }> {
  try {
    const cached = localStorage.getItem(COLUMN_CACHE_KEY);
    if (cached) {
      const parsed: ColumnCache = JSON.parse(cached);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    logger.debug('Error loading column cache from localStorage:', error);
  }
  return new Map();
}

// Save cache to localStorage
function saveColumnCache(cache: Map<string, { hasUpdatedAt?: boolean; hasCreatedAt?: boolean }>): void {
  try {
    const obj: ColumnCache = Object.fromEntries(cache);
    localStorage.setItem(COLUMN_CACHE_KEY, JSON.stringify(obj));
  } catch (error) {
    logger.debug('Error saving column cache to localStorage:', error);
  }
}

const columnCache = loadColumnCache();

/**
 * Get the latest version timestamp for a table
 * Returns MAX(updated_at, created_at) as the version
 */
export async function getTableVersion(table: string): Promise<string | null> {
  try {
    // Check cache first to avoid making queries for columns we know don't exist
    const cached = columnCache.get(table);
    
    // Try to get MAX(updated_at) first (only if we haven't cached that it doesn't exist)
    if (cached?.hasUpdatedAt === undefined || cached.hasUpdatedAt === true) {
      const { data: updatedData, error: updatedError } = await safeQuery(async () => {
        const result = await (supabase as any)
          .from(table)
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return result;
      });
      
      // Check if error is due to missing column (400) or other issues
      if (updatedError) {
        const errorCode = (updatedError as any)?.code;
        const errorMessage = String((updatedError as any)?.message || '').toLowerCase();
        const httpStatus = (updatedError as any)?.status || (updatedError as any)?.statusCode;
        
        // If it's a 400 error or column-related error, cache that updated_at doesn't exist
        if (httpStatus === 400 || errorCode === '42703' || errorMessage.includes('column') || errorMessage.includes('does not exist') || errorMessage.includes('undefined')) {
          // Cache that this table doesn't have updated_at
          const existingCache = columnCache.get(table) || {};
          columnCache.set(table, { ...existingCache, hasUpdatedAt: false });
          saveColumnCache(columnCache); // Persist to localStorage
          // Continue to created_at fallback
        } else if (errorCode !== 'PGRST116') {
          // PGRST116 is "no rows" which is fine, but other errors should be logged
          logger.warn(`Error querying 'updated_at' for table '${table}':`, updatedError);
        }
      } else if (updatedData?.updated_at) {
        // Success - cache that this table has updated_at
        const existingCache = columnCache.get(table) || {};
        columnCache.set(table, { ...existingCache, hasUpdatedAt: true });
        saveColumnCache(columnCache); // Persist to localStorage
        return updatedData.updated_at;
      } else {
        // No data but no error - might be empty table, cache that updated_at exists (column exists but table is empty)
        const existingCache = columnCache.get(table) || {};
        columnCache.set(table, { ...existingCache, hasUpdatedAt: true });
        saveColumnCache(columnCache); // Persist to localStorage
      }
    }
    
    // Fallback to MAX(created_at) if updated_at doesn't exist or returned null
    if (cached?.hasCreatedAt === undefined || cached.hasCreatedAt === true) {
      const { data: createdData, error: createdError } = await safeQuery(async () => {
        const result = await (supabase as any)
          .from(table)
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return result;
      });
      
      // Handle errors for created_at query
      if (createdError) {
        const errorCode = (createdError as any)?.code;
        const errorMessage = String((createdError as any)?.message || '').toLowerCase();
        const httpStatus = (createdError as any)?.status || (createdError as any)?.statusCode;
        
        // If it's a column not found error, cache that created_at doesn't exist
        if (httpStatus === 400 || errorCode === '42703' || errorMessage.includes('column') || errorMessage.includes('does not exist') || errorMessage.includes('undefined')) {
          const existingCache = columnCache.get(table) || {};
          columnCache.set(table, { ...existingCache, hasCreatedAt: false });
          saveColumnCache(columnCache); // Persist to localStorage
        } else if (errorCode !== 'PGRST116') {
          // PGRST116 is "no rows" which is fine
          logger.warn(`Error querying 'created_at' for table '${table}':`, createdError);
        }
        return null;
      }
      
      if (createdData?.created_at) {
        // Success - cache that this table has created_at
        const existingCache = columnCache.get(table) || {};
        columnCache.set(table, { ...existingCache, hasCreatedAt: true });
        saveColumnCache(columnCache); // Persist to localStorage
        return createdData.created_at;
      } else {
        // No data but no error - cache that created_at exists (column exists but table is empty)
        const existingCache = columnCache.get(table) || {};
        columnCache.set(table, { ...existingCache, hasCreatedAt: true });
        saveColumnCache(columnCache); // Persist to localStorage
      }
    }
    
    // No data found - table might be empty
    return null;
  } catch (error) {
    logger.error(`Error getting table version for ${table}:`, error);
    return null;
  }
}

/**
 * Get versions for multiple tables at once
 */
export async function getTableVersions(tables: string[]): Promise<Record<string, string | null>> {
  const versions: Record<string, string | null> = {};
  
  // Fetch all versions in parallel
  const promises = tables.map(async (table) => {
    const version = await getTableVersion(table);
    return { table, version };
  });
  
  const results = await Promise.all(promises);
  
  results.forEach(({ table, version }) => {
    versions[table] = version;
  });
  
  return versions;
}

/**
 * Check if cached version matches current database version
 */
export async function isCacheStale(
  cacheKey: string,
  table: string,
  cachedVersion: string | null
): Promise<boolean> {
  if (!cachedVersion) {
    return true; // No cached version means stale
  }
  
  const currentVersion = await getTableVersion(table);
  
  if (!currentVersion) {
    return false; // Can't determine, assume not stale
  }
  
  return currentVersion > cachedVersion;
}

/**
 * Lightweight version check - polls for changes
 * Returns true if any monitored table has changed
 */
export async function checkForChanges(
  lastCheckVersions: Record<string, string | null>
): Promise<{ changed: boolean; newVersions: Record<string, string | null> }> {
  const tables = Object.keys(lastCheckVersions);
  const newVersions = await getTableVersions(tables);
  
  let changed = false;
  
  for (const table of tables) {
    const oldVersion = lastCheckVersions[table];
    const newVersion = newVersions[table];
    
    if (oldVersion !== newVersion) {
      changed = true;
      logger.debug(`Table ${table} changed: ${oldVersion} -> ${newVersion}`);
    }
  }
  
  return { changed, newVersions };
}

/**
 * Map table names to cache invalidation patterns
 */
export const TABLE_CACHE_MAP: Record<string, string[]> = {
  pieces: ['pieces:*', 'index:*', 'categories:*'], // Pieces affect multiple caches
  categories: ['categories:*', 'index:*'],
  imams: ['imams:*', 'index:*', 'pieces:*'], // Imams affect pieces cache too
  site_settings: ['site_settings:*', 'index:*'],
  artistes: ['artists:*', 'index:*'],
};

/**
 * Invalidate caches based on table changes
 */
export function invalidateCachesForTable(table: string): void {
  const patterns = TABLE_CACHE_MAP[table] || [`${table}:*`];
  
  patterns.forEach(pattern => {
    invalidateCache(pattern);
  });
  
  logger.debug(`Invalidated caches for table ${table}: ${patterns.join(', ')}`);
}
