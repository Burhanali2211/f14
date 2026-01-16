/**
 * Query optimization utilities for Supabase
 * Helps reduce payload size and improve query performance
 */

/**
 * Common field selections for different entities
 * Use these instead of '*' to reduce payload size by 30-50%
 */
export const PIECE_FIELDS = {
  // Minimal fields for lists/cards
  card: 'id, title, image_url, reciter, language, view_count, video_url, created_at, category_id',
  // Full fields for detail pages
  full: 'id, title, text_content, image_url, video_url, reciter, language, view_count, created_at, updated_at, category_id, imam_id, tags',
  // Search results
  search: 'id, title, image_url, reciter, language, view_count, video_url, text_content',
} as const;

export const CATEGORY_FIELDS = {
  card: 'id, name, slug, description, icon, bg_image_url, bg_image_opacity, bg_image_blur, bg_image_position',
  full: 'id, name, slug, description, icon, bg_image_url, bg_image_opacity, bg_image_blur, bg_image_position, bg_image_size, bg_image_scale',
} as const;

export const IMAM_FIELDS = {
  card: 'id, name, slug, title, description, order_index',
  full: 'id, name, slug, title, description, order_index, image_url',
} as const;

/**
 * Batch multiple queries into a single request when possible
 */
export async function batchQueries<T>(
  queries: Array<() => Promise<{ data: T | null; error: any }>>
): Promise<Array<{ data: T | null; error: any }>> {
  return Promise.all(queries.map(q => q()));
}

/**
 * Debounce function for search queries
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll/resize handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
