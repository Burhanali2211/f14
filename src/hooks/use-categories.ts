import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { getCachedData, setCachedData, getCacheKey, invalidateCache } from '@/lib/data-cache';
import { logger } from '@/lib/logger';
import { deduplicateRequest } from '@/lib/request-utils';
import type { Category } from '@/lib/supabase-types';

const CATEGORIES_LIST_COLUMNS = 'id, name, slug, description, icon, custom_path';
const CATEGORIES_FULL_COLUMNS = 'id, name, slug, description, icon, created_at, bg_image_url, bg_image_position, bg_image_size, bg_image_opacity, bg_image_blur, bg_image_scale, custom_path, updated_at';

export interface UseCategoriesOptions {
  fullColumns?: boolean;
}

export interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
}

export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesReturn {
  const { fullColumns = false } = options;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = getCacheKey('categories', { fullColumns });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cached = getCachedData<Category[]>(cacheKey);
      if (cached) {
        setCategories(cached.data);
        setLoading(false);
        return;
      }

      const data = await deduplicateRequest(cacheKey, async () => {
        const columns = fullColumns ? CATEGORIES_FULL_COLUMNS : CATEGORIES_LIST_COLUMNS;
        const { data, error: queryError } = await safeQuery(async () =>
          supabase.from('categories').select(columns).order('name')
        );

        if (queryError) throw queryError;
        return data as Category[];
      });

      setCategories(data || []);
      setCachedData(cacheKey, data || []);
    } catch (err: any) {
      logger.error('Error fetching categories:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fullColumns]);

  const invalidateCategoriesCache = useCallback(() => {
    invalidateCache('categories:*');
    invalidateCache('index:*');
  }, []);

  const getCategoryById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  );

  const getCategoryBySlug = useCallback(
    (slug: string) => categories.find((c) => c.slug === slug),
    [categories]
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    invalidate: invalidateCategoriesCache,
    getCategoryById,
    getCategoryBySlug,
  };
}

export function useCategory(idOrSlug: string | undefined) {
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategory = useCallback(async () => {
    if (!idOrSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey('category', { idOrSlug });
      const cached = getCachedData<Category>(cacheKey);
      if (cached) {
        setCategory(cached.data);
        setLoading(false);
        return;
      }

      const data = await deduplicateRequest(cacheKey, async () => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        const column = isUuid ? 'id' : 'slug';

        const { data, error: queryError } = await safeQuery(async () =>
          supabase
            .from('categories')
            .select(CATEGORIES_FULL_COLUMNS)
            .eq(column, idOrSlug)
            .single()
        );

        if (queryError) throw queryError;
        return data as Category;
      });

      setCategory(data);
      setCachedData(cacheKey, data);
    } catch (err: any) {
      logger.error('Error fetching category:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  return { category, loading, error, refetch: fetchCategory };
}
