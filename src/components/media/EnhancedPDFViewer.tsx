import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { 
  FileText, Download, Maximize2, ExternalLink, Loader2, AlertCircle, Printer,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import * as pdfjsLib from 'pdfjs-dist';
import { FullscreenPDFViewer } from '@/components/FullscreenPDFViewer';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface EnhancedPDFViewerProps {
  pdfUrl: string;
  title: string;
  onOpenFullscreen?: () => void;
  hideToolbar?: boolean;
}

export const EnhancedPDFViewer = memo(function EnhancedPDFViewer({ 
  pdfUrl, 
  title, 
  onOpenFullscreen,
  hideToolbar = false
}: EnhancedPDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // Load and render PDF pages to images
  useEffect(() => {
    let isMounted = true;
    
    const loadAndRenderPDF = async () => {
      if (!pdfUrl) return;
      
      try {
        setLoading(true);
        setError(false);
        setRenderProgress(0);
        
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error('Failed to fetch PDF');
        
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        const pages: string[] = [];
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (!isMounted) break;
          
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) continue;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport }).promise;
          pages.push(canvas.toDataURL('image/jpeg', 0.85));
          
          if (isMounted) {
            setRenderProgress(Math.round((pageNum / numPages) * 100));
          }
        }
        
        if (isMounted) {
          setPdfPages(pages);
          setLoading(false);
        }
      } catch (err) {
        logger.error('Error rendering PDF:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    loadAndRenderPDF();
    
    return () => {
      isMounted = false;
    };
  }, [pdfUrl]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Download started' });
    } catch {
      window.open(pdfUrl, '_blank');
    }
  }, [pdfUrl, title]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }, [pdfUrl]);

  const handleOpenExternal = useCallback(() => {
    window.open(pdfUrl, '_blank');
  }, [pdfUrl]);

  const handleFullscreen = useCallback(() => {
    if (pdfPages.length > 0) {
      setIsFullscreenOpen(true);
    } else if (onOpenFullscreen) {
      onOpenFullscreen();
    } else {
      window.open(pdfUrl, '_blank');
    }
  }, [pdfPages.length, onOpenFullscreen, pdfUrl]);

  return (
    <div className="w-full flex flex-col">
      {!hideToolbar && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4 text-red-500" />
            <span className="font-medium">{title || 'PDF Document'}</span>
            {!loading && !error && pdfPages.length > 0 && (
              <span className="text-xs opacity-60">({pdfPages.length} pages)</span>
            )}
          </div>
          
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 px-3 rounded-xl gap-2 hover:bg-secondary/80"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-9 px-3 rounded-xl gap-2 hover:bg-secondary/80"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleFullscreen}
                className="h-9 px-3 rounded-xl gap-2 shadow-lg shadow-primary/20"
                disabled={loading && pdfPages.length === 0}
              >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline font-semibold">Fullscreen</span>
              </Button>
            </div>
        </div>
      )}

      <div className={`relative w-full bg-muted/30 overflow-hidden border border-border/50 ${hideToolbar ? 'h-full flex-1' : 'rounded-3xl min-h-[400px]'}`}>
        {loading && pdfPages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-10">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm font-semibold text-foreground">Optimizing PDF...</p>
              <p className="text-xs text-muted-foreground mt-1">{renderProgress}% complete</p>
            </div>
          </div>
        )}
        
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Could not display PDF</h3>
            <p className="text-muted-foreground text-center mb-8 max-w-xs">
              This PDF cannot be previewed in your browser, but you can still open or download it.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button onClick={handleOpenExternal} className="rounded-xl px-6 gap-2 h-12">
                <ExternalLink className="w-5 h-5" />
                Open PDF
              </Button>
              <Button onClick={handleDownload} variant="outline" className="rounded-xl px-6 gap-2 h-12">
                <Download className="w-5 h-5" />
                Download
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 p-4 md:p-8 overflow-y-auto max-h-[80vh]">
            {pdfPages.map((pageDataUrl, index) => (
              <div 
                key={index} 
                className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl shadow-black/10 overflow-hidden border border-border/50 transform transition-transform hover:scale-[1.01] cursor-pointer"
                onClick={handleFullscreen}
              >
                <img
                  src={pageDataUrl}
                  alt={`${title} - Page ${index + 1}`}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            ))}
            
            {pdfPages.length > 0 && !loading && (
              <div className="py-6 text-center">
                <Button 
                  variant="secondary" 
                  onClick={handleFullscreen}
                  className="rounded-full px-6 gap-2"
                >
                  <Maximize2 className="w-4 h-4" />
                  View all {pdfPages.length} pages
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {!hideToolbar && !error && (
        <p className="text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 mt-4">
          Rendered using PDF.js for maximum compatibility
        </p>
      )}

      {isFullscreenOpen && pdfPages.length > 0 && (
        <FullscreenPDFViewer
          images={pdfPages}
          title={title}
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
        />
      )}
    </div>
  );
});
