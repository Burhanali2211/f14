import { memo, useState, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: () => void;
  fallbackSrc?: string;
  // For responsive images
  sizes?: string;
  srcSet?: string;
}

/**
 * Optimized image component with lazy loading, error handling, and optional responsive images
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = '',
  style,
  loading = 'lazy',
  onError,
  onLoad,
  fallbackSrc,
  sizes,
  srcSet,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && fallbackSrc && imgSrc !== fallbackSrc) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    } else if (onError) {
      onError(e);
    }
  }, [hasError, fallbackSrc, imgSrc, onError]);

  const handleLoad = useCallback(() => {
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  // Update src if prop changes
  if (src !== imgSrc && !hasError) {
    setImgSrc(src);
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onError={handleError}
      onLoad={handleLoad}
      sizes={sizes}
      srcSet={srcSet}
      decoding="async"
      fetchPriority={loading === 'eager' ? 'high' : 'auto'}
    />
  );
});
