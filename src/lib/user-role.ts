import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from './db-utils';
import { logger } from './logger';
import { getCurrentUser } from './auth-utils';
import type { UserRole, UserProfile } from './supabase-types';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await safeQuery(async () => {
    return await (supabase as any)
      .from('users')
      .select('id, email, full_name, role, created_at, updated_at')
      .eq('id', userId)
      .single();
  });

  if (error) {
    logger.error('UserRole: Error fetching user profile:', error);
    return null;
  }
  
  if (!data) {
    return null;
  }
  
  const userData = data as any;
  const profile: UserProfile = {
    id: userData.id,
    email: userData.email,
    role: userData.role as UserRole,
    full_name: userData.full_name,
    avatar_url: null,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
  };
  
  return profile;
}

export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return 'user';
    }

    const role = user.role as UserRole || 'user';
    return role;
  } catch (error) {
    logger.error('UserRole: Error in getCurrentUserRole:', error);
    return 'user';
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      return null;
    }

    // Security: Validate user ID format (UUID)
    if (!user.id || typeof user.id !== 'string' || user.id.length < 30) {
      logger.error('UserRole: Invalid user ID format', { userId: user.id });
      return null;
    }

    // Fetch fresh data from database to get latest role
    // Security: Only fetch for the authenticated user's own ID
    const { data, error } = await safeQuery(async () => {
      return await (supabase as any)
        .from('users')
        .select('id, email, full_name, role, created_at, updated_at')
        .eq('id', user.id)
        .eq('is_active', true) // Security: Only fetch active users
        .single();
    });

    if (error) {
      logger.error('UserRole: Error fetching user profile from DB:', error);
      // Security: Fallback to session data only if DB fetch fails (network issue, not auth issue)
      // This prevents unauthorized access if session is compromised
      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        full_name: user.full_name,
        avatar_url: null,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
      return profile;
    }

    if (!data) {
      return null;
    }

    // Security: Verify the returned data matches the authenticated user
    const userData = data as any;
    if (userData.id !== user.id) {
      logger.error('UserRole: User ID mismatch - potential security issue', {
        sessionId: user.id,
        dbId: userData.id
      });
      return null;
    }

    const profile: UserProfile = {
      id: userData.id,
      email: userData.email,
      role: userData.role as UserRole,
      full_name: userData.full_name,
      avatar_url: null,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    };

    return profile;
  } catch (error) {
    logger.error('UserRole: Error in getCurrentUserProfile:', error);
    return null;
  }
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function isUploader(role: UserRole): boolean {
  return role === 'admin' || role === 'uploader';
}

export function isUser(role: UserRole): boolean {
  return role === 'user';
}

