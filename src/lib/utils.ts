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
