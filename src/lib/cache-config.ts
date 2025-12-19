/**
 * Cache configuration - defines cache policies per data type
 */

export interface CachePolicy {
  /** Cache duration in milliseconds */
  ttl: number;
  /** Whether to use Realtime subscriptions for change detection */
  useRealtime: boolean;
  /** Whether this cache is user-specific */
  userSpecific: boolean;
}

export const CACHE_POLICIES: Record<string, CachePolicy> = {
  // Categories rarely change - cache for 24 hours
  categories: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    useRealtime: true,
    userSpecific: false,
  },
  
  // Pieces change more frequently - cache for 1 hour
  pieces: {
    ttl: 60 * 60 * 1000, // 1 hour
    useRealtime: true,
    userSpecific: false,
  },
  
  // Individual piece - cache for 1 hour
  'pieces:single': {
    ttl: 60 * 60 * 1000, // 1 hour
    useRealtime: true,
    userSpecific: false,
  },
  
  // Imams rarely change - cache for 24 hours
  imams: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    useRealtime: true,
    userSpecific: false,
  },
  
  // Site settings change occasionally - cache for 1 hour
  site_settings: {
    ttl: 60 * 60 * 1000, // 1 hour
    useRealtime: true,
    userSpecific: false,
  },
  
  // Index page data - cache for 30 minutes
  index: {
    ttl: 30 * 60 * 1000, // 30 minutes
    useRealtime: true,
    userSpecific: false,
  },
  
  // User-specific data - cache for 5 minutes
  user_profile: {
    ttl: 5 * 60 * 1000, // 5 minutes
    useRealtime: false,
    userSpecific: true,
  },
  
  // Uploader permissions - cache for 5 minutes
  uploader_permissions: {
    ttl: 5 * 60 * 1000, // 5 minutes
    useRealtime: false,
    userSpecific: true,
  },
  
  // Artists/Reciters - cache for 12 hours
  artists: {
    ttl: 12 * 60 * 60 * 1000, // 12 hours
    useRealtime: true,
    userSpecific: false,
  },
  
  // Default policy - 1 hour
  default: {
    ttl: 60 * 60 * 1000, // 1 hour
    useRealtime: false,
    userSpecific: false,
  },
};

/**
 * Get cache policy for a given cache key
 */
export function getCachePolicy(key: string): CachePolicy {
  // Check for exact match first
  if (CACHE_POLICIES[key]) {
    return CACHE_POLICIES[key];
  }
  
  // Check for pattern matches (e.g., "pieces:123" matches "pieces")
  const parts = key.split(':');
  if (parts.length > 0 && CACHE_POLICIES[parts[0]]) {
    return CACHE_POLICIES[parts[0]];
  }
  
  // Check for single piece pattern
  if (key.startsWith('pieces:') && key !== 'pieces:list') {
    return CACHE_POLICIES['pieces:single'];
  }
  
  // Return default policy
  return CACHE_POLICIES.default;
}

/**
 * Cache key prefixes
 */
export const CACHE_KEY_PREFIX = 'app_cache:';

/**
 * Maximum cache size per key (5MB)
 */
export const MAX_CACHE_SIZE_PER_KEY = 5 * 1024 * 1024; // 5MB

/**
 * Maximum total cache size (10MB)
 */
export const MAX_TOTAL_CACHE_SIZE = 10 * 1024 * 1024; // 10MB
