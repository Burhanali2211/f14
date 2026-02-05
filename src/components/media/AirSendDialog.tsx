import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Wifi, CheckCircle, RefreshCw, File, Copy, Check, Download, FolderOpen, Loader2, Play, Cloud } from 'lucide-react';
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
import { getAirSendUrl, AIRSEND_SESSION_EXPIRY_MINUTES, getStoredSession, setStoredSession, clearStoredSession } from '@/lib/airsend-constants';
import { toast } from 'sonner';
import { useR2Audio, AudioFile } from '@/hooks/useR2Audio';
import { Progress } from '@/components/ui/progress';

interface AirSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pieceId?: string | null;
  mode?: 'audio' | 'download-only';
  onAudioReceived?: (audioUrl: string, audioName: string) => void;
  onCloudAudioUploaded?: (audioFile: AudioFile) => void;
}

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function AirSendDialog({ open, onOpenChange, pieceId = null, mode = 'audio', onAudioReceived, onCloudAudioUploaded }: AirSendDialogProps) {
  const isDownloadOnly = mode === 'download-only';
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'receiving' | 'saving' | 'completed' | 'uploading' | 'error'>('waiting');
  const [p2pStatus, setP2PStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [receivedFile, setReceivedFile] = useState<AirSendFile | null>(null);
  const [receivedUrl, setReceivedUrl] = useState<string | null>(null);
  const [savedToDisk, setSavedToDisk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState(30 * 60);
  const p2pRef = useRef<AirSendP2P | null>(null);
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const receivedUrlRef = useRef<string | null>(null);
  const receivedFileRef = useRef<AirSendFile | null>(null);
  const saveFileHandlerRef = useRef<(file: AirSendFile) => void>(() => {});

  const { uploadAudio, uploadProgress } = useR2Audio();

  const cleanupObjectUrl = useCallback(() => {
    if (receivedUrlRef.current) {
      URL.revokeObjectURL(receivedUrlRef.current);
      receivedUrlRef.current = null;
    }
    setReceivedUrl(null);
  }, []);

  const startP2P = useCallback((code: string) => {
    if (p2pRef.current) {
      p2pRef.current.destroy();
    }
    p2pRef.current = new AirSendP2P(code, true);
    p2pRef.current.start({
      onStatusChange: (s) => {
        setP2PStatus(s);
        if (s.includes('Channel open')) {
          setStatus('connecting');
        }
        if (s.includes('Receiving')) {
          setStatus('receiving');
        }
        if (s.includes('failed') || s.includes('timeout') || s.includes('error')) {
          setStatus('error');
          toast.error(s || 'Transfer failed');
        }
        if (s.includes('complete')) {
          setStatus('completed');
        }
      },
      onProgress: (p) => setProgress(p),
      onFileReceived: (file) => {
        setReceivedFile(file);
        receivedFileRef.current = file;
        saveFileHandlerRef.current(file);
      }
    });
  }, []);

  const createSession = useCallback(async (forceNew = false) => {
    cleanupObjectUrl();
    
    if (!forceNew) {
      const stored = getStoredSession();
      if (stored) {
        const { data, error } = await airsendSupabase
          .from('airsend_sessions')
          .select('session_code, expires_at')
          .eq('session_code', stored.sessionCode)
          .maybeSingle();
        
        if (!error && data) {
          const expiresAt = new Date(data.expires_at);
          if (expiresAt > new Date()) {
            setSessionCode(stored.sessionCode);
            setStatus('waiting');
            setReceivedFile(null);
            receivedFileRef.current = null;
            const secsLeft = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
            setExpiresIn(Math.max(0, secsLeft));
            setProgress(0);
            setSavedToDisk(false);
            startP2P(stored.sessionCode);
            return;
          }
        }
        clearStoredSession();
      }
    }
    
    let code = generateSessionCode();
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      const { data: existing } = await airsendSupabase
        .from('airsend_sessions')
        .select('session_code')
        .eq('session_code', code)
        .maybeSingle();
      
      if (!existing) break;
      code = generateSessionCode();
      attempts++;
    }
    
    const { error } = await airsendSupabase
      .from('airsend_sessions')
      .insert({
        session_code: code,
        piece_id: pieceId || null,
        status: 'pending',
        expires_at: new Date(Date.now() + AIRSEND_SESSION_EXPIRY_MINUTES * 60 * 1000).toISOString()
      });

    if (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to initialize session');
      return;
    }

    setStoredSession({ sessionCode: code, pieceId: pieceId ?? null, createdAt: new Date().toISOString() });
    setSessionCode(code);
    setStatus('waiting');
    setReceivedFile(null);
    receivedFileRef.current = null;
    setExpiresIn(AIRSEND_SESSION_EXPIRY_MINUTES * 60);
    setProgress(0);
    setSavedToDisk(false);

    startP2P(code);
  }, [pieceId ?? null, cleanupObjectUrl, startP2P]);

  const handleSaveReceivedFile = async (file: AirSendFile) => {
    setStatus('saving');
    
    const createBlobUrl = () => {
      const blob = new Blob([file.data], { type: file.type });
      const url = URL.createObjectURL(blob);
      receivedUrlRef.current = url;
      setReceivedUrl(url);
      return url;
    };
    
    try {
      if (isDownloadOnly) {
        createBlobUrl();
        setSavedToDisk(false);
        setStatus('completed');
        toast.success('File received. Download it below.');
        return;
      }
      
      if (!directoryHandleRef.current) {
        if (!('showDirectoryPicker' in window)) {
          createBlobUrl();
          setSavedToDisk(false);
          setStatus('completed');
          return;
        }
        
        try {
          toast.info('Please select a folder to save the audio file');
          directoryHandleRef.current = await window.showDirectoryPicker({
            mode: 'readwrite'
          });
        } catch (pickerError) {
          if (pickerError instanceof Error && pickerError.name === 'AbortError') {
            createBlobUrl();
            setSavedToDisk(false);
            setStatus('completed');
            toast.info('File received. You can download it manually.');
            return;
          }
          throw pickerError;
        }
      }

      const fileHandle = await directoryHandleRef.current.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file.data);
      await writable.close();

      createBlobUrl();
      setSavedToDisk(true);
      
      setStatus('completed');
      toast.success('Audio received and saved!');
    } catch (err) {
      console.error('Failed to save file:', err);
      createBlobUrl();
      setSavedToDisk(false);
      setStatus('completed');
      toast.info('File received. You can download it manually.');
    }
  };

  useEffect(() => {
    saveFileHandlerRef.current = handleSaveReceivedFile;
  });

  const handleClose = useCallback(() => {
    if (sessionCode) {
      airsendSupabase
        .from('airsend_sessions')
        .delete()
        .eq('session_code', sessionCode)
        .then(() => {});
      clearStoredSession();
    }
    if (p2pRef.current) {
      p2pRef.current.destroy();
      p2pRef.current = null;
    }
    cleanupObjectUrl();
    setSessionCode(null);
    setStatus('waiting');
    setReceivedFile(null);
    receivedFileRef.current = null;
    onOpenChange(false);
  }, [sessionCode, cleanupObjectUrl, onOpenChange]);

  const handleUploadToCloud = useCallback(async () => {
    const file = receivedFileRef.current;
    if (!file || !pieceId) return;

    setStatus('uploading');
    
    try {
      const blob = new Blob([file.data], { type: file.type });
      const audioFile = new File([blob], file.name, { type: file.type });
      
      const result = await uploadAudio(audioFile, pieceId);
      
      toast.success('Audio uploaded to cloud!');
      
      if (onCloudAudioUploaded) {
        onCloudAudioUploaded(result);
      }
      
      handleClose();
    } catch (err) {
      console.error('Cloud upload failed:', err);
      toast.error('Failed to upload to cloud');
      setStatus('completed');
    }
  }, [pieceId, uploadAudio, onCloudAudioUploaded, handleClose]);

  useEffect(() => {
    if (open && !sessionCode) {
      createSession();
    }
  }, [open, sessionCode, createSession]);
  
  useEffect(() => {
    return () => {
      if (p2pRef.current) {
        p2pRef.current.destroy();
        p2pRef.current = null;
      }
      if (receivedUrlRef.current) {
        URL.revokeObjectURL(receivedUrlRef.current);
        receivedUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setExpiresIn(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !sessionCode || status !== 'waiting') return;
    const heartbeat = setInterval(() => {
      airsendSupabase
        .from('airsend_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('session_code', sessionCode)
        .then(() => {});
    }, 5000);
    return () => clearInterval(heartbeat);
  }, [open, sessionCode, status]);

  const handleRefresh = useCallback(async () => {
    if (sessionCode) {
      await airsendSupabase
        .from('airsend_sessions')
        .delete()
        .eq('session_code', sessionCode);
      clearStoredSession();
    }
    setSessionCode(null);
    createSession(true);
  }, [sessionCode, createSession]);

  const copyLink = useCallback(async () => {
    if (!sessionCode) return;
    const url = getAirSendUrl(sessionCode);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionCode]);

  const qrUrl = sessionCode ? getAirSendUrl(sessionCode) : '';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      if (status === 'uploading') return;
      handleClose();
    },
    [status, handleClose]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            {isDownloadOnly ? 'Direct AirSend' : 'Direct AirSend Audio'}
          </DialogTitle>
          <DialogDescription>
            {isDownloadOnly
              ? 'Transfer any file directly between your devices using local Wi-Fi.'
              : 'Transfer audio files directly between your devices using local Wi-Fi.'}
          </DialogDescription>
        </DialogHeader>

        {status === 'waiting' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your phone to send {isDownloadOnly ? 'any file' : 'audio'} directly via Wi-Fi
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
                <span>{p2pStatus || 'Initializing...'}</span>
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
                   status === 'receiving' ? `Receiving ${isDownloadOnly ? 'file' : 'audio'}...` : 
                   'Connected & Ready'}
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

        {status === 'uploading' && (
          <div className="space-y-6 text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Cloud className="w-10 h-10 text-blue-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Uploading to Cloud...</h3>
                <p className="text-sm text-muted-foreground">
                  {uploadProgress ? `${uploadProgress.percentage}%` : 'Preparing...'}
                </p>
              </div>
              {uploadProgress && (
                <Progress value={uploadProgress.percentage} className="w-full max-w-[200px]" />
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
                {savedToDisk && !isDownloadOnly && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border shadow-sm">
                    <FolderOpen className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1 px-4">
                <h3 className="font-bold text-xl">Transfer Complete!</h3>
                <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted rounded-lg border border-border/50">
                  <File className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold truncate max-w-[200px]">
                    {receivedFile.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  {isDownloadOnly
                    ? 'File received. Download it to save to your device.'
                    : savedToDisk 
                      ? "File saved to your selected folder and ready to use." 
                      : "File received. You can download it or upload to cloud."}
                </p>
              </div>

              {isDownloadOnly ? (
                <div className="w-full px-2 space-y-3">
                  <Button
                    className="gap-2 w-full h-11"
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
                    Download File
                  </Button>
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
              ) : (
                <>
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
                        if (receivedUrl && onAudioReceived) {
                          onAudioReceived(receivedUrl, receivedFile.name);
                          handleClose();
                        }
                      }}
                    >
                      <Play className="w-4 h-4" />
                      Use Now
                    </Button>
                  </div>
                  
                  {pieceId && (
                    <Button
                      variant="secondary"
                      className="gap-2 w-full mx-2"
                      onClick={handleUploadToCloud}
                    >
                      <Cloud className="w-4 h-4" />
                      Upload to Cloud Storage
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Send Another
                  </Button>
                </>
              )}
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
