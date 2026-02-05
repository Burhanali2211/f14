import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, FileText, Music, Loader2, X, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useR2Audio } from '@/hooks/useR2Audio';
import {
  uploadImageToSupabase,
  uploadPdfToSupabase,
  validateImageFile,
  validatePdfFile,
} from '@/lib/piece-media-upload';
import { saveDraft } from '@/lib/teleprompter-studio-storage';
import { DraftStatusBar } from './DraftStatusBar';
import { PDFPageExtractorDialog } from './PDFPageExtractorDialog';
import { logger } from '@/lib/logger';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], filename, { type: mime });
}

export interface StudioDraft {
  title: string;
  imageUrls: string[];
  pdfUrl: string | null;
  audioUrl: string | null; // R2 key when from upload
}

interface StudioUploadZoneProps {
  pieceId?: string | null;
  onContentReady: (content: { imageUrls: string[]; pdfUrl: string | null; audioUrl: string | null }) => void;
  onSaveDraft?: (draft: StudioDraft) => Promise<string>; // Returns new piece id
  createPieceFromExtract?: (draft: {
    title: string;
    imageUrls: string[];
    pdfUrl: null;
    audioUrl: string | null;
  }) => Promise<string>;
}

async function fetchPiece(id: string) {
  const { data, error } = await supabase
    .from('pieces')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export function StudioUploadZone({ pieceId, onContentReady, onSaveDraft, createPieceFromExtract }: StudioUploadZoneProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingType, setUploadingType] = useState<'image' | 'pdf' | 'audio' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineDraftId, setOfflineDraftId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('teleprompter-studio-offline-draft-id');
    } catch {
      return null;
    }
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'pending-sync'>('synced');
  const [showExtractDialog, setShowExtractDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (offlineDraftId) {
      try {
        sessionStorage.setItem('teleprompter-studio-offline-draft-id', offlineDraftId);
      } catch {
        // Ignore
      }
    } else {
      try {
        sessionStorage.removeItem('teleprompter-studio-offline-draft-id');
      } catch {
        // Ignore
      }
    }
  }, [offlineDraftId]);

  const queryClient = useQueryClient();
  const { data: piece, isLoading: pieceLoading } = useQuery({
    queryKey: ['piece', pieceId],
    queryFn: () => fetchPiece(pieceId!),
    enabled: !!pieceId,
  });

  const { uploadAudio } = useR2Audio();

  // Load existing piece data when editing
  const hasLoadedPiece = piece != null;
  const existingImageUrls = piece ? normalizeImageUrl(piece.image_url) : [];
  const existingPdfUrl = existingImageUrls.find((u) => u.toLowerCase().endsWith('.pdf')) || null;
  const existingImageOnlyUrls = existingImageUrls.filter((u) => !u.toLowerCase().endsWith('.pdf'));
  const existingAudioUrl = piece?.audio_url || null;

  const currentImageUrls = pieceId && hasLoadedPiece ? existingImageOnlyUrls : imageUrls;
  const currentPdfUrl = pieceId && hasLoadedPiece ? existingPdfUrl : pdfUrl;
  const currentAudioUrl = pieceId && hasLoadedPiece ? existingAudioUrl : audioUrl;

  const hasContent = currentImageUrls.length > 0 || currentPdfUrl || currentAudioUrl;

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineDraftId && hasContent) {
        setSyncStatus('pending-sync');
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineDraftId, hasContent]);

  const lastNotifiedRef = useRef<string | null>(null);
  const contentKey = hasContent
    ? JSON.stringify({ urls: currentImageUrls, pdf: currentPdfUrl, audio: currentAudioUrl })
    : '';

  useEffect(() => {
    if (!hasContent || !contentKey) return;
    if (lastNotifiedRef.current === contentKey) return;
    lastNotifiedRef.current = contentKey;
    const resolvedAudio = currentAudioUrl?.startsWith('audio/')
      ? `/api/r2-audio-proxy?key=${encodeURIComponent(currentAudioUrl)}`
      : currentAudioUrl;
    onContentReady({
      imageUrls: currentImageUrls,
      pdfUrl: currentPdfUrl,
      audioUrl: resolvedAudio || null,
    });
  }, [contentKey, hasContent, onContentReady, currentImageUrls, currentPdfUrl, currentAudioUrl]);

  const handleImageUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      const imageFiles = fileArray.filter((f) => validateImageFile(f).ok);
      const pdfFiles = fileArray.filter((f) => validatePdfFile(f).ok);

      const newImageUrls: string[] = [];
      let newPdfUrl: string | null = null;
      const isOffline = !navigator.onLine;
      const useOfflinePath = isOffline && !pieceId;

      for (const file of imageFiles) {
        const validated = validateImageFile(file);
        if (!validated.ok) {
          toast({ title: 'Invalid file', description: validated.error, variant: 'destructive' });
          continue;
        }
        setUploadingType('image');
        try {
          if (useOfflinePath) {
            const dataUrl = await fileToDataUrl(file);
            newImageUrls.push(dataUrl);
            setImageUrls((prev) => [...prev, dataUrl]);
            setSyncStatus('offline');
            toast({ title: 'Saved locally', description: 'Will sync when online.' });
          } else {
            const url = await uploadImageToSupabase(file);
            newImageUrls.push(url);
            if (!pieceId) setImageUrls((prev) => [...prev, url]);
            toast({ title: 'Image uploaded', description: file.name });
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('QuotaExceededError')) {
            toast({ title: 'Storage full', description: 'Free up space or remove old drafts.', variant: 'destructive' });
          } else {
            toast({
              title: useOfflinePath ? 'Save failed' : 'Upload failed',
              description: isOffline ? 'Retry when online.' : (err instanceof Error ? err.message : 'Could not upload'),
              variant: 'destructive',
            });
          }
        } finally {
          setUploadingType(null);
        }
      }

      for (const file of pdfFiles) {
        const validated = validatePdfFile(file);
        if (!validated.ok) {
          toast({ title: 'Invalid file', description: validated.error, variant: 'destructive' });
          continue;
        }
        setUploadingType('pdf');
        try {
          if (useOfflinePath) {
            const dataUrl = await fileToDataUrl(file);
            newPdfUrl = dataUrl;
            setPdfUrl(dataUrl);
            setSyncStatus('offline');
            toast({ title: 'Saved locally', description: 'Will sync when online.' });
          } else {
            const url = await uploadPdfToSupabase(file);
            newPdfUrl = url;
            if (!pieceId) setPdfUrl(url);
            toast({ title: 'PDF uploaded', description: file.name });
          }
        } catch (err) {
          toast({
            title: useOfflinePath ? 'Save failed' : 'Upload failed',
            description: isOffline ? 'Retry when online.' : (err instanceof Error ? err.message : 'Could not upload PDF'),
            variant: 'destructive',
          });
        } finally {
          setUploadingType(null);
        }
      }

      if (pieceId && (newImageUrls.length > 0 || newPdfUrl) && !useOfflinePath) {
        const currentUrls = normalizeImageUrl(piece?.image_url);
        const combined = [...currentUrls.filter((u) => !u.toLowerCase().endsWith('.pdf')), ...newImageUrls];
        if (newPdfUrl) {
          combined.push(newPdfUrl);
        } else if (currentUrls.find((u) => u.toLowerCase().endsWith('.pdf'))) {
          combined.push(currentUrls.find((u) => u.toLowerCase().endsWith('.pdf'))!);
        }
        try {
          const { error } = await supabase
            .from('pieces')
            .update({ image_url: combined })
            .eq('id', pieceId);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ['piece', pieceId] });
        } catch (err) {
          toast({ title: 'Failed to update piece', description: 'Retry when online.', variant: 'destructive' });
        }
      }

      if (useOfflinePath && (newImageUrls.length > 0 || newPdfUrl)) {
        try {
          const draftId = offlineDraftId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          setOfflineDraftId(draftId);
          const imageBlobs = [...imageUrls.filter((u) => u.startsWith('data:')), ...newImageUrls];
          const pdfBlob = newPdfUrl ?? pdfUrl;
          await saveDraft({
            id: draftId,
            pieceId: null,
            title: title || 'Untitled',
            imageBlobs,
            pdfBlob,
            audioBlob: audioUrl?.startsWith('data:') ? audioUrl : null,
            imageUrls: [],
            pdfUrl: null,
            audioUrl: audioUrl?.startsWith('audio/') ? audioUrl : null,
          });
        } catch (err) {
          logger.error('Offline draft save failed:', err);
          if (err instanceof DOMException && err.name === 'QuotaExceededError') {
            toast({ title: 'Storage full', description: 'Free up space or remove old drafts.', variant: 'destructive' });
          }
        }
      }
    },
    [pieceId, piece?.image_url, queryClient, imageUrls, pdfUrl, title, offlineDraftId, onSaveDraft]
  );

  const handleAudioUpload = useCallback(
    async (file: File) => {
      setUploadingType('audio');
      const isOffline = !navigator.onLine;
      const useOfflinePath = isOffline && !pieceId;

      try {
        if (useOfflinePath) {
          const dataUrl = await fileToDataUrl(file);
          setAudioUrl(dataUrl);
          setSyncStatus('offline');
          toast({ title: 'Saved locally', description: 'Will sync when online.' });

          const draftId = offlineDraftId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          setOfflineDraftId(draftId);
          const imageBlobs = imageUrls.filter((u) => u.startsWith('data:'));
          await saveDraft({
            id: draftId,
            pieceId: null,
            title: title || 'Untitled',
            imageBlobs,
            pdfBlob: pdfUrl,
            audioBlob: dataUrl,
            imageUrls: [],
            pdfUrl: null,
            audioUrl: null,
          });
        } else {
          const audioFile = await uploadAudio(file, pieceId || undefined);
          setAudioUrl(audioFile.r2Key);
          if (pieceId) {
            await supabase.from('pieces').update({ audio_url: audioFile.r2Key }).eq('id', pieceId);
            queryClient.invalidateQueries({ queryKey: ['piece', pieceId] });
          }
          toast({ title: 'Audio uploaded', description: file.name });
        }
      } catch (err) {
        toast({
          title: useOfflinePath ? 'Save failed' : 'Upload failed',
          description: isOffline ? 'Retry when online.' : (err instanceof Error ? err.message : 'Could not upload audio'),
          variant: 'destructive',
        });
      } finally {
        setUploadingType(null);
      }
    },
    [pieceId, uploadAudio, queryClient, offlineDraftId, imageUrls, pdfUrl, title]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const audioFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (validateImageFile(file).ok) imageFiles.push(file);
        else if (validatePdfFile(file).ok) pdfFiles.push(file);
        else if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i))
          audioFiles.push(file);
      }

      if (imageFiles.length > 0) handleImageUpload(imageFiles);
      if (pdfFiles.length > 0) handleImageUpload(pdfFiles);
      if (audioFiles.length > 0) handleAudioUpload(audioFiles[0]);

      e.target.value = '';
    },
    [handleImageUpload, handleAudioUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (!files?.length) return;

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const audioFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (validateImageFile(file).ok) imageFiles.push(file);
        else if (validatePdfFile(file).ok) pdfFiles.push(file);
        else if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i))
          audioFiles.push(file);
      }

      if (imageFiles.length > 0) handleImageUpload(imageFiles);
      if (pdfFiles.length > 0) handleImageUpload(pdfFiles);
      if (audioFiles.length > 0) handleAudioUpload(audioFiles[0]);
    },
    [handleImageUpload, handleAudioUpload]
  );

  const handleRemoveImage = useCallback((index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemovePdf = useCallback(() => setPdfUrl(null), []);

  const handleRemoveAudio = useCallback(() => setAudioUrl(null), []);

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim()) {
      toast({ title: 'Title required', description: 'Enter a title for the piece.', variant: 'destructive' });
      return;
    }
    if (!hasContent) {
      toast({ title: 'Add content', description: 'Upload at least one image, PDF, or audio file.', variant: 'destructive' });
      return;
    }

    const isOffline = !navigator.onLine;
    if (isOffline && !pieceId) {
      setIsSaving(true);
      try {
        const draftId = offlineDraftId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setOfflineDraftId(draftId);
        const imageBlobs = currentImageUrls.filter((u) => u.startsWith('data:'));
        const pdfBlob = currentPdfUrl?.startsWith('data:') ? currentPdfUrl : null;
        const audioBlob = currentAudioUrl?.startsWith('data:') ? currentAudioUrl : null;
        await saveDraft({
          id: draftId,
          pieceId: null,
          title: title.trim(),
          imageBlobs,
          pdfBlob,
          audioBlob,
          imageUrls: [],
          pdfUrl: null,
          audioUrl: null,
        });
        setSyncStatus('offline');
        toast({ title: 'Saved locally', description: 'Will sync when you are back online.' });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          toast({ title: 'Storage full', description: 'Free up space or remove old drafts.', variant: 'destructive' });
        } else {
          toast({ title: 'Save failed', description: 'Retry when online.', variant: 'destructive' });
        }
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!onSaveDraft) return;
    setIsSaving(true);
    setSyncStatus('saving');
    try {
      let cloudImageUrls = currentImageUrls.filter((u) => !u.startsWith('data:'));
      let cloudPdfUrl = currentPdfUrl?.startsWith('http') ? currentPdfUrl : null;
      let audioR2Key = currentAudioUrl?.startsWith('audio/') ? currentAudioUrl : null;

      const imageDataUrls = currentImageUrls.filter((u) => u.startsWith('data:'));
      for (let i = 0; i < imageDataUrls.length; i++) {
        const file = dataUrlToFile(imageDataUrls[i], `image-${i}.webp`);
        const url = await uploadImageToSupabase(file);
        cloudImageUrls = [...cloudImageUrls, url];
      }
      if (currentPdfUrl?.startsWith('data:')) {
        const file = dataUrlToFile(currentPdfUrl, 'document.pdf');
        cloudPdfUrl = await uploadPdfToSupabase(file);
      }
      if (currentAudioUrl?.startsWith('data:')) {
        const file = dataUrlToFile(currentAudioUrl, 'audio.mp3');
        const audioFile = await uploadAudio(file, undefined);
        audioR2Key = audioFile.r2Key;
      }

      const newPieceId = await onSaveDraft({
        title: title.trim(),
        imageUrls: cloudImageUrls,
        pdfUrl: cloudPdfUrl,
        audioUrl: audioR2Key || null,
      });
      setSyncStatus('synced');
      setOfflineDraftId(null);
      toast({ title: 'Piece created', description: 'Redirecting to editor...' });
      window.location.href = `/piece/${newPieceId}/teleprompter/studio`;
    } catch (err) {
      setSyncStatus('pending-sync');
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not create piece. Retry when online.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [onSaveDraft, title, hasContent, currentImageUrls, currentPdfUrl, currentAudioUrl, offlineDraftId, pieceId]);

  if (pieceId && pieceLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const showDraftStatus = !pieceId && (offlineDraftId || syncStatus !== 'synced') && hasContent;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {showDraftStatus && (
        <DraftStatusBar
          status={syncStatus}
          onSync={isOnline && syncStatus === 'pending-sync' ? handleSaveDraft : undefined}
        />
      )}
      {!pieceId && (
        <div className="space-y-2">
          <Label htmlFor="studio-title">Title (required to save)</Label>
          <Input
            id="studio-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter piece title..."
            className="text-base"
          />
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 sm:p-6 md:p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <input
          type="file"
          accept="image/*,.pdf,audio/*,.mp3,.wav,.ogg,.m4a,.flac"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="studio-file-input"
        />
        <label
          htmlFor="studio-file-input"
          className="cursor-pointer flex flex-col items-center gap-2 sm:gap-3 min-h-[100px] sm:min-h-[120px] justify-center touch-manipulation"
        >
          {uploadingType ? (
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary" />
          ) : (
            <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
          )}
          <div className="text-center px-2">
            <p className="font-medium text-sm sm:text-base">Drop files here or click to upload</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Images (JPEG, PNG, WebP), PDF, or Audio (MP3, WAV, etc.)
            </p>
          </div>
          <Button type="button" variant="outline" asChild className="min-h-[44px] min-w-[120px]">
            <span>Choose files</span>
          </Button>
        </label>
      </div>

      {(currentImageUrls.length > 0 || currentPdfUrl || currentAudioUrl) && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-medium text-sm sm:text-base">Uploaded content</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {currentImageUrls.map((url, i) => (
              <div
                key={url}
                className="relative group rounded-lg overflow-hidden border border-border w-16 h-16 sm:w-20 sm:h-20 shrink-0"
              >
                <img src={url} alt={`Uploaded image ${i + 1}`} className="w-full h-full object-cover" />
                {!pieceId && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {currentPdfUrl && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm truncate max-w-[120px]">PDF</span>
                {(createPieceFromExtract || onSaveDraft) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => setShowExtractDialog(true)}
                    title="Extract page(s) as separate piece"
                  >
                    <Scissors className="w-3 h-3" />
                    Extract
                  </Button>
                )}
                {!pieceId && (
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="p-1 rounded-full hover:bg-destructive/20 text-destructive"
                    aria-label="Remove PDF"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            {currentAudioUrl && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50">
                <Music className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">Audio</span>
                {!pieceId && (
                  <button
                    type="button"
                    onClick={handleRemoveAudio}
                    className="p-1 rounded-full hover:bg-destructive/20 text-destructive"
                    aria-label="Remove audio"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {(createPieceFromExtract || onSaveDraft) && currentPdfUrl && (
        <PDFPageExtractorDialog
          open={showExtractDialog}
          onOpenChange={setShowExtractDialog}
          pdfUrl={currentPdfUrl}
          sourcePieceTitle={pieceId && piece ? piece.title : title || undefined}
          onExtractComplete={(newPieceId) => {
            navigate(`/piece/${newPieceId}/teleprompter/studio`);
          }}
          createPieceFromExtract={
            createPieceFromExtract ??
            (onSaveDraft
              ? async (draft) => onSaveDraft({ ...draft, pdfUrl: null })
              : async () => {
                  throw new Error('Sign in to create pieces');
                })
          }
        />
      )}

      {hasContent && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Content is ready. {!pieceId ? (onSaveDraft ? 'Enter a title and save to create the piece and continue to the editor.' : 'Sign in to create pieces.') : 'Use the buttons above to open the editor.'}
          </p>
          {!pieceId && !onSaveDraft && hasContent && (
            <Button asChild>
              <Link to="/auth" title="Sign in to create pieces">Sign in to create</Link>
            </Button>
          )}
          {!pieceId && onSaveDraft && (
            <Button
              onClick={handleSaveDraft}
              disabled={!title.trim() || isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Save & Continue to Editor'
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
