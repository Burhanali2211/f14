import { Upload, Trash2, Image as ImageIcon, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import type { ArtistesTabProps } from '../types';

export const ArtistesTab = ({ artistes, onOpenImageDialog, onDelete }: ArtistesTabProps) => {
  return (
    <TabsContent value="artistes" className="space-y-4">
      <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          Upload optimized images for artistes. Images are automatically resized to 200x200px and compressed for optimal performance. 
          <span className="block mt-1 text-xs text-muted-foreground/80">
            Note: Deleting an artiste will not delete their recitations. The reciter field in those recitations will remain but the artiste profile will be removed.
          </span>
        </p>
      </div>

      <div className="grid gap-3">
        {artistes.map((artiste) => (
          <div
            key={artiste.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              {artiste.image_url ? (
                <img
                  src={artiste.image_url}
                  alt={artiste.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 border-2 border-border"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border-2 border-dashed border-border">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{artiste.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                  {artiste.image_url ? 'Image uploaded' : 'No image'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenImageDialog(artiste)}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {artiste.image_url ? 'Change Image' : 'Upload Image'}
                </span>
                <span className="sm:hidden">Upload</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete('artiste', artiste.id)}
                className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                title="Delete Artist"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {artistes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No artistes found. Artistes are automatically created when recitations are added.</p>
          </div>
        )}
      </div>
    </TabsContent>
  );
};

