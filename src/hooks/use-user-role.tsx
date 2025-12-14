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
      logger.debug('UserRole: Refresh already in progress, skipping');
      return;
    }

    isRefreshingRef.current = true;
    
    try {
      logger.debug('UserRole: Refreshing user role');
      
      // Get user from custom session
      const currentUser = getCurrentUser();
      
      logger.debug('UserRole: Current user', { hasUser: !!currentUser, userId: currentUser?.id });
      setUser(currentUser);

      if (currentUser) {
        try {
          logger.debug('UserRole: Fetching profile for user', currentUser.id);
          const userProfile = await getCurrentUserProfile();
          logger.debug('UserRole: Profile fetched', { hasProfile: !!userProfile, role: userProfile?.role });
          setProfile(userProfile);
          const newRole = userProfile?.role || currentUser.role as UserRole || 'user';
          setRole(newRole);
          
          // Update session with latest role if it changed
          if (userProfile && userProfile.role !== currentUser.role) {
            logger.debug('UserRole: Role changed, updating session', { 
              oldRole: currentUser.role, 
              newRole: userProfile.role 
            });
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
      logger.debug('UserRole: Refresh complete');
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
        logger.debug('UserRole: Session changed in storage, refreshing');
        refresh().catch(error => {
          logger.error('UserRole: Error refreshing on storage change:', error);
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (when user logs in/out in same tab)
    const handleCustomAuthChange = () => {
      if (mounted) {
        logger.debug('UserRole: Custom auth change event, refreshing');
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
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
