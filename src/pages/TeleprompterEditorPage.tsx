import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play, Plus, Trash2, Edit2, Save, Clock,
  Scissors, Merge, RotateCcw, RotateCw, Music, AlertTriangle,
  CheckCircle, GripVertical, ArrowLeft, Loader2, Home,
  Image as ImageIcon, FileText, Star, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FinishTaskDialog } from '@/components/media/FinishTaskDialog';
import { TeleprompterAudioBar } from '@/components/media/TeleprompterAudioBar';
import { useTeleprompterSegmentEditor } from '@/hooks/use-teleprompter-segment-editor';
import { cn, normalizeImageUrl } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import type { TeleprompterSegment } from '@/lib/teleprompter-types';
import { formatTime, finishTeleprompterTask } from '@/lib/teleprompter-storage';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

async function fetchPiece(id: string) {
  const { data, error } = await supabase
    .from('pieces')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export default function TeleprompterEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: piece, isLoading: pieceLoading, error: pieceError } = useQuery({
    queryKey: ['piece', id],
    queryFn: () => fetchPiece(id!),
    enabled: !!id,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<'images' | 'text' | null>(null);

  useEffect(() => {
    const audioR2Key = piece?.audio_url;
    if (audioR2Key && audioR2Key.startsWith('audio/')) {
      setResolvedAudioUrl(`/api/r2-audio-proxy?key=${encodeURIComponent(audioR2Key)}`);
    } else if (audioR2Key && (audioR2Key.startsWith('http://') || audioR2Key.startsWith('https://'))) {
      setResolvedAudioUrl(audioR2Key);
    } else {
      setResolvedAudioUrl(null);
    }
  }, [piece?.audio_url]);

  const audioUrl = resolvedAudioUrl;

  const imageUrls = useMemo(() => {
    const urls = normalizeImageUrl(piece?.image_url);
    return urls.filter(u => !u.toLowerCase().endsWith('.pdf'));
  }, [piece?.image_url]);

  const pdfUrl = useMemo(() => {
    const urls = normalizeImageUrl(piece?.image_url);
    return urls.find(u => u.toLowerCase().endsWith('.pdf')) || null;
  }, [piece?.image_url]);

  const hasImages = imageUrls.length > 0;
  const hasPdf = !!pdfUrl;
  const hasText = !!piece?.text_content && piece.text_content.trim().length > 0;

  const availableTypes = useMemo(() => {
    const types: { type: 'images' | 'text'; label: string; icon: typeof ImageIcon; recommended: boolean; description: string }[] = [];

    if (hasImages || hasPdf) {
      types.push({
        type: 'images',
        label: hasPdf ? 'PDF / Images' : 'Images',
        icon: ImageIcon,
        recommended: hasImages || hasPdf,
        description: hasPdf
          ? 'Create regions on PDF pages synced with audio'
          : `Create regions on ${imageUrls.length} image(s) synced with audio`
      });
    }

    if (hasText) {
      types.push({
        type: 'text',
        label: 'Text Segments',
        icon: FileText,
        recommended: !hasImages && !hasPdf && hasText,
        description: 'Create text segments synced with audio'
      });
    }

    return types;
  }, [hasImages, hasPdf, hasText, imageUrls.length]);

  const recommendedType = useMemo(() => {
    if (hasImages || hasPdf) return 'images';
    if (hasText) return 'text';
    return null;
  }, [hasImages, hasPdf, hasText]);

  useEffect(() => {
    if (!id || !piece) return;

    if (availableTypes.length > 1 && !selectedType) {
      setShowTypeSelector(true);
      return;
    }

    if (availableTypes.length === 1 && !selectedType) {
      setSelectedType(availableTypes[0].type);
    }

    if (selectedType === 'images') {
      navigate(`/piece/${id}/teleprompter/image-edit`);
    }
  }, [id, piece, availableTypes, selectedType, navigate]);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    audioRef.current = audio;

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const playSegment = useCallback((segment: TeleprompterSegment) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = segment.startTime;
    audioRef.current.play();
    setIsPlaying(true);
  }, []);

  const editorEnabled = selectedType === 'text' || (availableTypes.length === 1 && availableTypes[0]?.type === 'text');

  const editor = useTeleprompterSegmentEditor({
    pieceId: id ?? '',
    textContent: piece?.text_content,
    audioUrl,
    audioDuration: duration,
    navigate,
    enabled: !!editorEnabled,
    currentTime,
  });

  const handleFinishTask = useCallback(() => {
    if (!id) return;
    finishTeleprompterTask(id);
    toast({
      title: 'Task completed',
      description: 'All teleprompter data for this piece has been deleted.',
    });
    navigate(`/piece/${id}`);
  }, [id, navigate]);

  const handleSelectType = useCallback((type: 'images' | 'text') => {
    setShowTypeSelector(false);
    setSelectedType(type);
    if (type === 'images') {
      navigate(`/piece/${id}/teleprompter/image-edit`);
    }
  }, [id, navigate]);

  if (pieceLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pieceError || !piece) {
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

  if (showTypeSelector && availableTypes.length > 1) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background border-b border-border p-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/piece/${id}/teleprompter`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">Create Segments</h2>
              <p className="text-sm text-muted-foreground">Choose what to sync with audio</p>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-2">What would you like to sync?</h3>
              <p className="text-muted-foreground">
                This piece has multiple content types. Choose which one to create segments for.
              </p>
            </div>

            <div className="space-y-4">
              {availableTypes.map((option) => {
                const Icon = option.icon;
                const isRecommended = option.type === recommendedType;
                return (
                  <button
                    key={option.type}
                    onClick={() => handleSelectType(option.type)}
                    className={cn(
                      "w-full p-6 rounded-xl border-2 text-left transition-all hover:border-primary hover:bg-primary/5",
                      isRecommended ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        isRecommended ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">{option.label}</span>
                          {isRecommended && (
                            <Badge variant="default" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (availableTypes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background border-b border-border p-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/piece/${id}/teleprompter`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">Create Segments</h2>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Content Available</h3>
            <p className="text-muted-foreground mb-6">
              This piece doesn't have any images, PDF, or text content to create segments from.
              Add content to the piece first.
            </p>
            <Button onClick={() => navigate(`/piece/${id}`)}>Go to Piece</Button>
          </div>
        </main>
      </div>
    );
  }

  const {
    segments,
    editingSegment,
    editForm,
    showAddDialog,
    setShowAddDialog,
    addForm,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showUnsavedWarning,
    setShowUnsavedWarning,
    pendingNavigation,
    hasChanges,
    isAutoSaving,
    lastSaved,
    draggedIndex,
    canUndoNow,
    canRedoNow,
    handleEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleAddSegment,
    handleDeleteSegment,
    handleSplit,
    handleMerge,
    handleUndo,
    handleRedo,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleSaveAll,
    handleNavigate,
    handleRestoreAutosave,
    handleDiscardAutosave,
    handleSaveAndContinue,
    handleGenerateFromText,
    setCurrentTimeAsStart,
    setCurrentTimeAsEnd,
    setEditCurrentTimeAsStart,
    setEditCurrentTimeAsEnd,
    setEditForm,
    setAddForm,
  } = editor;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[1600px] mx-auto px-4 min-h-[5rem] md:min-h-[6rem] py-2 grid grid-cols-3 items-center">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleNavigate(`/piece/${id}/teleprompter`)}
              className="h-10 w-10 rounded-full hover:bg-accent/50 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="flex flex-col min-w-0 hidden lg:flex">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Editor</span>
                {isAutoSaving ? (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                    <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">Saving</span>
                  </div>
                ) : lastSaved && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                    <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                    <span className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">Synced</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-foreground/70 tracking-tight">Segment Manager</span>
                {hasChanges && !isAutoSaving && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 min-w-0 px-2">
            <h1
              className="text-lg md:text-xl font-bold tracking-tight text-center overflow-visible w-full max-w-[400px] py-1"
              dir="rtl"
              style={{ fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif", lineHeight: '1.6' }}
            >
              {piece.title}
            </h1>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndoNow} className="h-8 w-8 rounded-full" title="Undo (Ctrl+Z)">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedoNow} className="h-8 w-8 rounded-full" title="Redo (Ctrl+Y)">
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
              <div className="w-px h-3 bg-border/50 mx-1" />
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)} className="rounded-full px-4 h-8 font-bold text-[10px] uppercase tracking-wider gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
              <Button onClick={handleSaveAll} disabled={!hasChanges} className="rounded-full px-5 h-8 font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-primary/10">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save All
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            {piece.text_content && segments.length === 0 && (
              <Button variant="ghost" size="sm" onClick={() => handleGenerateFromText(piece.text_content)} className="rounded-full px-3 h-9 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Auto-generate
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-green-50 text-green-600 hover:text-green-700" onClick={() => setShowFinishDialog(true)} title="Finish & Cleanup">
              <CheckCircle2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {audioUrl && (
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <TeleprompterAudioBar
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={togglePlayPause}
              onSeek={seekTo}
            />
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {segments.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Segments Yet</h3>
              <p className="text-muted-foreground mb-4">Add segments to sync your lyrics with the audio</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {piece.text_content && (
                  <Button variant="outline" onClick={() => handleGenerateFromText(piece.text_content)}>
                    Auto-generate from Text
                  </Button>
                )}
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Segment
                </Button>
              </div>
            </div>
          ) : (
            segments.map((segment, index) => (
              <div
                key={segment.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative bg-card border border-border rounded-lg p-4 transition-all",
                  draggedIndex === index && "opacity-50",
                  editingSegment === segment.id && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingSegment === segment.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editForm.text}
                          onChange={(e) => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                          className="min-h-[100px]"
                          dir="rtl"
                          style={{ fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif" }}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Start Time</Label>
                            <div className="flex gap-1">
                              <Input
                                value={editForm.startTime}
                                onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                                placeholder="00:00.00"
                                className="text-sm"
                              />
                              <Button variant="outline" size="icon" onClick={setEditCurrentTimeAsStart} title="Use current time">
                                <Clock className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">End Time</Label>
                            <div className="flex gap-1">
                              <Input
                                value={editForm.endTime}
                                onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                                placeholder="00:00.00"
                                className="text-sm"
                              />
                              <Button variant="outline" size="icon" onClick={setEditCurrentTimeAsEnd} title="Use current time">
                                <Clock className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveEdit}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <span className="bg-muted px-2 py-0.5 rounded">#{index + 1}</span>
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                          </span>
                          <span>({(segment.endTime - segment.startTime).toFixed(1)}s)</span>
                        </div>
                        <div className="text-base leading-relaxed whitespace-pre-wrap" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif" }}>
                          {segment.text || <span className="text-muted-foreground italic">Empty segment</span>}
                        </div>
                      </>
                    )}
                  </div>

                  {editingSegment !== segment.id && (
                    <div className="flex flex-col gap-1">
                      {audioUrl && (
                        <Button variant="ghost" size="icon" onClick={() => playSegment(segment)} title="Play segment">
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(segment)} title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleSplit(segment)} title="Split segment">
                        <Scissors className="w-4 h-4" />
                      </Button>
                      {index < segments.length - 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleMerge(segment.id, segments[index + 1].id)} title="Merge with next">
                          <Merge className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(segment.id)} className="text-destructive hover:text-destructive" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Segment</DialogTitle>
            <DialogDescription>Create a new segment with text and timing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Lyrics / Text</Label>
              <Textarea
                value={addForm.text}
                onChange={(e) => setAddForm(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Enter the lyrics for this segment..."
                className="min-h-[120px] mt-1"
                dir="rtl"
                style={{ fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    value={addForm.startTime}
                    onChange={(e) => setAddForm(prev => ({ ...prev, startTime: e.target.value }))}
                    placeholder="00:00.00"
                  />
                  <Button variant="outline" size="icon" onClick={setCurrentTimeAsStart} title="Use current audio time">
                    <Clock className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>End Time</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    value={addForm.endTime}
                    onChange={(e) => setAddForm(prev => ({ ...prev, endTime: e.target.value }))}
                    placeholder="00:00.00"
                  />
                  <Button variant="outline" size="icon" onClick={setCurrentTimeAsEnd} title="Use current audio time">
                    <Clock className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            {audioUrl && (
              <p className="text-xs text-muted-foreground">Current audio position: {formatTime(currentTime)}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSegment} disabled={!addForm.text.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Segment?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone (but you can undo with Ctrl+Z while editing).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => showDeleteConfirm && handleDeleteSegment(showDeleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Would you like to save them before leaving?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAutosave}>Discard</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndContinue}>
              Save & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FinishTaskDialog open={showFinishDialog} onOpenChange={setShowFinishDialog} onConfirm={handleFinishTask} />
    </div>
  );
}
