import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useEffect, useCallback, useRef, useMemo } from 'react';
import { smartFetch, getOptimalFetchConfig, invalidateTableCache, isOnline, onNetworkChange } from '@/lib/cache';
import { supabase } from '@/integrations/supabase/client';

interface UseSmartQueryOptions<T> {
  queryKey: QueryKey;
  table: string;
  queryFn: () => Promise<T>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  select?: (data: T) => T;
}

export function useSmartQuery<T>({
  queryKey,
  table,
  queryFn,
  enabled = true,
  onSuccess,
  onError,
  select,
}: UseSmartQueryOptions<T>) {
  const queryClient = useQueryClient();
  const networkConfig = getOptimalFetchConfig();
  
  // Create a stable cache key string for IndexedDB
  const cacheKey = useMemo(() => {
    return `${table}:${JSON.stringify(queryKey)}`;
  }, [table, queryKey]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      return smartFetch<T>(cacheKey, queryFn, table);
    },
    enabled: enabled && isOnline(),
    staleTime: networkConfig.staleTime,
    gcTime: networkConfig.cacheTime,
    refetchOnWindowFocus: networkConfig.refetchOnWindowFocus,
    refetchInterval: networkConfig.refetchInterval,
    retry: isOnline() ? 2 : 0,
  });

  // Handle side effects in a separate effect
  useEffect(() => {
    if (query.isSuccess && onSuccess) {
      onSuccess(query.data);
    }
    if (query.isError && onError) {
      onError(query.error as Error);
    }
  }, [query.isSuccess, query.isError, query.data, query.error, onSuccess, onError]);

  useEffect(() => {
    const unsubscribe = onNetworkChange((info) => {
      if (info.status === 'online' && query.isStale) {
        queryClient.invalidateQueries({ queryKey });
      }
    });
    return unsubscribe;
  }, [queryClient, queryKey, query.isStale]);

  const invalidate = useCallback(async () => {
    await invalidateTableCache(table);
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, table]);

  return {
    ...query,
    data: select && query.data ? select(query.data) : query.data,
    invalidate,
    isOffline: !isOnline(),
  };
}

export function useSupabaseQuery<T>(options: {
  queryKey: QueryKey;
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
  enabled?: boolean;
}) {
  const { table, select = '*', filters = {}, orderBy, limit, single = false, queryKey, enabled = true } = options;

  // Stable filters and orderBy to prevent unnecessary re-fetches
  const memoFilters = useMemo(() => JSON.stringify(filters), [filters]);
  const memoOrderBy = useMemo(() => JSON.stringify(orderBy), [orderBy]);

  const queryFn = useCallback(async () => {
    let query = supabase.from(table).select(select);

    const parsedFilters = JSON.parse(memoFilters);
    Object.entries(parsedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && value !== null && 'operator' in value) {
          const { operator, val } = value as { operator: string; val: any };
          switch (operator) {
            case 'eq': query = query.eq(key, val); break;
            case 'neq': query = query.neq(key, val); break;
            case 'gt': query = query.gt(key, val); break;
            case 'gte': query = query.gte(key, val); break;
            case 'lt': query = query.lt(key, val); break;
            case 'lte': query = query.lte(key, val); break;
            case 'like': query = query.like(key, val); break;
            case 'ilike': query = query.ilike(key, val); break;
            case 'in': query = query.in(key, val); break;
            case 'is': query = query.is(key, val); break;
          }
        } else {
          query = query.eq(key, value);
        }
      }
    });

    if (memoOrderBy) {
      const parsedOrderBy = JSON.parse(memoOrderBy);
      query = query.order(parsedOrderBy.column, { ascending: parsedOrderBy.ascending ?? true });
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (single) {
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as T;
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as T;
  }, [table, select, memoFilters, memoOrderBy, limit, single]);

  return useSmartQuery<T>({
    queryKey,
    table,
    queryFn,
    enabled,
  });
}

export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(
    async <T>(
      queryKey: QueryKey,
      table: string,
      queryFn: () => Promise<T>
    ) => {
      const cacheKey = `${table}:${JSON.stringify(queryKey)}`;

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => smartFetch<T>(cacheKey, queryFn, table),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return { prefetch };
}

export function useLinkPrefetch(queryKey: QueryKey, table: string, queryFn: () => Promise<any>) {
  const { prefetch } = usePrefetch();
  const prefetchedRef = useRef(false);

  const onMouseEnter = useCallback(() => {
    if (!prefetchedRef.current && isOnline()) {
      prefetchedRef.current = true;
      prefetch(queryKey, table, queryFn);
    }
  }, [prefetch, queryKey, table, queryFn]);

  const onFocus = useCallback(() => {
    if (!prefetchedRef.current && isOnline()) {
      prefetchedRef.current = true;
      prefetch(queryKey, table, queryFn);
    }
  }, [prefetch, queryKey, table, queryFn]);

  return { onMouseEnter, onFocus };
}
