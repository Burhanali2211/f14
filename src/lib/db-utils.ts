import { supabase } from '@/integrations/supabase/client';
import { ensureAuthenticated } from './session-utils';
import { getCurrentUser } from './auth-utils';
import { logger } from './logger';
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

/**
 * Execute an authenticated database operation with automatic session refresh on auth errors
 * Use this for operations that require authentication (insert, update, delete)
 */
export async function authenticatedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: QueryOptions = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  // First, ensure user is authenticated and session is refreshed
  const user = await ensureAuthenticated();
  if (!user) {
    return {
      data: null,
      error: {
        message: 'Not authenticated. Please refresh the page and try again.',
        details: 'Authentication required',
        hint: 'Please log in again',
        code: 'PGRST301'
      } as PostgrestError
    };
  }

  // Only refresh Supabase session if NOT using custom auth
  // Custom auth doesn't use Supabase sessions, so refreshing will fail
  const customUser = getCurrentUser();
  if (!customUser) {
    // Only refresh Supabase session if using Supabase Auth (not custom auth)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        logger.warn('No valid Supabase session found, attempting refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          logger.error('Failed to refresh Supabase session:', refreshError);
        }
      }
    } catch (refreshErr) {
      // Session refresh check completed
    }
  }

  // Execute the query
  const result = await executeQuery(queryFn, options);

  // If we get an authentication error, try refreshing session and retry once
  if (result.error && (
    result.error.message?.toLowerCase().includes('not authenticated') ||
    result.error.message?.toLowerCase().includes('jwt') ||
    result.error.message?.toLowerCase().includes('invalid') ||
    result.error.code === 'PGRST301' ||
    result.error.code === '42501' // Insufficient privilege
  )) {
    logger.warn('Authentication error detected, attempting session refresh...', {
      error: result.error.message,
      code: result.error.code
    });
    
    // Try to refresh authentication and Supabase session
    const refreshedUser = await ensureAuthenticated();
    if (!refreshedUser) {
      return {
        data: null,
        error: {
          message: 'Session expired. Please refresh the page and try again.',
          details: 'Session refresh failed',
          hint: 'Please log in again',
          code: 'PGRST301'
        } as PostgrestError
      };
    }

    // Only refresh Supabase session if NOT using custom auth
    const customUserAfterRefresh = getCurrentUser();
    if (!customUserAfterRefresh) {
      // Only refresh Supabase session if using Supabase Auth (not custom auth)
      try {
        await supabase.auth.refreshSession();
      } catch (refreshErr) {
        // Session refresh before retry
      }
    }

    // Retry the query once with refreshed session
    return executeQuery(queryFn, options);
  }

  return result;
}
