/**
 * Sanitize user input to prevent XSS attacks
 * Basic sanitization for text content
 */

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate URL to prevent javascript: and data: URLs
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  
  // Block javascript: and data: URLs
  if (trimmed.toLowerCase().startsWith('javascript:') || 
      trimmed.toLowerCase().startsWith('data:')) {
    return null;
  }

  // Allow http, https, and relative URLs
  if (trimmed.startsWith('http://') || 
      trimmed.startsWith('https://') || 
      trimmed.startsWith('/')) {
    return trimmed;
  }

  // For YouTube URLs, validate format
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    return trimmed;
  }

  return null;
}

/**
 * Sanitize text content by removing potentially dangerous characters
 * while preserving line breaks and basic formatting
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove null bytes and control characters (except newlines and tabs)
  return text
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validate and sanitize YouTube URL
 */
export function sanitizeYouTubeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  
  // YouTube URL patterns
  const patterns = [
    /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return trimmed;
    }
  }

  return null;
}

