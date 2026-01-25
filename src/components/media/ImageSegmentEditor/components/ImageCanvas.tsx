import { useCallback, memo, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ImageRegion } from '../types';
import { EyeOff, Eye, Trash2, Play, Pause, X, Settings } from 'lucide-react';

interface ImageCanvasProps {
  imageSrc: string;
  regions: ImageRegion[];
  selectedIds: Set<string>;
  focusedId: string | null;
  activeId: string | null;
  hiddenRegionIds: Set<string>;
  audioUrl?: string;
  playingRegionId: string | null;
  onRegionCreate: (y: number, height: number) => void;
  onRegionUpdate: (id: string, updates: Partial<ImageRegion>) => void;
  onRegionSelect: (id: string, options?: { addToSelection?: boolean; rangeSelect?: boolean }) => void;
  onRegionFocus: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onRegionDelete: (id: string) => void;
  onPlayRegion: (id: string) => void;
  onStopPlaying: () => void;
  onDeselectAll: () => void;
  isZoomed: boolean;
  getTransformStyle: () => React.CSSProperties;
  imageRef: React.RefObject<HTMLImageElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onStartPanning: (x: number, y: number) => void;
  onUpdatePan: (x: number, y: number) => void;
  onStopPanning: () => void;
}

function ImageCanvasComponent({
  imageSrc,
  regions,
  selectedIds,
  focusedId,
  activeId,
  hiddenRegionIds,
  audioUrl,
  playingRegionId,
  onRegionCreate,
  onRegionUpdate,
  onRegionSelect,
  onRegionFocus,
  onToggleVisibility,
  onRegionDelete,
  onPlayRegion,
  onStopPlaying,
  onDeselectAll,
  isZoomed,
  getTransformStyle,
  imageRef,
  containerRef,
  onStartPanning,
  onUpdatePan,
  onStopPanning,
}: ImageCanvasProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawBandRef = useRef<HTMLDivElement>(null);
  const [expandedControlId, setExpandedControlId] = useState<string | null>(null);
  
  const dragDataRef = useRef({
    active: false,
    type: '' as '' | 'draw' | 'move' | 'resize-top' | 'resize-bottom' | 'pan',
    regionId: '',
    startY: 0,
    startClientY: 0,
    origY: 0,
    origH: 0,
    panStartX: 0,
    panStartY: 0,
  });

  const SNAP_THRESHOLD = 3;

  const snapToEdge = useCallback((value: number, edges: number[]): number => {
    for (const edge of edges) {
      if (Math.abs(value - edge) <= SNAP_THRESHOLD) {
        return edge;
      }
    }
    return value;
  }, []);

  const getYPercent = useCallback((clientY: number): number => {
    const img = imageRef.current;
    if (!img) return 0;
    const rect = img.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
  }, [imageRef]);

  const updateRegionDOM = useCallback((id: string, y: number, h: number) => {
    const el = overlayRef.current?.querySelector(`[data-region-id="${id}"]`) as HTMLElement;
    if (el) {
      el.style.top = `${y}%`;
      el.style.height = `${h}%`;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    const regionEl = target.closest('[data-region-id]') as HTMLElement;
    const handle = target.dataset.handle;
    
    if (e.altKey || (!regionEl && isZoomed)) {
      dragDataRef.current = {
        active: true,
        type: 'pan',
        regionId: '',
        startY: 0,
        startClientY: e.clientY,
        origY: 0,
        origH: 0,
        panStartX: e.clientX,
        panStartY: e.clientY,
      };
      onStartPanning(e.clientX, e.clientY);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    
    if (regionEl) {
      const regionId = regionEl.dataset.regionId!;
      const region = regions.find(r => r.id === regionId);
      if (!region) return;
      
      if (handle === 'top' || handle === 'bottom') {
        dragDataRef.current = {
          active: true,
          type: handle === 'top' ? 'resize-top' : 'resize-bottom',
          regionId,
          startY: getYPercent(e.clientY),
          startClientY: e.clientY,
          origY: region.y,
          origH: region.height,
          panStartX: 0,
          panStartY: 0,
        };
      } else {
        dragDataRef.current = {
          active: true,
          type: 'move',
          regionId,
          startY: getYPercent(e.clientY),
          startClientY: e.clientY,
          origY: region.y,
          origH: region.height,
          panStartX: 0,
          panStartY: 0,
        };
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    
    if (!focusedId) {
      const y = getYPercent(e.clientY);
      dragDataRef.current = {
        active: true,
        type: 'draw',
        regionId: '',
        startY: y,
        startClientY: e.clientY,
        origY: 0,
        origH: 0,
        panStartX: 0,
        panStartY: 0,
      };
      
      if (drawBandRef.current) {
        drawBandRef.current.style.display = 'block';
        drawBandRef.current.style.top = `${y}%`;
        drawBandRef.current.style.height = '0%';
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [focusedId, isZoomed, regions, getYPercent, onStartPanning]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragDataRef.current;
    if (!d.active) return;
    
    const y = getYPercent(e.clientY);
    
    if (d.type === 'pan') {
      onUpdatePan(e.clientX, e.clientY);
      return;
    }
    
    if (d.type === 'draw') {
      const top = Math.min(d.startY, y);
      const height = Math.abs(y - d.startY);
      if (drawBandRef.current) {
        drawBandRef.current.style.top = `${top}%`;
        drawBandRef.current.style.height = `${height}%`;
      }
      return;
    }
    
      if (d.type === 'move') {
        const delta = y - d.startY;
        let newY = Math.max(0, Math.min(100 - d.origH, d.origY + delta));
        newY = snapToEdge(newY, [0]);
        updateRegionDOM(d.regionId, newY, d.origH);
        return;
      }
    
    if (d.type === 'resize-top') {
      const bottom = d.origY + d.origH;
      let newY = Math.max(0, Math.min(bottom - 2, y));
      newY = snapToEdge(newY, [0]);
      const newH = bottom - newY;
      updateRegionDOM(d.regionId, newY, newH);
      return;
    }
    
    if (d.type === 'resize-bottom') {
      const newH = Math.max(2, Math.min(100 - d.origY, y - d.origY));
      updateRegionDOM(d.regionId, d.origY, newH);
    }
  }, [getYPercent, updateRegionDOM, onUpdatePan]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragDataRef.current;
    if (!d.active) return;
    
    const y = getYPercent(e.clientY);
    
    if (d.type === 'pan') {
      onStopPanning();
      dragDataRef.current.active = false;
      dragDataRef.current.type = '';
      return;
    }
    
    if (d.type === 'draw') {
      if (drawBandRef.current) {
        drawBandRef.current.style.display = 'none';
      }
      let top = Math.min(d.startY, y);
      const height = Math.abs(y - d.startY);
      top = snapToEdge(top, [0]);
      if (height > 2) {
        onRegionCreate(top, height);
      } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        onDeselectAll();
      }
    } else if (d.type === 'move') {
      const delta = y - d.startY;
      let newY = Math.max(0, Math.min(100 - d.origH, d.origY + delta));
      newY = snapToEdge(newY, [0]);
      onRegionUpdate(d.regionId, { y: newY });
    } else if (d.type === 'resize-top') {
      const bottom = d.origY + d.origH;
      let newY = Math.max(0, Math.min(bottom - 2, y));
      newY = snapToEdge(newY, [0]);
      const newH = bottom - newY;
      onRegionUpdate(d.regionId, { y: newY, height: newH });
    } else if (d.type === 'resize-bottom') {
      const newH = Math.max(2, Math.min(100 - d.origY, y - d.origY));
      onRegionUpdate(d.regionId, { height: newH });
    }
    
    dragDataRef.current.active = false;
    dragDataRef.current.type = '';
  }, [getYPercent, onRegionCreate, onRegionUpdate, onDeselectAll, onStopPanning, snapToEdge]);

  const handleRegionClick = useCallback((e: React.MouseEvent, region: ImageRegion) => {
    if (dragDataRef.current.type === 'move' || dragDataRef.current.type === 'resize-top' || dragDataRef.current.type === 'resize-bottom') {
      const moved = Math.abs(e.clientY - dragDataRef.current.startClientY) > 5;
      if (moved) return;
    }
    
    e.stopPropagation();
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    
    if (isCtrl) {
      onRegionSelect(region.id, { addToSelection: true });
    } else if (isShift) {
      onRegionSelect(region.id, { rangeSelect: true });
    } else {
      onRegionSelect(region.id);
    }
  }, [onRegionSelect]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none overflow-hidden touch-none",
        isZoomed ? "cursor-grab" : "cursor-crosshair"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        if (drawBandRef.current) drawBandRef.current.style.display = 'none';
        dragDataRef.current.active = false;
        dragDataRef.current.type = '';
      }}
    >
      <div style={getTransformStyle()}>
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Page"
          className="w-full h-auto rounded-lg shadow-lg pointer-events-none"
          draggable={false}
        />
        
        <div ref={overlayRef} className="absolute inset-0">
          {regions.map(region => {
            const isHidden = hiddenRegionIds.has(region.id);
            const isSelected = selectedIds.has(region.id);
            const isFocused = focusedId === region.id;
            const isActive = activeId === region.id;
            
            if (isHidden) {
              return (
                <div
                  key={region.id}
                  data-region-id={region.id}
                  className="absolute left-0 right-0 opacity-30 pointer-events-none"
                  style={{ top: `${region.y}%`, height: `${region.height}%` }}
                >
                  <div className="absolute inset-0 border-y-2 border-dashed border-muted-foreground/30" />
                  <button
                    className="absolute top-1 right-2 p-1 rounded bg-background/80 hover:bg-background border shadow-sm pointer-events-auto"
                    onClick={() => onToggleVisibility(region.id)}
                  >
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              );
            }
            
            const borderCls = isFocused ? 'border-primary' : isActive ? 'border-green-500' : isSelected ? 'border-primary/70' : 'border-amber-500/60';
            const bgCls = isFocused ? 'bg-primary/25' : isActive ? 'bg-green-500/20' : isSelected ? 'bg-primary/15' : 'bg-amber-500/10';
            const zCls = isFocused ? 'z-20' : isActive || isSelected ? 'z-10' : '';
            
            return (
              <div
                key={region.id}
                data-region-id={region.id}
                className={cn("absolute left-0 right-0 border-y-2", borderCls, bgCls, zCls)}
                style={{ top: `${region.y}%`, height: `${region.height}%` }}
              >
                <div 
                  data-handle="top"
                  className="absolute -top-1.5 left-0 right-0 h-3 cursor-ns-resize z-10"
                />
                <div 
                  data-handle="bottom"
                  className="absolute -bottom-1.5 left-0 right-0 h-3 cursor-ns-resize z-10"
                />
                
                  <div 
                    className="absolute inset-0 cursor-pointer"
                    onClick={(e) => {
                      handleRegionClick(e, region);
                      if (expandedControlId && expandedControlId !== region.id) {
                        setExpandedControlId(null);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (audioUrl) {
                        setExpandedControlId(region.id);
                        onPlayRegion(region.id);
                      } else {
                        onRegionFocus(region.id);
                      }
                    }}
                  />
                  
                    {expandedControlId === region.id && audioUrl ? (
                      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex items-start justify-between p-1">
                        <div className="flex items-center gap-1.5 pointer-events-auto">
                          <button
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all",
                              playingRegionId === region.id 
                                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                : "bg-background/95 hover:bg-muted"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playingRegionId === region.id) {
                                onStopPlaying();
                              } else {
                                onPlayRegion(region.id);
                              }
                            }}
                          >
                            {playingRegionId === region.id ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 ml-0.5" />
                            )}
                          </button>
                          
                          <button
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-background/95 hover:bg-muted shadow-md transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRegionFocus(region.id);
                            }}
                            title="Edit Segment"
                          >
                            <Settings className="w-3.5 h-3.5 text-foreground/70" />
                          </button>
                          
                          <button
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-background/95 hover:bg-muted shadow-md transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleVisibility(region.id);
                            }}
                            title={hiddenRegionIds.has(region.id) ? "Show Segment" : "Hide Segment"}
                          >
                            {hiddenRegionIds.has(region.id) ? (
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>

                          <button
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-destructive/10 hover:bg-destructive/20 text-destructive shadow-md transition-all border border-destructive/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRegionDelete(region.id);
                            }}
                            title="Delete Segment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          className="w-5 h-5 rounded-full flex items-center justify-center bg-background/95 hover:bg-muted shadow-sm pointer-events-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedControlId(null);
                            if (playingRegionId === region.id) {
                              onStopPlaying();
                            }
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                    <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex flex-col group/segment">
                      <div className="flex items-start justify-between p-1">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium shadow-sm",
                          isActive ? "bg-green-500 text-white" : isFocused ? "bg-primary text-primary-foreground" : "bg-background/90 text-foreground/80"
                        )}>
                          {region.order + 1}
                        </span>
                        
                        <button
                          className="w-5 h-5 rounded-full flex items-center justify-center bg-destructive/80 hover:bg-destructive text-destructive-foreground shadow-sm pointer-events-auto opacity-0 group-hover/segment:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRegionDelete(region.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            );
          })}
          
          <div
            ref={drawBandRef}
            className="absolute left-0 right-0 border-y-2 border-primary bg-primary/20 border-dashed pointer-events-none"
            style={{ display: 'none', top: '0%', height: '0%' }}
          />
        </div>
      </div>
    </div>
  );
}

export const ImageCanvas = memo(ImageCanvasComponent);
