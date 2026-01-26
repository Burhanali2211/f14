import { memo, useState, useRef } from 'react';
import { Trash2, Upload, Mic, Image, Loader2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { optimizeArtistImage, validateImageFile, formatFileSize } from '@/lib/image-optimizer';
import type { Artiste } from '@/lib/supabase-types';

export const AdminArtistesSection = memo(() => {
  const { artistes, handleDelete, fetchData } = useAdmin();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedArtiste, setSelectedArtiste] = useState<Artiste | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const openImageDialog = (artiste: Artiste) => {
    setSelectedArtiste(artiste);
    setImageFile(null);
    setImagePreview(artiste.image_url);
    setImageDialogOpen(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: 'Error', description: validation.error || 'Invalid image', variant: 'destructive' });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async () => {
    if (!selectedArtiste || !imageFile) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const optimizedBlob = await optimizeArtistImage(imageFile);
      const fileName = `${selectedArtiste.slug}-${Date.now()}.webp`;

      const { data, error } = await supabase.storage
        .from('artist-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/webp',
        });

      if (error) {
        logger.error('Artiste image upload error:', error);
        toast({ title: 'Error', description: error.message || 'Failed to upload', variant: 'destructive' });
        return;
      }

      if (!data?.path) {
        toast({ title: 'Error', description: 'Upload succeeded but failed to get URL', variant: 'destructive' });
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('artist-images').getPublicUrl(data.path);

      const { error: updateError } = await safeQuery(async () =>
        await supabase
          .from('artistes')
          .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', selectedArtiste.id)
      );

      if (updateError) {
        toast({ title: 'Error', description: 'Image uploaded but failed to update record', variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: `Image uploaded for ${selectedArtiste.name}` });
      setImageDialogOpen(false);
      fetchData();
    } catch (error: any) {
      logger.error('Unexpected error:', error);
      toast({ title: 'Error', description: error.message || 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await handleDelete('artiste', deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
        <p className="text-sm text-orange-700 dark:text-orange-300">
          Upload optimized images for artistes. Images are automatically resized to 200x200px.
        </p>
        <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
          Note: Deleting an artiste will not delete their recitations.
        </p>
      </div>
      
      <div className="grid gap-3">
        {artistes.map((artiste) => (
          <div
            key={artiste.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {artiste.image_url ? (
                <img
                  src={artiste.image_url}
                  alt={artiste.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border-2 border-border"
                  loading="lazy"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 border-2 border-dashed border-border">
                  <Image className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground truncate">{artiste.name}</h3>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {artiste.image_url ? '✓ Image uploaded' : '○ No image'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openImageDialog(artiste)}
                className="gap-2 rounded-xl"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">{artiste.image_url ? 'Change' : 'Upload'}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(artiste.id)}
                className="text-destructive hover:text-destructive h-10 w-10 rounded-xl"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {artistes.length === 0 && (
          <div className="text-center py-16">
            <Mic className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No artistes yet</p>
            <p className="text-sm text-muted-foreground/80">Artistes are automatically created when recitations are added</p>
          </div>
        )}
      </div>

      {/* Image Upload Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Image for {selectedArtiste?.name}</DialogTitle>
            <DialogDescription>
              Images are automatically resized to 200x200px and compressed.
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
                  onChange={handleImageSelect}
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
              <div>
                <Label>Preview</Label>
                <div className="mt-2 relative inline-block">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 rounded-lg object-cover border-2 border-border" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Cancel</Button>
            <Button onClick={uploadImage} disabled={!imageFile || uploading} className="gap-2">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4" />Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Artiste?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the artist profile. Their recitations will remain but without the artist profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

AdminArtistesSection.displayName = 'AdminArtistesSection';

