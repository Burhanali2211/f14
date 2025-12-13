import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserProfile, getCurrentUserRole } from '@/lib/user-role';
import { logger } from '@/lib/logger';
import { waitForSession } from '@/lib/session-utils';
import type { UserRole, UserProfile } from '@/lib/supabase-types';
import type { User } from '@supabase/supabase-js';

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

  const refresh = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:27',message:'refresh called',data:{isRefreshing:isRefreshingRef.current,currentRole:role,currentLoading:loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Prevent multiple simultaneous refresh calls
    if (isRefreshingRef.current) {
      logger.debug('UserRole: Refresh already in progress, skipping');
      return;
    }

    isRefreshingRef.current = true;
    
    try {
      logger.debug('UserRole: Refreshing user role');
      
      // Wait a bit for session to be restored from localStorage (especially after refresh)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:42',message:'before getSession',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:45',message:'after getSession',data:{hasSession:!!session,hasError:!!sessionError,userId:session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (sessionError) {
        logger.error('UserRole: Error getting session:', sessionError);
        setUser(null);
        setProfile(null);
        setRole('user');
        setLoading(false);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:50',message:'session error, setting loading false',data:{error:sessionError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return;
      }
      
      logger.debug('UserRole: Session', { hasSession: !!session, userId: session?.user?.id });
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          logger.debug('UserRole: Fetching profile for user', session.user.id);
          const userProfile = await getCurrentUserProfile();
          logger.debug('UserRole: Profile fetched', { hasProfile: !!userProfile, role: userProfile?.role });
          setProfile(userProfile);
          const newRole = userProfile?.role || 'user';
          setRole(newRole);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:62',message:'role set from profile',data:{newRole,hasProfile:!!userProfile},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        } catch (error) {
          logger.error('UserRole: Error fetching user profile:', error);
          setProfile(null);
          setRole('user');
        }
      } else {
        setProfile(null);
        setRole('user');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:70',message:'no session user, setting role to user',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      logger.error('UserRole: Error in refresh:', error);
      setUser(null);
      setProfile(null);
      setRole('user');
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:78',message:'refresh complete, loading set to false',data:{finalRole:role,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      logger.debug('UserRole: Refresh complete');
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Initial refresh - wait for session to be restored from localStorage
    const initialRefresh = async () => {
      // Wait for Supabase to restore session from localStorage (especially after refresh)
      const sessionReady = await waitForSession(1500);
      if (!sessionReady) {
        logger.warn('UserRole: Session not ready after wait, proceeding anyway');
      }
      
      if (mounted) {
        await refresh();
      }
    };
    
    initialRefresh();

    // Set up auth state change listener with debouncing
    let debounceTimeout: NodeJS.Timeout | null = null;
    let hasHandledInitialSession = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:128',message:'auth state change event',data:{event,hasSession:!!session,hasHandledInitialSession},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      logger.debug('UserRole: Auth state changed', event, { hasSession: !!session });
      
      // Skip INITIAL_SESSION if we already handled it in initialRefresh
      if (event === 'INITIAL_SESSION' && hasHandledInitialSession) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:132',message:'skipping duplicate INITIAL_SESSION',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        logger.debug('UserRole: Skipping duplicate INITIAL_SESSION');
        return;
      }
      
      if (event === 'INITIAL_SESSION') {
        hasHandledInitialSession = true;
      }
      
      // Clear any pending refresh
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      
      // Debounce rapid auth state changes (especially INITIAL_SESSION)
      debounceTimeout = setTimeout(async () => {
        if (mounted) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:147',message:'debounced refresh triggered',data:{event},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          // For INITIAL_SESSION, wait a bit more for session to be fully ready
          if (event === 'INITIAL_SESSION') {
            await waitForSession(300);
          }
          await refresh();
        }
      }, event === 'INITIAL_SESSION' ? 200 : 100);
    });

    return () => {
      mounted = false;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-user-role.tsx:145',message:'context value changed',data:{role,loading,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, [role, loading, user]);
  // #endregion
  return (
    <UserRoleContext.Provider value={{ user, profile, role, loading, refresh }}>
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
