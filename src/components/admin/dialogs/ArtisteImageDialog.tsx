import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatFileSize } from '@/lib/image-optimizer';
import type { ArtisteImageDialogProps } from '../types';

export const ArtisteImageDialog = ({
  open,
  onOpenChange,
  selectedArtiste,
  imageFile,
  imagePreview,
  uploading,
  onImageSelect,
  onUpload,
  imageInputRef,
}: ArtisteImageDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Image for {selectedArtiste?.name}</DialogTitle>
          <DialogDescription>
            Upload an optimized image for this artist. Images are automatically resized to 200x200px and compressed for optimal website performance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="artiste-image">Image File</Label>
            <div className="mt-2">
              <input
                ref={imageInputRef}
                type="file"
                id="artiste-image"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={onImageSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                className="w-full gap-2"
              >
                <Upload className="w-4 h-4" />
                Select Image
              </Button>
              {imageFile && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {imageFile.name} ({formatFileSize(imageFile.size)})
                </p>
              )}
            </div>
          </div>

          {imagePreview && (
            <div className="relative">
              <Label>Preview</Label>
              <div className="mt-2 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 rounded-lg object-cover border-2 border-border"
                />
                {imageFile && (
                  <div className="absolute -bottom-2 left-0 right-0 text-center">
                    <span className="text-xs bg-background px-2 py-1 rounded border border-border">
                      Will be optimized to ~200x200px
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedArtiste?.image_url && !imageFile && (
            <div>
              <Label>Current Image</Label>
              <div className="mt-2">
                <img
                  src={selectedArtiste.image_url}
                  alt={selectedArtiste.name}
                  className="w-32 h-32 rounded-lg object-cover border-2 border-border"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onUpload}
            disabled={!imageFile || uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

