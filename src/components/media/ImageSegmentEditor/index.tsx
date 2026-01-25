import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { useUndoRedo, useKeyboardShortcuts, useZoomPan, useAudioPlayer, useSegmentSelection } from './hooks';
import {
  Toolbar,
  WaveformTimeline,
  PageNavigation,
  ImageCanvas,
  SegmentList,
  SegmentEditor,
  TimelineView,
  SelectionToolbar,
} from './components';
import type { ImageRegion } from './types';

export type { ImageRegion } from './types';

interface ImageSegmentEditorProps {
  imageUrls: string[];
  pdfUrl?: string;
  audioUrl?: string;
  regions: ImageRegion[];
  onRegionsChange: (regions: ImageRegion[]) => void;
  onSave: () => void;
  hasChanges?: boolean;
}

export function ImageSegmentEditor({
  imageUrls,
  pdfUrl,
  audioUrl,
  regions: initialRegions,
  onRegionsChange,
  onSave,
  hasChanges = false,
}: ImageSegmentEditorProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [hiddenRegionIds, setHiddenRegionIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'image' | 'timeline'>('image');
  const [clipboardRegion, setClipboardRegion] = useState<ImageRegion | null>(null);
  
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    regions,
    setRegions,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength,
    resetHistory,
  } = useUndoRedo(initialRegions);

  const audioPlayer = useAudioPlayer({ audioUrl });
  
  const zoomPan = useZoomPan({
    containerRef,
    imageRef,
    enabled: viewMode === 'image',
  });

  const handleRegionsDelete = useCallback((ids: string[]) => {
    setRegions(regions.filter(r => !ids.includes(r.id)));
  }, [regions, setRegions]);

  const selection = useSegmentSelection({
    regions,
    onRegionsDelete: handleRegionsDelete,
  });

  const activeId = useMemo(() => {
    const active = regions.find(r => 
      audioPlayer.currentTime >= r.startTime && audioPlayer.currentTime < r.endTime
    );
    return active?.id ?? null;
  }, [regions, audioPlayer.currentTime]);

  useEffect(() => {
    onRegionsChange(regions);
  }, [regions, onRegionsChange]);

  useEffect(() => {
    resetHistory(initialRegions);
  }, [initialRegions, resetHistory]);

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

  const allPages = useMemo(() => 
    pdfUrl && pdfPages.length > 0 ? pdfPages : imageUrls,
  [pdfUrl, pdfPages, imageUrls]);

  const currentPageRegions = useMemo(() =>
    regions.filter(r => r.imageIndex === currentPageIndex).sort((a, b) => a.y - b.y),
  [regions, currentPageIndex]);

  const regionsPerPage = useMemo(() => {
    const map = new Map<number, number>();
    regions.forEach(r => {
      map.set(r.imageIndex, (map.get(r.imageIndex) || 0) + 1);
    });
    return map;
  }, [regions]);

  const handleRegionCreate = useCallback((y: number, height: number) => {
    const sortedRegions = [...regions].sort((a, b) => a.endTime - b.endTime);
    const lastRegion = sortedRegions[sortedRegions.length - 1];
    const newStartTime = lastRegion ? lastRegion.endTime : 0;
    const defaultDuration = 5;
    const newEndTime = newStartTime + defaultDuration;
    
    const newRegion: ImageRegion = {
      id: `region-${Date.now()}`,
      imageIndex: currentPageIndex,
      x: 0,
      y,
      width: 100,
      height,
      startTime: newStartTime,
      endTime: newEndTime,
      order: regions.length,
      label: `Segment ${regions.filter(r => r.imageIndex === currentPageIndex).length + 1}`,
    };
    
    setRegions([...regions, newRegion]);
    selection.select(newRegion.id);
    selection.focus(newRegion.id);
  }, [regions, currentPageIndex, setRegions, selection]);

  const handleRegionUpdate = useCallback((id: string, updates: Partial<ImageRegion>) => {
    setRegions(regions.map(r => r.id === id ? { ...r, ...updates } : r));
  }, [regions, setRegions]);

  const handleRegionDelete = useCallback((id: string) => {
    setRegions(regions.filter(r => r.id !== id));
    selection.deselectAll();
  }, [regions, setRegions, selection]);

  const handleToggleVisibility = useCallback((id: string) => {
    setHiddenRegionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCopySegment = useCallback(() => {
    if (selection.selectedIds.size > 0) {
      const firstSelected = regions.find(r => selection.selectedIds.has(r.id));
      if (firstSelected) {
        setClipboardRegion(firstSelected);
        toast.success(`${selection.selectedIds.size} segment${selection.selectedIds.size > 1 ? 's' : ''} copied`);
      }
    }
  }, [selection.selectedIds, regions]);

  const handlePasteSegment = useCallback(() => {
    if (clipboardRegion) {
      const newRegion: ImageRegion = {
        ...clipboardRegion,
        id: `region-${Date.now()}`,
        imageIndex: currentPageIndex,
        order: regions.length,
        startTime: clipboardRegion.startTime + 5,
        endTime: clipboardRegion.endTime + 5,
      };
      setRegions([...regions, newRegion]);
      selection.select(newRegion.id);
      toast.success('Segment pasted');
    }
  }, [clipboardRegion, currentPageIndex, regions, setRegions, selection]);

  const handleDuplicateSegment = useCallback(() => {
    if (selection.focusedId) {
      const region = regions.find(r => r.id === selection.focusedId);
      if (region) {
        const newRegion: ImageRegion = {
          ...region,
          id: `region-${Date.now()}`,
          order: regions.length,
          y: Math.min(region.y + 5, 100 - region.height),
          startTime: region.endTime,
          endTime: region.endTime + (region.endTime - region.startTime),
        };
        setRegions([...regions, newRegion]);
        selection.select(newRegion.id);
        selection.focus(newRegion.id);
        toast.success('Segment duplicated');
      }
    }
  }, [selection, regions, setRegions]);

  const handlePlayRegion = useCallback((regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    if (region && audioPlayer.hasAudio) {
      audioPlayer.playRegion(region.startTime, region.endTime);
    }
  }, [regions, audioPlayer]);

  const handleSetStartTime = useCallback(() => {
    if (selection.focusedId) {
      handleRegionUpdate(selection.focusedId, { startTime: audioPlayer.currentTime });
    }
  }, [selection.focusedId, audioPlayer.currentTime, handleRegionUpdate]);

  const handleSetEndTime = useCallback(() => {
    if (selection.focusedId) {
      handleRegionUpdate(selection.focusedId, { endTime: audioPlayer.currentTime });
    }
  }, [selection.focusedId, audioPlayer.currentTime, handleRegionUpdate]);

  const handleAdjustStartTime = useCallback((delta: number) => {
    if (selection.focusedRegion) {
      const newStart = Math.max(0, selection.focusedRegion.startTime + delta);
      handleRegionUpdate(selection.focusedRegion.id, { startTime: newStart });
    }
  }, [selection.focusedRegion, handleRegionUpdate]);

  const handleAdjustEndTime = useCallback((delta: number) => {
    if (selection.focusedRegion) {
      const newEnd = Math.max(0, selection.focusedRegion.endTime + delta);
      handleRegionUpdate(selection.focusedRegion.id, { endTime: newEnd });
    }
  }, [selection.focusedRegion, handleRegionUpdate]);

  const handleNewSegment = useCallback(() => {
    handleRegionCreate(50, 10);
  }, [handleRegionCreate]);

  const handleDeselect = useCallback(() => {
    selection.deselectAll();
  }, [selection]);

  const handlePrevPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPageIndex(prev => Math.min(allPages.length - 1, prev + 1));
  }, [allPages.length]);

  const handleShiftSelectedTime = useCallback((delta: number) => {
    const selectedIds = Array.from(selection.selectedIds);
    setRegions(regions.map(r => {
      if (selectedIds.includes(r.id)) {
        const newEndTime = Math.max(r.startTime + 0.1, r.endTime + delta);
        return {
          ...r,
          endTime: newEndTime,
        };
      }
      return r;
    }));
    toast.success(`Adjusted ${selectedIds.length} segment${selectedIds.length > 1 ? 's' : ''} duration by ${delta}s`);
  }, [selection.selectedIds, regions, setRegions]);

  useKeyboardShortcuts({
    onTogglePlayPause: audioPlayer.togglePlayPause,
    onSetStartTime: handleSetStartTime,
    onSetEndTime: handleSetEndTime,
    onNewSegment: handleNewSegment,
    onDeleteSelected: selection.deleteSelected,
    onCopySegment: handleCopySegment,
    onPasteSegment: handlePasteSegment,
    onDuplicateSegment: handleDuplicateSegment,
    onUndo: undo,
    onRedo: redo,
    onSeekBackward: (s) => audioPlayer.seekRelative(-s),
    onSeekForward: (s) => audioPlayer.seekRelative(s),
    onAdjustStartTime: handleAdjustStartTime,
    onAdjustEndTime: handleAdjustEndTime,
    onDeselect: handleDeselect,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onZoomIn: zoomPan.zoomIn,
    onZoomOut: zoomPan.zoomOut,
    onResetZoom: zoomPan.resetZoomPan,
    selectedRegionId: selection.focusedId,
    editingRegionId: selection.focusedId,
    hasAudio: audioPlayer.hasAudio,
  });

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
      <Toolbar
        hasChanges={hasChanges}
        canUndo={canUndo}
        canRedo={canRedo}
        historyLength={historyLength}
        zoom={zoomPan.zoom}
        viewMode={viewMode}
        onSave={onSave}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={zoomPan.zoomIn}
        onZoomOut={zoomPan.zoomOut}
        onResetZoom={zoomPan.resetZoomPan}
        onToggleViewMode={() => setViewMode(v => v === 'image' ? 'timeline' : 'image')}
      />

      {audioUrl && (
        <WaveformTimeline
          audioUrl={audioUrl}
          regions={regions}
          currentTime={audioPlayer.currentTime}
          duration={audioPlayer.duration}
          isPlaying={audioPlayer.isPlaying}
          playbackRate={audioPlayer.playbackRate}
          isLooping={audioPlayer.isLooping}
          onTogglePlayPause={audioPlayer.togglePlayPause}
          onSeekTo={audioPlayer.seekTo}
          onSeekRelative={audioPlayer.seekRelative}
          onSetPlaybackRate={audioPlayer.setPlaybackRate}
          onRegionClick={(id) => {
            selection.select(id);
            const region = regions.find(r => r.id === id);
            if (region) setCurrentPageIndex(region.imageIndex);
          }}
          onPlayRegion={handlePlayRegion}
          selectedRegionId={selection.focusedId}
          activeRegionId={activeId}
        />
      )}

      <PageNavigation
        pages={allPages}
        currentPageIndex={currentPageIndex}
        regionsPerPage={regionsPerPage}
        onPageChange={setCurrentPageIndex}
      />

      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'image' ? (
          <div className="flex-1 overflow-auto p-4">
            <div className="mx-auto max-w-3xl">
              <ImageCanvas
                imageSrc={allPages[currentPageIndex]}
                regions={currentPageRegions}
                selectedIds={selection.selectedIds}
                focusedId={selection.focusedId}
                activeId={activeId}
                hiddenRegionIds={hiddenRegionIds}
                audioUrl={audioUrl}
                playingRegionId={activeId}
                onPlayRegion={handlePlayRegion}
                onStopPlaying={audioPlayer.stop}
                onRegionCreate={handleRegionCreate}
                onRegionUpdate={handleRegionUpdate}
                onRegionSelect={selection.select}
                onRegionFocus={selection.focus}
                onToggleVisibility={handleToggleVisibility}
                onDeselectAll={selection.deselectAll}
                isZoomed={zoomPan.isZoomed}
                getTransformStyle={zoomPan.getTransformStyle}
                imageRef={imageRef}
                containerRef={containerRef}
                onStartPanning={zoomPan.startPanning}
                onUpdatePan={zoomPan.updatePan}
                onStopPanning={zoomPan.stopPanning}
              />
            </div>
          </div>
        ) : (
          <TimelineView
            regions={regions}
            allPages={allPages}
            duration={audioPlayer.duration}
            currentTime={audioPlayer.currentTime}
            selectedRegionId={selection.focusedId}
            onRegionSelect={(id) => selection.select(id)}
            onRegionEdit={(id) => selection.focus(id)}
            onSeekTo={audioPlayer.seekTo}
            onRegionUpdate={handleRegionUpdate}
          />
        )}

        <div className="w-80 border-l bg-card flex flex-col">
          {selection.focusedRegion ? (
            <SegmentEditor
              region={selection.focusedRegion}
              currentTime={audioPlayer.currentTime}
              duration={audioPlayer.duration}
              hasAudio={audioPlayer.hasAudio}
              onSave={(updates) => {
                handleRegionUpdate(selection.focusedRegion!.id, updates);
                selection.focus(null);
              }}
              onDelete={() => handleRegionDelete(selection.focusedRegion!.id)}
              onCancel={() => selection.focus(null)}
              onPlayRegion={() => handlePlayRegion(selection.focusedRegion!.id)}
              onCopy={handleCopySegment}
            />
          ) : (
            <SegmentList
              regions={regions}
              allPages={allPages}
              currentPageIndex={currentPageIndex}
              selectedIds={selection.selectedIds}
              focusedId={selection.focusedId}
              activeId={activeId}
              hiddenRegionIds={hiddenRegionIds}
              onSelect={selection.select}
              onFocus={selection.focus}
              onToggleVisibility={handleToggleVisibility}
              onChangePage={setCurrentPageIndex}
              onPlayRegion={audioPlayer.hasAudio ? handlePlayRegion : undefined}
            />
          )}
        </div>
      </div>

      <SelectionToolbar
        selectedCount={selection.selectedCount}
        selectedRegion={selection.selectedCount === 1 ? selection.selectedRegions[0] : null}
        audioUrl={audioUrl}
        totalCount={regions.length}
        onDelete={selection.deleteSelected}
        onCopy={handleCopySegment}
        onDeselectAll={selection.deselectAll}
        onSelectAll={selection.selectAll}
        onShiftTime={handleShiftSelectedTime}
      />
    </div>
  );
}
