import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Home, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ImageSegmentEditor, type ImageRegion } from '@/components/media/ImageSegmentEditor/index';
import { AirSendDialog } from '@/components/media/AirSendDialog';
import { EditorHeader, RecoveryDialog } from '@/components/media/ImageSegmentEditor/components';
import { useAutoSave } from '@/components/media/ImageSegmentEditor/hooks';
import { toast } from '@/hooks/use-toast';

async function fetchPiece(id: string) {
  const { data, error } = await supabase
    .from('pieces')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

const parseImageUrls = (url: unknown): string[] => {
  if (!url) return [];
  
  if (typeof url === 'string') {
    const cleaned = url.replace(/^\{?"?|"?\}$/g, '').trim();
    if (cleaned.includes(',')) {
      return cleaned.split(',').map(u => u.trim()).filter(Boolean);
    }
    return cleaned ? [cleaned] : [];
  }
  
  if (Array.isArray(url)) {
    const allUrls: string[] = [];
    for (const item of url) {
      if (typeof item === 'string') {
        const cleaned = item.replace(/^\{?"?|"?\}$/g, '').trim();
        if (cleaned.includes(',')) {
          allUrls.push(...cleaned.split(',').map(u => u.trim()).filter(Boolean));
        } else if (cleaned) {
          allUrls.push(cleaned);
        }
      }
    }
    return allUrls;
  }
  
  return [];
};

export default function ImageSegmentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: piece, isLoading, error } = useQuery({
    queryKey: ['piece', id],
    queryFn: () => fetchPiece(id!),
    enabled: !!id,
  });

  const [regions, setRegions] = useState<ImageRegion[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAirSend, setShowAirSend] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryData, setRecoveryData] = useState<{
    localRegions: ImageRegion[];
    cloudRegions: ImageRegion[];
    localSavedAt: string | null;
  } | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const { saveStatus, manualSave, loadFromStorage, discardLocalChanges, syncToCloud } = useAutoSave({
    pieceId: id || '',
    regions,
    enabled: !!id && initialLoaded,
  });

  useEffect(() => {
    if (!id || initialLoaded) return;

    const initData = async () => {
      const result = await loadFromStorage();
      
      if (result.hasRecoveryData && result.localData && result.cloudData) {
        setRecoveryData({
          localRegions: result.localData.regions,
          cloudRegions: result.cloudData.regions,
          localSavedAt: result.localData.savedAt,
        });
        setShowRecoveryDialog(true);
      } else if (result.regions.length > 0) {
        setRegions(result.regions);
      }
      
      setInitialLoaded(true);
    };

    initData();
  }, [id, initialLoaded, loadFromStorage]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges || saveStatus.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, saveStatus.hasUnsavedChanges]);

  const pdfUrl = useMemo(() => {
    const urls = parseImageUrls(piece?.image_url);
    return urls.find(u => u.toLowerCase().endsWith('.pdf')) || null;
  }, [piece?.image_url]);

  const imageUrls = useMemo(() => {
    const urls = parseImageUrls(piece?.image_url);
    return urls.filter(u => !u.toLowerCase().endsWith('.pdf'));
  }, [piece?.image_url]);

  const regionsPerPage = useMemo(() => {
    const map = new Map<number, number>();
    regions.forEach(r => {
      map.set(r.imageIndex, (map.get(r.imageIndex) || 0) + 1);
    });
    return map;
  }, [regions]);

  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
      const audioR2Key = piece?.audio_url;
      if (audioR2Key && audioR2Key.startsWith('audio/')) {
        const proxyUrl = `/api/r2-audio-proxy?key=${encodeURIComponent(audioR2Key)}`;
        setResolvedAudioUrl(proxyUrl);
      } else if (audioR2Key && (audioR2Key.startsWith('http://') || audioR2Key.startsWith('https://'))) {
        setResolvedAudioUrl(audioR2Key);
      } else {
        setResolvedAudioUrl(undefined);
      }
    }, [piece?.audio_url]);

    const audioUrl = resolvedAudioUrl;

  const handleAudioUpload = useCallback(async (file: File) => {
    if (!id) return;
    
    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an audio file (MP3, WAV, etc.)',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `audio-${id}-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('piece-images')
        .upload(fileName, file, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('piece-images')
        .getPublicUrl(data?.path || fileName);

      const { error: updateError } = await supabase
        .from('pieces')
        .update({ audio_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      await queryClient.invalidateQueries({ queryKey: ['piece', id] });

      toast({
        title: 'Audio uploaded',
        description: `"${file.name}" has been saved`,
      });
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload failed',
        description: 'Could not upload the audio file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [id, queryClient]);

  const handleRemoveAudio = useCallback(async () => {
    if (!id || !piece?.audio_url) return;

    setIsUploading(true);
    try {
      const url = new URL(piece.audio_url);
      const fileName = url.pathname.split('/').pop();

      if (fileName) {
        await supabase.storage.from('piece-images').remove([fileName]);
      }

      const { error } = await supabase
        .from('pieces')
        .update({ audio_url: null })
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['piece', id] });

      toast({
        title: 'Audio removed',
        description: 'The audio file has been removed',
      });
    } catch (err) {
      console.error('Remove error:', err);
      toast({
        title: 'Remove failed',
        description: 'Could not remove the audio file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [id, piece?.audio_url, queryClient]);

  const handleRegionsChange = useCallback((newRegions: ImageRegion[]) => {
    setRegions(newRegions);
    setHasChanges(true);
  }, []);

  const handleAirSendReceived = useCallback(async (localUrl: string, fileName: string) => {
    if (!id) return;
    
    setIsUploading(true);
    try {
      const response = await fetch(localUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type || 'audio/mpeg' });
      
      const fileExt = fileName.split('.').pop() || 'mp3';
      const uploadFileName = `audio-${id}-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('piece-images')
        .upload(uploadFileName, file, {
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('piece-images')
        .getPublicUrl(data?.path || uploadFileName);

      const { error: updateError } = await supabase
        .from('pieces')
        .update({ audio_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      await queryClient.invalidateQueries({ queryKey: ['piece', id] });

      toast({
        title: 'Audio synced',
        description: `"${fileName}" has been saved from AirSend`,
      });
    } catch (err: any) {
      console.error('AirSend sync error:', err);
      
      let errorMessage = 'Could not save the audio file';
      if (err.message?.includes('exceeded the maximum allowed size')) {
        errorMessage = 'The audio file is too large for the cloud storage (Max 50MB).';
      }

      toast({
        title: 'Sync failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      if (localUrl) {
        toast({
          title: 'Using locally',
          description: 'The file will work in this session, but wasn\'t saved to the cloud.',
        });
      }
    } finally {
      setIsUploading(false);
    }
  }, [id, queryClient]);

  const handleSave = useCallback(async () => {
    await manualSave();
    setHasChanges(false);
    toast({
      title: 'Saved',
      description: `${regions.length} segments saved and synced.`,
    });
  }, [manualSave, regions.length]);

  const handleRestoreLocal = useCallback(() => {
    if (recoveryData) {
      setRegions(recoveryData.localRegions);
      setHasChanges(true);
    }
    setShowRecoveryDialog(false);
  }, [recoveryData]);

  const handleUseCloud = useCallback(() => {
    if (recoveryData) {
      setRegions(recoveryData.cloudRegions);
      discardLocalChanges();
    }
    setShowRecoveryDialog(false);
  }, [recoveryData, discardLocalChanges]);

  const handleDiscardLocal = useCallback(() => {
    discardLocalChanges();
    if (recoveryData?.cloudRegions) {
      setRegions(recoveryData.cloudRegions);
    }
    setShowRecoveryDialog(false);
  }, [discardLocalChanges, recoveryData]);

  const handlePreview = useCallback(async () => {
    if (hasChanges) {
      await manualSave();
      setHasChanges(false);
    }
    navigate(`/piece/${id}/teleprompter?autoplay=true`);
  }, [hasChanges, manualSave, navigate, id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !piece) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Piece Not Found</h1>
        <Button asChild>
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
        </Button>
      </div>
    );
  }

  if (imageUrls.length === 0 && !pdfUrl) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">No Images Available</h1>
        <p className="text-muted-foreground mb-4">This piece doesn't have any images to annotate.</p>
        <Button onClick={() => navigate(`/piece/${id}/teleprompter`)}>
          Back to Teleprompter
        </Button>
        </div>
      );
    }

  const audioFileName = audioUrl ? decodeURIComponent(audioUrl.split('/').pop() || '').replace(/^\d+-\d+\./, '') : undefined;
  const allPages = pdfUrl ? [] : imageUrls;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EditorHeader
          pieceId={id || ''}
          pieceTitle={piece.title}
          hasChanges={hasChanges}
          canUndo={false}
          canRedo={false}
          historyLength={0}
          zoom={zoom}
          audioUrl={audioUrl}
          audioFileName={audioFileName}
          isUploading={isUploading}
          saveStatus={saveStatus}
          regionsCount={regions.length}
          pages={allPages}
          currentPageIndex={currentPageIndex}
          regionsPerPage={regionsPerPage}
          onSave={handleSave}
          onUndo={() => {}}
          onRedo={() => {}}
          onZoomIn={() => setZoom(z => Math.min(4, z * 1.2))}
          onZoomOut={() => setZoom(z => Math.max(0.25, z / 1.2))}
          onZoomChange={setZoom}
          onResetZoom={() => setZoom(1)}
          onPreview={handlePreview}
          onAudioUpload={handleAudioUpload}
          onRemoveAudio={handleRemoveAudio}
          onAirSend={() => setShowAirSend(true)}
          onPageChange={setCurrentPageIndex}
          onSyncToCloud={() => syncToCloud(true)}
        />

      <main className="flex-1">
        <ImageSegmentEditor
          imageUrls={imageUrls}
          pdfUrl={pdfUrl || undefined}
          audioUrl={audioUrl}
          regions={regions}
          onRegionsChange={handleRegionsChange}
          onSave={handleSave}
          hasChanges={hasChanges}
        />
      </main>

      <AirSendDialog
        open={showAirSend}
        onOpenChange={setShowAirSend}
        pieceId={id || ''}
        onAudioReceived={handleAirSendReceived}
      />

      <RecoveryDialog
        open={showRecoveryDialog}
        onOpenChange={setShowRecoveryDialog}
        localSegments={recoveryData?.localRegions.length || 0}
        cloudSegments={recoveryData?.cloudRegions.length || 0}
        localSavedAt={recoveryData?.localSavedAt || null}
        onRestoreLocal={handleRestoreLocal}
        onUseCloud={handleUseCloud}
        onDiscard={handleDiscardLocal}
      />
    </div>
  );
}
