import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/use-favorites';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { Category, Piece, Imam, SiteSettings } from '@/lib/supabase-types';

export interface IndexData {
  categories: Category[];
  imams: Imam[];
  recentPieces: Piece[];
  popularPieces: Piece[];
  continueReadingPieces: Piece[];
  favoritePieces: Piece[];
  artists: Array<{ name: string; count: number; image_url: string | null }>;
  siteSettings: SiteSettings | null;
  stats: { categories: number; pieces: number };
  loading: boolean;
}

/**
 * Hook to fetch all data needed for the index page
 */
export function useIndexData(): IndexData {
  const { role, loading: roleLoading } = useUserRole();
  const { favorites } = useFavorites();
  const { getRecentlyRead } = useReadingProgress();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [recentPieces, setRecentPieces] = useState<Piece[]>([]);
  const [popularPieces, setPopularPieces] = useState<Piece[]>([]);
  const [continueReadingPieces, setContinueReadingPieces] = useState<Piece[]>([]);
  const [favoritePieces, setFavoritePieces] = useState<Piece[]>([]);
  const [artists, setArtists] = useState<Array<{ name: string; count: number; image_url: string | null }>>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ categories: 0, pieces: 0 });

  // Fetch continue reading and favorite pieces when data is available
  useEffect(() => {
    const fetchContinueReading = async () => {
      const recentlyRead = getRecentlyRead(4);
      if (recentlyRead.length > 0) {
        const pieceIds = recentlyRead.map(r => r.pieceId);
        const { data, error } = await safeQuery(async () =>
          await supabase
            .from('pieces')
            .select('*')
            .in('id', pieceIds)
        );
        if (error) {
          logger.error('Error fetching continue reading:', error);
        } else if (data) {
          setContinueReadingPieces(data as unknown as Piece[]);
        }
      }
    };

    const fetchFavorites = async () => {
      if (favorites.length > 0) {
        const { data, error } = await safeQuery(async () =>
          await supabase
            .from('pieces')
            .select('*')
            .in('id', favorites.slice(0, 4))
        );
        if (error) {
          logger.error('Error fetching favorites:', error);
        } else if (data) {
          setFavoritePieces(data as unknown as Piece[]);
        }
      }
    };

    fetchContinueReading();
    fetchFavorites();
  }, [favorites, getRecentlyRead]);

  // Main data fetching
  useEffect(() => {
    // Wait for role loading to complete before fetching data
    // This prevents race conditions after page refresh
    if (!roleLoading) {
      fetchData();
    }
  }, [roleLoading]);

  const fetchData = async () => {
    logger.debug('Index: Starting fetchData');
    try {
      logger.debug('Index: Executing queries');
      const [catRes, recentRes, popularRes, imamRes, artistsRes, siteSettingsRes] = await Promise.all([
        safeQuery(async () => await supabase.from('categories').select('*').order('name')),
        safeQuery(async () => await supabase.from('pieces').select('*').order('created_at', { ascending: false }).limit(6)),
        safeQuery(async () => await supabase.from('pieces').select('*').order('view_count', { ascending: false }).limit(4)),
        safeQuery(async () => await (supabase as any).from('imams').select('*').order('order_index, name')),
        safeQuery(async () => await supabase.from('pieces').select('reciter').not('reciter', 'is', null)),
        safeQuery(async () => await (supabase as any).from('site_settings').select('*').eq('id', '00000000-0000-0000-0000-000000000000').maybeSingle()),
      ]);
      
      logger.debug('Index: Queries completed', {
        categories: { hasData: !!catRes.data, hasError: !!catRes.error, count: catRes.data?.length },
        recent: { hasData: !!recentRes.data, hasError: !!recentRes.error, count: recentRes.data?.length },
        popular: { hasData: !!popularRes.data, hasError: !!popularRes.error, count: popularRes.data?.length },
        imams: { hasData: !!imamRes.data, hasError: !!imamRes.error, count: imamRes.data?.length },
      });

      if (catRes.error) {
        logger.error('Error fetching categories:', catRes.error);
      } else if (catRes.data) {
        const categoriesData = catRes.data as Category[];
        // Debug: Log all categories and their image URLs
        const categoriesWithImages = categoriesData.filter(c => c.bg_image_url);
        if (categoriesWithImages.length > 0) {
          console.log('✅ Categories with images found:', categoriesWithImages.length);
          categoriesWithImages.forEach(c => {
            console.log(`  🖼️ ${c.name}:`, {
              url: c.bg_image_url,
              opacity: c.bg_image_opacity ?? 0.3,
              blur: c.bg_image_blur ?? 8,
              position: c.bg_image_position ?? 'center'
            });
          });
        } else {
          console.warn('⚠️ No categories have bg_image_url set');
        }
        setCategories(categoriesData);
        setStats(prev => ({ ...prev, categories: categoriesData.length }));
      }

      if (recentRes.error) {
        logger.error('Error fetching recent pieces:', recentRes.error);
      } else if (recentRes.data) {
        setRecentPieces(recentRes.data as unknown as Piece[]);
        setStats(prev => ({ ...prev, pieces: recentRes.data!.length }));
      }

      if (popularRes.error) {
        logger.error('Error fetching popular pieces:', popularRes.error);
      } else if (popularRes.data) {
        setPopularPieces(popularRes.data as unknown as Piece[]);
      }

      if (imamRes.error) {
        logger.error('Error fetching imams:', imamRes.error);
      } else if (imamRes.data) {
        setImams(imamRes.data as unknown as Imam[]);
      }

      // Process artists/reciters - get all unique reciters from pieces (source of truth)
      // Database triggers automatically sync to artistes table
      if (artistsRes.error) {
        logger.error('Error fetching artists:', artistsRes.error);
      } else if (artistsRes.data) {
        // Count pieces per reciter (from pieces table - this is the source of truth)
        const reciterCounts = new Map<string, number>();
        artistsRes.data.forEach((piece: any) => {
          if (piece.reciter && piece.reciter.trim() !== '') {
            reciterCounts.set(piece.reciter, (reciterCounts.get(piece.reciter) || 0) + 1);
          }
        });
        
        // Get all unique reciter names
        const uniqueReciters = Array.from(reciterCounts.keys());
        
        // Fetch artistes with images (triggers ensure they exist)
        const artistesRes = await safeQuery(async () => 
          await (supabase as any).from('artistes').select('name, image_url').in('name', uniqueReciters)
        );
        
        // Get artiste data for images
        const artistesMap = new Map<string, { image_url: string | null }>();
        if (artistesRes.data) {
          (artistesRes.data as any[]).forEach((artiste: any) => {
            artistesMap.set(artiste.name, { image_url: artiste.image_url });
          });
        }
        
        // Convert to array and sort by count (descending)
        // Show all artists who have recitations
        const artistsArray = Array.from(reciterCounts.entries())
          .map(([name, count]) => ({ 
            name, 
            count,
            image_url: artistesMap.get(name)?.image_url || null
          }))
          .sort((a, b) => b.count - a.count);
        
        setArtists(artistsArray);
      }

      if (siteSettingsRes.error) {
        logger.error('Error fetching site settings:', siteSettingsRes.error);
      } else if (siteSettingsRes.data) {
        setSiteSettings(siteSettingsRes.data as unknown as SiteSettings);
      }
    } catch (error) {
      logger.error('Unexpected error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    categories,
    imams,
    recentPieces,
    popularPieces,
    continueReadingPieces,
    favoritePieces,
    artists,
    siteSettings,
    stats,
    loading,
  };
}
