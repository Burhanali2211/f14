/**
 * Image optimization utility for all image types
 * Optimizes images to be small and performant for website use
 * Provides different optimization strategies for different use cases
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  maintainAspectRatio?: boolean;
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
 * Optimizes an image file for category background images
 * Returns a Promise that resolves to an optimized Blob
 * Category backgrounds are larger than artist thumbnails but still optimized for fast loading
 */
export async function optimizeCategoryBgImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<Blob> {
  const categoryDefaults: Required<OptimizeImageOptions> = {
    maxWidth: 800, // Larger size for category backgrounds
    maxHeight: 800,
    quality: 0.75, // Slightly lower quality for faster loading
    format: 'webp', // Best compression for web
  };
  const opts = { ...categoryDefaults, ...options };

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
 * Optimizes an image file for recitation pages (pieces)
 * Maintains high quality, clear and neat appearance with no blur
 * Used for images that are part of the recitation content
 */
export async function optimizeRecitationImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<Blob> {
  const recitationDefaults: Required<OptimizeImageOptions> = {
    maxWidth: 1920, // High resolution for clarity
    maxHeight: 1920,
    quality: 0.95, // Very high quality to prevent blur
    format: 'webp', // WebP for better compression while maintaining quality
    maintainAspectRatio: true,
  };
  const opts = { ...recitationDefaults, ...options };

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
        const ctx = canvas.getContext('2d', { 
          alpha: true,
          desynchronized: false,
          willReadFrequently: false
        });
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Use highest quality image rendering settings for clarity
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Use high-quality scaling algorithm
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with high quality settings
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
 * Optimizes an image file for announcement thumbnails
 * Balanced optimization for good performance while maintaining visual quality
 */
export async function optimizeAnnouncementThumbnail(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<Blob> {
  const announcementDefaults: Required<OptimizeImageOptions> = {
    maxWidth: 600, // Good size for thumbnails
    maxHeight: 600,
    quality: 0.8, // Good balance
    format: 'webp',
    maintainAspectRatio: true,
  };
  const opts = { ...announcementDefaults, ...options };

  return optimizeImageGeneric(file, opts);
}

/**
 * Optimizes an image file for logos and site settings
 * Optimized for performance while maintaining brand quality
 */
export async function optimizeLogoImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<Blob> {
  const logoDefaults: Required<OptimizeImageOptions> = {
    maxWidth: 400, // Logos don't need to be huge
    maxHeight: 400,
    quality: 0.85, // High quality for brand images
    format: 'webp',
    maintainAspectRatio: true,
  };
  const opts = { ...logoDefaults, ...options };

  return optimizeImageGeneric(file, opts);
}

/**
 * Optimizes an image file for hero/background images
 * Larger size for hero sections but still optimized for performance
 */
export async function optimizeHeroImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<Blob> {
  const heroDefaults: Required<OptimizeImageOptions> = {
    maxWidth: 1920, // Large for hero backgrounds
    maxHeight: 1080,
    quality: 0.85, // Good quality for backgrounds
    format: 'webp',
    maintainAspectRatio: true,
  };
  const opts = { ...heroDefaults, ...options };

  return optimizeImageGeneric(file, opts);
}

/**
 * Optimizes an image file for profile images
 * Small, optimized images for user profiles
 */
export async function optimizeProfileImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<Blob> {
  const profileDefaults: Required<OptimizeImageOptions> = {
    maxWidth: 300, // Profile images are typically small
    maxHeight: 300,
    quality: 0.8,
    format: 'webp',
    maintainAspectRatio: true,
  };
  const opts = { ...profileDefaults, ...options };

  return optimizeImageGeneric(file, opts);
}

/**
 * Generic image optimization function used by specific optimizers
 */
async function optimizeImageGeneric(
  file: File,
  opts: Required<OptimizeImageOptions>
): Promise<Blob> {
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
 * Gets file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
