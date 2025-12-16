/**
 * Performance utility functions
 */

/**
 * Request Animation Frame wrapper for smooth animations
 */
export function raf(callback: () => void): number {
  return requestAnimationFrame(callback);
}

/**
 * Cancel Animation Frame wrapper
 */
export function cancelRaf(id: number): void {
  cancelAnimationFrame(id);
}

/**
 * Throttle function optimized for scroll/resize events
 * Uses requestAnimationFrame for smooth performance
 */
export function throttleRaf<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args;

    if (rafId === null) {
      rafId = raf(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        rafId = null;
        lastArgs = null;
      });
    }
  };
}

/**
 * Debounce with immediate option
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Batch DOM reads/writes to prevent layout thrashing
 */
export class BatchDOM {
  private readQueue: Array<() => void> = [];
  private writeQueue: Array<() => void> = [];
  private scheduled = false;

  read(callback: () => void): void {
    this.readQueue.push(callback);
    this.schedule();
  }

  write(callback: () => void): void {
    this.writeQueue.push(callback);
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;

    raf(() => {
      // Execute all reads first
      this.readQueue.forEach(cb => cb());
      this.readQueue = [];

      // Then execute all writes
      this.writeQueue.forEach(cb => cb());
      this.writeQueue = [];

      this.scheduled = false;
    });
  }
}

export const batchDOM = new BatchDOM();

/**
 * Lazy load images with Intersection Observer
 */
export function createImageLoader(
  src: string,
  onLoad?: (img: HTMLImageElement) => void,
  onError?: (error: Error) => void
): HTMLImageElement {
  const img = new Image();
  
  img.onload = () => {
    if (onLoad) onLoad(img);
  };
  
  img.onerror = () => {
    if (onError) onError(new Error(`Failed to load image: ${src}`));
  };
  
  img.src = src;
  return img;
}

/**
 * Preload critical images
 */
export function preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    urls.map(
      url =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = createImageLoader(url, resolve, reject);
        })
    )
  );
}

/**
 * Measure performance of a function
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${name}-start`);
    const result = fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return result;
  }
  return fn();
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
