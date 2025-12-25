import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/use-favorites';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { getCachedData, setCachedData, getCacheKey } from '@/lib/data-cache';
import { getTableVersion } from '@/lib/cache-change-detector';
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
            .select('id, title, image_url, reciter, language, view_count, video_url, created_at, category_id, text_content')
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
            .select('id, title, image_url, reciter, language, view_count, video_url, created_at, category_id, text_content')
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
    try {
      // Check cache first for index data
      const indexCacheKey = getCacheKey('index');
      const cachedIndex = getCachedData<{
        categories: Category[];
        imams: Imam[];
        recentPieces: Piece[];
        popularPieces: Piece[];
        artists: Array<{ name: string; count: number; image_url: string | null }>;
        siteSettings: SiteSettings | null;
        stats: { categories: number; pieces: number };
      }>(indexCacheKey);

      // If we have cached data and it's not stale, use it
      if (cachedIndex) {
        // Check if cache is stale by comparing table versions
        const [categoriesVersion, piecesVersion, imamsVersion, siteSettingsVersion, artistesVersion] = await Promise.all([
          getTableVersion('categories'),
          getTableVersion('pieces'),
          getTableVersion('imams'),
          getTableVersion('site_settings'),
          getTableVersion('artistes'),
        ]);

        const latestVersion = [categoriesVersion, piecesVersion, imamsVersion, siteSettingsVersion, artistesVersion]
          .filter((v): v is string => v !== null)
          .sort()
          .reverse()[0];

        if (latestVersion && cachedIndex.version && latestVersion <= cachedIndex.version) {
          // Cache is still valid
          logger.debug('Using cached index data');
          setCategories(cachedIndex.data.categories);
          setImams(cachedIndex.data.imams);
          setRecentPieces(cachedIndex.data.recentPieces);
          setPopularPieces(cachedIndex.data.popularPieces);
          setArtists(cachedIndex.data.artists);
          setSiteSettings(cachedIndex.data.siteSettings);
          setStats(cachedIndex.data.stats);
          setLoading(false);
          return;
        }
      }

      // Cache miss or stale - fetch from API
      // Optimized: Select only needed fields instead of * to reduce payload size
      const [catRes, recentRes, popularRes, imamRes, artistesRes, piecesCountRes, siteSettingsRes] = await Promise.all([
        safeQuery(async () => await supabase.from('categories').select('id, name, slug, description, icon, bg_image_url, bg_image_opacity, bg_image_blur, bg_image_position, bg_image_size, bg_image_scale').order('name')),
        safeQuery(async () => await supabase.from('pieces').select('id, title, image_url, reciter, language, view_count, video_url, created_at, category_id').order('created_at', { ascending: false }).limit(6)),
        safeQuery(async () => await supabase.from('pieces').select('id, title, image_url, reciter, language, view_count, video_url, created_at, category_id').order('view_count', { ascending: false }).limit(4)),
        safeQuery(async () => await (supabase as any).from('imams').select('id, name, slug, title, description, order_index').order('order_index, name')),
        safeQuery(async () => await (supabase as any).from('artistes').select('name, image_url').order('name')),
        safeQuery(async () => await supabase.from('pieces').select('reciter').not('reciter', 'is', null)),
        safeQuery(async () => await (supabase as any).from('site_settings').select('id, site_name, site_tagline, logo_url, hero_image_url, hero_text_color_mode, hero_gradient_preset, hero_gradient_opacity, hero_image_opacity, hero_heading_line1, hero_heading_line2, hero_description, hero_badge_text, hero_arabic_font').eq('id', '00000000-0000-0000-0000-000000000000').maybeSingle()),
      ]);

      if (catRes.error) {
        logger.error('Error fetching categories:', catRes.error);
      } else if (catRes.data) {
        const categoriesData = catRes.data as Category[];
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

      // Process artists - fetch ALL artists from artistes table, then count their pieces
      let artistsArray: Array<{ name: string; count: number; image_url: string | null }> = [];
      if (artistesRes.error) {
        logger.error('Error fetching artistes:', artistesRes.error);
      } else if (artistesRes.data) {
        // Get all artists from artistes table
        const allArtistes = artistesRes.data as Array<{ name: string; image_url: string | null }>;
        
        // Count pieces per artist (from pieces table)
        const reciterCounts = new Map<string, number>();
        if (piecesCountRes.data) {
          piecesCountRes.data.forEach((piece: any) => {
            if (piece.reciter && piece.reciter.trim() !== '') {
              reciterCounts.set(piece.reciter, (reciterCounts.get(piece.reciter) || 0) + 1);
            }
          });
        }
        
        // Create artists array with ALL artists from artistes table
        // Include artists even if they have 0 pieces
        artistsArray = allArtistes
          .map((artiste) => ({
            name: artiste.name,
            count: reciterCounts.get(artiste.name) || 0,
            image_url: artiste.image_url,
          }))
          .sort((a, b) => {
            // Sort by count first (descending), then by name (ascending)
            if (b.count !== a.count) {
              return b.count - a.count;
            }
            return a.name.localeCompare(b.name);
          });
        
        setArtists(artistsArray);
      }

      if (siteSettingsRes.error) {
        logger.error('Error fetching site settings:', siteSettingsRes.error);
      } else if (siteSettingsRes.data) {
        setSiteSettings(siteSettingsRes.data as unknown as SiteSettings);
      }

      // Cache the complete index data
      const [categoriesVersion, piecesVersion, imamsVersion, siteSettingsVersion, artistesVersion] = await Promise.all([
        getTableVersion('categories'),
        getTableVersion('pieces'),
        getTableVersion('imams'),
        getTableVersion('site_settings'),
        getTableVersion('artistes'),
      ]);

      const latestVersion = [categoriesVersion, piecesVersion, imamsVersion, siteSettingsVersion, artistesVersion]
        .filter((v): v is string => v !== null)
        .sort()
        .reverse()[0];

      setCachedData(
        indexCacheKey,
        {
          categories: catRes.data as Category[] || [],
          imams: imamRes.data as unknown as Imam[] || [],
          recentPieces: recentRes.data as unknown as Piece[] || [],
          popularPieces: popularRes.data as unknown as Piece[] || [],
          artists: artistsArray,
          siteSettings: siteSettingsRes.data as unknown as SiteSettings || null,
          stats: {
            categories: (catRes.data as Category[] || []).length,
            pieces: (recentRes.data || []).length,
          },
        },
        latestVersion
      );
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
