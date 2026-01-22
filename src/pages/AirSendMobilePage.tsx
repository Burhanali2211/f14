import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, CheckCircle, Music, Loader2, AlertCircle, Smartphone, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { airsendSupabase } from '@/integrations/supabase/airsend-client';
import { cn } from '@/lib/utils';
import { AirSendP2P } from '@/lib/airsend-p2p';
import { toast } from 'sonner';

export default function AirSendMobilePage() {
  const [searchParams] = useSearchParams();
  const sessionCode = searchParams.get('session');
  
  const [status, setStatus] = useState<'idle' | 'connecting' | 'sending' | 'success' | 'error'>('idle');
  const [p2pStatus, setP2PStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const p2pRef = useRef<AirSendP2P | null>(null);

  useEffect(() => {
    if (!sessionCode) {
      setSessionValid(false);
      return;
    }

    const checkSession = async () => {
      const { data, error } = await airsendSupabase
        .from('airsend_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .single();
      
      if (error || !data) {
        setSessionValid(false);
        return;
      }

      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setSessionValid(false);
        return;
      }

      setSessionValid(true);
      
      // Initialize P2P as sender
      p2pRef.current = new AirSendP2P(sessionCode, false);
      p2pRef.current.start({
        onStatusChange: (s) => {
          setP2PStatus(s);
          if (s.includes('Direct connection')) setStatus('idle');
        },
        onProgress: (p) => setProgress(p)
      });
    };

    checkSession();

    return () => {
      p2pRef.current?.destroy();
    };
  }, [sessionCode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Please select an audio file');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !p2pRef.current) return;

    setStatus('sending');
    setProgress(0);
    setError(null);

    try {
      await p2pRef.current.sendFile(selectedFile);
      setStatus('success');
      toast.success('Audio sent successfully!');
    } catch (err) {
      console.error('P2P send error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to send file');
      toast.error('Failed to send file directly');
    }
  };

  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500/10 to-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid or Expired Session</h1>
        <p className="text-muted-foreground">
          This QR code has expired or is invalid. Please scan a new QR code from the teleprompter page.
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-500/10 to-background flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping">
            <CheckCircle className="w-20 h-20 text-green-500/50" />
          </div>
          <CheckCircle className="w-20 h-20 text-green-500 relative" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Audio Sent!</h1>
        <p className="text-muted-foreground mb-4">
          {selectedFile?.name} has been sent directly to your computer.
        </p>
        <p className="text-sm text-muted-foreground">
          You can close this page now.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex flex-col p-4">
      <header className="text-center py-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Smartphone className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Direct AirSend</h1>
        </div>
        <p className="text-muted-foreground text-sm">Send audio directly via Wi-Fi</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 max-w-md mx-auto w-full">
          <div className="w-full flex justify-center mb-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-xs">
              <Wifi className={cn("w-4 h-4", (p2pStatus.includes('established') || p2pStatus.includes('transfer')) ? "text-green-500" : "text-amber-500 animate-pulse")} />
              <span>{p2pStatus}</span>
            </div>
          </div>


        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full aspect-square max-w-[280px] rounded-3xl border-2 border-dashed",
              "flex flex-col items-center justify-center gap-4 p-8",
              "bg-card hover:bg-accent transition-colors",
              "active:scale-95 transform"
            )}
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Music className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1">Select Audio File</p>
              <p className="text-sm text-muted-foreground">
                Tap to browse your files
              </p>
            </div>
          </button>
        ) : (
          <div className="w-full max-w-[320px] bg-card rounded-2xl p-6 border shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Music className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            {status === 'sending' && (
              <div className="mb-6">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Transferring directly: {progress}%
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedFile(null);
                  setError(null);
                  setStatus('idle');
                }}
                disabled={status === 'sending'}
              >
                Change
              </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleUpload}
                    disabled={status === 'sending' || (!p2pStatus.includes('established') && !p2pStatus.includes('transfer'))}
                  >

                {status === 'sending' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Send Direct
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          Both devices must be on the same Wi-Fi
        </p>
      </footer>
    </div>
  );
}
