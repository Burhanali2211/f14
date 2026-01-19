import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Settings2, X, Maximize2, Minimize2,
  Plus, Minus, Timer, Trash2, Save, Clock, ChevronLeft, ChevronRight,
  Eye, EyeOff, MousePointer2, Crosshair, GripVertical, Check, RotateCcw,
  Music, Upload, Volume2, VolumeX, Repeat, Repeat1
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';

export interface Segment {
  id: string;
  pageIndex: number;
  startY: number;
  endY: number;
  duration: number;
  label: string;
}

interface AllSegments {
  [pageIndex: number]: Segment[];
}

interface AudioSettings {
  volume: number;
  playbackRate: number;
  loop: boolean;
  autoPlay: boolean;
}

interface TeleprompterModeProps {
  images: string[];
  pdfUrl?: string;
  title: string;
  pieceId?: string;
  onClose: () => void;
}

type DrawingState = {
  isDrawing: boolean;
  startY: number;
  currentY: number;
} | null;

type DragState = {
  segmentId: string;
  type: 'move' | 'resize-top' | 'resize-bottom';
  startY: number;
  initialSegment: Segment;
} | null;

const STORAGE_KEY_PREFIX = 'teleprompter_segments_';
const AUDIO_DB_NAME = 'TeleprompterAudioDB';
const AUDIO_STORE_NAME = 'audioFiles';
const DB_VERSION = 1;

const getStorageKey = (pieceId: string | undefined, title: string) => {
  return `${STORAGE_KEY_PREFIX}${pieceId || title.replace(/\s+/g, '_')}`;
};

const openAudioDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveAudioToDB = async (id: string, audioBlob: Blob, fileName: string): Promise<void> => {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    const request = store.put({ id, audioBlob, fileName, savedAt: new Date().toISOString() });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const loadAudioFromDB = async (id: string): Promise<{ audioBlob: Blob; fileName: string } | null> => {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE_NAME], 'readonly');
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => {
      if (request.result) {
        resolve({ audioBlob: request.result.audioBlob, fileName: request.result.fileName });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

const deleteAudioFromDB = async (id: string): Promise<void> => {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(AUDIO_STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const TeleprompterMode = memo(function TeleprompterMode({
  images,
  pdfUrl,
  title,
  pieceId,
  onClose,
}: TeleprompterModeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [allSegments, setAllSegments] = useState<AllSegments>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [defaultDuration, setDefaultDuration] = useState(5);
  const [isEditMode, setIsEditMode] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [showSegmentOverlay, setShowSegmentOverlay] = useState(true);
  const [drawingState, setDrawingState] = useState<DrawingState>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 1,
    playbackRate: 1,
    loop: false,
    autoPlay: true,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const viewportRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allPages = images.length > 0 ? images : (pdfUrl ? [pdfUrl] : []);
  const currentImage = images[currentPageIndex];
  const currentPageSegments = allSegments[currentPageIndex] || [];
  const currentSegment = currentPageSegments[currentSegmentIndex];
  const hasSegments = currentPageSegments.length > 0;
  
  const isPresentationMode = isFullscreen && isPlaying && !isEditMode;
  
  const audioStorageKey = getStorageKey(pieceId, title) + '_audio';

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPresentationMode) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPresentationMode]);

  useEffect(() => {
    if (isPresentationMode) {
      resetControlsTimeout();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPresentationMode, resetControlsTimeout]);

  const loadAudio = useCallback(async () => {
    try {
      setAudioLoading(true);
      const audioData = await loadAudioFromDB(audioStorageKey);
      if (audioData) {
        const url = URL.createObjectURL(audioData.audioBlob);
        setAudioUrl(url);
        setAudioFileName(audioData.fileName);
      }
    } catch (e) {
      console.error('Failed to load audio:', e);
    } finally {
      setAudioLoading(false);
    }
  }, [audioStorageKey]);

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Please select an audio file', variant: 'destructive' });
      return;
    }
    
    try {
      setAudioLoading(true);
      await saveAudioToDB(audioStorageKey, file, file.name);
      const url = URL.createObjectURL(file);
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      setAudioUrl(url);
      setAudioFileName(file.name);
      toast({ title: 'Audio uploaded successfully!' });
    } catch (err) {
      console.error('Failed to save audio:', err);
      toast({ title: 'Failed to upload audio', variant: 'destructive' });
    } finally {
      setAudioLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [audioStorageKey, audioUrl]);

  const handleRemoveAudio = useCallback(async () => {
    if (!confirm('Remove the audio file?')) return;
    
    try {
      await deleteAudioFromDB(audioStorageKey);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      setAudioFileName(null);
      setAudioDuration(0);
      setAudioCurrentTime(0);
      toast({ title: 'Audio removed' });
    } catch (err) {
      console.error('Failed to remove audio:', err);
    }
  }, [audioStorageKey, audioUrl]);

  useEffect(() => {
    loadAudio();
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : audioSettings.volume;
      audioRef.current.playbackRate = audioSettings.playbackRate;
      audioRef.current.loop = audioSettings.loop;
    }
  }, [audioSettings, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    
    if (isPlaying && audioSettings.autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setAudioUnlocked(true);
        }).catch((error) => {
          console.log('Audio play failed:', error);
          if (!audioUnlocked) {
            toast({ title: 'Tap Play again to start audio', description: 'Browser requires user interaction first' });
          }
        });
      }
    } else if (!isPlaying) {
      audio.pause();
    }
  }, [isPlaying, audioUrl, audioSettings.autoPlay, audioUnlocked]);

  const unlockAudio = useCallback(() => {
    if (audioRef.current && audioUrl && !audioUnlocked) {
      audioRef.current.load();
      setAudioUnlocked(true);
    }
  }, [audioUrl, audioUnlocked]);

  const handleAudioTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleAudioLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  }, []);

  const seekAudio = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  }, []);

  const saveToStorage = useCallback((segments: AllSegments, duration: number, audio: AudioSettings) => {
    try {
      const key = getStorageKey(pieceId, title);
      const data = {
        segments,
        defaultDuration: duration,
        audioSettings: audio,
        updatedAt: new Date().toISOString(),
        pieceId,
        title
      };
      localStorage.setItem(key, JSON.stringify(data));
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      return true;
    } catch (e) {
      console.error('Failed to save segments:', e);
      return false;
    }
  }, [pieceId, title]);

  const loadFromStorage = useCallback((): boolean => {
    try {
      const key = getStorageKey(pieceId, title);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.segments) {
          setAllSegments(parsed.segments);
          setDefaultDuration(parsed.defaultDuration || 5);
          if (parsed.audioSettings) {
            setAudioSettings(parsed.audioSettings);
          }
          if (parsed.updatedAt) {
            setLastSaved(new Date(parsed.updatedAt));
          }
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to load segments:', e);
    }
    return false;
  }, [pieceId, title]);

  const handleSave = useCallback(() => {
    const success = saveToStorage(allSegments, defaultDuration, audioSettings);
    if (success) {
      toast({ title: 'Saved successfully!' });
    } else {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  }, [allSegments, defaultDuration, audioSettings, saveToStorage]);

  useEffect(() => {
    loadFromStorage();
    loadAudio();
  }, []);

  useEffect(() => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
    }
    
    if (hasUnsavedChanges) {
      autoSaveRef.current = setTimeout(() => {
        saveToStorage(allSegments, defaultDuration, audioSettings);
      }, 2000);
    }
    
    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [allSegments, defaultDuration, audioSettings, hasUnsavedChanges, saveToStorage]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveToStorage(allSegments, defaultDuration, audioSettings);
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [allSegments, defaultDuration, audioSettings, hasUnsavedChanges, saveToStorage]);

  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (Object.keys(allSegments).length > 0) {
        saveToStorage(allSegments, defaultDuration, audioSettings);
      }
    }, 30000);
    
    return () => clearInterval(saveInterval);
  }, [allSegments, defaultDuration, audioSettings, saveToStorage]);

  const getRelativeY = useCallback((clientY: number): number => {
    if (!imageRef.current || !imageDimensions.height) return 0;
    const rect = imageRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    return Math.max(0, Math.min(imageDimensions.height, (y / rect.height) * imageDimensions.height));
  }, [imageDimensions.height]);

  const getDisplayY = useCallback((relativeY: number): number => {
    if (!imageRef.current || !imageDimensions.height) return 0;
    return (relativeY / imageDimensions.height) * imageRef.current.clientHeight;
  }, [imageDimensions.height]);

  const getAllSegmentsFlat = useCallback(() => {
    const flat: { segment: Segment; pageIndex: number; segmentIndex: number }[] = [];
    allPages.forEach((_, pageIndex) => {
      const pageSegments = allSegments[pageIndex] || [];
      pageSegments.forEach((segment, segmentIndex) => {
        flat.push({ segment, pageIndex, segmentIndex });
      });
    });
    return flat;
  }, [allSegments, allPages]);

  useEffect(() => {
    if (currentSegment) {
      setTimeRemaining(currentSegment.duration);
    }
  }, [currentSegmentIndex, currentSegment, currentPageIndex]);

  useEffect(() => {
    if (isPlaying && hasSegments && currentSegment) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0.1) {
            const allFlat = getAllSegmentsFlat();
            const currentFlatIndex = allFlat.findIndex(
              f => f.pageIndex === currentPageIndex && f.segmentIndex === currentSegmentIndex
            );
            
            if (currentFlatIndex < allFlat.length - 1) {
              const next = allFlat[currentFlatIndex + 1];
              setTotalElapsed(t => t + currentSegment.duration);
              if (next.pageIndex !== currentPageIndex) {
                setCurrentPageIndex(next.pageIndex);
                setCurrentSegmentIndex(0);
              } else {
                setCurrentSegmentIndex(next.segmentIndex);
              }
              return next.segment.duration;
            } else {
              setIsPlaying(false);
              if (audioRef.current) {
                audioRef.current.pause();
              }
              toast({ title: 'Recitation complete!' });
              return 0;
            }
          }
          return prev - 0.1;
        });
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, hasSegments, currentSegment, currentSegmentIndex, currentPageIndex, getAllSegmentsFlat]);

  const scrollToSegment = useCallback((segment: Segment) => {
    if (!viewportRef.current || !imageRef.current || !imageDimensions.height) return;
    const viewportHeight = viewportRef.current.clientHeight;
    const displayY = getDisplayY(segment.startY);
    const targetScroll = displayY - viewportHeight * 0.2;
    viewportRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [imageDimensions.height, getDisplayY]);

  useEffect(() => {
    if (currentSegment && imageLoaded && !isEditMode) {
      scrollToSegment(currentSegment);
    }
  }, [currentSegment, imageLoaded, scrollToSegment, isEditMode]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditMode || !imageRef.current) return;
    e.preventDefault();
    
    const relativeY = getRelativeY(e.clientY);
    setDrawingState({
      isDrawing: true,
      startY: relativeY,
      currentY: relativeY
    });
  }, [isEditMode, getRelativeY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return;

    if (drawingState?.isDrawing) {
      const relativeY = getRelativeY(e.clientY);
      setDrawingState(prev => prev ? { ...prev, currentY: relativeY } : null);
      return;
    }

    if (dragState) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      
      rafRef.current = requestAnimationFrame(() => {
        const deltaY = e.clientY - dragState.startY;
        const deltaRelative = (deltaY / imageRef.current!.clientHeight) * imageDimensions.height;
        
        setAllSegments(prev => {
          const pageSegments = [...(prev[currentPageIndex] || [])];
          const segmentIndex = pageSegments.findIndex(s => s.id === dragState.segmentId);
          if (segmentIndex === -1) return prev;
          
          const segment = { ...dragState.initialSegment };
          
          if (dragState.type === 'move') {
            const height = segment.endY - segment.startY;
            const newStartY = Math.max(0, Math.min(imageDimensions.height - height, segment.startY + deltaRelative));
            segment.startY = newStartY;
            segment.endY = newStartY + height;
          } else if (dragState.type === 'resize-top') {
            segment.startY = Math.max(0, Math.min(segment.endY - 30, segment.startY + deltaRelative));
          } else if (dragState.type === 'resize-bottom') {
            segment.endY = Math.max(segment.startY + 30, Math.min(imageDimensions.height, segment.endY + deltaRelative));
          }
          
          pageSegments[segmentIndex] = segment;
          return { ...prev, [currentPageIndex]: pageSegments };
        });
        setHasUnsavedChanges(true);
      });
      return;
    }
  }, [drawingState, dragState, getRelativeY, imageDimensions.height, currentPageIndex]);

  const handleMouseUp = useCallback(() => {
    if (drawingState?.isDrawing) {
      const minY = Math.min(drawingState.startY, drawingState.currentY);
      const maxY = Math.max(drawingState.startY, drawingState.currentY);
      
      if (maxY - minY > 20) {
        const newSegment: Segment = {
          id: `${currentPageIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          pageIndex: currentPageIndex,
          startY: minY,
          endY: maxY,
          duration: defaultDuration,
          label: `Segment ${(currentPageSegments.length || 0) + 1}`,
        };
        
        setAllSegments(prev => ({
          ...prev,
          [currentPageIndex]: [...(prev[currentPageIndex] || []), newSegment].sort((a, b) => a.startY - b.startY)
        }));
        setSelectedSegmentId(newSegment.id);
        setHasUnsavedChanges(true);
      }
      setDrawingState(null);
    }
    
    if (dragState) {
      setAllSegments(prev => ({
        ...prev,
        [currentPageIndex]: (prev[currentPageIndex] || []).sort((a, b) => a.startY - b.startY)
      }));
      setDragState(null);
      setHasUnsavedChanges(true);
    }
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, [drawingState, dragState, currentPageIndex, currentPageSegments.length, defaultDuration]);

  const startDrag = useCallback((e: React.MouseEvent, segment: Segment, type: 'move' | 'resize-top' | 'resize-bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({
      segmentId: segment.id,
      type,
      startY: e.clientY,
      initialSegment: { ...segment }
    });
    setSelectedSegmentId(segment.id);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp();
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState && imageRef.current) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        
        rafRef.current = requestAnimationFrame(() => {
          const deltaY = e.clientY - dragState.startY;
          const deltaRelative = (deltaY / imageRef.current!.clientHeight) * imageDimensions.height;
          
          setAllSegments(prev => {
            const pageSegments = [...(prev[currentPageIndex] || [])];
            const segmentIndex = pageSegments.findIndex(s => s.id === dragState.segmentId);
            if (segmentIndex === -1) return prev;
            
            const segment = { ...dragState.initialSegment };
            
            if (dragState.type === 'move') {
              const height = segment.endY - segment.startY;
              const newStartY = Math.max(0, Math.min(imageDimensions.height - height, segment.startY + deltaRelative));
              segment.startY = newStartY;
              segment.endY = newStartY + height;
            } else if (dragState.type === 'resize-top') {
              segment.startY = Math.max(0, Math.min(segment.endY - 30, segment.startY + deltaRelative));
            } else if (dragState.type === 'resize-bottom') {
              segment.endY = Math.max(segment.startY + 30, Math.min(imageDimensions.height, segment.endY + deltaRelative));
            }
            
            pageSegments[segmentIndex] = segment;
            return { ...prev, [currentPageIndex]: pageSegments };
          });
        });
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [handleMouseUp, dragState, imageDimensions.height, currentPageIndex]);

  const updateSegmentDuration = useCallback((id: string, duration: number) => {
    const newDuration = Math.max(1, Math.min(300, duration));
    setAllSegments(prev => {
      const newSegments: AllSegments = {};
      Object.keys(prev).forEach(pageKey => {
        const pageIndex = parseInt(pageKey);
        newSegments[pageIndex] = prev[pageIndex].map(s => 
          s.id === id ? { ...s, duration: newDuration } : s
        );
      });
      return newSegments;
    });
    setHasUnsavedChanges(true);
  }, []);

  const updateSegmentLabel = useCallback((id: string, label: string) => {
    setAllSegments(prev => {
      const newSegments: AllSegments = {};
      Object.keys(prev).forEach(pageKey => {
        const pageIndex = parseInt(pageKey);
        newSegments[pageIndex] = prev[pageIndex].map(s => 
          s.id === id ? { ...s, label } : s
        );
      });
      return newSegments;
    });
    setHasUnsavedChanges(true);
  }, []);

  const deleteSegment = useCallback((id: string) => {
    setAllSegments(prev => {
      const newSegments: AllSegments = {};
      Object.keys(prev).forEach(pageKey => {
        const pageIndex = parseInt(pageKey);
        newSegments[pageIndex] = prev[pageIndex].filter(s => s.id !== id);
      });
      return newSegments;
    });
    if (selectedSegmentId === id) setSelectedSegmentId(null);
    setHasUnsavedChanges(true);
  }, [selectedSegmentId]);

  const clearPageSegments = useCallback(() => {
    setAllSegments(prev => ({ ...prev, [currentPageIndex]: [] }));
    setSelectedSegmentId(null);
    setHasUnsavedChanges(true);
  }, [currentPageIndex]);

  const resetAll = useCallback(() => {
    if (confirm('Are you sure you want to reset all segments across all pages?')) {
      setAllSegments({});
      setSelectedSegmentId(null);
      setCurrentSegmentIndex(0);
      setTotalElapsed(0);
      setHasUnsavedChanges(true);
      toast({ title: 'All segments cleared' });
    }
  }, []);

  const handlePrevSegment = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    const allFlat = getAllSegmentsFlat();
    const currentFlatIndex = allFlat.findIndex(
      f => f.pageIndex === currentPageIndex && f.segmentIndex === currentSegmentIndex
    );
    if (currentFlatIndex > 0) {
      const prev = allFlat[currentFlatIndex - 1];
      if (prev.pageIndex !== currentPageIndex) {
        setCurrentPageIndex(prev.pageIndex);
        setImageLoaded(false);
      }
      setCurrentSegmentIndex(prev.segmentIndex);
      setTimeRemaining(prev.segment.duration);
    }
  }, [currentPageIndex, currentSegmentIndex, getAllSegmentsFlat]);

  const handleNextSegment = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    const allFlat = getAllSegmentsFlat();
    const currentFlatIndex = allFlat.findIndex(
      f => f.pageIndex === currentPageIndex && f.segmentIndex === currentSegmentIndex
    );
    if (currentFlatIndex < allFlat.length - 1) {
      const next = allFlat[currentFlatIndex + 1];
      if (next.pageIndex !== currentPageIndex) {
        setCurrentPageIndex(next.pageIndex);
        setImageLoaded(false);
      }
      setCurrentSegmentIndex(next.segmentIndex);
      setTimeRemaining(next.segment.duration);
    }
  }, [currentPageIndex, currentSegmentIndex, getAllSegmentsFlat]);

  const goToPage = useCallback((pageIndex: number) => {
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    setCurrentPageIndex(pageIndex);
    setCurrentSegmentIndex(0);
    setImageLoaded(false);
    setSelectedSegmentId(null);
    const pageSegs = allSegments[pageIndex];
    if (pageSegs && pageSegs.length > 0) {
      setTimeRemaining(pageSegs[0].duration);
    }
  }, [allSegments]);

  const getTotalSegments = useCallback(() => {
    return getAllSegmentsFlat().length;
  }, [getAllSegmentsFlat]);

  const togglePlay = useCallback(() => {
    if (getTotalSegments() === 0) {
      toast({ title: 'Create segments first', description: 'Press E to enter edit mode' });
      return;
    }
    if (isEditMode) {
      toast({ title: 'Exit edit mode to play' });
      return;
    }
    
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    if (newPlayingState && audioRef.current && audioUrl && audioSettings.autoPlay) {
      audioRef.current.play().then(() => {
        setAudioUnlocked(true);
      }).catch((err) => {
        console.log('Audio autoplay blocked:', err);
      });
    }
  }, [isEditMode, getTotalSegments, isPlaying, audioUrl, audioSettings.autoPlay]);

  const restartFromBeginning = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentPageIndex(0);
    setCurrentSegmentIndex(0);
    setTotalElapsed(0);
    setAudioCurrentTime(0);
    const firstPageSegs = allSegments[0];
    if (firstPageSegs && firstPageSegs.length > 0) {
      setTimeRemaining(firstPageSegs[0].duration);
    }
  }, [allSegments]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        handleNextSegment();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        handlePrevSegment();
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      } else if (e.code === 'KeyE') {
        setIsEditMode(m => !m);
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.pause();
      } else if (e.code === 'KeyM') {
        setIsMuted(m => !m);
      } else if (e.code === 'KeyA') {
        setShowAudioPanel(p => !p);
      } else if (e.code === 'KeyS' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.code === 'Escape') {
        if (isEditMode) {
          setIsEditMode(false);
        } else if (!document.fullscreenElement) {
          saveToStorage(allSegments, defaultDuration, audioSettings);
          onClose();
        }
      } else if (e.code === 'Delete' && selectedSegmentId) {
        deleteSegment(selectedSegmentId);
      } else if (e.code === 'Home') {
        e.preventDefault();
        restartFromBeginning();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleNextSegment, handlePrevSegment, toggleFullscreen, isEditMode, handleSave, saveToStorage, allSegments, defaultDuration, audioSettings, onClose, selectedSegmentId, deleteSegment, restartFromBeginning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${secs}s`;
  };

  const formatTimeDetailed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${secs}.${tenths}`;
  };

  const getTotalDuration = useCallback(() => {
    return getAllSegmentsFlat().reduce((total, f) => total + f.segment.duration, 0);
  }, [getAllSegmentsFlat]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  }, []);

  const getCurrentGlobalIndex = useCallback(() => {
    const allFlat = getAllSegmentsFlat();
    return allFlat.findIndex(
      f => f.pageIndex === currentPageIndex && f.segmentIndex === currentSegmentIndex
    );
  }, [currentPageIndex, currentSegmentIndex, getAllSegmentsFlat]);

  const getDrawingPreviewStyle = useCallback(() => {
    if (!drawingState || !imageRef.current) return { display: 'none' };
    const minY = Math.min(drawingState.startY, drawingState.currentY);
    const maxY = Math.max(drawingState.startY, drawingState.currentY);
    return {
      top: `${getDisplayY(minY)}px`,
      height: `${getDisplayY(maxY) - getDisplayY(minY)}px`,
    };
  }, [drawingState, getDisplayY]);

  const getSegmentStyle = useCallback((segment: Segment) => {
    if (!imageRef.current || !imageDimensions.height) return {};
    return {
      top: `${getDisplayY(segment.startY)}px`,
      height: `${Math.max(getDisplayY(segment.endY) - getDisplayY(segment.startY), 24)}px`,
    };
  }, [imageDimensions.height, getDisplayY]);

  const handleClose = useCallback(() => {
    saveToStorage(allSegments, defaultDuration, audioSettings);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onClose();
  }, [saveToStorage, allSegments, defaultDuration, audioSettings, onClose]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col select-none"
      onClick={unlockAudio}
    >
      {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            preload="auto"
          />
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioUpload}
          className="hidden"
        />
        
        {!isPresentationMode && (
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/10">
            <div className="flex items-center gap-3">
              <h2 className="text-white font-semibold truncate max-w-[200px]" dir="rtl">{title}</h2>
              <span className="text-white/50 text-sm">Page {currentPageIndex + 1}/{allPages.length}</span>
              {lastSaved && (
                <span className="text-white/30 text-xs flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  Saved
                </span>
              )}
              {hasUnsavedChanges && (
                <span className="text-yellow-400 text-xs">Unsaved</span>
              )}
            </div>
          
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {isEditMode && (
                <span className="text-emerald-400 text-xs font-medium px-2 py-1 bg-emerald-500/20 rounded mr-2">
                  EDIT MODE
                </span>
              )}
              {audioUrl && (
                <Button variant="ghost" size="sm" onClick={() => { setIsMuted(!isMuted); unlockAudio(); }} className="text-white hover:bg-white/10">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowAudioPanel(!showAudioPanel)} className={`text-white hover:bg-white/10 ${audioUrl ? 'text-primary' : ''}`}>
                <Music className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSegmentOverlay(!showSegmentOverlay)} className="text-white hover:bg-white/10">
                {showSegmentOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="text-white hover:bg-white/10">
                <Settings2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-white hover:bg-white/10">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

      <div className="flex-1 flex overflow-hidden" onMouseMove={isPresentationMode ? resetControlsTimeout : undefined}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {images.length > 1 && !isPresentationMode && (
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index)}
                  className={`relative flex-shrink-0 w-12 h-16 rounded border-2 overflow-hidden transition-all ${
                    index === currentPageIndex ? 'border-primary ring-2 ring-primary/50' : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  <img src={img} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
                  {(allSegments[index]?.length || 0) > 0 && (
                    <div className="absolute bottom-0 right-0 bg-primary text-white text-[10px] px-1 rounded-tl">
                      {allSegments[index].length}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div ref={viewportRef} className="flex-1 overflow-auto relative bg-zinc-950">
            <div 
              ref={imageContainerRef}
              className="relative inline-block min-w-full"
              onMouseDown={isEditMode ? handleMouseDown : undefined}
              onMouseMove={handleMouseMove}
              style={{ cursor: isEditMode ? 'crosshair' : 'default' }}
            >
              <img
                ref={imageRef}
                src={currentImage}
                alt={title}
                className="w-full h-auto pointer-events-none"
                onLoad={handleImageLoad}
                draggable={false}
              />
              
              {drawingState && (
                <div 
                  className="absolute left-0 right-0 bg-emerald-500/30 border-2 border-emerald-400 border-dashed pointer-events-none"
                  style={getDrawingPreviewStyle()}
                />
              )}
              
              {imageLoaded && showSegmentOverlay && currentPageSegments.map((segment, index) => {
                const isSelected = selectedSegmentId === segment.id;
                const isCurrent = index === currentSegmentIndex && !isEditMode;
                const isDragging = dragState?.segmentId === segment.id;
                
                return (
                  <div
                    key={segment.id}
                    className={`absolute left-0 right-0 transition-colors ${isDragging ? '' : 'transition-all'} ${
                      isCurrent
                        ? 'bg-primary/30 border-y-2 border-primary'
                        : isSelected && isEditMode
                          ? 'bg-emerald-500/25 border-y-2 border-emerald-400'
                          : isEditMode
                            ? 'bg-blue-500/15 border-y border-blue-400/40 hover:bg-blue-500/25'
                            : 'bg-white/5 border-y border-white/10'
                    }`}
                    style={getSegmentStyle(segment)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEditMode) {
                        setSelectedSegmentId(segment.id);
                      } else {
                        setCurrentSegmentIndex(index);
                        setIsPlaying(false);
                        if (audioRef.current) audioRef.current.pause();
                        setTimeRemaining(segment.duration);
                      }
                    }}
                  >
                    {isEditMode && (
                      <>
                        <div 
                          className="absolute top-0 left-0 right-0 h-4 cursor-ns-resize hover:bg-emerald-400/40 flex items-center justify-center group"
                          onMouseDown={(e) => startDrag(e, segment, 'resize-top')}
                        >
                          <div className="w-16 h-1.5 bg-white/30 group-hover:bg-emerald-400 rounded-full transition-colors" />
                        </div>
                        
                        <div 
                          className="absolute left-0 right-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
                          style={{ top: '16px', bottom: '16px' }}
                          onMouseDown={(e) => startDrag(e, segment, 'move')}
                        >
                          <GripVertical className="w-5 h-5 text-white/30" />
                        </div>
                        
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize hover:bg-emerald-400/40 flex items-center justify-center group"
                          onMouseDown={(e) => startDrag(e, segment, 'resize-bottom')}
                        >
                          <div className="w-16 h-1.5 bg-white/30 group-hover:bg-emerald-400 rounded-full transition-colors" />
                        </div>
                      </>
                    )}
                    
                    <div className={`absolute top-1 left-2 text-xs px-2 py-0.5 rounded ${
                      isCurrent ? 'bg-primary text-white' : isSelected && isEditMode ? 'bg-emerald-500 text-white' : 'bg-black/60 text-white/80'
                    }`}>
                      {index + 1}. {segment.label} <span className="opacity-60">• {segment.duration}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showSettings && (
          <div className="w-72 bg-zinc-900 border-l border-white/10 overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              <Button
                variant={isEditMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setIsEditMode(!isEditMode); setIsPlaying(false); if (audioRef.current) audioRef.current.pause(); }}
                className={`w-full ${isEditMode ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                {isEditMode ? (
                  <><MousePointer2 className="w-4 h-4 mr-2" />Exit Edit Mode (E)</>
                ) : (
                  <><Crosshair className="w-4 h-4 mr-2" />Edit Segments (E)</>
                )}
              </Button>

              {isEditMode && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                  <p className="font-medium text-emerald-300 mb-2">How to add segments:</p>
                  <ol className="text-xs space-y-1 text-emerald-200/80 list-decimal list-inside">
                    <li>Click and drag on the image</li>
                    <li>Release to create segment</li>
                    <li>Drag handles to resize</li>
                    <li>Drag middle to move</li>
                  </ol>
                </div>
              )}

              {showAudioPanel && (
                <div className="border border-white/10 rounded-lg p-3 bg-white/5">
                  <h3 className="text-white font-medium flex items-center gap-2 mb-3">
                    <Music className="w-4 h-4" />
                    Audio
                  </h3>
                  
                  {audioLoading ? (
                    <p className="text-white/50 text-sm">Loading audio...</p>
                  ) : audioUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-white/80 text-xs truncate flex-1">{audioFileName}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={handleRemoveAudio}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-white/50">
                          <span>{formatTime(audioCurrentTime)}</span>
                          <span>{formatTime(audioDuration)}</span>
                        </div>
                        <Slider
                          value={[audioCurrentTime]}
                          max={audioDuration || 100}
                          step={0.1}
                          onValueChange={(v) => seekAudio(v[0])}
                          className="cursor-pointer"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60 text-xs">Volume</span>
                          <span className="text-white/40 text-xs">{Math.round(audioSettings.volume * 100)}%</span>
                        </div>
                        <Slider
                          value={[audioSettings.volume]}
                          max={1}
                          step={0.01}
                          onValueChange={(v) => { setAudioSettings(s => ({ ...s, volume: v[0] })); setHasUnsavedChanges(true); }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60 text-xs">Speed</span>
                          <span className="text-white/40 text-xs">{audioSettings.playbackRate}x</span>
                        </div>
                        <Slider
                          value={[audioSettings.playbackRate]}
                          min={0.5}
                          max={2}
                          step={0.1}
                          onValueChange={(v) => { setAudioSettings(s => ({ ...s, playbackRate: v[0] })); setHasUnsavedChanges(true); }}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant={audioSettings.loop ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => { setAudioSettings(s => ({ ...s, loop: !s.loop })); setHasUnsavedChanges(true); }}
                          className="flex-1 h-8"
                        >
                          {audioSettings.loop ? <Repeat1 className="w-3 h-3 mr-1" /> : <Repeat className="w-3 h-3 mr-1" />}
                          Loop
                        </Button>
                        <Button
                          variant={audioSettings.autoPlay ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => { setAudioSettings(s => ({ ...s, autoPlay: !s.autoPlay })); setHasUnsavedChanges(true); }}
                          className="flex-1 h-8"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Auto
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-white/50 text-xs">No audio uploaded yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Audio
                      </Button>
                      <p className="text-white/30 text-[10px] text-center">Audio is saved locally on your device</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    Default Time
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDefaultDuration(d => Math.max(1, d - 1)); setHasUnsavedChanges(true); }}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-white font-mono w-10 text-center">{defaultDuration}s</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDefaultDuration(d => Math.min(120, d + 1)); setHasUnsavedChanges(true); }}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-white/60 mb-2">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Total: {formatTime(getTotalDuration())}</span>
                  <span>{getTotalSegments()} segments</span>
                </div>
              </div>

              {currentPageSegments.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-medium text-sm">Page Segments</h3>
                    <Button variant="ghost" size="sm" onClick={clearPageSegments} className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <Trash2 className="w-3 h-3 mr-1" /> Clear
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {currentPageSegments.map((segment, index) => {
                      const isSelected = selectedSegmentId === segment.id;
                      return (
                        <div
                          key={segment.id}
                          className={`p-2 rounded-lg border transition-all ${
                            isSelected ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                          onClick={() => {
                            setSelectedSegmentId(segment.id);
                            if (!isEditMode) {
                              setCurrentSegmentIndex(index);
                              setIsPlaying(false);
                              if (audioRef.current) audioRef.current.pause();
                              setTimeRemaining(segment.duration);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white/50 text-xs w-4">{index + 1}</span>
                            <Input
                              value={segment.label}
                              onChange={(e) => updateSegmentLabel(segment.id, e.target.value)}
                              className="h-6 text-xs flex-1 bg-white/5 border-white/10"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              onClick={(e) => { e.stopPropagation(); deleteSegment(segment.id); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 pl-6">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={segment.duration}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  updateSegmentDuration(segment.id, parseInt(val) || 1);
                                }}
                                className="h-7 w-16 text-sm text-center bg-white/5 border border-white/20 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-white/50 text-xs">sec</span>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-white/10 pt-4 space-y-2">
                <Button variant="default" size="sm" onClick={handleSave} className="w-full">
                  <Save className="w-4 h-4 mr-2" /> Save (Ctrl+S)
                </Button>
                {getTotalSegments() > 0 && (
                  <Button variant="outline" size="sm" onClick={resetAll} className="w-full text-red-400 border-red-400/30 hover:bg-red-500/10">
                    <RotateCcw className="w-4 h-4 mr-2" /> Reset All
                  </Button>
                )}
              </div>

              <div className="text-xs text-white/40 space-y-1 border-t border-white/10 pt-4">
                <p><kbd className="px-1 bg-white/10 rounded">Space</kbd> Play/Pause</p>
                <p><kbd className="px-1 bg-white/10 rounded">←</kbd><kbd className="px-1 bg-white/10 rounded ml-1">→</kbd> Prev/Next</p>
                <p><kbd className="px-1 bg-white/10 rounded">E</kbd> Toggle edit</p>
                <p><kbd className="px-1 bg-white/10 rounded">A</kbd> Audio panel</p>
                <p><kbd className="px-1 bg-white/10 rounded">M</kbd> Mute/Unmute</p>
                <p><kbd className="px-1 bg-white/10 rounded">F</kbd> Fullscreen</p>
                <p><kbd className="px-1 bg-white/10 rounded">Home</kbd> Restart</p>
              </div>
              </div>
            </div>
          )}
        </div>

        {isPresentationMode ? (
          <div 
            className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-4 px-4">
              <div className="flex items-center justify-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => goToPage(Math.max(0, currentPageIndex - 1))} disabled={currentPageIndex === 0} className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 h-8 w-8">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handlePrevSegment} disabled={getCurrentGlobalIndex() <= 0} className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 h-8 w-8">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNextSegment} disabled={getCurrentGlobalIndex() >= getTotalSegments() - 1} className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 h-8 w-8">
                  <SkipForward className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => goToPage(Math.min(allPages.length - 1, currentPageIndex + 1))} disabled={currentPageIndex >= allPages.length - 1} className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                {audioUrl && (
                  <Button variant="ghost" size="icon" onClick={() => { setIsMuted(!isMuted); }} className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8">
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="max-w-sm mx-auto mt-2">
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <span className="text-xs">{formatTime(totalElapsed)}</span>
                  <div className="flex-1 bg-white/20 rounded-full h-1 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all"
                      style={{ width: `${Math.max(0, ((getCurrentGlobalIndex() + 1 - (timeRemaining / (currentSegment?.duration || 1))) / getTotalSegments()) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs">{formatTime(getTotalDuration())}</span>
                </div>
                <div className="text-center text-white/50 text-xs mt-1">
                  {currentPageIndex + 1}/{allPages.length} • {Math.max(1, getCurrentGlobalIndex() + 1)}/{getTotalSegments()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 border-t border-white/10 px-4 py-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button variant="ghost" size="icon" onClick={() => goToPage(Math.max(0, currentPageIndex - 1))} disabled={currentPageIndex === 0} className="text-white hover:bg-white/10 disabled:opacity-30">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePrevSegment} disabled={getCurrentGlobalIndex() <= 0} className="text-white hover:bg-white/10 disabled:opacity-30">
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={togglePlay}
                disabled={getTotalSegments() === 0 || isEditMode}
                className="w-14 h-14 rounded-full"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextSegment} disabled={getCurrentGlobalIndex() >= getTotalSegments() - 1} className="text-white hover:bg-white/10 disabled:opacity-30">
                <SkipForward className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => goToPage(Math.min(allPages.length - 1, currentPageIndex + 1))} disabled={currentPageIndex >= allPages.length - 1} className="text-white hover:bg-white/10 disabled:opacity-30">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {getTotalSegments() > 0 ? (
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between text-white/60 text-xs mb-1">
                  <span>{formatTime(totalElapsed)}</span>
                  <span className="text-lg font-mono text-white font-medium">{formatTimeDetailed(timeRemaining)}</span>
                  <span>{formatTime(getTotalDuration())}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all"
                    style={{ width: `${Math.max(0, ((getCurrentGlobalIndex() + 1 - (timeRemaining / (currentSegment?.duration || 1))) / getTotalSegments()) * 100)}%` }}
                  />
                </div>
                <div className="text-center text-white/50 text-xs mt-1">
                  Segment {Math.max(1, getCurrentGlobalIndex() + 1)}/{getTotalSegments()}
                  {currentSegment?.label && ` — ${currentSegment.label}`}
                </div>
              </div>
            ) : (
              <p className="text-center text-white/40 text-sm">
                {isEditMode ? 'Click and drag on the image to create segments' : 'Press E to enter edit mode and create segments'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  });
