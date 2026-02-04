import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Plus, Trash2, Edit2, Save, X, Clock,
  Scissors, Merge, RotateCcw, RotateCw,
  Music, AlertTriangle, CheckCircle, GripVertical
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
import { cn } from '@/lib/utils';
import type { TeleprompterSegment, TeleprompterSession } from '@/lib/teleprompter-types';
import { formatTime } from '@/lib/teleprompter-storage';
import { useTeleprompterSegmentEditor } from '@/hooks/use-teleprompter-segment-editor';
import { TeleprompterAudioBar } from './TeleprompterAudioBar';

interface TeleprompterEditorProps {
  pieceId: string;
  textContent?: string;
  audioUrl?: string | null;
  onSave?: (session: TeleprompterSession) => void;
  onClose?: () => void;
}

export function TeleprompterEditor({
  pieceId,
  textContent = '',
  audioUrl,
  onSave,
  onClose,
}: TeleprompterEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const editor = useTeleprompterSegmentEditor({
    audioDuration: duration,
    pieceId,
    textContent,
    audioUrl,
    navigate: (path) => {
      if (path === '__close__') onClose?.();
    },
    enabled: true,
    currentTime,
    onSave,
  });

  const handleClose = useCallback(() => {
    if (editor.hasChanges) {
      editor.handleNavigate('__close__');
    } else {
      onClose?.();
    }
  }, [editor.hasChanges, editor.handleNavigate, onClose]);

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
    pendingNavigation,
    hasChanges,
    draggedIndex,
    handleSaveAndContinue,
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
    handleRestoreAutosave,
    handleDiscardAutosave,
    setCurrentTimeAsStart,
    setCurrentTimeAsEnd,
    setEditCurrentTimeAsStart,
    setEditCurrentTimeAsEnd,
    setEditForm,
    setAddForm,
    canUndoNow,
    canRedoNow,
  } = editor;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Segment Editor</h2>
            {hasChanges && (
              <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndoNow} title="Undo (Ctrl+Z)">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!canRedoNow} title="Redo (Ctrl+Y)">
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Segment
            </Button>
            <Button onClick={handleSaveAll} disabled={!hasChanges}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {audioUrl && (
          <div className="max-w-4xl mx-auto mt-4">
            <TeleprompterAudioBar
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={togglePlayPause}
              onSeek={seekTo}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {segments.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Segments Yet</h3>
              <p className="text-muted-foreground mb-4">Add segments to sync your lyrics with the audio</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Segment
              </Button>
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
                          className="min-h-[100px] font-arabic"
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
      </div>

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
                className="min-h-[120px] font-arabic mt-1"
                dir="rtl"
                style={{ fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <div className="flex gap-1 mt-1">
                  <Input value={addForm.startTime} onChange={(e) => setAddForm(prev => ({ ...prev, startTime: e.target.value }))} placeholder="00:00.00" />
                  <Button variant="outline" size="icon" onClick={setCurrentTimeAsStart} title="Use current audio time">
                    <Clock className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>End Time</Label>
                <div className="flex gap-1 mt-1">
                  <Input value={addForm.endTime} onChange={(e) => setAddForm(prev => ({ ...prev, endTime: e.target.value }))} placeholder="00:00.00" />
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

      <AlertDialog open={showUnsavedWarning} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {pendingNavigation === '__close__' ? 'Unsaved Changes' : 'Unsaved Changes Found'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingNavigation === '__close__'
                ? 'You have unsaved changes. Would you like to save them before closing?'
                : 'There are unsaved changes from a previous session. Would you like to restore them or discard?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAutosave}>
              {pendingNavigation === '__close__' ? 'Discard' : 'Discard Changes'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={pendingNavigation === '__close__' ? handleSaveAndContinue : handleRestoreAutosave}
            >
              {pendingNavigation === '__close__' ? 'Save & Close' : 'Restore Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
