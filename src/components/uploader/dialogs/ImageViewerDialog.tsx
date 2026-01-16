import { X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { ImageViewerDialogProps } from '../types';

export const ImageViewerDialog = ({ imageUrl, isOpen, onClose }: ImageViewerDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-full max-h-[90vh] h-[90vh] sm:h-auto p-0 overflow-hidden rounded-2xl">
        {imageUrl && (
          <div className="relative w-full h-full flex items-center justify-center bg-black/95 overflow-auto">
            <img 
              src={imageUrl} 
              alt="Full size preview"
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(90vh - 2rem)' }}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 text-white hover:bg-white/20 min-h-[44px] min-w-[44px] touch-manipulation z-10 rounded-xl" 
              onClick={onClose} 
              aria-label="Close image viewer"
            >
              <XIcon className="w-6 h-6" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

