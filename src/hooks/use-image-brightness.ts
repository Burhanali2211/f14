import { useState, useEffect } from 'react';
import type { SiteSettings } from '@/lib/supabase-types';

/**
 * Hook to detect image brightness and determine text color class
 */
export function useImageBrightness(siteSettings: SiteSettings | null) {
  const [imageIsDark, setImageIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    if (siteSettings?.hero_image_url && siteSettings.hero_text_color_mode === 'auto') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let brightness = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              brightness += (r * 299 + g * 587 + b * 114) / 1000;
            }
            brightness = brightness / (data.length / 4);
            setImageIsDark(brightness < 128);
          }
        } catch (e) {
          setImageIsDark(false);
        }
      };
      img.onerror = () => setImageIsDark(false);
      img.src = siteSettings.hero_image_url;
    } else {
      setImageIsDark(null);
    }
  }, [siteSettings?.hero_image_url, siteSettings?.hero_text_color_mode]);

  const getTextColorClass = () => {
    if (siteSettings?.hero_text_color_mode === 'auto') {
      return imageIsDark ? 'text-white' : 'text-foreground';
    }
    return siteSettings?.hero_text_color_mode === 'light' ? 'text-white' : 'text-foreground';
  };

  return { imageIsDark, getTextColorClass };
}
