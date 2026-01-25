  import { memo, useState, useCallback } from 'react';
  import { 
    FileText, Download, Maximize2, ExternalLink, Loader2, AlertCircle, Printer
  } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { toast } from '@/hooks/use-toast';
  
  interface EnhancedPDFViewerProps {
    pdfUrl: string;
    title: string;
    onOpenFullscreen?: () => void;
  }
  
  export const EnhancedPDFViewer = memo(function EnhancedPDFViewer({ 
    pdfUrl, 
    title, 
    onOpenFullscreen
  }: EnhancedPDFViewerProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
  
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
      if (onOpenFullscreen) {
        onOpenFullscreen();
      } else {
        window.open(pdfUrl, '_blank');
      }
    }, [pdfUrl, onOpenFullscreen]);

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4 text-red-500" />
          <span>PDF Document</span>
        </div>
        
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-3 rounded-lg gap-2"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-9 px-3 rounded-lg gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="h-9 px-3 rounded-lg gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleFullscreen}
            className="h-9 px-3 rounded-lg gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Fullscreen</span>
          </Button>
        </div>
      </div>

      <div className="relative w-full bg-muted/30 rounded-2xl overflow-hidden border border-border">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}
        
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              PDF preview unavailable in browser
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={handleOpenExternal} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Open PDF
              </Button>
              <Button onClick={handleDownload} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        ) : (
          <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              title={title}
              className="w-full border-0"
              style={{ height: '80vh', minHeight: '500px' }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
        )}
      </div>
      
      <p className="text-center text-xs text-muted-foreground mt-3">
        If the PDF doesn't display, use the buttons above to open or download it.
      </p>
    </div>
  );
});
