import { useState, useRef, useCallback } from 'react';
import { Upload, Cloud, Music, Loader2, CheckCircle, AlertCircle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useR2Audio, AudioFile } from '@/hooks/useR2Audio';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface R2AudioUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pieceId: string;
  onAudioUploaded: (audioFile: AudioFile) => void;
  existingAudio?: AudioFile | null;
}

export function R2AudioUploadDialog({
  open,
  onOpenChange,
  pieceId,
  onAudioUploaded,
  existingAudio,
}: R2AudioUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const { uploadAudio, deleteAudio, uploadProgress, isUploading, error } = useR2Audio();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 500MB');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');

    try {
      const audioFile = await uploadAudio(selectedFile, pieceId);
      setUploadStatus('success');
      toast.success('Audio uploaded to cloud storage!');
      onAudioUploaded(audioFile);
      
      setTimeout(() => {
        onOpenChange(false);
        setSelectedFile(null);
        setUploadStatus('idle');
      }, 1500);
    } catch (err) {
      setUploadStatus('error');
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [selectedFile, pieceId, uploadAudio, onAudioUploaded, onOpenChange]);

  const handleDeleteExisting = useCallback(async () => {
    if (!existingAudio) return;

    try {
      await deleteAudio(existingAudio.id);
      toast.success('Audio deleted from cloud storage');
    } catch (err) {
      toast.error('Failed to delete audio');
    }
  }, [existingAudio, deleteAudio]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Cloud Audio Storage
          </DialogTitle>
          <DialogDescription>
            Upload audio files to secure cloud storage. Files are private and accessible only to you.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {existingAudio && uploadStatus === 'idle' && !selectedFile && (
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm truncate max-w-[180px]">{existingAudio.filename}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(existingAudio.sizeBytes)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleDeleteExisting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {uploadStatus === 'idle' && !selectedFile && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full py-12 rounded-xl border-2 border-dashed",
              "flex flex-col items-center justify-center gap-3",
              "bg-muted/30 hover:bg-muted/50 transition-colors",
              "cursor-pointer"
            )}
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Select Audio File</p>
              <p className="text-sm text-muted-foreground">MP3, WAV, AAC, FLAC up to 500MB</p>
            </div>
          </button>
        )}

        {selectedFile && uploadStatus === 'idle' && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Music className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{formatSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleUpload}
              >
                <Cloud className="w-4 h-4" />
                Upload to Cloud
              </Button>
            </div>
          </div>
        )}

        {uploadStatus === 'uploading' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="font-medium">Uploading to cloud...</p>
            </div>
            <div className="space-y-2">
              <Progress value={uploadProgress?.percentage || 0} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {uploadProgress?.percentage || 0}% • {formatSize(uploadProgress?.loaded || 0)} / {formatSize(uploadProgress?.total || 0)}
              </p>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-medium text-green-600">Upload Complete!</p>
            <p className="text-sm text-muted-foreground">Your audio is now stored securely in the cloud</p>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="font-medium text-red-600">Upload Failed</p>
            <p className="text-sm text-muted-foreground text-center">{error || 'Please try again'}</p>
            <Button variant="outline" onClick={() => setUploadStatus('idle')}>
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
