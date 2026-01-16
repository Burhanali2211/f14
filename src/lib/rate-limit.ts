/**
 * Client-side rate limiting utility
 * Note: Real rate limiting should be implemented on the server side
 * This is a basic client-side protection against accidental spam
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  key: string;
}

class RateLimiter {
  private storage: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * Check if request is allowed
   */
  isAllowed(config: RateLimitConfig): boolean {
    const now = Date.now();
    const key = `rate_limit_${config.key}`;
    const stored = this.storage.get(key);

    // If no record or window expired, reset
    if (!stored || now > stored.resetAt) {
      this.storage.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return true;
    }

    // If under limit, increment
    if (stored.count < config.maxRequests) {
      stored.count++;
      this.storage.set(key, stored);
      return true;
    }

    // Over limit
    return false;
  }

  /**
   * Get remaining requests
   */
  getRemaining(config: RateLimitConfig): number {
    const now = Date.now();
    const key = `rate_limit_${config.key}`;
    const stored = this.storage.get(key);

    if (!stored || now > stored.resetAt) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - stored.count);
  }

  /**
   * Get time until reset (in milliseconds)
   */
  getResetTime(config: RateLimitConfig): number {
    const now = Date.now();
    const key = `rate_limit_${config.key}`;
    const stored = this.storage.get(key);

    if (!stored || now > stored.resetAt) {
      return 0;
    }

    return stored.resetAt - now;
  }

  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.storage.delete(`rate_limit_${key}`);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.storage.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different operations
 */
export const RATE_LIMITS = {
  search: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    key: 'search',
  },
  translation: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    key: 'translation',
  },
  upload: {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    key: 'upload',
  },
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    key: 'auth',
  },
} as const;

/**
 * Hook to check rate limit before performing an action
 */
export function checkRateLimit(
  config: RateLimitConfig,
  onLimitExceeded?: (remaining: number, resetTime: number) => void
): boolean {
  const isAllowed = rateLimiter.isAllowed(config);

  if (!isAllowed) {
    const remaining = rateLimiter.getRemaining(config);
    const resetTime = rateLimiter.getResetTime(config);
    
    if (onLimitExceeded) {
      onLimitExceeded(remaining, resetTime);
    } else {
      console.warn(`Rate limit exceeded for ${config.key}. Try again in ${Math.ceil(resetTime / 1000)}s`);
    }
  }

  return isAllowed;
}

