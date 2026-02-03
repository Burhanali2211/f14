import { useState, useEffect, useRef, useCallback } from 'react';
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
import { toast } from '@/hooks/use-toast';

export interface UseTeleprompterSegmentEditorOptions {
  pieceId: string;
  textContent?: string;
  audioUrl?: string | null;
  navigate: (path: string) => void;
  enabled: boolean;
  currentTime: number;
  onSave?: (session: TeleprompterSession) => void;
}

export interface UseTeleprompterSegmentEditorReturn {
  session: TeleprompterSession | null;
  segments: TeleprompterSegment[];
  editingSegment: string | null;
  editForm: { text: string; startTime: string; endTime: string };
  showAddDialog: boolean;
  setShowAddDialog: (show: boolean) => void;
  addForm: { text: string; startTime: string; endTime: string };
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (id: string | null) => void;
  showUnsavedWarning: boolean;
  setShowUnsavedWarning: (show: boolean) => void;
  pendingNavigation: string | null;
  hasChanges: boolean;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  draggedIndex: number | null;
  canUndoNow: boolean;
  canRedoNow: boolean;
  handleEdit: (segment: TeleprompterSegment) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  handleAddSegment: () => void;
  handleDeleteSegment: (segmentId: string) => void;
  handleSplit: (segment: TeleprompterSegment) => void;
  handleMerge: (segment1Id: string, segment2Id: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  handleSaveAll: () => void;
  handleNavigate: (path: string) => void;
  handleRestoreAutosave: () => void;
  handleDiscardAutosave: () => void;
  handleSaveAndContinue: () => void;
  handleGenerateFromText: (textContent: string) => void;
  setCurrentTimeAsStart: () => void;
  setCurrentTimeAsEnd: () => void;
  setEditCurrentTimeAsStart: () => void;
  setEditCurrentTimeAsEnd: () => void;
  setEditForm: React.Dispatch<React.SetStateAction<{ text: string; startTime: string; endTime: string }>>;
  setAddForm: React.Dispatch<React.SetStateAction<{ text: string; startTime: string; endTime: string }>>;
}

export function useTeleprompterSegmentEditor({
  pieceId,
  textContent,
  audioUrl,
  navigate,
  enabled,
  currentTime,
  onSave,
}: UseTeleprompterSegmentEditorOptions): UseTeleprompterSegmentEditorReturn {
  const [session, setSession] = useState<TeleprompterSession | null>(null);
  const [segments, setSegments] = useState<TeleprompterSegment[]>([]);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ text: '', startTime: '', endTime: '' });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ text: '', startTime: '', endTime: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !pieceId) return;

    const existingSession = getSession(pieceId);
    const sessionToUse = existingSession ?? createSession(pieceId, audioUrl, textContent ? parseTextToSegments(textContent) : []);

    setSession(sessionToUse);
    setSegments(sessionToUse.segments);

    if (getAutosave(sessionToUse.id) && hasUnsavedChanges(sessionToUse.id)) {
      setShowUnsavedWarning(true);
    }
  }, [enabled, pieceId, textContent, audioUrl]);

  useEffect(() => {
    if (!session || !hasChanges) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      setIsAutoSaving(true);
      saveAutosave(session.id, segments);
      setLastSaved(new Date());
      setIsAutoSaving(false);
    }, 1000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
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
      toast({
        title: 'Invalid time range',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
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
      toast({
        title: 'Invalid time range',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
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
      setSegments(updated.segments);
      clearAutosave(session.id);
      setHasChanges(false);
      toast({
        title: 'Saved',
        description: 'Segments have been saved successfully.',
      });
      onSave?.(updated);
    }
  }, [session, segments, onSave]);

  const handleNavigate = useCallback((path: string) => {
    if (hasChanges) {
      setPendingNavigation(path);
      setShowUnsavedWarning(true);
    } else {
      navigate(path);
    }
  }, [hasChanges, navigate]);

  const handleRestoreAutosave = useCallback(() => {
    if (!session) return;

    const autosave = getAutosave(session.id);
    if (autosave) {
      setSegments(autosave.segments);
      setHasChanges(true);
    }
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  }, [session]);

  const handleDiscardAutosave = useCallback(() => {
    if (session) {
      clearAutosave(session.id);
    }
    setShowUnsavedWarning(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setPendingNavigation(null);
  }, [session, pendingNavigation, navigate]);

  const handleSaveAndContinue = useCallback(() => {
    if (!session) return;
    const updated = updateSessionSegments(session.id, segments);
    if (updated) {
      setSession(updated);
      setSegments(updated.segments);
      clearAutosave(session.id);
      setHasChanges(false);
      setShowUnsavedWarning(false);
      toast({
        title: 'Saved',
        description: 'Segments have been saved successfully.',
      });
      onSave?.(updated);
      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    }
  }, [session, segments, pendingNavigation, navigate, onSave]);

  const handleGenerateFromText = useCallback((content: string) => {
    if (!content || !session) return;

    const generatedSegments = parseTextToSegments(content);
    const updated = updateSessionSegments(session.id, generatedSegments);

    if (updated) {
      setSession(updated);
      setSegments(updated.segments);
      setHasChanges(true);
      toast({
        title: 'Segments generated',
        description: `Created ${generatedSegments.length} segments from text content.`,
      });
    }
  }, [session]);

  return {
    session,
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
    canUndoNow: session ? canUndo(session.id) : false,
    canRedoNow: session ? canRedo(session.id) : false,
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
    setCurrentTimeAsStart: useCallback(() => {
      setAddForm(prev => ({ ...prev, startTime: formatTime(currentTime) }));
    }, [currentTime]),
    setCurrentTimeAsEnd: useCallback(() => {
      setAddForm(prev => ({ ...prev, endTime: formatTime(currentTime) }));
    }, [currentTime]),
    setEditCurrentTimeAsStart: useCallback(() => {
      setEditForm(prev => ({ ...prev, startTime: formatTime(currentTime) }));
    }, [currentTime]),
    setEditCurrentTimeAsEnd: useCallback(() => {
      setEditForm(prev => ({ ...prev, endTime: formatTime(currentTime) }));
    }, [currentTime]),
    setEditForm,
    setAddForm,
  };
}
