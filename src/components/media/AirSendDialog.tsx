import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Wifi, CheckCircle, RefreshCw, Music, Copy, Check, Download, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { airsendSupabase } from '@/integrations/supabase/airsend-client';

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
  const [status, setStatus] = useState<'waiting' | 'downloading' | 'downloaded' | 'error'>('waiting');
  const [receivedAudio, setReceivedAudio] = useState<{ url: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState(30 * 60);
  const [downloadedFile, setDownloadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDownloadingRef = useRef(false);
  const hasDownloadedRef = useRef<string | null>(null);

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
      return;
    }

    setSessionCode(code);
    setStatus('waiting');
    setReceivedAudio(null);
    setExpiresIn(30 * 60);
  }, [pieceId]);

  useEffect(() => {
    if (open && !sessionCode) {
      createSession();
    }
  }, [open, sessionCode, createSession]);

  useEffect(() => {
    if (!sessionCode || !open) return;

    const downloadAndSaveAudio = async (base64Data: string, fileName: string) => {
      // Prevent multiple concurrent downloads or re-downloading the same data
      if (isDownloadingRef.current || hasDownloadedRef.current === base64Data) return;
      
      isDownloadingRef.current = true;
      setStatus('downloading');
      
      try {
        const response = await fetch(base64Data);
        const blob = await response.blob();
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        const file = new File([blob], fileName, { type: blob.type });
        setDownloadedFile(file);
        
        await airsendSupabase
          .from('airsend_sessions')
          .update({ audio_url: null, status: 'downloaded' })
          .eq('session_code', sessionCode);
        
        hasDownloadedRef.current = base64Data;
        setStatus('downloaded');
        setReceivedAudio({ url: base64Data, name: fileName });
      } catch (err) {
        console.error('Download failed:', err);
        setStatus('waiting');
      } finally {
        isDownloadingRef.current = false;
      }
    };

    const checkSession = async () => {
      const { data, error } = await airsendSupabase
        .from('airsend_sessions')
        .select('session_code, status, audio_name, audio_url')
        .eq('session_code', sessionCode)
        .single();
      
      if (error) {
        console.error('AirSend poll error:', error);
        return;
      }
      
      if (data?.status === 'completed' && data?.audio_url) {
        await downloadAndSaveAudio(data.audio_url, data.audio_name || 'audio-file.mp3');
      }
    };

    checkSession();
    const pollInterval = setInterval(checkSession, 2000);

    const channel = airsendSupabase
      .channel(`airsend-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'airsend_sessions',
          filter: `session_code=eq.${sessionCode}`
        },
        async (payload) => {
          const newData = payload.new as any;
          if (newData.status === 'completed') {
            const { data: fullData } = await airsendSupabase
              .from('airsend_sessions')
              .select('audio_url, audio_name')
              .eq('session_code', sessionCode)
              .single();
            
            if (fullData?.audio_url) {
              await downloadAndSaveAudio(fullData.audio_url, fullData.audio_name || 'audio-file.mp3');
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      airsendSupabase.removeChannel(channel);
    };
  }, [sessionCode, open]);

  useEffect(() => {
    if (!open) return;

    const timer = setInterval(() => {
      setExpiresIn(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
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
    setSessionCode(null);
    setStatus('waiting');
    setReceivedAudio(null);
    setDownloadedFile(null);
    onOpenChange(false);
  };

  const handleUseAudio = () => {
    if (downloadedFile) {
      const localUrl = URL.createObjectURL(downloadedFile);
      onAudioReceived(localUrl, downloadedFile.name);
      handleClose();
    }
  };

  const handleSelectFromDownloads = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      onAudioReceived(localUrl, file.name);
      handleClose();
    }
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
            AirSend Audio
          </DialogTitle>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        {status === 'waiting' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your phone to send audio
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

            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                <Wifi className="w-4 h-4 text-green-500 animate-pulse" />
                <span>Waiting for audio...</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Both devices must be connected to the internet
              </p>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Expires in {formatTime(expiresIn)}</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyLink}
                  className="gap-1"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy Link'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-center text-muted-foreground">
                Session Code: <span className="font-mono font-bold">{sessionCode}</span>
              </p>
            </div>
          </div>
        )}

        {status === 'downloading' && (
          <div className="space-y-6 text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-10 h-10 text-primary animate-bounce" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Downloading...</h3>
                <p className="text-sm text-muted-foreground">Saving to your Downloads folder</p>
              </div>
            </div>
          </div>
        )}

        {status === 'downloaded' && receivedAudio && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-4 w-full max-w-full overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-1 w-full text-center">
                <h3 className="font-semibold text-xl tracking-tight">Audio Downloaded!</h3>
                <p className="text-sm text-muted-foreground">
                  The file has been successfully transferred
                </p>
              </div>

              <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-center gap-4 w-full overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Music className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm truncate">
                    {receivedAudio.name.length > 35 
                      ? `${receivedAudio.name.substring(0, 20)}...${receivedAudio.name.split('.').pop()}`
                      : receivedAudio.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 font-medium uppercase tracking-wider">
                    Saved to Downloads
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUseAudio}>
                Use This Audio
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button 
                variant="ghost" 
                className="w-full gap-2 text-muted-foreground"
                onClick={handleSelectFromDownloads}
              >
                <FolderOpen className="w-4 h-4" />
                Select Different File from Downloads
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
