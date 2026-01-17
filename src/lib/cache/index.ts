export { smartFetch, invalidateTableCache, invalidateAllCaches, getCacheStats, initializeCache, getOptimalFetchConfig, CACHE_VERSION, getConfig, CACHE_CONFIGS } from './smart-cache';
export type { CacheConfig } from './smart-cache';
export { getFromIndexedDB, setInIndexedDB, clearAllCache, clearExpiredEntries, invalidateByPattern } from './indexed-db-store';
export { deduplicatedFetch, cancelPendingRequest, clearAllPendingRequests, hasPendingRequest, getPendingRequestCount } from './request-deduplication';
export { initNetworkMonitor, getNetworkInfo, isOnline, isSlowConnection, shouldReduceRequests, onNetworkChange } from './network-monitor';
export { checkAndClearOutdatedCache, getAppVersion, getBuildInfo, APP_VERSION } from './version-manager';
// Force refresh
