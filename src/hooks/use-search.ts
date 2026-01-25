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
    
    if (!query.trim()) {
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
      // Replace % and _ with escaped versions, and escape backslashes
      const escapedQuery = query.trim().replace(/[%_\\]/g, (match) => {
        if (match === '\\') return '\\\\';
        return '\\' + match;
      });
      
      // Build the search pattern with wildcards for ilike
      const searchPattern = `%${escapedQuery}%`;
      
      // Use proper Supabase .or() syntax: column.operator.value,column.operator.value
      // The format is: column1.operator.value,column2.operator.value
      // Optimized: Select only needed fields for search results
      const { data, error } = await safeQuery(async () => {
        return await supabase
          .from('pieces')
          .select('id, title, image_url, reciter, language, view_count, video_url, text_content, category_id')
          .or(`title.ilike.${searchPattern},text_content.ilike.${searchPattern},reciter.ilike.${searchPattern}`)
          .limit(20)
          .order('view_count', { ascending: false });
      });

      if (error) {
        // If .or() fails, try alternative approach with separate queries
        logger.warn('Primary search failed, trying alternative method:', error);
        
        // Optimized: Select only needed fields for search results
        const [titleRes, contentRes, reciterRes] = await Promise.all([
          safeQuery(async () => 
            await supabase
              .from('pieces')
              .select('id, title, image_url, reciter, language, view_count, video_url, text_content, category_id')
              .ilike('title', searchPattern)
              .limit(20)
          ),
          safeQuery(async () => 
            await supabase
              .from('pieces')
              .select('id, title, image_url, reciter, language, view_count, video_url, text_content, category_id')
              .ilike('text_content', searchPattern)
              .limit(20)
          ),
          safeQuery(async () => 
            await supabase
              .from('pieces')
              .select('id, title, image_url, reciter, language, view_count, video_url, text_content, category_id')
              .ilike('reciter', searchPattern)
              .limit(20)
          ),
        ]);

        // Combine results and remove duplicates
        const allResults = [
          ...(titleRes.data || []),
          ...(contentRes.data || []),
          ...(reciterRes.data || []),
        ];
        
        const uniqueResults = Array.from(
          new Map(allResults.map(piece => [piece.id, piece])).values()
        ).slice(0, 20);
        
        setSearchResults(uniqueResults as unknown as Piece[]);
        setIsSearching(false);
        return;
      }

      if (data) {
        setSearchResults(data as unknown as Piece[]);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      logger.error('Unexpected error in search:', err);
      toast({
        title: 'Search Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
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
