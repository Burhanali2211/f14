import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, FileText, Star, Edit2, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PDFPageExtractorDialog } from './PDFPageExtractorDialog';

export type EditorMode = 'images' | 'text';

interface StudioContentRouterProps {
  pieceId: string;
  pieceTitle: string;
  imageUrls: string[];
  pdfUrl: string | null;
  audioUrl: string | null;
  textContent?: string;
  createPieceFromExtract?: (draft: {
    title: string;
    imageUrls: string[];
    pdfUrl: null;
    audioUrl: string | null;
  }) => Promise<string>;
}

export function StudioContentRouter({
  pieceId,
  pieceTitle,
  imageUrls,
  pdfUrl,
  audioUrl,
  textContent = '',
  createPieceFromExtract,
}: StudioContentRouterProps) {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<EditorMode | null>(null);
  const [showExtractDialog, setShowExtractDialog] = useState(false);

  const hasImages = imageUrls.length > 0 || !!pdfUrl;
  const hasText = !!textContent?.trim();

  const availableModes = useMemo(() => {
    const modes: { mode: EditorMode; label: string; icon: typeof ImageIcon; recommended: boolean; description: string }[] = [];
    if (hasImages) {
      modes.push({
        mode: 'images',
        label: pdfUrl ? 'PDF / Images' : 'Images',
        icon: ImageIcon,
        recommended: true,
        description: pdfUrl
          ? 'Create regions on PDF pages synced with audio'
          : `Create regions on ${imageUrls.length} image(s) synced with audio`,
      });
    }
    if (hasText) {
      modes.push({
        mode: 'text',
        label: 'Text Segments',
        icon: FileText,
        recommended: !hasImages,
        description: 'Create text segments synced with audio',
      });
    }
    return modes;
  }, [hasImages, hasText, pdfUrl, imageUrls.length]);

  const effectiveMode = useMemo(() => {
    if (selectedMode) return selectedMode;
    if (availableModes.length === 1) return availableModes[0].mode;
    if (availableModes.length > 1) return availableModes.find((m) => m.recommended)?.mode ?? availableModes[0].mode;
    return null;
  }, [selectedMode, availableModes]);

  if (availableModes.length > 1 && !selectedMode) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Choose editor mode</h3>
          <p className="text-muted-foreground">This piece has multiple content types. Choose which one to create segments for.</p>
        </div>
        <div className="space-y-4">
          {availableModes.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.mode}
                onClick={() => setSelectedMode(option.mode)}
                className={cn(
                  "w-full p-6 rounded-xl border-2 text-left transition-all hover:border-primary hover:bg-primary/5",
                  option.recommended ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-lg",
                      option.recommended ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">{option.label}</span>
                      {option.recommended && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (effectiveMode === 'images') {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold">Image / PDF Segment Editor</h3>
          <p className="text-muted-foreground">
            Create regions on your {pdfUrl ? 'PDF pages' : 'images'} synced with audio for the teleprompter.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate(`/piece/${pieceId}/teleprompter/image-edit`)}
              className="gap-2"
            >
              <Edit2 className="w-5 h-5" />
              Open Image Editor
            </Button>
            {pdfUrl && createPieceFromExtract && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowExtractDialog(true)}
                className="gap-2"
              >
                <Scissors className="w-5 h-5" />
                Extract page(s)
              </Button>
            )}
          </div>
        </div>
        {pdfUrl && createPieceFromExtract && (
          <PDFPageExtractorDialog
            open={showExtractDialog}
            onOpenChange={setShowExtractDialog}
            pdfUrl={pdfUrl}
            sourcePieceTitle={pieceTitle}
            onExtractComplete={(newPieceId) => {
              navigate(`/piece/${newPieceId}/teleprompter/studio`);
            }}
            createPieceFromExtract={createPieceFromExtract}
          />
        )}
      </div>
    );
  }

  if (effectiveMode === 'text') {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold">Text Segment Editor</h3>
          <p className="text-muted-foreground">
            Create text segments synced with audio for the teleprompter.
          </p>
          <Button
            size="lg"
            onClick={() => navigate(`/piece/${pieceId}/teleprompter/edit`)}
            className="gap-2"
          >
            <Edit2 className="w-5 h-5" />
            Open Text Editor
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
