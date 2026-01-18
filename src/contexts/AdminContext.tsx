import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery, authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { getCachedData, setCachedData, getCacheKey, invalidateCache } from '@/lib/data-cache';
import { getTableVersion } from '@/lib/cache-change-detector';
import type { Category, Piece, Imam, UserProfile, Artiste, AhlulBaitEvent } from '@/lib/supabase-types';

interface AdminContextType {
  // Data
  categories: Category[];
  pieces: Piece[];
  imams: Imam[];
  artistes: Artiste[];
  userProfiles: UserProfile[];
  events: AhlulBaitEvent[];
  
  // State
  loading: boolean;
  currentUser: any;
  currentRole: string | null;
  
  // Actions
  fetchData: () => Promise<void>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setPieces: React.Dispatch<React.SetStateAction<Piece[]>>;
  setImams: React.Dispatch<React.SetStateAction<Imam[]>>;
  setArtistes: React.Dispatch<React.SetStateAction<Artiste[]>>;
  setUserProfiles: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  setEvents: React.Dispatch<React.SetStateAction<AhlulBaitEvent[]>>;
  
  // Delete handler
  handleDelete: (type: 'category' | 'piece' | 'imam' | 'event' | 'artiste', id: string) => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider = ({ children }: AdminProviderProps) => {
  const navigate = useNavigate();
  const { role: currentRole, loading: roleLoading, user: currentUser } = useUserRole();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [artistes, setArtistes] = useState<Artiste[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<AhlulBaitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const redirectingRef = useRef(false);
  const dataFetchedRef = useRef(false);
  
  useEffect(() => {
    if (roleLoading || redirectingRef.current) return;

    if (!currentUser) {
      if (window.location.pathname.includes('/admin')) {
        redirectingRef.current = true;
        toast({
          title: 'Login required',
          description: 'Please log in as an admin to access the admin panel.',
          variant: 'destructive',
        });
        navigate('/auth?redirect=/admin');
      }
      return;
    }

    if (currentRole !== 'admin') {
      redirectingRef.current = true;
      toast({
        title: 'Access denied',
        description: 'Only admins can access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    if (!dataFetchedRef.current) {
      dataFetchedRef.current = true;
      fetchData();
    }
  }, [currentUser, currentRole, roleLoading]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check cache for admin data
      const cacheKey = getCacheKey('admin:data');
      const cached = getCachedData<{
        categories: Category[];
        pieces: Piece[];
        imams: Imam[];
        artistes: Artiste[];
        users: UserProfile[];
        events: AhlulBaitEvent[];
      }>(cacheKey);

      // Only check versions if cache exists and might be stale (older than 1 minute)
      // This avoids making API calls when cache is fresh
      if (cached && cached.timestamp && (Date.now() - cached.timestamp) < 60000) {
        // Cache is less than 1 minute old, use it without version check
        setCategories(cached.data.categories);
        setPieces(cached.data.pieces);
        setImams(cached.data.imams);
        setArtistes(cached.data.artistes);
        setUserProfiles(cached.data.users);
        setEvents(cached.data.events);
        setLoading(false);
        return;
      }

      // If cache exists but might be stale, check versions
      if (cached) {
        const [piecesVersion, categoriesVersion, imamsVersion, artistesVersion] = await Promise.all([
          getTableVersion('pieces'),
          getTableVersion('categories'),
          getTableVersion('imams'),
          getTableVersion('artistes'),
        ]);

        const latestVersion = [piecesVersion, categoriesVersion, imamsVersion, artistesVersion]
          .filter((v): v is string => v !== null)
          .sort()
          .reverse()[0];

        if (latestVersion && cached.version && latestVersion <= cached.version) {
          // Cache is still valid
          setCategories(cached.data.categories);
          setPieces(cached.data.pieces);
          setImams(cached.data.imams);
          setArtistes(cached.data.artistes);
          setUserProfiles(cached.data.users);
          setEvents(cached.data.events);
          setLoading(false);
          return;
        }
      }

      // Fetch from API
        const CATEGORIES_COLUMNS = 'id, name, slug, description, icon, created_at, bg_image_url, bg_image_position, bg_image_size, bg_image_opacity, bg_image_blur, bg_image_scale, custom_path, updated_at';
        const PIECES_COLUMNS = 'id, title, category_id, reciter, language, text_content, video_url, tags, image_url, view_count, created_at, updated_at, imam_id, user_id';
        const IMAMS_COLUMNS = 'id, name, slug, title, description, image_url, order_index, created_at, category_id, updated_at';
        const ARTISTES_COLUMNS = 'id, name, slug, image_url, created_at, updated_at';
        const EVENTS_COLUMNS = 'id, imam_id, event_type, event_date, event_name, description, is_annual, created_at, updated_at';
        const EVENTS_IMAM_COLUMNS = 'id, name, slug, image_url';

        const [catRes, pieceRes, imamRes, artistesRes, usersRes, eventsRes] = await Promise.all([
          safeQuery(async () => await supabase.from('categories').select(CATEGORIES_COLUMNS).order('name')),
          safeQuery(async () => await supabase.from('pieces').select(PIECES_COLUMNS).order('created_at', { ascending: false })),
          safeQuery(async () => {
            const { data, error } = await supabase.from('imams').select(IMAMS_COLUMNS);
            if (error) return { data: null, error };
            const sorted = (data || []).sort((a: Imam, b: Imam) => {
              const orderA = a.order_index || 1;
              const orderB = b.order_index || 1;
              if (orderA !== orderB) return orderA - orderB;
              return (a.name || '').localeCompare(b.name || '');
            });
            return { data: sorted, error: null };
          }),
          safeQuery(async () => await supabase.from('artistes').select(ARTISTES_COLUMNS).order('name')),
          safeQuery(async () => await supabase.from('users').select('id, email, full_name, phone_number, address, role, is_active, created_at, updated_at').order('created_at', { ascending: false })),
          safeQuery(async () => await supabase.from('ahlul_bait_events').select(`${EVENTS_COLUMNS}, imam:imams(${EVENTS_IMAM_COLUMNS})`).order('event_date', { ascending: true })),
        ]);

      if (catRes.data) setCategories(catRes.data as Category[]);
      if (pieceRes.data) setPieces(pieceRes.data as Piece[]);
      if (imamRes.data) setImams(imamRes.data as Imam[]);
      if (artistesRes.data) setArtistes(artistesRes.data as unknown as Artiste[]);
      if (usersRes.data) setUserProfiles(usersRes.data as UserProfile[]);
      if (eventsRes.data) setEvents(eventsRes.data as unknown as AhlulBaitEvent[]);

      // Cache the data
      if (catRes.data && pieceRes.data && imamRes.data && usersRes.data && eventsRes.data) {
        const [piecesVersion, categoriesVersion, imamsVersion, artistesVersion] = await Promise.all([
          getTableVersion('pieces'),
          getTableVersion('categories'),
          getTableVersion('imams'),
          getTableVersion('artistes'),
        ]);

        const latestVersion = [piecesVersion, categoriesVersion, imamsVersion, artistesVersion]
          .filter((v): v is string => v !== null)
          .sort()
          .reverse()[0] || null;

        setCachedData(
          cacheKey,
          {
            categories: catRes.data as Category[],
            pieces: pieceRes.data as Piece[],
            imams: imamRes.data as Imam[],
            artistes: artistesRes.data as unknown as Artiste[] || [],
            users: usersRes.data as UserProfile[],
            events: eventsRes.data as unknown as AhlulBaitEvent[],
          },
          latestVersion
        );
      }
    } catch (error) {
      logger.error('Unexpected error in fetchData:', error);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (type: 'category' | 'piece' | 'imam' | 'event' | 'artiste', id: string): Promise<boolean> => {
    const tableMap: Record<string, string> = {
      category: 'categories',
      piece: 'pieces',
      imam: 'imams',
      event: 'ahlul_bait_events',
      artiste: 'artistes',
    };
    const table = tableMap[type] || 'categories';
    
    try {
      const { data, error } = await authenticatedQuery(async () =>
        await supabase.from(table).delete().eq('id', id).select()
      );

      if (error) {
        logger.error(`Error deleting ${type}:`, error);
        toast({ 
          title: 'Error', 
          description: error.message || `Failed to delete ${type}`, 
          variant: 'destructive' 
        });
        return false;
      }

      if (data && data.length > 0) {
        toast({ title: 'Success', description: `${type} deleted successfully` });
        
        // Invalidate cache
        if (type === 'piece') {
          invalidateCache('pieces:*');
          invalidateCache('index:*');
        } else if (type === 'category') {
          invalidateCache('categories:*');
          invalidateCache('index:*');
        } else if (type === 'imam') {
          invalidateCache('imams:*');
          invalidateCache('index:*');
        } else if (type === 'artiste') {
          invalidateCache('artistes:*');
          invalidateCache('artists:*');
          invalidateCache('index:*');
        }
        invalidateCache('admin:data');
        
        await fetchData();
        return true;
      }
      
      toast({ 
        title: 'Warning', 
        description: 'Delete operation completed but could not verify.',
        variant: 'destructive'
      });
      await fetchData();
      return false;
    } catch (error: any) {
      logger.error(`Unexpected error deleting ${type}:`, error);
      toast({ 
        title: 'Error', 
        description: error?.message || `An unexpected error occurred`, 
        variant: 'destructive' 
      });
      return false;
    }
  }, [fetchData]);

  const value: AdminContextType = {
    categories,
    pieces,
    imams,
    artistes,
    userProfiles,
    events,
    loading,
    currentUser,
    currentRole,
    fetchData,
    setCategories,
    setPieces,
    setImams,
    setArtistes,
    setUserProfiles,
    setEvents,
    handleDelete,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

