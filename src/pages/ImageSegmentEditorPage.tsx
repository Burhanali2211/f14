import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Home, Image as ImageIcon, Upload, Music, X, Eye, Save, Smartphone, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ImageSegmentEditor, type ImageRegion } from '@/components/media/ImageSegmentEditor/index';
import { ImageSegmentPreview } from '@/components/media/ImageSegmentPreview';
import { AirSendDialog } from '@/components/media/AirSendDialog';
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

const STORAGE_KEY = 'image-regions';

function getStoredRegions(pieceId: string): ImageRegion[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${pieceId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRegions(pieceId: string, regions: ImageRegion[]) {
  localStorage.setItem(`${STORAGE_KEY}-${pieceId}`, JSON.stringify(regions));
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
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showAirSend, setShowAirSend] = useState(false);
    const audioFileRef = useRef<File | null>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id && !initialLoaded) {
      const stored = getStoredRegions(id);
      if (stored.length > 0) {
        setRegions(stored);
        setLastSaved(new Date());
      }
      setInitialLoaded(true);
    }
  }, [id, initialLoaded]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!id || !initialLoaded || !hasChanges) return;

    const timer = setTimeout(() => {
      setIsAutoSaving(true);
      saveRegions(id, regions);
      setLastSaved(new Date());
      setIsAutoSaving(false);
      // We keep hasChanges true until they click "Save" for DB sync, 
      // but localStorage is updated immediately
    }, 1000);

    return () => clearTimeout(timer);
  }, [id, regions, initialLoaded, hasChanges]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);


  const pdfUrl = useMemo(() => {
    const urls = parseImageUrls(piece?.image_url);
    return urls.find(u => u.toLowerCase().endsWith('.pdf')) || null;
  }, [piece?.image_url]);

  const imageUrls = useMemo(() => {
    const urls = parseImageUrls(piece?.image_url);
    return urls.filter(u => !u.toLowerCase().endsWith('.pdf'));
  }, [piece?.image_url]);

  const audioUrl = piece?.audio_url || undefined;

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an audio file (MP3, WAV, etc.)',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    audioFileRef.current = file;

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
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
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
          errorMessage = 'The audio file is too large for the cloud storage (Max 50MB). Please use a smaller file or increase the limit in your Supabase dashboard.';
        }

        toast({
          title: 'Sync failed',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Still allow using it locally if sync fails
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

  const handleSave = useCallback(() => {
    if (!id) return;
    saveRegions(id, regions);
    setHasChanges(false);
    toast({
      title: 'Saved',
      description: `${regions.length} segments saved successfully.`,
    });
  }, [id, regions]);

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
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teleprompter
        </Button>
      </div>
    );
  }

  if (showPreview) {
    return (
      <ImageSegmentPreview
        imageUrls={imageUrls}
        pdfUrl={pdfUrl || undefined}
        audioUrl={audioUrl}
        regions={regions}
        onClose={() => setShowPreview(false)}
        pieceTitle={piece.title}
      />
    );
  }

  const audioFileName = audioUrl ? decodeURIComponent(audioUrl.split('/').pop() || '').replace(/^\d+-\d+\./, '') : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/piece/${id}/teleprompter`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{piece.title}</h1>
              <p className="text-sm text-muted-foreground truncate">Image Segment Editor</p>
            </div>

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
            id="audio-upload"
            disabled={isUploading}
          />

            <div className="flex items-center gap-2 flex-shrink-0">
              {isAutoSaving ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-[10px] font-medium text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Auto-saving...
                </div>
              ) : lastSaved && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-[10px] font-medium text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {audioUrl && (

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/30 max-w-[200px] sm:max-w-[350px]">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Music className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter bg-green-500/20 px-1 rounded">Active</span>
                    </div>
                    <span className="text-sm font-medium text-green-600 truncate">
                      {audioFileName || 'Audio synced'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/20 flex-shrink-0 ml-1"
                      onClick={handleRemoveAudio}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 ml-2 border-l pl-3 border-border">
                  <Button
                    variant={audioUrl ? "ghost" : "outline"}
                    size="sm"
                    className={cn("gap-2", audioUrl && "text-muted-foreground hover:text-foreground")}
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {audioUrl ? 'Replace' : 'Upload'}
                  </Button>
                  <Button
                    variant={audioUrl ? "ghost" : "outline"}
                    size="sm"
                    className={cn("gap-2", audioUrl && "text-muted-foreground hover:text-foreground")}
                    onClick={() => setShowAirSend(true)}
                    disabled={isUploading}
                  >
                    <Smartphone className="w-4 h-4" />
                    AirSend
                  </Button>
                </div>
              </div>

          {regions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          )}

          {hasChanges && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </header>

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
      </div>
    );
  }
