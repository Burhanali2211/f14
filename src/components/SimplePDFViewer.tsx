import { useState, useEffect, useCallback, memo } from 'react';
import { Loader2, FileText, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface SimplePDFViewerProps {
  pdfUrl: string;
  title: string;
  onPdfPagesLoaded?: (pages: string[]) => void;
  onOpenFullscreen?: () => void;
}

export const SimplePDFViewer = memo(function SimplePDFViewer({ 
  pdfUrl, 
  title, 
  onPdfPagesLoaded,
  onOpenFullscreen
}: SimplePDFViewerProps) {
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(pdfUrl);
        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        const pages: string[] = [];
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) continue;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport }).promise;
          pages.push(canvas.toDataURL('image/jpeg', 0.9));
        }
        
        if (isMounted) {
          setPdfPages(pages);
          onPdfPagesLoaded?.(pages);
        }
      } catch (err) {
        logger.error('Error loading PDF:', err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadPDF();
    
    return () => {
      isMounted = false;
    };
  }, [pdfUrl, onPdfPagesLoaded]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Error downloading PDF:', err);
    }
  }, [pdfUrl, title]);

  if (loading) {
    return (
      <div className="w-full mb-8 flex items-center justify-center py-20 bg-card rounded-3xl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mb-8 flex flex-col items-center justify-center py-16 bg-card rounded-3xl">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground mb-6">Could not load PDF preview</p>
        <div className="flex gap-4">
          <Button onClick={() => window.open(pdfUrl, '_blank')} size="lg" className="h-14 px-8 text-lg rounded-xl gap-3">
            <FileText className="w-5 h-5" />
            Open PDF
          </Button>
          <Button onClick={handleDownload} variant="outline" size="lg" className="h-14 px-8 text-lg rounded-xl gap-3">
            <Download className="w-5 h-5" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full mb-8">
      <div className="flex justify-center gap-4 mb-6">
        <Button
          onClick={onOpenFullscreen}
          size="lg"
          className="h-14 px-8 text-lg rounded-xl gap-3"
        >
          <Maximize2 className="w-5 h-5" />
          View Fullscreen
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          size="lg"
          className="h-14 px-8 text-lg rounded-xl gap-3"
        >
          <Download className="w-5 h-5" />
          Download PDF
        </Button>
      </div>
      
      <div className="flex flex-col items-center gap-6">
        {pdfPages.map((pageDataUrl, index) => (
          <div key={index} className="w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <img
              src={pageDataUrl}
              alt={`${title} - Page ${index + 1}`}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      
      {pdfPages.length > 1 && (
        <p className="text-center text-muted-foreground mt-6 text-lg">
          {pdfPages.length} pages • Scroll to view all
        </p>
      )}
    </section>
  );
});
