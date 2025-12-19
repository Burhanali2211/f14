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

/**
 * Get the latest version timestamp for a table
 * Returns MAX(updated_at, created_at) as the version
 */
export async function getTableVersion(table: string): Promise<string | null> {
  try {
    // Try to get MAX(updated_at) first
    const { data: updatedData, error: updatedError } = await safeQuery(async () => {
      const result = await (supabase as any)
        .from(table)
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return result;
    });
    
    if (!updatedError && updatedData?.updated_at) {
      return updatedData.updated_at;
    }
    
    // Fallback to MAX(created_at) if updated_at doesn't exist
    const { data: createdData, error: createdError } = await safeQuery(async () => {
      const result = await (supabase as any)
        .from(table)
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return result;
    });
    
    if (!createdError && createdData?.created_at) {
      return createdData.created_at;
    }
    
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
