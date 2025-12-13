import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

export interface QueryOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<QueryOptions> = {
  retries: 2, // Reduced from 3 to 2 for faster failure
  retryDelay: 500, // Reduced from 1000ms to 500ms
  timeout: 10000, // Reduced from 30s to 10s for faster timeout
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: PostgrestError | Error | null): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  
  // Network errors
  if (errorMessage.includes('fetch') || 
      errorMessage.includes('network') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('networkerror')) {
    return true;
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('aborted')) {
    return true;
  }
  
  // Connection errors
  if (errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('etimedout')) {
    return true;
  }
  
  // Supabase specific errors that might be retryable
  const postgrestError = error as PostgrestError;
  if (postgrestError.code) {
    // Database connection errors
    if (postgrestError.code === '08000' || // connection_exception
        postgrestError.code === '08003' || // connection_does_not_exist
        postgrestError.code === '08006' || // connection_failure
        postgrestError.code === '08001' || // sqlclient_unable_to_establish_sqlconnection
        postgrestError.code === '08004' || // sqlserver_rejected_establishment_of_sqlconnection
        postgrestError.code === '57P01' || // admin_shutdown
        postgrestError.code === '57P02' || // crash_shutdown
        postgrestError.code === '57P03') { // cannot_connect_now
      return true;
    }
  }
  
  return false;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a query with retry logic and error handling
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: QueryOptions = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: PostgrestError | null = null;
  
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      // Execute query directly without timeout race (simpler and faster)
      const result = await queryFn();
      
      // If no error, return success immediately
      if (!result.error) {
        return result;
      }
      
      // If we got an error but it's not retryable, return immediately
      if (!isRetryableError(result.error)) {
        return result;
      }
      
      // Error is retryable, save it
      lastError = result.error;
      
      // If this was the last attempt, return the error
      if (attempt === opts.retries) {
        return { data: null, error: lastError };
      }
      
      // Wait before retrying (exponential backoff)
      const delay = opts.retryDelay * Math.pow(2, attempt);
      await sleep(delay);
      
    } catch (error) {
      lastError = error as PostgrestError;
      
      // If this was the last attempt or error is not retryable, return
      if (attempt === opts.retries || !isRetryableError(lastError)) {
        return { data: null, error: lastError };
      }
      
      // Wait before retrying
      const delay = opts.retryDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  
  return { data: null, error: lastError };
}

/**
 * Safe query wrapper - simplified version without session validation
 * Session validation should be done at the auth level, not for every query
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: QueryOptions = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  // Execute query with retry logic (no session validation - that's handled elsewhere)
  return executeQuery(queryFn, options);
}
