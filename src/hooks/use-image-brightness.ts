import { useState, useEffect } from 'react';
import type { SiteSettings } from '@/lib/supabase-types';

/**
 * Hook to detect image brightness and determine text color class
 * Optimized for performance using a small canvas sample
 */
export function useImageBrightness(siteSettings: SiteSettings | null) {
  const [textColorClass, setTextColorClass] = useState<string>('text-foreground');

  useEffect(() => {
    const imageUrl = siteSettings?.hero_image_url;
    if (!imageUrl) {
      setTextColorClass('text-foreground');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Use a tiny canvas to get the average color quickly
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          // Perceptual brightness formula
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          setTextColorClass(brightness < 128 ? 'text-white' : 'text-foreground');
        }
      } catch (e) {
        setTextColorClass('text-foreground');
      }
    };
    img.onerror = () => setTextColorClass('text-foreground');
    img.src = imageUrl;
  }, [siteSettings?.hero_image_url]);

  return { textColorClass };
}


