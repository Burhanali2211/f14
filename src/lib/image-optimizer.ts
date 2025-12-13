/**
 * Image optimization utility for artist images
 * Optimizes images to be small and performant for website use
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

const DEFAULT_OPTIONS: Required<OptimizeImageOptions> = {
  maxWidth: 200, // Small size for artist thumbnails
  maxHeight: 200,
  quality: 0.8, // Good balance between quality and file size
  format: 'webp', // Best compression for web
};

/**
 * Optimizes an image file for artist thumbnails
 * Returns a Promise that resolves to an optimized Blob
 */
export async function optimizeArtistImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        const maxWidth = opts.maxWidth;
        const maxHeight = opts.maxHeight;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with specified format and quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create optimized image'));
            }
          },
          `image/${opts.format}`,
          opts.quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Validates if a file is a valid image
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB max before optimization
  
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPEG, PNG, or WebP)',
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image file is too large. Please use an image smaller than 5MB.',
    };
  }
  
  return { valid: true };
}

/**
 * Gets file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
