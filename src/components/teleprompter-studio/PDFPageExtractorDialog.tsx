import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Scissors, Check, ZoomIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import { uploadImageToSupabase } from '@/lib/piece-media-upload';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], filename, { type: mime });
}

export interface PDFPageExtractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  sourcePieceTitle?: string;
  onExtractComplete: (newPieceId: string) => void;
  createPieceFromExtract: (draft: {
    title: string;
    imageUrls: string[];
    pdfUrl: null;
    audioUrl: string | null;
  }) => Promise<string>;
}

export function PDFPageExtractorDialog({
  open,
  onOpenChange,
  pdfUrl,
  sourcePieceTitle,
  onExtractComplete,
  createPieceFromExtract,
}: PDFPageExtractorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [extractTitle, setExtractTitle] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);

  const loadPages = useCallback(async () => {
    if (!pdfUrl || !open) return;
    setLoading(true);
    setPageThumbnails([]);
    setSelectedPages(new Set());
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const pages: string[] = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        pages.push(canvas.toDataURL('image/jpeg', 0.9));
        setProgress(Math.round((pageNum / numPages) * 100));
      }
      setPageThumbnails(pages);
    } catch (err) {
      toast({
        title: 'Failed to load PDF',
        description: err instanceof Error ? err.message : 'Could not read PDF pages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [pdfUrl, open]);

  useEffect(() => {
    if (open && pdfUrl) {
      loadPages();
    }
  }, [open, pdfUrl, loadPages]);

  const togglePage = useCallback((index: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedPages.size === pageThumbnails.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pageThumbnails.map((_, i) => i)));
    }
  }, [pageThumbnails.length, selectedPages.size]);

  const handleExtract = useCallback(async () => {
    const title = extractTitle.trim() || `Extract from ${sourcePieceTitle || 'PDF'}`;
    if (selectedPages.size === 0) {
      toast({
        title: 'Select at least one page',
        description: 'Choose the page(s) you want to extract.',
        variant: 'destructive',
      });
      return;
    }

    setExtracting(true);
    try {
      const sortedIndices = Array.from(selectedPages).sort((a, b) => a - b);
      const imageUrls: string[] = [];

      // Re-render selected pages at scale 2 for recitation-quality (matches Image Segment Editor)
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const extractScale = 2;

      for (let i = 0; i < sortedIndices.length; i++) {
        const pageIndex = sortedIndices[i];
        const pageNum = pageIndex + 1;
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: extractScale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        page.cleanup();

        const file = dataUrlToFile(dataUrl, `page-${pageNum}.jpg`);
        const url = await uploadImageToSupabase(file);
        imageUrls.push(url);
      }
      pdf.destroy();

      const newPieceId = await createPieceFromExtract({
        title,
        imageUrls,
        pdfUrl: null,
        audioUrl: null,
      });

      toast({
        title: 'Extraction complete',
        description: `Created "${title}" with ${imageUrls.length} page(s).`,
      });
      onOpenChange(false);
      onExtractComplete(newPieceId);
    } catch (err) {
      toast({
        title: 'Extraction failed',
        description: err instanceof Error ? err.message : 'Could not save extracted pages',
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  }, [
    extractTitle,
    sourcePieceTitle,
    selectedPages,
    pdfUrl,
    createPieceFromExtract,
    onOpenChange,
    onExtractComplete,
  ]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && (extracting || loading)) return;
      if (!next && previewPageIndex !== null) {
        setPreviewPageIndex(null);
        return;
      }
      if (!next) {
        setPreviewPageIndex(null);
        onOpenChange(false);
      }
    },
    [extracting, loading, previewPageIndex, onOpenChange]
  );

  const handleEscapeKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (extracting || loading) {
        e.preventDefault();
        return;
      }
      if (previewPageIndex !== null) {
        e.preventDefault();
        setPreviewPageIndex(null);
      }
    },
    [extracting, loading, previewPageIndex]
  );

  const handlePointerDownOutside = useCallback(
    (e: Event) => {
      if (extracting || loading) {
        e.preventDefault();
        return;
      }
      if (previewPageIndex !== null) {
        e.preventDefault();
        setPreviewPageIndex(null);
      } else {
        e.preventDefault();
      }
    },
    [extracting, loading, previewPageIndex]
  );

  useEffect(() => {
    if (!open) setPreviewPageIndex(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0 [&>button]:right-2 [&>button]:top-2"
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-6 pt-14">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              Extract page(s) from PDF
            </DialogTitle>
            <DialogDescription>
              Select one or more pages to extract as a separate piece. Click the zoom icon to preview a page before
              selecting. The extracted content will be saved as images and work in the Image Segment Editor.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 flex-1">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading PDF pages...</p>
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          ) : pageThumbnails.length > 0 ? (
            <>
              <div className="space-y-2 flex-shrink-0">
                <Label htmlFor="extract-title">Piece title (for extracted content)</Label>
                <Input
                  id="extract-title"
                  value={extractTitle}
                  onChange={(e) => setExtractTitle(e.target.value)}
                  placeholder={`e.g. Recitation page 42 from ${sourcePieceTitle || 'collection'}`}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between flex-shrink-0 py-2">
                <p className="text-sm text-muted-foreground">
                  {pageThumbnails.length} page(s) — Select the recitation(s) to extract
                </p>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedPages.size === pageThumbnails.length ? 'Deselect all' : 'Select all'}
                </Button>
              </div>

              <div className="flex-1 min-h-0 rounded-lg border overflow-y-auto overflow-x-hidden overscroll-contain flex flex-col">
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {pageThumbnails.map((thumb, index) => (
                      <div key={index} className="relative group">
                        <button
                          type="button"
                          onClick={() => togglePage(index)}
                          className={cn(
                            'relative w-full rounded-lg overflow-hidden border-2 transition-all aspect-[3/4]',
                            'hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary',
                            selectedPages.has(index)
                              ? 'border-primary ring-2 ring-primary'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <img
                            src={thumb}
                            alt={`Page ${index + 1}`}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                          <div
                            className={cn(
                              'absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                              selectedPages.has(index)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/80 text-muted-foreground'
                            )}
                          >
                            {selectedPages.has(index) ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                            <span className="text-xs font-medium text-white">Page {index + 1}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPageIndex(index);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/90 opacity-70 hover:opacity-100 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm z-10"
                          title="Preview page"
                          aria-label="Preview page"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <DialogFooter className="flex-shrink-0 pt-4 mt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={extracting}>
                  Cancel
                </Button>
                <Button onClick={handleExtract} disabled={extracting || selectedPages.size === 0}>
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4 mr-2" />
                      Extract & save ({selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : !loading && open ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 flex-1">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No pages could be loaded from this PDF.</p>
            </div>
          ) : null}
        </div>

        {previewPageIndex !== null &&
          pageThumbnails[previewPageIndex] &&
          createPortal(
            <div
              className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
              onClick={() => setPreviewPageIndex(null)}
              role="dialog"
              aria-modal="true"
              aria-label="Page preview"
            >
              <button
                type="button"
                onClick={() => setPreviewPageIndex(null)}
                className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close preview"
              >
                <X className="w-6 h-6" />
              </button>
              <div
                className="relative max-w-full max-h-full overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={pageThumbnails[previewPageIndex]}
                  alt={`Page ${previewPageIndex + 1} preview`}
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded"
                />
                <p className="text-center text-white/80 text-sm mt-2">Page {previewPageIndex + 1}</p>
              </div>
            </div>,
            document.body
          )}
      </DialogContent>
    </Dialog>
  );
}
