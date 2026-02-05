import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AirSendQrScannerProps {
  onScan: (sessionCode: string) => void;
  onClose: () => void;
}

function extractSessionFromUrl(urlOrCode: string): string | null {
  try {
    if (/^[A-Z0-9]{6}$/i.test(urlOrCode.trim())) {
      return urlOrCode.trim().toUpperCase();
    }
    const url = new URL(urlOrCode);
    const session = url.searchParams.get('session');
    return session || null;
  } catch {
    return null;
  }
}

export function AirSendQrScanner({ onScan, onClose }: AirSendQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (result) => {
        const sessionCode = extractSessionFromUrl(result.data);
        if (sessionCode) {
          scanner.stop();
          onScan(sessionCode);
        }
      },
      {
        returnDetailedScanResult: true,
        preferredCamera: 'environment',
        maxScansPerSecond: 5,
      }
    );

    scannerRef.current = scanner;

    scanner
      .start()
      .then(() => {
        setHasPermission(true);
        setError(null);
      })
      .catch((err) => {
        setHasPermission(false);
        setError(err instanceof Error ? err.message : 'Camera access denied');
      });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Scan QR Code</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-primary/50 rounded-2xl" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {hasPermission && !error && (
        <p className="p-4 text-center text-sm text-muted-foreground">
          Point your camera at the QR code on your computer
        </p>
      )}
    </div>
  );
}
