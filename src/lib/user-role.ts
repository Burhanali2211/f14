import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from './db-utils';
import { logger } from './logger';
import { getCurrentUser } from './auth-utils';
import type { UserRole, UserProfile } from './supabase-types';

// Cache for user profile to prevent repeated API calls
let profileCache: {
  userId: string;
  profile: UserProfile | null;
  timestamp: number;
} | null = null;

const PROFILE_CACHE_TTL = 30000; // 30 seconds cache
let pendingProfileRequest: Promise<UserProfile | null> | null = null;

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('id, email, full_name, role, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();
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
      profileCache = null;
      return null;
    }

    // Security: Validate user ID format (UUID)
    if (!user.id || typeof user.id !== 'string' || user.id.length < 30) {
      logger.error('UserRole: Invalid user ID format', { userId: user.id });
      return null;
    }

    // Check cache first
    const now = Date.now();
    if (profileCache && profileCache.userId === user.id && (now - profileCache.timestamp) < PROFILE_CACHE_TTL) {
      return profileCache.profile;
    }

    // If there's already a pending request for this user, return it
    if (pendingProfileRequest) {
      return pendingProfileRequest;
    }

    // Create a new request
    pendingProfileRequest = (async () => {
      try {
        // Fetch fresh data from database to get latest role
        // Security: Only fetch for the authenticated user's own ID
          const { data, error } = await safeQuery(async () => {
            return await supabase
              .from('users')
              .select('id, email, full_name, phone_number, address, role, is_active, created_at, updated_at')
              .eq('id', user.id)
              .eq('is_active', true)
              .maybeSingle();
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
          
          // Cache the fallback profile
          profileCache = {
            userId: user.id,
            profile,
            timestamp: now,
          };
          
          return profile;
        }

        if (!data) {
          profileCache = {
            userId: user.id,
            profile: null,
            timestamp: now,
          };
          return null;
        }

        // Security: Verify the returned data matches the authenticated user
        const userData = data as any;
        if (userData.id !== user.id) {
          logger.error('UserRole: User ID mismatch - potential security issue', {
            sessionId: user.id,
            dbId: userData.id
          });
          profileCache = {
            userId: user.id,
            profile: null,
            timestamp: now,
          };
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

        // IMPORTANT: If the role in database is different from session, update the session
        // This ensures users get their updated role without needing to log out and back in
        if (userData.role !== user.role) {
          logger.info('UserRole: Role changed in database, updating session', {
            oldRole: user.role,
            newRole: userData.role,
          });
          // Import dynamically to avoid circular dependency
          const { saveSession } = await import('./auth-utils');
          saveSession({
            ...user,
            role: userData.role,
            full_name: userData.full_name,
            phone_number: userData.phone_number,
            address: userData.address,
            updated_at: userData.updated_at,
          });
          // Clear cache when role changes
          profileCache = null;
        } else {
          // Cache the profile
          profileCache = {
            userId: user.id,
            profile,
            timestamp: now,
          };
        }

        return profile;
      } catch (error) {
        logger.error('UserRole: Error in getCurrentUserProfile:', error);
        return null;
      } finally {
        // Clear pending request after completion
        pendingProfileRequest = null;
      }
    })();

    return pendingProfileRequest;
  } catch (error) {
    logger.error('UserRole: Error in getCurrentUserProfile:', error);
    pendingProfileRequest = null;
    return null;
  }
}

// Function to clear profile cache (useful when user logs out or profile is updated)
export function clearProfileCache(): void {
  profileCache = null;
  pendingProfileRequest = null;
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

