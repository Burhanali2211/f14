import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play, Pause, Trash2, Save, Clock, ChevronLeft, ChevronRight,
  Check, FileText, Loader2, Plus, GripHorizontal, Eye, EyeOff,
  SkipBack, SkipForward, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatTime, parseTime } from '@/lib/teleprompter-storage';

export interface ImageRegion {
  id: string;
  imageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  endTime: number;
  order: number;
  label?: string;
}

interface ImageSegmentEditorProps {
  imageUrls: string[];
  pdfUrl?: string;
  audioUrl?: string;
  regions: ImageRegion[];
  onRegionsChange: (regions: ImageRegion[]) => void;
  onSave: () => void;
  hasChanges?: boolean;
}

const formatTimeParts = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return {
    mm: mins.toString().padStart(2, '0'),
    ss: secs.toString().padStart(2, '0'),
    cc: ms.toString().padStart(2, '0')
  };
};

const parseTimeParts = (mm: string, ss: string, cc: string) => {
  const mins = parseInt(mm || '0');
  const secs = parseInt(ss || '0');
  const ms = parseInt(cc || '0');
  return mins * 60 + secs + ms / 100;
};

export function ImageSegmentEditor({
  imageUrls,
  pdfUrl,
  audioUrl,
  regions,
  onRegionsChange,
  onSave,
  hasChanges = false,
}: ImageSegmentEditorProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartY, setDrawStartY] = useState<number | null>(null);
  const [currentBand, setCurrentBand] = useState<{ top: number; bottom: number } | null>(null);
  const [editingSegment, setEditingSegment] = useState<ImageRegion | null>(null);
  const [segmentForm, setSegmentForm] = useState({ 
    label: '', 
    startMM: '', startSS: '', startCC: '',
    endMM: '', endSS: '', endCC: ''
  });
  
  const endMinRef = useRef<HTMLInputElement>(null);
  const endSecRef = useRef<HTMLInputElement>(null);
  const endMsRef = useRef<HTMLInputElement>(null);
  const startMinRef = useRef<HTMLInputElement>(null);
  const startSecRef = useRef<HTMLInputElement>(null);
  const startMsRef = useRef<HTMLInputElement>(null);

  const [draggingHandle, setDraggingHandle] = useState<{ regionId: string; handle: 'top' | 'bottom' | 'move' } | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragOriginalY, setDragOriginalY] = useState<number>(0);
  const [hiddenRegions, setHiddenRegions] = useState<Set<string>>(new Set());

  const imageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allPages = pdfUrl && pdfPages.length > 0 ? pdfPages : imageUrls;
  const currentPageRegions = regions
    .filter(r => r.imageIndex === currentPageIndex)
    .sort((a, b) => a.y - b.y);

  useEffect(() => {
    if (!pdfUrl) return;
    
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(null);

    const loadPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        
        const pdf = await pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/cmaps/',
          cMapPacked: true,
        }).promise;
        
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 2;
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
          
          pages.push(canvas.toDataURL('image/png'));
        }
        
        if (!cancelled) {
          setPdfPages(pages);
          setPdfLoading(false);
        }
      } catch (err) {
        console.error('PDF load error:', err);
        if (!cancelled) {
          setPdfError('Failed to load PDF');
          setPdfLoading(false);
        }
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

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

  const getRelativeY = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return 0;
    const rect = imageRef.current.getBoundingClientRect();
    const scaleY = imageRef.current.naturalHeight / rect.height;
    return (e.clientY - rect.top) * scaleY;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editingSegment) return;
    
    const y = getRelativeY(e);
    setIsDrawing(true);
    setDrawStartY(y);
    setCurrentBand({ top: y, bottom: y });
  }, [getRelativeY, editingSegment]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingHandle && imageRef.current) {
      const y = getRelativeY(e);
      const region = regions.find(r => r.id === draggingHandle.regionId);
      if (region) {
        const updated = regions.map(r => {
          if (r.id === draggingHandle.regionId) {
            if (draggingHandle.handle === 'top') {
              const newY = Math.min(y, r.y + r.height - 20);
              return { ...r, y: Math.max(0, newY), height: r.y + r.height - Math.max(0, newY) };
            } else if (draggingHandle.handle === 'bottom') {
              const newHeight = Math.max(20, y - r.y);
              return { ...r, height: newHeight };
            } else if (draggingHandle.handle === 'move') {
              const deltaY = y - dragStartY;
              const newY = Math.max(0, dragOriginalY + deltaY);
              return { ...r, y: newY };
            }
          }
          return r;
        });
        onRegionsChange(updated);
      }
      return;
    }

    if (!isDrawing || drawStartY === null) return;
    
    const y = getRelativeY(e);
    setCurrentBand({
      top: Math.min(drawStartY, y),
      bottom: Math.max(drawStartY, y),
    });
  }, [isDrawing, drawStartY, getRelativeY, draggingHandle, regions, onRegionsChange, dragStartY, dragOriginalY]);

    const handleMouseUp = useCallback(() => {
      if (draggingHandle) {
        setDraggingHandle(null);
        return;
      }

      if (!isDrawing || !currentBand || !imageRef.current) {
        setIsDrawing(false);
        return;
      }

      const height = currentBand.bottom - currentBand.top;
      if (height > 30) {
        const sortedRegions = [...regions].sort((a, b) => a.endTime - b.endTime);
        const lastRegion = sortedRegions[sortedRegions.length - 1];
        const newStartTime = lastRegion ? lastRegion.endTime : 0;
        const defaultDuration = 5;
        const newEndTime = newStartTime + defaultDuration;
        
        const newRegion: ImageRegion = {
          id: `region-${Date.now()}`,
          imageIndex: currentPageIndex,
          x: 0,
          y: currentBand.top,
          width: imageRef.current.naturalWidth,
          height: height,
          startTime: newStartTime,
          endTime: newEndTime,
          order: regions.length,
          label: `Segment ${regions.filter(r => r.imageIndex === currentPageIndex).length + 1}`,
        };
        
        setEditingSegment(newRegion);
        
        const start = formatTimeParts(newStartTime);
        const end = formatTimeParts(newEndTime);

        setSegmentForm({
          label: newRegion.label || '',
          startMM: start.mm, startSS: start.ss, startCC: start.cc,
          endMM: end.mm, endSS: end.ss, endCC: end.cc,
        });

        // Auto focus and select end minute
        setTimeout(() => {
          if (endMinRef.current) {
            endMinRef.current.focus();
            endMinRef.current.select();
          }
        }, 100);
      }

      setIsDrawing(false);
      setDrawStartY(null);
      setCurrentBand(null);
    }, [isDrawing, currentBand, currentPageIndex, regions]);

  const handleSaveSegment = useCallback(() => {
    if (!editingSegment) return;

    const startTime = parseTimeParts(segmentForm.startMM, segmentForm.startSS, segmentForm.startCC);
    const endTime = parseTimeParts(segmentForm.endMM, segmentForm.endSS, segmentForm.endCC);

    if (endTime <= startTime) return;

    const updatedRegion: ImageRegion = {
      ...editingSegment,
      label: segmentForm.label || undefined,
      startTime,
      endTime,
    };

    const existingIndex = regions.findIndex(r => r.id === editingSegment.id);
    if (existingIndex >= 0) {
      const updated = [...regions];
      updated[existingIndex] = updatedRegion;
      onRegionsChange(updated);
    } else {
      onRegionsChange([...regions, updatedRegion]);
    }

    setEditingSegment(null);
    setSegmentForm({ 
      label: '', 
      startMM: '', startSS: '', startCC: '',
      endMM: '', endSS: '', endCC: ''
    });
  }, [editingSegment, segmentForm, regions, onRegionsChange]);

  const handleEditRegion = useCallback((region: ImageRegion) => {
    setEditingSegment(region);
    const start = formatTimeParts(region.startTime);
    const end = formatTimeParts(region.endTime);
    setSegmentForm({
      label: region.label || '',
      startMM: start.mm, startSS: start.ss, startCC: start.cc,
      endMM: end.mm, endSS: end.ss, endCC: end.cc,
    });
  }, []);

  const handleDeleteRegion = useCallback((regionId: string) => {
    onRegionsChange(regions.filter(r => r.id !== regionId));
    if (editingSegment?.id === regionId) {
      setEditingSegment(null);
    }
  }, [regions, onRegionsChange, editingSegment]);

  const setCurrentTimeAsStart = useCallback(() => {
    const parts = formatTimeParts(currentTime);
    setSegmentForm(prev => ({ 
      ...prev, 
      startMM: parts.mm, startSS: parts.ss, startCC: parts.cc 
    }));
  }, [currentTime]);

  const setCurrentTimeAsEnd = useCallback(() => {
    const parts = formatTimeParts(currentTime);
    setSegmentForm(prev => ({ 
      ...prev, 
      endMM: parts.mm, endSS: parts.ss, endCC: parts.cc 
    }));
  }, [currentTime]);

  const toggleRegionVisibility = useCallback((regionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHiddenRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  }, []);

    const handleStartMove = useCallback((e: React.MouseEvent, region: ImageRegion) => {
      e.stopPropagation();
      e.preventDefault();
      const y = getRelativeY(e);
      setDragStartY(y);
      setDragOriginalY(region.y);
      setDraggingHandle({ regionId: region.id, handle: 'move' });
    }, [getRelativeY]);

    const skipBackward = useCallback(() => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
    }, []);

    const skipForward = useCallback(() => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
    }, [duration]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement) return;
        
        if (e.code === 'Space') {
          e.preventDefault();
          togglePlayPause();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          skipBackward();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          skipForward();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlayPause, skipBackward, skipForward]);

  const renderBand = useCallback((region: ImageRegion | null, isTemp = false) => {
    if (!region || !imageRef.current) return null;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleY = rect.height / imageRef.current.naturalHeight;

    const top = region.y * scaleY;
    const height = region.height * scaleY;
    const isEditing = editingSegment?.id === region.id;
    const isDragging = draggingHandle?.regionId === region.id;
    const isHidden = hiddenRegions.has(region.id);

    if (isHidden && !isTemp) {
      return (
        <div
          key={region.id}
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top, height }}
        >
          <div className="absolute top-1 right-2 pointer-events-auto">
            <button
              className="p-1 rounded bg-background/80 hover:bg-background border shadow-sm"
              onClick={(e) => toggleRegionVisibility(region.id, e)}
              title="Show segment"
            >
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={isTemp ? 'temp' : region.id}
        className={cn(
          "absolute left-0 right-0 border-y-2 transition-colors",
          isTemp ? "border-primary bg-primary/20 border-dashed" :
          isEditing ? "border-primary bg-primary/30" : 
          isDragging ? "border-primary bg-primary/25" :
          "border-amber-500 bg-amber-500/20 hover:bg-amber-500/30"
        )}
        style={{ top, height }}
      >
        {!isTemp && (
          <>
            <div 
              className="absolute -top-1.5 left-0 right-0 h-3 cursor-ns-resize bg-transparent hover:bg-primary/50 z-10"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingHandle({ regionId: region.id, handle: 'top' });
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-primary/60 rounded opacity-0 hover:opacity-100" />
            </div>
            <div 
              className="absolute -bottom-1.5 left-0 right-0 h-3 cursor-ns-resize bg-transparent hover:bg-primary/50 z-10"
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingHandle({ regionId: region.id, handle: 'bottom' });
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-primary/60 rounded opacity-0 hover:opacity-100" />
            </div>
            
            <div 
              className="absolute inset-0 cursor-move"
              onMouseDown={(e) => handleStartMove(e, region)}
              onClick={(e) => {
                if (!isDragging) {
                  e.stopPropagation();
                  handleEditRegion(region);
                }
              }}
            />
            
            <div className="absolute top-1 left-2 right-2 flex items-center justify-between pointer-events-none">
              <span className="bg-background/90 px-2 py-0.5 rounded text-xs font-medium truncate max-w-[50%]">
                {region.label || `Segment ${region.order + 1}`}
              </span>
              <div className="flex items-center gap-1">
                <span className="bg-background/90 px-2 py-0.5 rounded text-xs font-mono">
                  {formatTime(region.startTime)} - {formatTime(region.endTime)}
                </span>
                <button
                  className="p-1 rounded bg-background/90 hover:bg-background pointer-events-auto"
                  onClick={(e) => toggleRegionVisibility(region.id, e)}
                  title="Hide segment"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }, [editingSegment, handleEditRegion, handleStartMove, draggingHandle, hiddenRegions, toggleRegionVisibility]);

  if (pdfLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading PDF pages...</p>
      </div>
    );
  }

  if (pdfError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <FileText className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive mb-2">{pdfError}</p>
      </div>
    );
  }

  if (allPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No images or PDF pages available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GripHorizontal className="w-4 h-4" />
          <span>Drag to create segments. Drag edges to resize, center to move.</span>
        </div>
        <Button onClick={onSave} disabled={!hasChanges} size="sm">
          <Save className="w-4 h-4 mr-1" />
          Save All
        </Button>
      </div>

        {audioUrl && (
          <div className="flex items-center gap-3 p-3 border-b bg-card">
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={skipBackward}
                title="Back 5s (←)"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button 
                variant="default" 
                size="icon" 
                className="h-10 w-10" 
                onClick={togglePlayPause}
                title="Play/Pause (Space)"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={skipForward}
                title="Forward 5s (→)"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1">
              <div
                className="h-4 bg-muted rounded-full cursor-pointer relative group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  seekTo(percentage * duration);
                }}
              >
                <div
                  className="h-full bg-primary rounded-full transition-all relative"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-foreground rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {regions.map(region => (
                  <div
                    key={region.id}
                    className="absolute top-0 h-full w-1 bg-amber-500/80 rounded"
                    style={{ left: `${duration > 0 ? (region.startTime / duration) * 100 : 0}%` }}
                    title={`${region.label || 'Segment'}: ${formatTime(region.startTime)}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm font-mono text-foreground min-w-[100px] text-center bg-muted px-2 py-1 rounded">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>
        )}



      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {allPages.length > 1 && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-3">
                Page {currentPageIndex + 1} / {allPages.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPageIndex(Math.min(allPages.length - 1, currentPageIndex + 1))}
                disabled={currentPageIndex === allPages.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div
            ref={containerRef}
            className="relative mx-auto max-w-3xl select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={allPages[currentPageIndex]}
              alt={`Page ${currentPageIndex + 1}`}
              className="w-full h-auto rounded-lg shadow-lg cursor-crosshair"
              draggable={false}
            />
            
            {currentPageRegions.map(region => renderBand(region))}
            
            {currentBand && imageRef.current && (
              <div
                className="absolute left-0 right-0 border-y-2 border-primary bg-primary/20 border-dashed pointer-events-none"
                style={{
                  top: currentBand.top * (imageRef.current.getBoundingClientRect().height / imageRef.current.naturalHeight),
                  height: (currentBand.bottom - currentBand.top) * (imageRef.current.getBoundingClientRect().height / imageRef.current.naturalHeight),
                }}
              />
            )}
          </div>
        </div>

        <div className="w-80 border-l bg-card flex flex-col">
          {editingSegment ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Edit Segment</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteRegion(editingSegment.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-xs">Segment Name</Label>
                <Input
                  value={segmentForm.label}
                  onChange={(e) => setSegmentForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Verse 1, Para 3..."
                  className="mt-1"
                />
              </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 block">Start Time (MM:SS.CC)</Label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-muted/50 rounded-lg px-2 border border-border focus-within:border-primary transition-colors">
                        <input
                          ref={startMinRef}
                          value={segmentForm.startMM}
                          onChange={(e) => setSegmentForm(prev => ({ ...prev, startMM: e.target.value.slice(0, 2) }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab' && !e.shiftKey) {
                              e.preventDefault();
                              startSecRef.current?.focus();
                              startSecRef.current?.select();
                            } else if (e.key === 'Enter') {
                              handleSaveSegment();
                            }
                          }}
                          className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
                          placeholder="00"
                        />
                        <span className="text-muted-foreground">:</span>
                        <input
                          ref={startSecRef}
                          value={segmentForm.startSS}
                          onChange={(e) => setSegmentForm(prev => ({ ...prev, startSS: e.target.value.slice(0, 2) }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              if (e.shiftKey) {
                                startMinRef.current?.focus();
                                startMinRef.current?.select();
                              } else {
                                startMsRef.current?.focus();
                                startMsRef.current?.select();
                              }
                            } else if (e.key === 'Enter') {
                              handleSaveSegment();
                            }
                          }}
                          className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
                          placeholder="00"
                        />
                        <span className="text-muted-foreground">.</span>
                        <input
                          ref={startMsRef}
                          value={segmentForm.startCC}
                          onChange={(e) => setSegmentForm(prev => ({ ...prev, startCC: e.target.value.slice(0, 2) }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              if (e.shiftKey) {
                                startSecRef.current?.focus();
                                startSecRef.current?.select();
                              } else {
                                endMinRef.current?.focus();
                                endMinRef.current?.select();
                              }
                            } else if (e.key === 'Enter') {
                              handleSaveSegment();
                            }
                          }}
                          className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
                          placeholder="00"
                        />
                      </div>
                      {audioUrl && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={setCurrentTimeAsStart}
                          title="Set to current time"
                          className="shrink-0 h-9 w-9 rounded-lg"
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 block">End Time (MM:SS.CC)</Label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-muted/50 rounded-lg px-2 border border-border focus-within:border-primary transition-colors">
                        <input
                          ref={endMinRef}
                          value={segmentForm.endMM}
                          onChange={(e) => setSegmentForm(prev => ({ ...prev, endMM: e.target.value.slice(0, 2) }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              if (e.shiftKey) {
                                startMsRef.current?.focus();
                                startMsRef.current?.select();
                              } else {
                                endSecRef.current?.focus();
                                endSecRef.current?.select();
                              }
                            } else if (e.key === 'Enter') {
                              handleSaveSegment();
                            }
                          }}
                          className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
                          placeholder="00"
                        />
                        <span className="text-muted-foreground">:</span>
                        <input
                          ref={endSecRef}
                          value={segmentForm.endSS}
                          onChange={(e) => setSegmentForm(prev => ({ ...prev, endSS: e.target.value.slice(0, 2) }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              if (e.shiftKey) {
                                endMinRef.current?.focus();
                                endMinRef.current?.select();
                              } else {
                                endMsRef.current?.focus();
                                endMsRef.current?.select();
                              }
                            } else if (e.key === 'Enter') {
                              handleSaveSegment();
                            }
                          }}
                          className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
                          placeholder="00"
                        />
                        <span className="text-muted-foreground">.</span>
                        <input
                          ref={endMsRef}
                          value={segmentForm.endCC}
                          onChange={(e) => setSegmentForm(prev => ({ ...prev, endCC: e.target.value.slice(0, 2) }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              if (e.shiftKey) {
                                endSecRef.current?.focus();
                                endSecRef.current?.select();
                              } else {
                                startMinRef.current?.focus();
                                startMinRef.current?.select();
                              }
                            } else if (e.key === 'Enter') {
                              handleSaveSegment();
                            }
                          }}
                          className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
                          placeholder="00"
                        />
                      </div>
                      {audioUrl && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={setCurrentTimeAsEnd}
                          title="Set to current time"
                          className="shrink-0 h-9 w-9 rounded-lg"
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

              {audioUrl && (
                <p className="text-xs text-muted-foreground text-center py-2 bg-muted rounded">
                  Current: <span className="font-mono">{formatTime(currentTime)}</span>
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingSegment(null);
                    setSegmentForm({ label: '', startTime: '', endTime: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveSegment}>
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">All Segments ({regions.length})</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag on the image to create segments
                  </p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {regions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Plus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No segments yet</p>
                        <p className="text-xs mt-1">Drag on the page to create</p>
                      </div>
                    ) : (
                      <>
                        {allPages.map((_, pageIdx) => {
                          const pageRegions = regions
                            .filter(r => r.imageIndex === pageIdx)
                            .sort((a, b) => a.startTime - b.startTime);
                          
                          if (pageRegions.length === 0) return null;
                          
                          return (
                            <div key={pageIdx} className="space-y-2">
                              {allPages.length > 1 && (
                                <div 
                                  className={cn(
                                    "text-xs font-medium px-2 py-1.5 rounded-md flex items-center justify-between cursor-pointer transition-colors",
                                    pageIdx === currentPageIndex 
                                      ? "bg-primary/10 text-primary" 
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  )}
                                  onClick={() => setCurrentPageIndex(pageIdx)}
                                >
                                  <span>Page {pageIdx + 1}</span>
                                  <span className="text-xs opacity-70">{pageRegions.length} segment{pageRegions.length !== 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {pageRegions.map((region, idx) => (
                                <div
                                  key={region.id}
                                  className={cn(
                                    "p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors",
                                    hiddenRegions.has(region.id) && "opacity-50",
                                    pageIdx !== currentPageIndex && "ml-2 border-l-2 border-l-muted"
                                  )}
                                  onClick={() => {
                                    if (pageIdx !== currentPageIndex) {
                                      setCurrentPageIndex(pageIdx);
                                    }
                                    handleEditRegion(region);
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm truncate flex-1">
                                      {region.label || `Segment ${idx + 1}`}
                                    </span>
                                    <button
                                      className="p-1 rounded hover:bg-muted ml-2"
                                      onClick={(e) => toggleRegionVisibility(region.id, e)}
                                      title={hiddenRegions.has(region.id) ? "Show segment" : "Hide segment"}
                                    >
                                      {hiddenRegions.has(region.id) ? (
                                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {formatTime(region.startTime)} - {formatTime(region.endTime)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
