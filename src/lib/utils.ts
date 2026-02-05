import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects if text is in a RTL language (Arabic, Urdu, Kashmiri)
 * Returns true if text contains RTL characters, false otherwise
 */
export function isRTLText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  
  // Check for Arabic script (includes Arabic, Urdu, Kashmiri, Persian, etc.)
  // Unicode ranges: Arabic (0600-06FF), Arabic Supplement (0750-077F), 
  // Arabic Extended-A (08A0-08FF), Arabic Presentation Forms-A (FB50-FDFF),
  // Arabic Presentation Forms-B (FE70-FEFF)
  const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  return rtlPattern.test(text);
}

/**
 * Gets text alignment class based on language
 * Returns 'text-right' for RTL languages, 'text-left' for LTR languages
 */
export function getTextAlignmentClass(text: string): string {
  return isRTLText(text) ? 'text-right' : 'text-left';
}

/**
 * Gets text direction attribute based on language
 * Returns 'rtl' for RTL languages, 'ltr' for LTR languages
 */
export function getTextDirection(text: string): 'rtl' | 'ltr' {
  return isRTLText(text) ? 'rtl' : 'ltr';
}

/**
 * Normalizes image_url to always return an array
 * Handles backward compatibility with single string values, comma-separated strings, and JSON arrays
 */
export function normalizeImageUrl(imageUrl: any): string[] {
  if (!imageUrl) return [];
  
  let urls: string[] = [];
  
  if (Array.isArray(imageUrl)) {
    urls = imageUrl;
  } else if (typeof imageUrl === 'string' && imageUrl.trim()) {
    const trimmed = imageUrl.trim();
    
    // Check if it's a JSON array string or Postgres array string
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || 
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        // If it looks like a JSON array, try parsing it
        if (trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            urls = parsed;
          } else {
            urls = [trimmed];
          }
        } else {
          // If it looks like a Postgres array string {url1,url2}, 
          // or a JSON object that was stringified incorrectly,
          // we treat it as a string to be split by comma below, 
          // but we remove the outer braces first.
          urls = [trimmed.substring(1, trimmed.length - 1)];
        }
      } catch {
        urls = [trimmed];
      }
    } else {
      urls = [trimmed];
    }
  }

  // Now process the urls array to split by commas and filter
  // We also aggressively clean up any quotes or extra characters from each URL
  return urls
    .flatMap(url => {
      if (typeof url !== 'string') return [];
      
      // Split by commas
      // Usually, bulk upload URLs are separated by commas
      return url.split(',').map(u => {
        let cleaned = u.trim();
        // Remove leading/trailing quotes (single or double) and brackets/braces that might remain
        cleaned = cleaned.replace(/^["'{]+|["'}]+\s*$/g, '');
        return cleaned;
      });
    })
    .filter(Boolean);
}

/**
 * Gets the first image URL from image_url (supports both string and array)
 * Useful for display components that only need one image
 */
export function getFirstImageUrl(imageUrl: string | null | string[] | undefined): string | null {
  const normalized = normalizeImageUrl(imageUrl);
  return normalized.length > 0 ? normalized[0] : null;
}

/** Supabase storage hosts - proxy these to avoid __cf_bm cookie rejection in cross-origin img loads */
const PROXY_IMAGE_HOSTS = ['supabase.co', 'supabase.in'];

function shouldProxyImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return PROXY_IMAGE_HOSTS.some((h) => parsed.hostname.endsWith(h));
  } catch {
    return false;
  }
}

/**
 * Returns a same-origin proxy URL for external images (e.g. Supabase Storage).
 * Fixes "Cookie __cf_bm has been rejected for invalid domain" when loading
 * images from Cloudflare-backed CDNs in cross-origin context.
 */
export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  if (!shouldProxyImageUrl(trimmed)) return trimmed;
  return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
}

/**
 * Gets a Karbala sacred place placeholder image
 * Returns a random placeholder from the available Karbala sacred places
 * Uses the piece ID to ensure consistent selection for the same piece
 */
export function getKarbalaPlaceholder(pieceId?: string): string {
  const placeholders = [
    '/karbala-placeholder-1.svg', // Main Shrine of Imam Hussain (AS)
    '/karbala-placeholder-2.svg', // Shrine of Hazrat Abbas (AS) - Alamdar
    '/karbala-placeholder-3.svg', // Sacred Courtyard
    '/karbala-placeholder-4.svg', // Shrine Complex
  ];
  
  // Use piece ID to get consistent placeholder for same piece, or random if no ID
  if (pieceId) {
    // Simple hash function to convert ID to index
    let hash = 0;
    for (let i = 0; i < pieceId.length; i++) {
      hash = ((hash << 5) - hash) + pieceId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    const index = Math.abs(hash) % placeholders.length;
    return placeholders[index];
  }
  
  // Random selection if no ID provided
  return placeholders[Math.floor(Math.random() * placeholders.length)];
}
