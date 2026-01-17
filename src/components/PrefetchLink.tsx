import { Link, LinkProps } from 'react-router-dom';
import { useCallback, useRef, forwardRef } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { smartFetch, isOnline } from '@/lib/cache';

interface PrefetchLinkProps extends LinkProps {
  prefetchConfig?: {
    queryKey: QueryKey;
    table: string;
    queryFn: () => Promise<any>;
  };
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ prefetchConfig, onMouseEnter, onFocus, children, ...props }, ref) => {
    const queryClient = useQueryClient();
    const prefetchedRef = useRef(false);

    const handlePrefetch = useCallback(() => {
      if (!prefetchConfig || prefetchedRef.current || !isOnline()) return;
      
      prefetchedRef.current = true;
      const { queryKey, table, queryFn } = prefetchConfig;
      const cacheKey = Array.isArray(queryKey)
        ? `${table}:${queryKey.join(':')}`
        : `${table}:${queryKey}`;

      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => smartFetch(cacheKey, queryFn, table),
        staleTime: 5 * 60 * 1000,
      });
    }, [prefetchConfig, queryClient]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        handlePrefetch();
        onMouseEnter?.(e);
      },
      [handlePrefetch, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        handlePrefetch();
        onFocus?.(e);
      },
      [handlePrefetch, onFocus]
    );

    return (
      <Link
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

PrefetchLink.displayName = 'PrefetchLink';
