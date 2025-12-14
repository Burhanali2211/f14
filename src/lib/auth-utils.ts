// Custom authentication utilities
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/auth`;

// Get the anon key (JWT token) for Edge Functions
// The anon key is a JWT that works with verify_jwt: true
const getAnonKey = (): string => {
  // First, try to get the anon key from environment (JWT format)
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey && anonKey.startsWith('eyJ')) {
    return anonKey;
  }
  
  // Fallback to publishable key (might be JWT or modern format)
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  
  // If it's a JWT (starts with eyJ), use it directly
  if (publishableKey.startsWith('eyJ')) {
    return publishableKey;
  }
  
  // If using modern publishable key, we need the legacy anon key
  // Return the publishable key as fallback (might not work with verify_jwt: true)
  return publishableKey;
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
  user: User | null;
  error?: string;
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
    logger.debug('Using anon key for signup:', { hasKey: !!anonKey, keyLength: anonKey.length, startsWithJWT: anonKey.startsWith('eyJ') });
    
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
      response = await fetchWithRetry(AUTH_FUNCTION_URL, {
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
        // Add credentials for CORS
        credentials: 'include',
        // Add mode for better CORS handling
        mode: 'cors',
      });
    } catch (fetchError: any) {
      // Handle specific error types
      if (fetchError.name === 'AbortError') {
        logger.error('Signup timeout:', { url: AUTH_FUNCTION_URL, isMobile });
        return { user: null, error: 'Request timed out. Please check your internet connection and try again.' };
      }
      
      if (fetchError.message?.includes('Failed to fetch') || 
          fetchError.message?.includes('NetworkError') ||
          fetchError.message?.includes('Network request failed')) {
        logger.error('Network error during signup:', { 
          error: fetchError.message,
          url: AUTH_FUNCTION_URL,
          userAgent: navigator.userAgent,
          isMobile,
          origin: window.location.origin
        });
        return { 
          user: null, 
          error: 'Network error. Please check your internet connection. If using mobile data, try switching to WiFi or vice versa.' 
        };
      }
      
      throw fetchError;
    }

    if (!response.ok) {
      let errorMessage = 'Signup failed';
      let errorData: any = null;
      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      logger.error('Signup failed:', { 
        status: response.status, 
        error: errorMessage,
        errorData,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      
      // Provide helpful error message for 401
      if (response.status === 401) {
        errorMessage = errorData?.error || errorMessage || 'Authentication failed. The Edge Function may still have JWT verification enabled. Please verify in Supabase Dashboard that JWT verification is disabled for the auth function.';
      }
      
      return { user: null, error: errorMessage };
    }

    const data = await response.json();

    if (data.user) {
      saveSession(data.user);
      return { user: data.user };
    }

    return { user: null, error: 'Failed to create user' };
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
    
    return { user: null, error: errorMessage };
  }
}

// Helper function to retry fetch with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2
): Promise<Response> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on abort (timeout)
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s
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
    
    let response: Response;
    try {
      response = await fetchWithRetry(AUTH_FUNCTION_URL, {
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
        // Add credentials for CORS
        credentials: 'include',
        // Add mode for better CORS handling
        mode: 'cors',
      });
    } catch (fetchError: any) {
      // Handle specific error types
      if (fetchError.name === 'AbortError') {
        logger.error('Login timeout:', { url: AUTH_FUNCTION_URL, isMobile });
        return { user: null, error: 'Request timed out. Please check your internet connection and try again.' };
      }
      
      if (fetchError.message?.includes('Failed to fetch') || 
          fetchError.message?.includes('NetworkError') ||
          fetchError.message?.includes('Network request failed')) {
        logger.error('Network error during login:', { 
          error: fetchError.message,
          url: AUTH_FUNCTION_URL,
          userAgent: navigator.userAgent,
          isMobile,
          origin: window.location.origin
        });
        return { 
          user: null, 
          error: 'Network error. Please check your internet connection. If using mobile data, try switching to WiFi or vice versa.' 
        };
      }
      
      throw fetchError;
    }

    if (!response.ok) {
      let errorMessage = 'Login failed';
      let errorData: any = null;
      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      logger.error('Login failed:', { 
        status: response.status, 
        error: errorMessage,
        errorData,
        responseHeaders: Object.fromEntries(response.headers.entries())
      });
      
      // Provide helpful error message for 401
      if (response.status === 401) {
        errorMessage = errorData?.error || errorMessage || 'Authentication failed. The Edge Function may still have JWT verification enabled. Please verify in Supabase Dashboard that JWT verification is disabled for the auth function.';
      }
      
      return { user: null, error: errorMessage };
    }

    const data = await response.json();

    if (data.user) {
      saveSession(data.user);
      return { user: data.user };
    }

    return { user: null, error: 'Invalid credentials' };
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
    
    return { user: null, error: errorMessage };
  }
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
