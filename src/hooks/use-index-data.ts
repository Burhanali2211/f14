import { useFavorites } from '@/hooks/use-favorites';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { useUserRole } from '@/hooks/use-user-role';
import { useSupabaseQuery, useSmartQuery } from '@/hooks/use-smart-query';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { supabase } from '@/integrations/supabase/client';
import { useMemo, useCallback } from 'react';
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

export function useIndexData(): IndexData {
  const { role, loading: roleLoading } = useUserRole();
  const { favorites } = useFavorites();
  const { getRecentlyRead } = useReadingProgress();
  const { siteSettings } = useSiteSettings();

  const { data: categories = [] } = useSupabaseQuery<Category[]>({
    queryKey: ['categories', 'all'],
    table: 'categories',
    select: 'id, name, slug, description, icon, custom_path, bg_image_url, bg_image_opacity, bg_image_blur, bg_image_position, bg_image_size, bg_image_scale',
    orderBy: { column: 'name' },
    enabled: !roleLoading,
  });

  const { data: recentPieces = [] } = useSupabaseQuery<Piece[]>({
    queryKey: ['pieces', 'recent', 6],
    table: 'pieces',
    select: 'id, title, image_url, reciter, language, view_count, video_url, created_at, category_id',
    orderBy: { column: 'created_at', ascending: false },
    limit: 6,
    enabled: !roleLoading,
  });

  const { data: popularPieces = [] } = useSupabaseQuery<Piece[]>({
    queryKey: ['pieces', 'popular', 4],
    table: 'pieces',
    select: 'id, title, image_url, reciter, language, view_count, video_url, created_at, category_id',
    orderBy: { column: 'view_count', ascending: false },
    limit: 4,
    enabled: !roleLoading,
  });

  const { data: imams = [] } = useSupabaseQuery<Imam[]>({
    queryKey: ['imams', 'all'],
    table: 'imams',
    select: 'id, name, slug, title, description, order_index',
    orderBy: { column: 'order_index' },
    enabled: !roleLoading,
  });

  const artistsQueryFn = useCallback(async () => {
    const [artistesRes, piecesCountRes] = await Promise.all([
      supabase.from('artistes').select('name, image_url').order('name').limit(20),
      supabase.from('pieces').select('reciter').not('reciter', 'is', null).limit(500)
    ]);

    if (artistesRes.error) throw artistesRes.error;
    
    const allArtistes = artistesRes.data as Array<{ name: string; image_url: string | null }>;
    const reciterCounts = new Map<string, number>();
    
    if (piecesCountRes.data) {
      piecesCountRes.data.forEach((piece: { reciter: string | null }) => {
        if (piece.reciter && piece.reciter.trim() !== '') {
          reciterCounts.set(piece.reciter, (reciterCounts.get(piece.reciter) || 0) + 1);
        }
      });
    }

    return allArtistes
      .map((artiste) => ({
        name: artiste.name,
        count: reciterCounts.get(artiste.name) || 0,
        image_url: artiste.image_url,
      }))
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name)))
      .slice(0, 12);
  }, []);

  const { data: artistsData } = useSmartQuery({
    queryKey: ['artists', 'with-counts'],
    table: 'artistes',
    enabled: !roleLoading,
    queryFn: artistsQueryFn,
  });

  const recentlyReadIds = useMemo(() => getRecentlyRead(4).map(r => r.pieceId), [getRecentlyRead]);
  const { data: continueReadingPieces = [] } = useSupabaseQuery<Piece[]>({
    queryKey: ['pieces', 'continue-reading', recentlyReadIds],
    table: 'pieces',
    select: 'id, title, image_url, reciter, language, view_count, video_url, created_at, category_id, text_content',
    filters: { id: { operator: 'in', val: recentlyReadIds } },
    enabled: !roleLoading && recentlyReadIds.length > 0,
  });

  const favoritesSlice = useMemo(() => favorites.slice(0, 4), [favorites]);
  const { data: favoritePieces = [] } = useSupabaseQuery<Piece[]>({
    queryKey: ['pieces', 'favorites', favoritesSlice],
    table: 'pieces',
    select: 'id, title, image_url, reciter, language, view_count, video_url, created_at, category_id, text_content',
    filters: { id: { operator: 'in', val: favoritesSlice } },
    enabled: !roleLoading && favoritesSlice.length > 0,
  });

  const loading = roleLoading || (!categories.length && !recentPieces.length && !imams.length);

  return {
    categories,
    imams,
    recentPieces,
    popularPieces,
    continueReadingPieces,
    favoritePieces,
    artists: artistsData || [],
    siteSettings: siteSettings || null,
    stats: {
      categories: categories.length,
      pieces: recentPieces.length,
    },
    loading,
  };
}
