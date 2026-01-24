import { useCallback, memo, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ImageRegion } from '../types';
import { formatTimeDisplay } from '../types';
import { Eye, EyeOff, Check, Play, Pause } from 'lucide-react';

interface ImageCanvasProps {
  imageSrc: string;
  regions: ImageRegion[];
  selectedIds: Set<string>;
  focusedId: string | null;
  activeId: string | null;
  hiddenRegionIds: Set<string>;
  audioUrl?: string;
  playingRegionId: string | null;
  onPlayRegion: (regionId: string) => void;
  onStopPlaying: () => void;
  onRegionCreate: (y: number, height: number) => void;
  onRegionUpdate: (id: string, updates: Partial<ImageRegion>) => void;
  onRegionSelect: (id: string, options?: { addToSelection?: boolean; rangeSelect?: boolean }) => void;
  onRegionFocus: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
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
  onRegionCreate,
  onRegionUpdate,
  onRegionSelect,
  onRegionFocus,
  onToggleVisibility,
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
      const newY = Math.max(0, Math.min(100 - d.origH, d.origY + delta));
      updateRegionDOM(d.regionId, newY, d.origH);
      return;
    }
    
    if (d.type === 'resize-top') {
      const bottom = d.origY + d.origH;
      const newY = Math.max(0, Math.min(bottom - 2, y));
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
      const top = Math.min(d.startY, y);
      const height = Math.abs(y - d.startY);
      if (height > 2) {
        onRegionCreate(top, height);
      } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        onDeselectAll();
      }
    } else if (d.type === 'move') {
      const delta = y - d.startY;
      const newY = Math.max(0, Math.min(100 - d.origH, d.origY + delta));
      onRegionUpdate(d.regionId, { y: newY });
    } else if (d.type === 'resize-top') {
      const bottom = d.origY + d.origH;
      const newY = Math.max(0, Math.min(bottom - 2, y));
      const newH = bottom - newY;
      onRegionUpdate(d.regionId, { y: newY, height: newH });
    } else if (d.type === 'resize-bottom') {
      const newH = Math.max(2, Math.min(100 - d.origY, y - d.origY));
      onRegionUpdate(d.regionId, { height: newH });
    }
    
    dragDataRef.current.active = false;
    dragDataRef.current.type = '';
  }, [getYPercent, onRegionCreate, onRegionUpdate, onDeselectAll, onStopPanning]);

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
                  onClick={(e) => handleRegionClick(e, region)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onRegionFocus(region.id);
                  }}
                />
                
                <div className="absolute top-1 left-2 right-2 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <div className={cn(
                        "w-5 h-5 rounded flex items-center justify-center",
                        isFocused ? "bg-primary text-primary-foreground" : "bg-primary/80 text-primary-foreground"
                      )}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium truncate max-w-[40%]",
                      isActive ? "bg-green-500 text-white" : "bg-background/90"
                    )}>
                      {region.label || `Segment ${region.order + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-mono",
                      isActive ? "bg-green-500 text-white" : "bg-background/90"
                    )}>
                      {formatTimeDisplay(region.startTime)} - {formatTimeDisplay(region.endTime)}
                    </span>
                    <button
                      className="p-1 rounded bg-background/90 hover:bg-background pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(region.id);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
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
