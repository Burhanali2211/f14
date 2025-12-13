import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from './db-utils';
import { logger } from './logger';
import type { UserRole, UserProfile } from './supabase-types';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  logger.debug('UserRole: Fetching profile for userId', userId);
  
  const { data, error } = await safeQuery(async () => {
    const result = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return result;
  });

  if (error) {
    logger.error('UserRole: Error fetching user profile:', error);
    return null;
  }
  
  if (!data) {
    logger.debug('UserRole: No profile data found');
    return null;
  }
  
  const profile = data as UserProfile;
  logger.debug('UserRole: Profile found', { id: profile.id, role: profile.role });
  return profile;
}

export async function getCurrentUserRole(): Promise<UserRole> {
  try {
    logger.debug('UserRole: Getting current user role');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      logger.error('UserRole: Error getting user:', userError);
      return 'user';
    }
    
    if (!user) {
      logger.debug('UserRole: No user found');
      return 'user';
    }

    const profile = await getUserProfile(user.id);
    const role = profile?.role || 'user';
    logger.debug('UserRole: Current role', role);
    return role;
  } catch (error) {
    logger.error('UserRole: Error in getCurrentUserRole:', error);
    return 'user';
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    logger.debug('UserRole: Getting current user profile');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      logger.error('UserRole: Error getting user:', userError);
      return null;
    }
    
    if (!user) {
      logger.debug('UserRole: No user found');
      return null;
    }

    return await getUserProfile(user.id);
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

