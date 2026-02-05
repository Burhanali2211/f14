import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, File, Loader2, AlertCircle, Smartphone, Wifi, Camera, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { airsendSupabase } from '@/integrations/supabase/airsend-client';
import { cn } from '@/lib/utils';
import { AirSendP2P } from '@/lib/airsend-p2p';
import { AirSendQrScanner } from '@/components/media/AirSendQrScanner';
import { AIRSEND_ROUTE } from '@/lib/airsend-constants';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 500 * 1024 * 1024;

interface AvailableSession {
  session_code: string;
  expires_at: string;
  updated_at: string;
}

export default function AirSendMobilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionCode = searchParams.get('session');

  const [status, setStatus] = useState<'idle' | 'connecting' | 'sending' | 'success' | 'error'>('idle');
  const [p2pStatus, setP2PStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showBrowseSessions, setShowBrowseSessions] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<AvailableSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const p2pRef = useRef<AirSendP2P | null>(null);
  const mounted = useRef(true);

  const connectToSession = (code: string) => {
    setSearchParams({ session: code });
    setShowScanner(false);
    setShowBrowseSessions(false);
  };

  useEffect(() => {
    mounted.current = true;

    if (!sessionCode) {
      setSessionValid(false);
      return;
    }

    const checkSession = async () => {
      try {
        const { data, error } = await airsendSupabase
          .from('airsend_sessions')
          .select('*')
          .eq('session_code', sessionCode)
          .maybeSingle();

        if (!mounted.current) return;

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

        p2pRef.current = new AirSendP2P(sessionCode, false);
        p2pRef.current.start({
          onStatusChange: (s) => {
            if (!mounted.current) return;
            setP2PStatus(s);
            if (s.includes('Channel open')) {
              setIsChannelReady(true);
              setStatus('idle');
            }
            if (s.includes('failed') || s.includes('timeout') || s.includes('Connection lost')) {
              setStatus('error');
              setError(s);
              setIsChannelReady(false);
              toast.error(s);
            }
            if (s.includes('Reconnecting')) {
              setIsChannelReady(false);
            }
          },
          onProgress: (p) => {
            if (mounted.current) setProgress(p);
          }
        });
      } catch (err) {
        if (mounted.current) {
          setSessionValid(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted.current = false;
      p2pRef.current?.destroy();
      p2pRef.current = null;
    };
  }, [sessionCode]);

  const fetchAvailableSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data, error } = await airsendSupabase
        .from('airsend_sessions')
        .select('session_code, expires_at, updated_at')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setAvailableSessions(data);
      }
    } catch (err) {
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (showBrowseSessions) {
      fetchAvailableSessions();
      const interval = setInterval(fetchAvailableSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [showBrowseSessions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !p2pRef.current) return;

    if (!p2pRef.current.isReady()) {
      setError('Connection not ready. Please wait...');
      toast.error('Connection not ready. Please wait for channel to open.');
      return;
    }

    setStatus('sending');
    setProgress(0);
    setError(null);

    try {
      await p2pRef.current.sendFile(selectedFile);
      if (mounted.current) {
        setStatus('success');
        toast.success('File sent successfully!');
      }
    } catch (err) {
      console.error('P2P send error:', err);
      if (mounted.current) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to send file');
        toast.error('Failed to send file');
      }
    }
  };

  if (showScanner) {
    return (
      <AirSendQrScanner
        onScan={(code) => connectToSession(code)}
        onClose={() => setShowScanner(false)}
      />
    );
  }

  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionValid === false) {
    if (showBrowseSessions) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex flex-col p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">Connect to Session</h1>
            <Button variant="ghost" size="sm" onClick={() => setShowBrowseSessions(false)}>
              Back
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select a session that is waiting on your computer:
          </p>
          {loadingSessions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : availableSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No active sessions found.</p>
              <p className="text-sm text-muted-foreground">
                Open AirSend on your computer and show the QR code first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableSessions.map((s) => (
                <button
                  key={s.session_code}
                  onClick={() => connectToSession(s.session_code)}
                  className="w-full p-4 bg-card rounded-xl border flex items-center justify-between hover:bg-accent transition-colors text-left"
                >
                  <span className="font-mono font-semibold">{s.session_code}</span>
                  <span className="text-xs text-muted-foreground">
                    Expires {new Date(s.expires_at).toLocaleTimeString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-center">Connect to AirSend</h1>
        <p className="text-muted-foreground text-center mb-8">
          Scan a QR code or connect to an active session on your computer.
        </p>

        <div className="w-full max-w-[280px] space-y-3">
          <Button
            className="w-full gap-2 h-14 text-base"
            onClick={() => setShowScanner(true)}
          >
            <Camera className="w-6 h-6" />
            Scan QR Code
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 h-14 text-base"
            onClick={() => setShowBrowseSessions(true)}
          >
            <List className="w-6 h-6" />
            Browse Active Sessions
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Both devices must be on the same Wi-Fi network
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
        <h1 className="text-2xl font-bold mb-2">File Sent!</h1>
        <p className="text-muted-foreground mb-4">
          {selectedFile?.name} has been sent directly to your computer.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setStatus('idle');
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            Send Another
          </Button>
          <Button variant="ghost" onClick={() => navigate(AIRSEND_ROUTE)}>
            New Session
          </Button>
        </div>
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
        <p className="text-muted-foreground text-sm">Send any file directly via Wi-Fi</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 max-w-md mx-auto w-full">
        <div className="w-full flex justify-center mb-4">
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-xs',
              isChannelReady && 'bg-green-500/10'
            )}
          >
            <Wifi
              className={cn(
                'w-4 h-4',
                isChannelReady ? 'text-green-500' : 'text-amber-500 animate-pulse'
              )}
            />
            <span>{p2pStatus || 'Initializing...'}</span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'w-full aspect-square max-w-[280px] rounded-3xl border-2 border-dashed',
              'flex flex-col items-center justify-center gap-4 p-8',
              'bg-card hover:bg-accent transition-colors',
              'active:scale-95 transform'
            )}
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <File className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1">Select File</p>
              <p className="text-sm text-muted-foreground">
                Tap to browse any file (max 500MB)
              </p>
            </div>
          </button>
        ) : (
          <div className="w-full max-w-[320px] bg-card rounded-2xl p-6 border shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <File className="w-7 h-7 text-primary" />
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
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={status === 'sending'}
              >
                Change
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleUpload}
                disabled={status === 'sending' || !isChannelReady}
              >
                {status === 'sending' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {!isChannelReady ? 'Connecting...' : 'Send Direct'}
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
