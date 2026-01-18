import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { getCachedData, setCachedData, getCacheKey, invalidateCache } from '@/lib/data-cache';
import { logger } from '@/lib/logger';
import { deduplicateRequest } from '@/lib/request-utils';
import type { Piece, Category, Imam } from '@/lib/supabase-types';

const PIECES_LIST_COLUMNS = 'id, title, category_id, reciter, language, image_url, view_count, created_at, imam_id, user_id';
const PIECES_FULL_COLUMNS = 'id, title, category_id, reciter, language, text_content, video_url, tags, image_url, view_count, created_at, updated_at, imam_id, user_id';

export interface UsePiecesOptions {
  userId?: string;
  categoryId?: string;
  imamId?: string;
  language?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'view_count' | 'title';
  orderDirection?: 'asc' | 'desc';
  includeRelations?: boolean;
  fullColumns?: boolean;
}

export interface UsePiecesReturn {
  pieces: Piece[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

export function usePieces(options: UsePiecesOptions = {}): UsePiecesReturn {
  const {
    userId,
    categoryId,
    imamId,
    language,
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'desc',
    includeRelations = false,
    fullColumns = false,
  } = options;

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const cacheKey = useMemo(() => {
    return getCacheKey('pieces', {
      userId,
      categoryId,
      imamId,
      language,
      limit,
      offset,
      orderBy,
      orderDirection,
      includeRelations,
      fullColumns,
    });
  }, [userId, categoryId, imamId, language, limit, offset, orderBy, orderDirection, includeRelations, fullColumns]);

  const fetchPieces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cached = getCachedData<{ pieces: Piece[]; total: number }>(cacheKey);
      if (cached) {
        setPieces(cached.data.pieces);
        setTotal(cached.data.total);
        setLoading(false);
        return;
      }

      const result = await deduplicateRequest(cacheKey, async () => {
        const columns = fullColumns ? PIECES_FULL_COLUMNS : PIECES_LIST_COLUMNS;
        let query = supabase
          .from('pieces')
          .select(includeRelations ? `${columns}, category:categories(id, name, slug), imam:imams(id, name, slug, image_url)` : columns, { count: 'exact' });

        if (userId) query = query.eq('user_id', userId);
        if (categoryId) query = query.eq('category_id', categoryId);
        if (imamId) query = query.eq('imam_id', imamId);
        if (language) query = query.eq('language', language);

        query = query.order(orderBy, { ascending: orderDirection === 'asc' });
        query = query.range(offset, offset + limit - 1);

        const { data, error: queryError, count } = await safeQuery(async () => query);

        if (queryError) throw queryError;

        return {
          pieces: (data || []) as Piece[],
          total: count || 0
        };
      });

      setPieces(result.pieces);
      setTotal(result.total);
      setCachedData(cacheKey, result);
    } catch (err: any) {
      logger.error('Error fetching pieces:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, userId, categoryId, imamId, language, limit, offset, orderBy, orderDirection, includeRelations, fullColumns]);

  const invalidatePiecesCache = useCallback(() => {
    invalidateCache('pieces:*');
    invalidateCache('index:*');
  }, []);

  useEffect(() => {
    fetchPieces();
  }, [fetchPieces]);

  return {
    pieces,
    loading,
    error,
    total,
    refetch: fetchPieces,
    invalidate: invalidatePiecesCache,
  };
}

export function usePiece(id: string | undefined) {
  const [piece, setPiece] = useState<Piece | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPiece = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cacheKey = getCacheKey('piece', { id });
      const cached = getCachedData<Piece>(cacheKey);
      if (cached) {
        setPiece(cached.data);
        setLoading(false);
        return;
      }

      const data = await deduplicateRequest(cacheKey, async () => {
        const { data, error: queryError } = await safeQuery(async () =>
          supabase
            .from('pieces')
            .select(`${PIECES_FULL_COLUMNS}, category:categories(id, name, slug, icon), imam:imams(id, name, slug, image_url, title)`)
            .eq('id', id)
            .single()
        );

        if (queryError) throw queryError;
        return data as Piece;
      });

      setPiece(data);
      setCachedData(cacheKey, data);
    } catch (err: any) {
      logger.error('Error fetching piece:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPiece();
  }, [fetchPiece]);

  return { piece, loading, error, refetch: fetchPiece };
}
