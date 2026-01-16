import { useRef, useCallback } from 'react';

/**
 * Hook to use Web Worker for image processing
 */
export function useImageWorker() {
  const workerRef = useRef<Worker | null>(null);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      // Create worker from blob URL for better compatibility
      const workerCode = `
        self.addEventListener('message', (event) => {
          const { type, data } = event.data;
          
          if (type === 'CALCULATE_BRIGHTNESS') {
            const { imageData } = data;
            const dataArray = imageData.data;
            let brightness = 0;
            const sampleRate = 16; // Sample every 16th pixel
            
            for (let i = 0; i < dataArray.length; i += sampleRate * 4) {
              const r = dataArray[i];
              const g = dataArray[i + 1];
              const b = dataArray[i + 2];
              brightness += (r * 299 + g * 587 + b * 114) / 1000;
            }
            
            const avgBrightness = brightness / (dataArray.length / (sampleRate * 4));
            self.postMessage({ type: 'BRIGHTNESS_CALCULATED', brightness: avgBrightness });
          }
        });
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      workerRef.current = new Worker(URL.createObjectURL(blob));
    }
    
    return workerRef.current;
  }, []);

  const calculateBrightness = useCallback(
    (imageData: ImageData): Promise<number> => {
      return new Promise((resolve, reject) => {
        const worker = getWorker();
        
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'BRIGHTNESS_CALCULATED') {
            worker.removeEventListener('message', handleMessage);
            resolve(event.data.brightness);
          } else if (event.data.type === 'ERROR') {
            worker.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error));
          }
        };
        
        worker.addEventListener('message', handleMessage);
        worker.postMessage({
          type: 'CALCULATE_BRIGHTNESS',
          data: { imageData },
        });
      });
    },
    [getWorker]
  );

  return { calculateBrightness };
}
