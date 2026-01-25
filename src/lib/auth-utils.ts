// Custom authentication utilities
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/auth`;

const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const localStorageEnabled = isLocalStorageAvailable();

async function sendNewUserNotification(userData: {
  full_name: string;
  email: string;
  phone_number?: string;
  address?: string;
}): Promise<void> {
  try {
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    if (!chatId) return;
    
    const apiUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/telegram-notify`
      : '/api/telegram-notify';

    await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new_user',
        data: {
          ...userData,
          chat_id: chatId,
        },
      }),
    });
  } catch (error) {
    logger.error('Failed to send new user notification:', error);
  }
}

/**
 * Hash password using SHA-256 (matches Edge Function implementation)
 * Falls back to a simple hash for HTTP (dev) environments where crypto.subtle is unavailable
 */
async function hashPassword(password: string): Promise<string> {
  if (crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const simpleHash = Math.abs(hash).toString(16).padStart(64, '0');
  return simpleHash;
}

/**
 * Test if the auth endpoint is reachable
 */
async function testConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(AUTH_FUNCTION_URL, {
      method: 'OPTIONS',
      signal: controller.signal,
      mode: 'cors',
    });
    
    clearTimeout(timeoutId);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Get the anon key (JWT token) for Edge Functions
const getAnonKey = (): string => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  if (anonKey && anonKey.startsWith('eyJ')) {
    return anonKey;
  }

  if (publishableKey && publishableKey.startsWith('eyJ')) {
    return publishableKey;
  }

  return '';
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

export interface AuthResult {
  success: boolean;
  user: User | null;
  error?: string;
  errorCode?: string;
}

// Get session from localStorage
export function getSession(): User | null {
  if (!localStorageEnabled) return null;
  
  try {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    if (session.expiresAt) {
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt < new Date()) {
        clearSession();
        return null;
      }
    }
    
    return session.user;
  } catch (error) {
    logger.error('Error getting session:', error);
    return null;
  }
}

const SESSION_DURATION_DAYS = 30;

export function saveSession(user: User): void {
  if (!localStorageEnabled) {
    window.dispatchEvent(new Event('auth:change'));
    return;
  }
  
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
    
    const sessionData = {
      user,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
    
    localStorage.setItem('user_session', JSON.stringify(sessionData));
    window.dispatchEvent(new Event('auth:change'));
  } catch (error) {
    logger.error('Error saving session:', error);
  }
}

// Clear session
export function clearSession(): void {
  if (localStorageEnabled) {
    localStorage.removeItem('user_session');
  }
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
    const passwordHash = await hashPassword(password);
    
    // Direct DB insertion as fallback for missing Edge Function
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: fullName,
        phone_number: phoneNumber || null,
        address: address || null,
        role: 'user',
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: false, user: null, error: 'Email already registered', errorCode: 'AUTH_EMAIL_EXISTS' };
      }
      throw insertError;
    }

      if (!userData) throw new Error('Failed to create user');

      const { password_hash, ...userWithoutPassword } = userData as any;
      const user = userWithoutPassword as User;
      
      sendNewUserNotification({
        full_name: fullName,
        email: email.toLowerCase().trim(),
        phone_number: phoneNumber || undefined,
        address: address || undefined,
      });
      
      saveSession(user);
      return { success: true, user, error: undefined, errorCode: undefined };
  } catch (error: any) {
    logger.error('Signup error:', error);
    return { success: false, user: null, error: error.message || 'Failed to create account' };
  }
}

// High-level signup helper
export async function register(
  email: string,
  password: string,
  fullName: string,
  phoneNumber?: string,
  address?: string
): Promise<AuthResult> {
  const result = await signUp(email, password, fullName, phoneNumber, address);
  return {
    success: result.success,
    user: result.user,
    error: result.error,
  };
}

// Sign in user
export async function signIn(
  email: string,
  password: string,
  options?: { suppressErrorLog?: boolean }
): Promise<AuthResponse> {
  try {
    const { data: userData, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (findError || !userData) {
      return { 
        success: false, 
        user: null, 
        error: 'Invalid email or password', 
        errorCode: 'AUTH_INVALID_CREDENTIALS' 
      };
    }

    const userRow: any = userData;
    if (!userRow.is_active) {
      return { 
        success: false, 
        user: null, 
        error: 'This account is inactive. Please contact support.', 
        errorCode: 'AUTH_INACTIVE' 
      };
    }

    const inputHash = await hashPassword(password);
    if (userRow.password_hash !== inputHash) {
      return { 
        success: false, 
        user: null, 
        error: 'Invalid email or password', 
        errorCode: 'AUTH_INVALID_CREDENTIALS' 
      };
    }

    const { password_hash, ...userWithoutPassword } = userRow;
    const user = userWithoutPassword as User;

    saveSession(user);
    return { success: true, user, error: undefined, errorCode: undefined };
  } catch (error: any) {
    if (!options?.suppressErrorLog) {
      logger.error('Login error:', error);
    }
    return { success: false, user: null, error: 'An unexpected error occurred. Please try again.' };
  }
}

// High-level login helper
export async function login(
  email: string,
  password: string,
  options?: { suppressErrorLog?: boolean }
): Promise<AuthResult> {
  const result = await signIn(email, password, options);
  return {
    success: result.success,
    user: result.user,
    error: result.error,
    errorCode: result.errorCode,
  };
}

// Sign out user
export function signOut(): void {
  clearSession();
  try {
    const { clearProfileCache } = require('./user-role');
    clearProfileCache();
  } catch (error) {}
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// Get current user
export function getCurrentUser(): User | null {
  const user = getSession();
  if (user) {
    refreshSessionExpiration();
  }
  return user;
}

function refreshSessionExpiration(): void {
  if (!localStorageEnabled) return;
  
  try {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) return;
    
    const session = JSON.parse(sessionData);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
    
    const updatedSession = {
      ...session,
      expiresAt: expiresAt.toISOString(),
      lastActivity: new Date().toISOString(),
    };
    
    localStorage.setItem('user_session', JSON.stringify(updatedSession));
  } catch (error) {}
}
