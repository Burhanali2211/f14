import { getFromIndexedDB, setInIndexedDB, invalidateByPattern, clearExpiredEntries, initDB } from './indexed-db-store';
import { deduplicatedFetch } from './request-deduplication';
import { isOnline, shouldReduceRequests, getOptimalFetchConfig } from './network-monitor';

export const CACHE_VERSION = '1.0.0';

export interface CacheConfig {
  ttl: number;
  staleWhileRevalidate: boolean;
  persistToIndexedDB: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000,
  staleWhileRevalidate: true,
  persistToIndexedDB: true,
};

export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  pieces: {
    ttl: 10 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: true,
  },
  categories: {
    ttl: 30 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: true,
  },
  imams: {
    ttl: 60 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: true,
  },
  artistes: {
    ttl: 30 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: true,
  },
  site_settings: {
    ttl: 60 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: true,
  },
  ahlul_bait_events: {
    ttl: 60 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: true,
  },
  fiqh_questions: {
    ttl: 15 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: true,
  },
  fiqh_categories: {
    ttl: 60 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: true,
  },
  announcements: {
    ttl: 2 * 60 * 1000,
    staleWhileRevalidate: true,
    persistToIndexedDB: false,
  },
};

const memoryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

export function getConfig(table: string): CacheConfig {
  return CACHE_CONFIGS[table] || DEFAULT_CONFIG;
}

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setMemoryCache<T>(key: string, data: T, ttl: number): void {
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
}

export async function smartFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  table: string
): Promise<T> {
  const config = getConfig(table);
  
  const memoryCached = getMemoryCache<T>(key);
  if (memoryCached !== null) {
    if (config.staleWhileRevalidate && isOnline() && !shouldReduceRequests()) {
      revalidateInBackground(key, fetchFn, table);
    }
    return memoryCached;
  }

  if (config.persistToIndexedDB) {
    try {
      const idbCached = await getFromIndexedDB<T>(key);
      if (idbCached?.value !== undefined) {
        setMemoryCache(key, idbCached.value, config.ttl);
        
        if (config.staleWhileRevalidate && isOnline() && !shouldReduceRequests()) {
          revalidateInBackground(key, fetchFn, table);
        }
        return idbCached.value;
      }
    } catch (error) {
      console.warn('IndexedDB read failed, falling back to network:', error);
    }
  }

  if (!isOnline()) {
    throw new Error('No cached data available and device is offline');
  }

  return deduplicatedFetch(key, async () => {
    const data = await fetchFn();
    
    setMemoryCache(key, data, config.ttl);
    
    if (config.persistToIndexedDB) {
      setInIndexedDB(key, data, config.ttl, CACHE_VERSION).catch(() => {});
    }
    
    return data;
  });
}

async function revalidateInBackground<T>(
  key: string,
  fetchFn: () => Promise<T>,
  table: string
): Promise<void> {
  const config = getConfig(table);
  
  try {
    const freshData = await fetchFn();
    
    setMemoryCache(key, freshData, config.ttl);
    
    if (config.persistToIndexedDB) {
      await setInIndexedDB(key, freshData, config.ttl, CACHE_VERSION);
    }
  } catch (error) {
    console.debug('Background revalidation failed:', error);
  }
}

export async function invalidateTableCache(table: string): Promise<void> {
  const pattern = `${table}:`;
  
  for (const key of memoryCache.keys()) {
    if (key.startsWith(pattern)) {
      memoryCache.delete(key);
    }
  }
  
  await invalidateByPattern(`^${table}:`);
}

export async function invalidateAllCaches(): Promise<void> {
  memoryCache.clear();
  await clearExpiredEntries();
}

export function getCacheStats(): {
  memoryEntries: number;
  memorySize: number;
} {
  let memorySize = 0;
  memoryCache.forEach((entry) => {
    memorySize += JSON.stringify(entry.data).length;
  });
  
  return {
    memoryEntries: memoryCache.size,
    memorySize,
  };
}

export async function initializeCache(): Promise<void> {
  try {
    await initDB();
    await clearExpiredEntries();
  } catch (error) {
    console.warn('Cache initialization failed:', error);
  }
}

export { getOptimalFetchConfig };
