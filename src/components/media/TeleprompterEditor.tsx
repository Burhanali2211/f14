import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Plus, Trash2, Edit2, Save, X, Clock,
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
import {
  getSession,
  createSession,
  updateSessionSegments,
  addSegment,
  updateSegment,
  deleteSegment,
  splitSegment,
  mergeSegments,
  reorderSegments,
  parseTextToSegments,
  formatTime,
  parseTime,
  undo,
  redo,
  canUndo,
  canRedo,
  saveAutosave,
  getAutosave,
  clearAutosave,
  hasUnsavedChanges,
} from '@/lib/teleprompter-storage';

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
  const [session, setSession] = useState<TeleprompterSession | null>(null);
  const [segments, setSegments] = useState<TeleprompterSegment[]>([]);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ text: '', startTime: '', endTime: '' });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ text: '', startTime: '', endTime: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autosaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let existingSession = getSession(pieceId);
    
    if (!existingSession) {
      const initialSegments = textContent ? parseTextToSegments(textContent) : [];
      existingSession = createSession(pieceId, audioUrl, initialSegments);
    }
    
    setSession(existingSession);
    setSegments(existingSession.segments);

    const autosave = getAutosave(existingSession.id);
    if (autosave && hasUnsavedChanges(existingSession.id)) {
      setShowUnsavedWarning(true);
    }
  }, [pieceId, textContent, audioUrl]);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

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

  useEffect(() => {
    if (!session) return;

    autosaveIntervalRef.current = setInterval(() => {
      if (hasChanges) {
        saveAutosave(session.id, segments);
      }
    }, 10000);

    return () => {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
      }
    };
  }, [session, segments, hasChanges]);

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

  const handleEdit = useCallback((segment: TeleprompterSegment) => {
    setEditingSegment(segment.id);
    setEditForm({
      text: segment.text,
      startTime: formatTime(segment.startTime),
      endTime: formatTime(segment.endTime),
    });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!session || !editingSegment) return;

    const startTime = parseTime(editForm.startTime);
    const endTime = parseTime(editForm.endTime);

    if (endTime <= startTime) {
      alert('End time must be after start time');
      return;
    }

    const updated = updateSegment(session.id, editingSegment, {
      text: editForm.text,
      startTime,
      endTime,
    });

    if (updated) {
      setSession(updated);
      setSegments(updated.segments);
      setHasChanges(true);
    }

    setEditingSegment(null);
  }, [session, editingSegment, editForm]);

  const handleCancelEdit = useCallback(() => {
    setEditingSegment(null);
    setEditForm({ text: '', startTime: '', endTime: '' });
  }, []);

  const handleAddSegment = useCallback(() => {
    if (!session) return;

    const startTime = parseTime(addForm.startTime);
    const endTime = parseTime(addForm.endTime);

    if (endTime <= startTime) {
      alert('End time must be after start time');
      return;
    }

    const updated = addSegment(session.id, addForm.text, startTime, endTime);

    if (updated) {
      setSession(updated);
      setSegments(updated.segments);
      setHasChanges(true);
    }

    setShowAddDialog(false);
    setAddForm({ text: '', startTime: '', endTime: '' });
  }, [session, addForm]);

  const handleDeleteSegment = useCallback((segmentId: string) => {
    if (!session) return;

    const updated = deleteSegment(session.id, segmentId);

    if (updated) {
      setSession(updated);
      setSegments(updated.segments);
      setHasChanges(true);
    }

    setShowDeleteConfirm(null);
  }, [session]);

  const handleSplit = useCallback((segment: TeleprompterSegment) => {
    if (!session) return;

    const splitTime = (segment.startTime + segment.endTime) / 2;
    const updated = splitSegment(session.id, segment.id, splitTime);

    if (updated) {
      setSession(updated);
      setSegments(updated.segments);
      setHasChanges(true);
    }
  }, [session]);

  const handleMerge = useCallback((segment1Id: string, segment2Id: string) => {
    if (!session) return;

    const updated = mergeSegments(session.id, segment1Id, segment2Id);

    if (updated) {
      setSession(updated);
      setSegments(updated.segments);
      setHasChanges(true);
    }
  }, [session]);

  const handleUndo = useCallback(() => {
    if (!session) return;
    const undone = undo(session.id);
    if (undone) {
      setSession(undone);
      setSegments(undone.segments);
    }
  }, [session]);

  const handleRedo = useCallback(() => {
    if (!session) return;
    const redone = redo(session.id);
    if (redone) {
      setSession(redone);
      setSegments(redone.segments);
    }
  }, [session]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    if (session) {
      const updated = reorderSegments(session.id, draggedIndex, index);
      if (updated) {
        setSession(updated);
        setSegments(updated.segments);
        setDraggedIndex(index);
        setHasChanges(true);
      }
    }
  }, [session, draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleSaveAll = useCallback(() => {
    if (!session) return;

    const updated = updateSessionSegments(session.id, segments);
    if (updated) {
      setSession(updated);
      clearAutosave(session.id);
      setHasChanges(false);
      onSave?.(updated);
    }
  }, [session, segments, onSave]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose?.();
    }
  }, [hasChanges, onClose]);

  const handleRestoreAutosave = useCallback(() => {
    if (!session) return;

    const autosave = getAutosave(session.id);
    if (autosave) {
      setSegments(autosave.segments);
      setHasChanges(true);
    }
    setShowUnsavedWarning(false);
  }, [session]);

  const handleDiscardAutosave = useCallback(() => {
    if (session) {
      clearAutosave(session.id);
    }
    setShowUnsavedWarning(false);
  }, [session]);

  const setCurrentTimeAsStart = useCallback(() => {
    setAddForm(prev => ({ ...prev, startTime: formatTime(currentTime) }));
  }, [currentTime]);

  const setCurrentTimeAsEnd = useCallback(() => {
    setAddForm(prev => ({ ...prev, endTime: formatTime(currentTime) }));
  }, [currentTime]);

  const setEditCurrentTimeAsStart = useCallback(() => {
    setEditForm(prev => ({ ...prev, startTime: formatTime(currentTime) }));
  }, [currentTime]);

  const setEditCurrentTimeAsEnd = useCallback(() => {
    setEditForm(prev => ({ ...prev, endTime: formatTime(currentTime) }));
  }, [currentTime]);

  const canUndoNow = session ? canUndo(session.id) : false;
  const canRedoNow = session ? canRedo(session.id) : false;

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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={!canUndoNow}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRedo}
              disabled={!canRedoNow}
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Segment
            </Button>

            <Button
              onClick={handleSaveAll}
              disabled={!hasChanges}
            >
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
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <div className="flex-1">
                <div
                  className="h-2 bg-muted-foreground/20 rounded-full cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    seekTo(percentage * duration);
                  }}
                >
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground min-w-[100px] text-center">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {segments.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Segments Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add segments to sync your lyrics with the audio
              </p>
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
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={setEditCurrentTimeAsStart}
                                title="Use current time"
                              >
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
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={setEditCurrentTimeAsEnd}
                                title="Use current time"
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
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
                          <span>
                            ({(segment.endTime - segment.startTime).toFixed(1)}s)
                          </span>
                        </div>

                        <div
                          className="text-base leading-relaxed whitespace-pre-wrap"
                          dir="rtl"
                          style={{ fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif" }}
                        >
                          {segment.text || <span className="text-muted-foreground italic">Empty segment</span>}
                        </div>
                      </>
                    )}
                  </div>

                  {editingSegment !== segment.id && (
                    <div className="flex flex-col gap-1">
                      {audioUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => playSegment(segment)}
                          title="Play segment"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(segment)}
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSplit(segment)}
                        title="Split segment"
                      >
                        <Scissors className="w-4 h-4" />
                      </Button>

                      {index < segments.length - 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMerge(segment.id, segments[index + 1].id)}
                          title="Merge with next"
                        >
                          <Merge className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteConfirm(segment.id)}
                        className="text-destructive hover:text-destructive"
                        title="Delete"
                      >
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
            <DialogDescription>
              Create a new segment with text and timing
            </DialogDescription>
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
                  <Input
                    value={addForm.startTime}
                    onChange={(e) => setAddForm(prev => ({ ...prev, startTime: e.target.value }))}
                    placeholder="00:00.00"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={setCurrentTimeAsStart}
                    title="Use current audio time"
                  >
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={setCurrentTimeAsEnd}
                    title="Use current audio time"
                  >
                    <Clock className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {audioUrl && (
              <p className="text-xs text-muted-foreground">
                Current audio position: {formatTime(currentTime)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
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
            <AlertDialogDescription>
              This action cannot be undone (but you can undo with Ctrl+Z while editing).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteConfirm && handleDeleteSegment(showDeleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
              Unsaved Changes Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              There are unsaved changes from a previous session. Would you like to restore them or discard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAutosave}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreAutosave}>
              Restore Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
