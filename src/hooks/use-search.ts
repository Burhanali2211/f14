import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { toast } from '@/hooks/use-toast';
import type { Piece } from '@/lib/supabase-types';

/**
 * Hook to handle search functionality with rate limiting
 */
export function useSearch() {
  const [searchResults, setSearchResults] = useState<Piece[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = async (query: string) => {
      setSearchQuery(query);
      
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setIsSearching(false);
        setSearchResults([]);
        return;
      }

      // Protection: Don't search for very short strings (1-2 chars)
      // This prevents "cooking" the DB with heavy ilike queries like %a%
      if (trimmedQuery.length < 2) {
        setIsSearching(false);
        setSearchResults([]);
        return;
      }

      // Check rate limit
      if (!checkRateLimit(RATE_LIMITS.search, (remaining, resetTime) => {
        toast({
          title: 'Too many searches',
          description: `Please wait ${Math.ceil(resetTime / 1000)} seconds before searching again.`,
          variant: 'destructive',
        });
      })) {
        return;
      }

      setIsSearching(true);
      
      try {
        // Escape special characters in query for Supabase ilike pattern
        const escapedQuery = trimmedQuery.replace(/[%_\\]/g, (match) => {
          if (match === '\\') return '\\\\';
          return '\\' + match;
        });
        
        const searchPattern = `%${escapedQuery}%`;
        
        // Build an optimized query
        // For short queries (2-3 chars), only search title and reciter (no text_content)
        // This significantly reduces DB load for broad searches
        const orFilter = trimmedQuery.length < 4
          ? `title.ilike.${searchPattern},reciter.ilike.${searchPattern}`
          : `title.ilike.${searchPattern},text_content.ilike.${searchPattern},reciter.ilike.${searchPattern}`;

        const { data, error } = await safeQuery(async () => {
          return await supabase
            .from('pieces')
            .select('id, title, image_url, reciter, language, view_count, video_url, text_content, category_id')
            .or(orFilter)
            .limit(20)
            .order('view_count', { ascending: false });
        });

        if (error) {
          logger.error('Search failed:', error);
          setSearchResults([]);
          return;
        }

        if (data) {
          setSearchResults(data as unknown as Piece[]);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        logger.error('Unexpected error in search:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

  return {
    searchResults,
    isSearching,
    searchQuery,
    handleSearch,
  };
}
