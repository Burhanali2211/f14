import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Wifi, CheckCircle, RefreshCw, Music, Copy, Check, Download, FolderOpen, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { airsendSupabase } from '@/integrations/supabase/airsend-client';
import { AirSendP2P, AirSendFile } from '@/lib/airsend-p2p';
import { toast } from 'sonner';

interface AirSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pieceId: string;
  onAudioReceived: (audioUrl: string, audioName: string) => void;
}

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function AirSendDialog({ open, onOpenChange, pieceId, onAudioReceived }: AirSendDialogProps) {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'receiving' | 'saving' | 'completed' | 'error'>('waiting');
  const [p2pStatus, setP2PStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [receivedFile, setReceivedFile] = useState<AirSendFile | null>(null);
  const [receivedUrl, setReceivedUrl] = useState<string | null>(null);
  const [savedToDisk, setSavedToDisk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState(30 * 60);
  const p2pRef = useRef<AirSendP2P | null>(null);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const createSession = useCallback(async () => {
    const code = generateSessionCode();
    
    const { error } = await airsendSupabase
      .from('airsend_sessions')
      .insert({
        session_code: code,
        piece_id: pieceId,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      });

    if (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to initialize session');
      return;
    }

    setSessionCode(code);
    setStatus('waiting');
    setReceivedFile(null);
    setExpiresIn(30 * 60);
    setProgress(0);

    // Initialize P2P
    if (p2pRef.current) p2pRef.current.destroy();
    p2pRef.current = new AirSendP2P(code, true);
    p2pRef.current.start({
        onStatusChange: (s) => {
          setP2PStatus(s);
          if (s.includes('Direct connection') || s.includes('transfer')) setStatus('connecting');
          if (s.includes('Receiving')) setStatus('receiving');
          if (s.includes('failed')) {
            setStatus('error');
            toast.error(s);
          }
        },
      onProgress: (p) => setProgress(p),
      onFileReceived: (file) => {
        setReceivedFile(file);
        handleSaveReceivedFile(file);
      }
    });
  }, [pieceId]);

  const handleSaveReceivedFile = async (file: AirSendFile) => {
    setStatus('saving');
    try {
      // Check if we have a directory handle, if not ask for one
      if (!directoryHandleRef.current) {
        if (!('showDirectoryPicker' in window)) {
          // Fallback if File System Access API is not supported
          const blob = new Blob([file.data], { type: file.type });
            const url = URL.createObjectURL(blob);
            setReceivedUrl(url);
            setSavedToDisk(false);
            setStatus('completed');
            return;
          }
          
          toast.info('Please select a folder to save the audio file');
          directoryHandleRef.current = await window.showDirectoryPicker({
            mode: 'readwrite'
          });
        }

        const fileHandle = await directoryHandleRef.current.getFileHandle(file.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file.data);
        await writable.close();

        const blob = new Blob([file.data], { type: file.type });
        const url = URL.createObjectURL(blob);
        setReceivedUrl(url);
        setSavedToDisk(true);
        
        setStatus('completed');
        toast.success('Audio received successfully!');
      } catch (err) {
      console.error('Failed to save file:', err);
      setStatus('error');
      toast.error('Failed to save file to directory');
    }
  };

  useEffect(() => {
    if (open && !sessionCode) {
      createSession();
    }
    return () => {
      if (!open && p2pRef.current) {
        p2pRef.current.destroy();
        p2pRef.current = null;
      }
    };
  }, [open, sessionCode, createSession]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setExpiresIn(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  const handleClose = async () => {
    if (sessionCode) {
      await airsendSupabase
        .from('airsend_sessions')
        .delete()
        .eq('session_code', sessionCode);
    }
    if (p2pRef.current) {
      p2pRef.current.destroy();
      p2pRef.current = null;
    }
    setSessionCode(null);
    setStatus('waiting');
    setReceivedFile(null);
    onOpenChange(false);
  };

  const handleRefresh = async () => {
    if (sessionCode) {
      await airsendSupabase
        .from('airsend_sessions')
        .delete()
        .eq('session_code', sessionCode);
    }
    setSessionCode(null);
    createSession();
  };

  const copyLink = async () => {
    if (!sessionCode) return;
    const url = `${window.location.origin}/airsend?session=${sessionCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = sessionCode ? `${window.location.origin}/airsend?session=${sessionCode}` : '';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Direct AirSend Audio
            </DialogTitle>
            <DialogDescription>
              Transfer audio files directly between your devices using local Wi-Fi.
            </DialogDescription>
          </DialogHeader>

        {status === 'waiting' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your phone to send audio directly via Wi-Fi
              </p>
              
              {sessionCode && (
                <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                  <QRCodeSVG
                    value={qrUrl}
                    size={200}
                    level="M"
                    marginSize={2}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm">
                <Wifi className="w-4 h-4 text-green-500 animate-pulse" />
                <span>{p2pStatus || 'Initializing direct connection...'}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Both devices must be on the same Wi-Fi network
              </p>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Expires in {formatTime(expiresIn)}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy Link'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        )}

        {(status === 'connecting' || status === 'receiving' || status === 'saving') && (
          <div className="space-y-6 text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                {status === 'saving' ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : (
                  <Download className="w-10 h-10 text-primary animate-bounce" />
                )}
              </div>
              <div>
                  <h3 className="font-semibold text-lg">
                    {status === 'saving' ? 'Saving to directory...' : 
                     status === 'receiving' ? 'Receiving audio...' : 
                     (p2pStatus.includes('transfer') || p2pStatus.includes('established')) ? 'Connected & Ready' : 'Connecting...'}
                  </h3>

                <p className="text-sm text-muted-foreground">
                  {status === 'receiving' ? `Directly transferring: ${progress}%` : p2pStatus}
                </p>
              </div>
              {(status === 'receiving' || status === 'saving') && (
                <div className="w-full max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

          {status === 'completed' && receivedFile && (
            <div className="space-y-6 text-center py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500 animate-in zoom-in duration-300" />
                  </div>
                  {savedToDisk && (
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border shadow-sm">
                      <FolderOpen className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 px-4">
                  <h3 className="font-bold text-xl">Transfer Complete!</h3>
                  <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted rounded-lg border border-border/50">
                    <Music className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold truncate max-w-[200px]">
                      {receivedFile.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    {savedToDisk 
                      ? "File saved to your selected folder and ready to use." 
                      : "File received in memory. You can download it or use it now."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full px-2">
                  <Button
                    variant="outline"
                    className="gap-2 h-11"
                    onClick={() => {
                      if (receivedUrl) {
                        const a = document.createElement('a');
                        a.href = receivedUrl;
                        a.download = receivedFile.name;
                        a.click();
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button
                    className="gap-2 h-11 shadow-md shadow-primary/20"
                    onClick={() => {
                      if (receivedUrl) {
                        onAudioReceived(receivedUrl, receivedFile.name);
                        handleClose();
                      }
                    }}
                  >
                    <Play className="w-4 h-4" />
                    Use Now
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Send Another
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
          <div className="space-y-6 text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <RefreshCw className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Transfer Failed</h3>
                <p className="text-sm text-muted-foreground">Please try again or refresh the QR code</p>
              </div>
              <Button onClick={handleRefresh}>Try Again</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
