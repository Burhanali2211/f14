import { useState, useRef, useEffect, memo } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackSrc?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  loading?: 'lazy' | 'eager';
  // For responsive images
  sizes?: string;
  srcSet?: string;
}

/**
 * Advanced lazy loading image component using Intersection Observer
 * Only loads images when they're about to enter the viewport
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className = '',
  style,
  fallbackSrc,
  placeholder,
  onLoad,
  onError,
  loading = 'lazy',
  sizes,
  srcSet,
}: LazyImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(placeholder || '');
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [containerRef, isIntersecting] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.01,
    rootMargin: '100px', // Start loading 100px before entering viewport
    triggerOnce: true,
  });

  // Load image when it enters viewport
  useEffect(() => {
    if (isIntersecting && !isLoaded && src) {
      const img = new Image();
      img.onload = () => {
        setImgSrc(src);
        setIsLoaded(true);
        if (onLoad) onLoad();
      };
      img.onerror = (e) => {
        if (fallbackSrc && !hasError) {
          setHasError(true);
          setImgSrc(fallbackSrc);
        } else if (onError) {
          onError(e as any);
        }
      };
      img.src = src;
    }
  }, [isIntersecting, src, fallbackSrc, hasError, isLoaded, onLoad, onError]);

  // For eager loading, load immediately
  useEffect(() => {
    if (loading === 'eager' && src && !isLoaded) {
      setImgSrc(src);
      setIsLoaded(true);
    }
  }, [loading, src, isLoaded]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && fallbackSrc && imgSrc !== fallbackSrc) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    } else if (onError) {
      onError(e);
    }
  };

  return (
    <div ref={containerRef} className={className} style={style}>
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt}
          className={className}
          style={{
            ...style,
            opacity: isLoaded ? 1 : 0.3,
            transition: 'opacity 0.3s ease-in-out',
          }}
          loading={loading}
          onError={handleError}
          sizes={sizes}
          srcSet={srcSet}
          decoding="async"
          fetchPriority={loading === 'eager' ? 'high' : 'auto'}
        />
      )}
      {!imgSrc && placeholder && (
        <div
          className={className}
          style={{
            ...style,
            backgroundColor: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});
