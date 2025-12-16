/**
 * Database integration utilities for SEO
 * Helps optimize database queries for SEO purposes
 */

import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from './db-utils';
import type { Piece, Category, Imam } from './supabase-types';

/**
 * Fetch piece with all SEO-related data in a single optimized query
 */
export async function fetchPieceForSEO(pieceId: string) {
  const { data, error } = await safeQuery(async () =>
    await supabase
      .from('pieces')
      .select(`
        id,
        title,
        text_content,
        image_url,
        video_url,
        reciter,
        language,
        view_count,
        created_at,
        updated_at,
        category_id,
        imam_id,
        tags,
        category:categories(id, name, slug, description),
        imam:imams(id, name, slug, title, description)
      `)
      .eq('id', pieceId)
      .maybeSingle()
  );

  if (error || !data) {
    return null;
  }

  return {
    piece: data as Piece,
    category: (data as any).category as Category | null,
    imam: (data as any).imam as Imam | null,
  };
}

/**
 * Fetch all pieces for sitemap (optimized query)
 */
export async function fetchAllPiecesForSitemap() {
  const { data, error } = await safeQuery(async () =>
    await supabase
      .from('pieces')
      .select('id, updated_at, created_at')
      .order('updated_at', { ascending: false })
  );

  return { data, error };
}

/**
 * Fetch all categories for sitemap (optimized query)
 */
export async function fetchAllCategoriesForSitemap() {
  const { data, error } = await safeQuery(async () =>
    await supabase
      .from('categories')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false })
  );

  return { data, error };
}

/**
 * Fetch all imams for sitemap (optimized query)
 */
export async function fetchAllImamsForSitemap() {
  const { data, error } = await safeQuery(async () =>
    await (supabase as any)
      .from('imams')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false })
  );

  return { data, error };
}

/**
 * Search pieces optimized for SEO (used in search functionality)
 */
export async function searchPiecesForSEO(query: string, limit = 20) {
  const escapedQuery = query.trim().replace(/[%_\\]/g, (match) => {
    if (match === '\\') return '\\\\';
    return '\\' + match;
  });
  
  const searchPattern = `%${escapedQuery}%`;
  
  const { data, error } = await safeQuery(async () =>
    await supabase
      .from('pieces')
      .select('id, title, image_url, reciter, language, view_count, video_url, text_content, category_id, created_at')
      .or(`title.ilike.${searchPattern},text_content.ilike.${searchPattern},reciter.ilike.${searchPattern}`)
      .limit(limit)
      .order('view_count', { ascending: false })
  );

  return { data, error };
}
