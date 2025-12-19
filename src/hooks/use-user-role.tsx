import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback, useMemo } from 'react';
import { getCurrentUserProfile, getCurrentUserRole } from '@/lib/user-role';
import { logger } from '@/lib/logger';
import { getCurrentUser, saveSession, type User } from '@/lib/auth-utils';
import type { UserRole, UserProfile } from '@/lib/supabase-types';

interface UserRoleContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);
  const isRefreshingRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    // Prevent multiple simultaneous refresh calls
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    
    try {
      // Get user from custom session
      const currentUser = getCurrentUser();
      
      setUser(currentUser);

      if (currentUser) {
        try {
          const userProfile = await getCurrentUserProfile();
          setProfile(userProfile);
          const newRole = userProfile?.role || currentUser.role as UserRole || 'user';
          setRole(newRole);
          
          // Update session with latest role if it changed
          if (userProfile && userProfile.role !== currentUser.role) {
            const updatedUser: User = {
              ...currentUser,
              role: userProfile.role,
            };
            saveSession(updatedUser);
            setUser(updatedUser);
          }
        } catch (error) {
          logger.error('UserRole: Error fetching user profile:', error);
          setProfile(null);
          setRole(currentUser.role as UserRole || 'user');
        }
      } else {
        setProfile(null);
        setRole('user');
      }
    } catch (error) {
      logger.error('UserRole: Error in refresh:', error);
      setUser(null);
      setProfile(null);
      setRole('user');
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Initial refresh - get session from localStorage
    const initialRefresh = async () => {
      try {
        if (mounted) {
          await refresh();
        }
      } catch (error) {
        logger.error('UserRole: Error in initial refresh:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    initialRefresh();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_session' && mounted) {
        refresh().catch(error => {
          logger.error('UserRole: Error refreshing on storage change:', error);
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (when user logs in/out in same tab)
    const handleCustomAuthChange = () => {
      if (mounted) {
        refresh().catch(error => {
          logger.error('UserRole: Error refreshing on auth change:', error);
        });
      }
    };

    window.addEventListener('auth:change', handleCustomAuthChange);

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:change', handleCustomAuthChange);
    };
  }, []);

  // Ensure we always have a valid context value with stable references
  const contextValue: UserRoleContextType = useMemo(() => ({
    user,
    profile,
    role,
    loading,
    refresh,
  }), [user, profile, role, loading, refresh]);

  return (
    <UserRoleContext.Provider value={contextValue}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);

  // Gracefully handle cases where the hook is used outside the provider
  // (e.g. during error boundaries, tests, or alternate render roots)
  if (!context) {
    return {
      user: null,
      profile: null,
      role: 'user' as UserRole,
      loading: true,
      refresh: async () => {
        // no-op fallback when provider is not available
      },
    };
  }

  return context;
}
