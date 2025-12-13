import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

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
        logger.debug('Session ready', { hasSession: !!session });
        return true;
      }
      
      // If there's an error, wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      logger.debug('Error checking session, retrying...', error);
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

