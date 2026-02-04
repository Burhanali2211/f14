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
import { useR2Audio } from '@/hooks/useR2Audio';
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

  const { uploadAudio, deleteAudio, isUploading: isR2Uploading } = useR2Audio();

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
    
    setIsUploading(true);
    try {
      const audioFile = await uploadAudio(file, id);
      
      const { error: updateError } = await supabase
        .from('pieces')
        .update({ audio_url: audioFile.r2Key })
        .eq('id', id);

      if (updateError) throw updateError;

      await queryClient.invalidateQueries({ queryKey: ['piece', id] });

      toast({
        title: 'Audio uploaded',
        description: `"${file.name}" has been saved to cloud storage`,
      });
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [id, queryClient, uploadAudio]);

  const handleRemoveAudio = useCallback(async () => {
    if (!id || !piece?.audio_url) return;

    setIsUploading(true);
    try {
      // If it's an R2 key, we should ideally delete it from R2 too, 
      // but for now let's just null the reference in the DB
      // as deleting from R2 requires more logic (checking if other pieces use it)
      
      const { error } = await supabase
        .from('pieces')
        .update({ audio_url: null })
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['piece', id] });

      toast({
        title: 'Audio removed',
        description: 'The audio reference has been removed',
      });
    } catch (err) {
      console.error('Remove error:', err);
      toast({
        title: 'Remove failed',
        description: 'Could not remove the audio reference',
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
      const isAudio = blob.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|webm|aac)$/i.test(fileName);
      if (!isAudio) {
        toast({
          title: 'Audio required',
          description: 'Please send an audio file. The Image Editor uses AirSend for audio uploads.',
          variant: 'destructive',
        });
        return;
      }
      const file = new File([blob], fileName, { type: blob.type || 'audio/mpeg' });
      
      const audioFile = await uploadAudio(file, id);

      const { error: updateError } = await supabase
        .from('pieces')
        .update({ audio_url: audioFile.r2Key })
        .eq('id', id);

      if (updateError) throw updateError;

      await queryClient.invalidateQueries({ queryKey: ['piece', id] });

      toast({
        title: 'Audio synced',
        description: `"${fileName}" has been saved to cloud storage via AirSend`,
      });
    } catch (err: any) {
      console.error('AirSend sync error:', err);
      const msg = err?.message || 'Could not save the audio file to cloud';
      toast({
        title: 'Sync failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [id, queryClient, uploadAudio]);

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
