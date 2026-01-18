import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { getCachedData, setCachedData, getCacheKey, invalidateCache } from '@/lib/data-cache';
import { logger } from '@/lib/logger';
import type { Imam } from '@/lib/supabase-types';

const IMAMS_LIST_COLUMNS = 'id, name, slug, title, image_url, order_index, category_id';
const IMAMS_FULL_COLUMNS = 'id, name, slug, title, description, image_url, order_index, created_at, category_id, updated_at';

export interface UseImamsOptions {
  categoryId?: string;
  fullColumns?: boolean;
}

export interface UseImamsReturn {
  imams: Imam[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
  getImamById: (id: string) => Imam | undefined;
  getImamBySlug: (slug: string) => Imam | undefined;
}

export function useImams(options: UseImamsOptions = {}): UseImamsReturn {
  const { categoryId, fullColumns = false } = options;
  const [imams, setImams] = useState<Imam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = getCacheKey('imams', { categoryId, fullColumns });

  const fetchImams = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cached = getCachedData<Imam[]>(cacheKey);
      if (cached) {
        setImams(cached.data);
        setLoading(false);
        return;
      }

      const columns = fullColumns ? IMAMS_FULL_COLUMNS : IMAMS_LIST_COLUMNS;
      let query = supabase.from('imams').select(columns);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      query = query.order('order_index').order('name');

      const { data, error: queryError } = await safeQuery(async () => query);

      if (queryError) {
        logger.error('Error fetching imams:', queryError);
        setError(queryError.message || 'Failed to fetch imams');
        return;
      }

      const fetchedImams = (data || []) as Imam[];
      setImams(fetchedImams);
      setCachedData(cacheKey, fetchedImams);
    } catch (err) {
      logger.error('Unexpected error fetching imams:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, categoryId, fullColumns]);

  const invalidateImamsCache = useCallback(() => {
    invalidateCache('imams:*');
    invalidateCache('index:*');
  }, []);

  const getImamById = useCallback(
    (id: string) => imams.find((i) => i.id === id),
    [imams]
  );

  const getImamBySlug = useCallback(
    (slug: string) => imams.find((i) => i.slug === slug),
    [imams]
  );

  useEffect(() => {
    fetchImams();
  }, [fetchImams]);

  return {
    imams,
    loading,
    error,
    refetch: fetchImams,
    invalidate: invalidateImamsCache,
    getImamById,
    getImamBySlug,
  };
}

export function useImam(idOrSlug: string | undefined) {
  const [imam, setImam] = useState<Imam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImam = useCallback(async () => {
    if (!idOrSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey('imam', { idOrSlug });
      const cached = getCachedData<Imam>(cacheKey);
      if (cached) {
        setImam(cached.data);
        setLoading(false);
        return;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const column = isUuid ? 'id' : 'slug';

      const { data, error: queryError } = await safeQuery(async () =>
        supabase
          .from('imams')
          .select(`${IMAMS_FULL_COLUMNS}, category:categories(id, name, slug)`)
          .eq(column, idOrSlug)
          .single()
      );

      if (queryError) {
        logger.error('Error fetching imam:', queryError);
        setError(queryError.message || 'Failed to fetch imam');
        return;
      }

      setImam(data as Imam);
      setCachedData(cacheKey, data);
    } catch (err) {
      logger.error('Unexpected error fetching imam:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    fetchImam();
  }, [fetchImam]);

  return { imam, loading, error, refetch: fetchImam };
}
