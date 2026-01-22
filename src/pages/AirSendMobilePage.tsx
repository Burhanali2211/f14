import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, CheckCircle, Music, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { airsendSupabase } from '@/integrations/supabase/airsend-client';
import { cn } from '@/lib/utils';

export default function AirSendMobilePage() {
  const [searchParams] = useSearchParams();
  const sessionCode = searchParams.get('session');
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    };

    checkSession();
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
    if (!selectedFile || !sessionCode) return;

    setStatus('uploading');
    setUploadProgress(0);
    setError(null);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedFile);
      
      const base64Data = await base64Promise;
      
      clearInterval(progressInterval);

      const { error: updateError } = await airsendSupabase
        .from('airsend_sessions')
        .update({
          audio_url: base64Data,
          audio_name: selectedFile.name,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('session_code', sessionCode);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setUploadProgress(100);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
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
          {selectedFile?.name} has been sent to your computer.
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
          <h1 className="text-xl font-bold">AirSend</h1>
        </div>
        <p className="text-muted-foreground text-sm">Send audio to Teleprompter</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 max-w-md mx-auto w-full">
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
          <div className="w-full max-w-[320px] bg-card rounded-2xl p-6 border">
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

            {status === 'uploading' && (
              <div className="mb-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Sending... {uploadProgress}%
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
                disabled={status === 'uploading'}
              >
                Change
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleUpload}
                disabled={status === 'uploading'}
              >
                {status === 'uploading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          Supported: MP3, WAV, AAC, OGG, M4A
        </p>
      </footer>
    </div>
  );
}
