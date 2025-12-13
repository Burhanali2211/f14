/**
 * Utility functions for handling audio URLs from various sources
 * Supports YouTube, direct audio URLs, and other streaming sources
 */

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Checks if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return getYouTubeId(url) !== null;
}

/**
 * Checks if a URL is a direct audio file URL
 */
export function isDirectAudioUrl(url: string): boolean {
  if (!url) return false;
  
  const audioExtensions = ['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac', '.webm', '.opus'];
  const urlLower = url.toLowerCase();
  
  // Check if URL ends with audio extension
  if (audioExtensions.some(ext => urlLower.includes(ext))) {
    return true;
  }
  
  // Check if URL has audio MIME type in path
  const audioMimeTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm'];
  if (audioMimeTypes.some(mime => urlLower.includes(mime))) {
    return true;
  }
  
  return false;
}

/**
 * Checks if a URL is from the same origin (no CORS needed)
 */
export function isSameOrigin(url: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const urlObj = new URL(url);
    const currentOrigin = window.location.origin;
    return urlObj.origin === currentOrigin;
  } catch {
    return false;
  }
}

/**
 * Gets the Supabase project URL for edge functions
 */
function getSupabaseFunctionUrl(functionName: string): string {
  // Get from environment variable
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl) {
    // Remove trailing slash if present
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    return `${baseUrl}/functions/v1/${functionName}`;
  }
  
  return '';
}

/**
 * Gets the best audio URL for playback with proxy support
 * 
 * Strategy:
 * 1. YouTube URLs -> Use YouTube IFrame API (handled separately in player)
 * 2. Same-origin URLs -> Use directly (no proxy needed)
 * 3. External direct audio URLs -> Use proxy to avoid CORS
 * 4. Other URLs -> Try proxy first, fallback to direct
 */
export function getAudioUrl(url: string, useProxy: boolean = true): string {
  if (!url) return url;
  
  // YouTube URLs are handled by YouTube IFrame API in the player
  if (isYouTubeUrl(url)) {
    return url; // Return as-is, player will handle it
  }
  
  // Same-origin URLs don't need proxy
  if (isSameOrigin(url)) {
    return url;
  }
  
  // For external URLs, use proxy if enabled
  if (useProxy) {
    const proxyUrl = getSupabaseFunctionUrl('audio-proxy');
    if (proxyUrl) {
      return `${proxyUrl}?url=${encodeURIComponent(url)}`;
    }
  }
  
  // Fallback to direct URL (may have CORS issues)
  return url;
}

/**
 * Detects if an audio URL might have CORS issues
 */
export function mightHaveCorsIssues(url: string): boolean {
  if (!url) return false;
  
  // YouTube URLs are handled separately
  if (isYouTubeUrl(url)) return false;
  
  // Same-origin URLs don't have CORS issues
  if (isSameOrigin(url)) return false;
  
  // External URLs might have CORS issues
  return true;
}

/**
 * Gets audio source type for proper handling
 */
export type AudioSourceType = 'youtube' | 'direct' | 'stream' | 'unknown';

export function getAudioSourceType(url: string): AudioSourceType {
  if (!url) return 'unknown';
  
  if (isYouTubeUrl(url)) return 'youtube';
  if (isDirectAudioUrl(url)) return 'direct';
  
  // Check if it looks like a streaming URL
  if (url.includes('stream') || url.includes('live') || url.includes('m3u8')) {
    return 'stream';
  }
  
  return 'unknown';
}

