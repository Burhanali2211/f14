// Custom authentication utilities
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/auth`;

/**
 * Test if the auth endpoint is reachable (for mobile debugging)
 */
async function testConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for test
    
    const response = await fetch(AUTH_FUNCTION_URL, {
      method: 'OPTIONS', // CORS preflight
      signal: controller.signal,
      mode: 'cors',
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 200;
  } catch (error) {
    logger.debug('Connection test failed:', error);
    return false;
  }
}

// Get the anon key (JWT token) for Edge Functions
// The anon key is a JWT that works with verify_jwt: true
const getAnonKey = (): string => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  // Prefer explicit anon key when it looks like a JWT
  if (anonKey && anonKey.startsWith('eyJ')) {
    return anonKey;
  }

  // Fallback: allow legacy publishable key if it's a JWT
  if (publishableKey && publishableKey.startsWith('eyJ')) {
    return publishableKey;
  }

  // At this point we don't have a JWT-style key, which will fail with verify_jwt = true
  const message =
    'Missing JWT-style anon key for auth Edge Function. ' +
    'Please set VITE_SUPABASE_ANON_KEY to your legacy anon JWT from Supabase.';
  logger.error(message, {
    hasAnonKey: !!anonKey,
    hasPublishableKey: !!publishableKey,
  });
  throw new Error(message);
};

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  user: User | null;
  error?: string;
  errorCode?: string;
}

// Normalized auth result used by UI layers
export interface AuthResult {
  success: boolean;
  user: User | null;
  error?: string;
  errorCode?: string;
}

// Get session from localStorage
export function getSession(): User | null {
  try {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    // Sessions never expire automatically - removed expiration check
    // Users will remain logged in indefinitely until they explicitly log out
    
    return session.user;
  } catch (error) {
    logger.error('Error getting session:', error);
    return null;
  }
}

// Save session to localStorage
export function saveSession(user: User): void {
  try {
    // Set expiration to far future (100 years) to ensure session never expires
    // This provides persistence even when browser is closed and reopened
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100); // 100 years from now
    
    const sessionData = {
      user,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(), // Track when session was created
    };
    
    localStorage.setItem('user_session', JSON.stringify(sessionData));
    logger.debug('Session saved for user:', user.email);
    
    // Dispatch custom event for auth state change
    window.dispatchEvent(new Event('auth:change'));
  } catch (error) {
    logger.error('Error saving session:', error);
    // If localStorage is full, try to clear old data and retry
    if (error instanceof DOMException && error.code === 22) {
      try {
        // Clear only non-essential items, preserve user_session
        const sessionBackup = localStorage.getItem('user_session');
        localStorage.clear();
        if (sessionBackup) {
          localStorage.setItem('user_session', sessionBackup);
        }
        // Retry saving
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);
        const sessionData = {
          user,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem('user_session', JSON.stringify(sessionData));
        logger.debug('Session saved after clearing storage');
        window.dispatchEvent(new Event('auth:change'));
      } catch (retryError) {
        logger.error('Error saving session after retry:', retryError);
      }
    }
  }
}

// Clear session
export function clearSession(): void {
  localStorage.removeItem('user_session');
  logger.debug('Session cleared');
  
  // Dispatch custom event for auth state change
  window.dispatchEvent(new Event('auth:change'));
}

// Sign up user
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phoneNumber?: string,
  address?: string
): Promise<AuthResponse> {
  try {
    // Use the anon key (JWT) for Edge Functions with verify_jwt: true
    const anonKey = getAnonKey();
    logger.debug('Using anon key for signup:', {
      hasKey: !!anonKey,
      keyLength: anonKey.length,
      startsWithJWT: anonKey.startsWith('eyJ'),
    });
    
    // Add timeout and better error handling for mobile devices
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Log for debugging mobile issues
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    logger.debug('Signup attempt:', { 
      url: AUTH_FUNCTION_URL,
      isMobile,
      userAgent: navigator.userAgent.substring(0, 50),
      origin: window.location.origin
    });
    
    let response: Response;
    try {
      // For mobile devices, use a more permissive fetch configuration
      // Note: We don't use credentials since we use localStorage, not cookies
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          action: 'signup',
          email,
          password,
          full_name: fullName,
          phone_number: phoneNumber || null,
          address: address || null,
        }),
        // Don't use credentials - we use localStorage, not cookies
        // This avoids CORS issues with credentials
        mode: 'cors',
        // Add cache control for mobile
        cache: 'no-cache',
      };
      
      response = await fetchWithRetry(AUTH_FUNCTION_URL, fetchOptions);
    } catch (fetchError: any) {
      // Handle specific error types
      if (fetchError.name === 'AbortError') {
        logger.error('Signup timeout:', { url: AUTH_FUNCTION_URL, isMobile });
        return { user: null, error: 'Request timed out. Please check your internet connection and try again.' };
      }
      
      if (fetchError.message?.includes('Failed to fetch') || 
          fetchError.message?.includes('NetworkError') ||
          fetchError.message?.includes('Network request failed') ||
          fetchError.message?.includes('Load failed') ||
          fetchError.message?.includes('timeout')) {
        logger.error('Network error during signup:', { 
          error: fetchError.message,
          url: AUTH_FUNCTION_URL,
          userAgent: navigator.userAgent,
          isMobile,
          origin: window.location.origin
        });
        
        // More helpful error message for mobile
        const mobileErrorMsg = isMobile 
          ? 'Unable to connect to server. Please check:\n\n' +
            '• Your internet connection (WiFi or mobile data)\n' +
            '• Try switching between WiFi and mobile data\n' +
            '• Make sure you have a stable connection\n' +
            '• Try refreshing the page\n' +
            '• If the problem persists, check if the website is accessible'
          : 'Network error. Please check your internet connection. If using mobile data, try switching to WiFi or vice versa.';
        
        return { 
          user: null, 
          error: mobileErrorMsg
        };
      }
      
      throw fetchError;
    }

    const data = await response.json();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-utils.ts:254',message:'Response received',data:{status:response.status,statusText:response.statusText,hasData:!!data,dataKeys:data?Object.keys(data):[],dataSuccess:data?.success,hasDataData:!!data?.data,hasDataDataUser:!!data?.data?.user},timestamp:Date.now(),sessionId:'debug-session',runId:'signup-debug',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    // Support both new normalized shape and legacy shape for robustness
    let success = false;
    let user: User | null = null;
    let errorMessage: string | undefined;
    let errorCode: string | undefined;

    if (typeof data?.success === 'boolean') {
      // New edge function format
      success = !!data.success;
      user = (data?.data?.user as User) ?? null;
      const rawError = data?.error;
      if (!success && rawError) {
        errorMessage = rawError.message;
        errorCode = rawError.code;
      }
    } else {
      // Legacy format: { user?, error? }
      user = (data?.user as User) ?? null;
      if (!user && typeof data?.error === 'string') {
        errorMessage = data.error;
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth-utils.ts:279',message:'After parsing',data:{success,hasUser:!!user,userKeys:user?Object.keys(user):[],errorMessage,errorCode,responseOk:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'signup-debug',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    if (!response.ok || !user) {
      if (!errorMessage) {
        errorMessage =
          typeof data?.error === 'string'
            ? data.error
            : response.statusText || 'Failed to create user';
      }

      logger.error('Signup failed:', {
        status: response.status,
        error: errorMessage,
        errorCode,
        responseHeaders: Object.fromEntries(response.headers.entries()),
      });

      return { success: false, user: null, error: errorMessage, errorCode };
    }

    saveSession(user);
    return { success: true, user, error: undefined, errorCode: undefined };
  } catch (error: any) {
    logger.error('Signup error:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Network error';
    if (error.message) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
        errorMessage = 'Request timed out. Please try again.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { success: false, user: null, error: errorMessage };
  }
}

// High-level signup helper with normalized result shape
export async function register(
  email: string,
  password: string,
  fullName: string,
  phoneNumber?: string,
  address?: string
): Promise<AuthResult> {
  const result = await signUp(email, password, fullName, phoneNumber, address);
  return {
    success: !!result.user && !result.error,
    user: result.user,
    error: result.error,
  };
}

// Helper function to retry fetch with exponential backoff
// Mobile devices get longer timeout and more retries
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2
): Promise<Response> {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  // Mobile devices get longer timeout (60s) and more retries (3)
  const timeout = isMobile ? 60000 : 30000;
  const retries = isMobile ? 3 : maxRetries;
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      logger.debug(`Fetch attempt ${attempt + 1}/${retries + 1}`, { 
        url, 
        isMobile, 
        timeout,
        attempt 
      });
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is ok, if not, might retry on 5xx errors
      if (!response.ok && response.status >= 500 && attempt < retries) {
        logger.warn(`Server error ${response.status}, will retry...`, { attempt });
        lastError = new Error(`Server error: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on abort (timeout) on last attempt
      if (error.name === 'AbortError') {
        if (attempt < retries) {
          logger.warn('Request timeout, retrying...', { attempt, isMobile });
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      
      // Don't retry on last attempt
      if (attempt < retries) {
        logger.debug('Network error, retrying...', { 
          error: error.message, 
          attempt,
          isMobile 
        });
        // Exponential backoff: 1s, 2s, 4s for mobile
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

// Sign in user
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    // Use the anon key (JWT) for Edge Functions with verify_jwt: true
    const anonKey = getAnonKey();
    
    // Log for debugging mobile issues
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    logger.debug('Login attempt:', { 
      url: AUTH_FUNCTION_URL,
      isMobile,
      userAgent: navigator.userAgent.substring(0, 50),
      origin: window.location.origin
    });
    
    // For mobile, test connection first (non-blocking)
    if (isMobile) {
      testConnection().then(connected => {
        if (!connected) {
          logger.warn('Connection test failed on mobile device');
        }
      }).catch(() => {
        // Ignore test errors
      });
    }
    
    let response: Response;
    try {
      // For mobile devices, use a more permissive fetch configuration
      // Note: We don't use credentials since we use localStorage, not cookies
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
        // Don't use credentials - we use localStorage, not cookies
        // This avoids CORS issues with credentials
        mode: 'cors',
        // Add cache control for mobile
        cache: 'no-cache',
      };
      
      response = await fetchWithRetry(AUTH_FUNCTION_URL, fetchOptions);
    } catch (fetchError: any) {
      // Handle specific error types
      if (fetchError.name === 'AbortError') {
        logger.error('Login timeout:', { url: AUTH_FUNCTION_URL, isMobile });
        return { user: null, error: 'Request timed out. Please check your internet connection and try again.' };
      }
      
      if (fetchError.message?.includes('Failed to fetch') || 
          fetchError.message?.includes('NetworkError') ||
          fetchError.message?.includes('Network request failed') ||
          fetchError.message?.includes('Load failed') ||
          fetchError.message?.includes('timeout')) {
        logger.error('Network error during login:', { 
          error: fetchError.message,
          url: AUTH_FUNCTION_URL,
          userAgent: navigator.userAgent,
          isMobile,
          origin: window.location.origin
        });
        
        // More helpful error message for mobile
        const mobileErrorMsg = isMobile 
          ? 'Unable to connect to server. Please check:\n\n' +
            '• Your internet connection (WiFi or mobile data)\n' +
            '• Try switching between WiFi and mobile data\n' +
            '• Make sure you have a stable connection\n' +
            '• Try refreshing the page\n' +
            '• If the problem persists, check if the website is accessible'
          : 'Network error. Please check your internet connection. If using mobile data, try switching to WiFi or vice versa.';
        
        return { 
          user: null, 
          error: mobileErrorMsg
        };
      }
      
      throw fetchError;
    }

    const data = await response.json();

    let success = false;
    let user: User | null = null;
    let errorMessage: string | undefined;
    let errorCode: string | undefined;

    if (typeof data?.success === 'boolean') {
      // New edge function format
      success = !!data.success;
      user = (data?.data?.user as User) ?? null;
      const rawError = data?.error;
      if (!success && rawError) {
        errorMessage = rawError.message;
        errorCode = rawError.code;
      }
    } else {
      // Legacy format: { user?, error? }
      user = (data?.user as User) ?? null;
      if (!user && typeof data?.error === 'string') {
        errorMessage = data.error;
      }
    }

    if (!response.ok || !user) {
      if (!errorMessage) {
        if (typeof data?.error === 'string') {
          errorMessage = data.error;
        } else if (data?.error?.message) {
          errorMessage = data.error.message;
          errorCode = data.error.code;
        } else {
          errorMessage = response.statusText || 'Login failed';
        }
      }

      // Distinguish gateway 401 (JWT/verify_jwt issues) from normal auth failures
      if (response.status === 401 && !data?.success && !user && !errorCode) {
        errorCode = 'AUTH_GATEWAY_401';
      }

      logger.error('Login failed:', {
        status: response.status,
        error: errorMessage,
        errorCode,
        responseHeaders: Object.fromEntries(response.headers.entries()),
      });

      return { success: false, user: null, error: errorMessage, errorCode };
    }

    saveSession(user);
    return { success: true, user, error: undefined, errorCode: undefined };
  } catch (error: any) {
    logger.error('Login error:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Network error';
    if (error.message) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
        errorMessage = 'Request timed out. Please try again.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { success: false, user: null, error: errorMessage };
  }
}

// High-level login helper with normalized result shape
export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  const result = await signIn(email, password);
  return {
    success: !!result.user && !result.error,
    user: result.user,
    error: result.error,
    errorCode: result.errorCode,
  };
}

// Sign out user
export function signOut(): void {
  clearSession();
  logger.debug('User signed out');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// Get current user
export function getCurrentUser(): User | null {
  const user = getSession();
  // Refresh session expiration on access to ensure it stays active
  if (user) {
    refreshSessionExpiration();
  }
  return user;
}

// Refresh session expiration to ensure it never expires
function refreshSessionExpiration(): void {
  try {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) return;
    
    const session = JSON.parse(sessionData);
    if (session.user) {
      // Update expiration to far future
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
      
      const updatedSession = {
        ...session,
        expiresAt: expiresAt.toISOString(),
      };
      
      localStorage.setItem('user_session', JSON.stringify(updatedSession));
    }
  } catch (error) {
    logger.error('Error refreshing session expiration:', error);
  }
}
