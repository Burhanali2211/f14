import { memo, useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Plus, Eye, EyeOff, Check, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageRegion } from '../types';
import { formatTimeDisplay } from '../types';

interface SegmentListProps {
  regions: ImageRegion[];
  allPages: string[];
  currentPageIndex: number;
  selectedIds: Set<string>;
  focusedId: string | null;
  activeId: string | null;
  hiddenRegionIds: Set<string>;
  isPlaying?: boolean;
  onSelect: (id: string, options?: { addToSelection?: boolean; rangeSelect?: boolean }) => void;
  onFocus: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onChangePage: (index: number) => void;
  onPlayRegion?: (id: string) => void;
  onStopPlaying?: () => void;
}

const ITEM_HEIGHT = 76;
const OVERSCAN = 3;
const VIRTUALIZATION_THRESHOLD = 50;

const SegmentItem = memo(function SegmentItem({
  region,
  isSelected,
  isFocused,
  isActive,
  isHidden,
  isOtherPage,
  isCurrentlyPlaying,
  onSelect,
  onFocus,
  onToggleVisibility,
  onPlayRegion,
  onStopPlaying,
}: {
  region: ImageRegion;
  isSelected: boolean;
  isFocused: boolean;
  isActive: boolean;
  isHidden: boolean;
  isOtherPage: boolean;
  isCurrentlyPlaying: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onFocus: () => void;
  onToggleVisibility: () => void;
  onPlayRegion?: () => void;
  onStopPlaying?: () => void;
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer group",
        isFocused 
          ? "bg-primary/15 border-primary ring-1 ring-primary" 
          : isActive
            ? "bg-green-500/10 border-green-500"
            : isSelected 
              ? "bg-primary/10 border-primary/50" 
              : "bg-card hover:bg-accent border-border",
        isHidden && "opacity-50",
        isOtherPage && "ml-2 border-l-2 border-l-muted"
      )}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onFocus();
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
            isSelected 
              ? "bg-primary border-primary text-primary-foreground" 
              : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
          )}>
            {isSelected && <Check className="w-3 h-3" />}
          </div>
          <span className={cn(
            "font-medium text-sm truncate",
            isActive && "text-green-600"
          )}>
            {region.label || `Segment ${region.order + 1}`}
          </span>
          {isActive && (
            <span className="shrink-0 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(onPlayRegion || onStopPlaying) && (
            <button
              className={cn(
                "p-1 rounded hover:bg-muted",
                isCurrentlyPlaying ? "opacity-100 text-green-600" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (isCurrentlyPlaying && onStopPlaying) {
                  onStopPlaying();
                } else if (onPlayRegion) {
                  onPlayRegion();
                }
              }}
            >
              {isCurrentlyPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            className="p-1 rounded hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
          >
            {isHidden ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      <div className={cn(
        "text-xs font-mono",
        isActive ? "text-green-600" : "text-muted-foreground"
      )}>
        {formatTimeDisplay(region.startTime)} - {formatTimeDisplay(region.endTime)}
        <span className="ml-2 opacity-60">
          ({(region.endTime - region.startTime).toFixed(1)}s)
        </span>
      </div>
    </div>
  );
});

function SegmentListComponent({
  regions,
  allPages,
  currentPageIndex,
  selectedIds,
  focusedId,
  activeId,
  hiddenRegionIds,
  isPlaying = false,
  onSelect,
  onFocus,
  onToggleVisibility,
  onChangePage,
  onPlayRegion,
  onStopPlaying,
}: SegmentListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const prevActiveId = useRef<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const sortedRegions = useMemo(() => 
    [...regions].sort((a, b) => a.startTime - b.startTime),
    [regions]
  );

  const useVirtualization = sortedRegions.length > VIRTUALIZATION_THRESHOLD;

  useEffect(() => {
    if (activeId && activeId !== prevActiveId.current && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevActiveId.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !useVirtualization) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [useVirtualization]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (useVirtualization) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [useVirtualization]);

  const handleItemClick = useCallback((e: React.MouseEvent, region: ImageRegion) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    if (region.imageIndex !== currentPageIndex) {
      onChangePage(region.imageIndex);
    }

    if (isCtrl) {
      onSelect(region.id, { addToSelection: true });
    } else if (isShift) {
      onSelect(region.id, { rangeSelect: true });
    } else {
      onSelect(region.id);
    }
  }, [currentPageIndex, onChangePage, onSelect]);

  const { visibleItems, startIndex, totalHeight } = useMemo(() => {
    if (!useVirtualization) {
      return { 
        visibleItems: sortedRegions, 
        startIndex: 0, 
        totalHeight: sortedRegions.length * ITEM_HEIGHT 
      };
    }

    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(sortedRegions.length, start + visibleCount);
    
    return {
      visibleItems: sortedRegions.slice(start, end),
      startIndex: start,
      totalHeight: sortedRegions.length * ITEM_HEIGHT,
    };
  }, [sortedRegions, scrollTop, containerHeight, useVirtualization]);

  const renderItem = useCallback((region: ImageRegion, index: number) => {
    const style = useVirtualization ? {
      position: 'absolute' as const,
      top: (startIndex + index) * ITEM_HEIGHT,
      left: 12,
      right: 12,
      height: ITEM_HEIGHT - 8,
    } : undefined;

    const isCurrentlyPlaying = isPlaying && activeId === region.id;

    return (
      <div 
        key={region.id} 
        ref={activeId === region.id ? activeRef : null}
        style={style}
        className={!useVirtualization ? "mb-2" : undefined}
      >
        <SegmentItem
          region={region}
          isSelected={selectedIds.has(region.id)}
          isFocused={focusedId === region.id}
          isActive={activeId === region.id}
          isHidden={hiddenRegionIds.has(region.id)}
          isOtherPage={region.imageIndex !== currentPageIndex && allPages.length > 1}
          isCurrentlyPlaying={isCurrentlyPlaying}
          onSelect={(e) => handleItemClick(e, region)}
          onFocus={() => onFocus(region.id)}
          onToggleVisibility={() => onToggleVisibility(region.id)}
          onPlayRegion={onPlayRegion ? () => onPlayRegion(region.id) : undefined}
          onStopPlaying={onStopPlaying}
        />
      </div>
    );
  }, [
    useVirtualization, startIndex, activeId, selectedIds, focusedId, 
    hiddenRegionIds, currentPageIndex, allPages.length, handleItemClick, 
    onFocus, onToggleVisibility, onPlayRegion, onStopPlaying, isPlaying
  ]);

  return (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">All Segments ({regions.length})</h3>
          {selectedIds.size > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Click to select • Ctrl+click multi-select • Double-click to edit
        </p>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        {regions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plus className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No segments yet</p>
            <p className="text-xs mt-1">Drag on the page to create</p>
          </div>
        ) : useVirtualization ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleItems.map((region, idx) => renderItem(region, idx))}
          </div>
        ) : (
          <div className="p-3">
            {allPages.length > 1 ? (
              allPages.map((_, pageIdx) => {
                const pageRegions = sortedRegions.filter(r => r.imageIndex === pageIdx);
                if (pageRegions.length === 0) return null;
                
                return (
                  <div key={pageIdx} className="mb-4">
                    <div 
                      className={cn(
                        "text-xs font-medium px-2 py-1.5 rounded-md flex items-center justify-between cursor-pointer mb-2",
                        pageIdx === currentPageIndex 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      onClick={() => onChangePage(pageIdx)}
                    >
                      <span>Page {pageIdx + 1}</span>
                      <span className="text-xs opacity-70">
                        {pageRegions.length} segment{pageRegions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {pageRegions.map((region, idx) => renderItem(region, idx))}
                  </div>
                );
              })
            ) : (
              sortedRegions.map((region, idx) => renderItem(region, idx))
            )}
          </div>
        )}
      </div>
    </>
  );
}

export const SegmentList = memo(SegmentListComponent);
