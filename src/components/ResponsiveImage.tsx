import { memo } from 'react';
import { LazyImage } from './LazyImage';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  fallbackSrc?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Responsive image component with srcset support
 * Automatically generates srcset for different screen sizes
 */
export const ResponsiveImage = memo(function ResponsiveImage({
  src,
  alt,
  className = '',
  style,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  fallbackSrc,
  loading = 'lazy',
  onLoad,
  onError,
}: ResponsiveImageProps) {
  // Generate srcset for responsive images
  // Note: This assumes your image hosting supports URL parameters for resizing
  // Adjust based on your image CDN (e.g., Supabase Storage, Cloudinary, etc.)
  const generateSrcSet = (baseSrc: string): string => {
    // If using Supabase Storage or similar, you can add resize parameters
    // For now, return the original src (you can enhance this based on your image service)
    if (baseSrc.includes('supabase.co') || baseSrc.includes('storage')) {
      const widths = [400, 800, 1200, 1600];
      return widths
        .map(width => `${baseSrc}?width=${width} ${width}w`)
        .join(', ');
    }
    
    // For other image sources, return single src
    return baseSrc;
  };

  const srcSet = generateSrcSet(src);

  return (
    <LazyImage
      src={src}
      alt={alt}
      className={className}
      style={style}
      srcSet={srcSet !== src ? srcSet : undefined}
      sizes={sizes}
      fallbackSrc={fallbackSrc}
      loading={loading}
      onLoad={onLoad}
      onError={onError}
    />
  );
});
