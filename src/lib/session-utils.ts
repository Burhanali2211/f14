import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { getCurrentUser } from './auth-utils';

/**
 * Wait for session to be ready (restored from localStorage)
 * This is important after page refresh
 */
export async function waitForSession(maxWait = 2000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // If we got a response (even if no session), the auth is ready
      if (!error) {
        return true;
      }
      
      // If there's an error, wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  logger.warn('Session wait timeout');
  return false;
}

/**
 * Ensure session is valid and ready before making queries
 */
export async function ensureSessionReady(): Promise<boolean> {
  try {
    // Wait for session to be restored
    const sessionReady = await waitForSession(1000);
    if (!sessionReady) {
      logger.warn('Session not ready after wait');
    }
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Error getting session:', error);
      return false;
    }
    
    // Session is ready (even if null, that's okay for public queries)
    return true;
  } catch (error) {
    logger.error('Error ensuring session ready:', error);
    return false;
  }
}

/**
 * Ensure user is authenticated before performing database operations
 * This function refreshes the session if needed and validates authentication
 * @returns The authenticated user or null if not authenticated
 */
export async function ensureAuthenticated(): Promise<{ id: string; email?: string } | null> {
  try {
    // First, try custom auth session (primary auth system)
    const customUser = getCurrentUser();
    if (customUser) {
      return { id: customUser.id, email: customUser.email || undefined };
    }

    // If no custom auth user, fall back to Supabase Auth (for compatibility)
    // First, ensure session is ready
    await ensureSessionReady();
    
    // Try to get the current Supabase Auth user
    let { data: { user }, error: getUserError } = await supabase.auth.getUser();
    
    // If getUser fails or user is null, try refreshing the session
    if (getUserError || !user) {
      // Try to refresh the session token explicitly
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        // If refresh fails, try getting the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logger.error('Error getting session for refresh:', sessionError);
          return null;
        }
        
        if (!session) {
          logger.warn('No session found after refresh attempt');
          return null;
        }
      }
      
      // Try getting user again after session refresh
      const { data: { user: refreshedUser }, error: refreshedError } = await supabase.auth.getUser();
      
      if (refreshedError) {
        logger.error('Error getting user after session refresh:', refreshedError);
        return null;
      }
      
      if (!refreshedUser) {
        logger.warn('User still not found after session refresh');
        return null;
      }
      
      user = refreshedUser;
    } else {
      // Even if user exists, refresh the session to ensure token is valid
      try {
        await supabase.auth.refreshSession();
      } catch (refreshErr) {
        // Ignore refresh errors if user already exists - session might be valid
      }
    }
    
    return user;
  } catch (error) {
    logger.error('Error ensuring authentication:', error);
    return null;
  }
}

