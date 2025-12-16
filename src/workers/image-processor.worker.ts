/**
 * Web Worker for image processing
 * Handles heavy image operations off the main thread
 */

// Listen for messages from main thread
self.addEventListener('message', (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case 'PROCESS_IMAGE': {
      const { imageData, options } = data;
      processImage(imageData, options)
        .then((result) => {
          self.postMessage({ type: 'IMAGE_PROCESSED', result });
        })
        .catch((error) => {
          self.postMessage({ type: 'ERROR', error: error.message });
        });
      break;
    }

    case 'CALCULATE_BRIGHTNESS': {
      const { imageData } = data;
      const brightness = calculateBrightness(imageData);
      self.postMessage({ type: 'BRIGHTNESS_CALCULATED', brightness });
      break;
    }

    default:
      self.postMessage({ type: 'ERROR', error: 'Unknown message type' });
  }
});

/**
 * Process image (resize, compress, etc.)
 */
async function processImage(
  imageData: ImageData,
  options: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<ImageData> {
  const { maxWidth = 800, maxHeight = 800, quality = 0.8 } = options;
  
  const canvas = new OffscreenCanvas(maxWidth, maxHeight);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Calculate new dimensions maintaining aspect ratio
  let { width, height } = imageData;
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  canvas.width = width;
  canvas.height = height;

  // Draw resized image
  ctx.drawImage(
    imageData as any, // OffscreenCanvas accepts ImageBitmap
    0,
    0,
    width,
    height
  );

  return ctx.getImageData(0, 0, width, height);
}

/**
 * Calculate image brightness (for text color detection)
 */
function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let brightness = 0;
  const sampleRate = 4; // Sample every 4th pixel for performance

  for (let i = 0; i < data.length; i += sampleRate * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Use luminance formula
    brightness += (r * 299 + g * 587 + b * 114) / 1000;
  }

  return brightness / (data.length / (sampleRate * 4));
}
