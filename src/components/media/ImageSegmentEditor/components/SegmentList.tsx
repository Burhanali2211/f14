import { memo, useRef, useEffect, useCallback } from 'react';
import { Plus, Eye, EyeOff, Check, Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  onSelect: (id: string, options?: { addToSelection?: boolean; rangeSelect?: boolean }) => void;
  onFocus: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onChangePage: (index: number) => void;
  onPlayRegion?: (id: string) => void;
}

const SegmentItem = memo(function SegmentItem({
  region,
  isSelected,
  isFocused,
  isActive,
  isHidden,
  isOtherPage,
  onSelect,
  onFocus,
  onToggleVisibility,
  onPlayRegion,
}: {
  region: ImageRegion;
  isSelected: boolean;
  isFocused: boolean;
  isActive: boolean;
  isHidden: boolean;
  isOtherPage: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onFocus: () => void;
  onToggleVisibility: () => void;
  onPlayRegion?: () => void;
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
          {onPlayRegion && (
            <button
              className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onPlayRegion();
              }}
            >
              <Play className="w-4 h-4" />
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
  onSelect,
  onFocus,
  onToggleVisibility,
  onChangePage,
  onPlayRegion,
}: SegmentListProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  const prevActiveId = useRef<string | null>(null);

  useEffect(() => {
    if (activeId && activeId !== prevActiveId.current && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevActiveId.current = activeId;
  }, [activeId]);

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
                
                if (pageRegions.length === 0 && allPages.length === 1) return null;
                
                return (
                  <div key={pageIdx} className="space-y-2">
                    {allPages.length > 1 && (
                      <div 
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-md flex items-center justify-between cursor-pointer",
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
                    )}
                    
                    {pageRegions.map((region) => (
                      <div key={region.id} ref={activeId === region.id ? activeRef : null}>
                        <SegmentItem
                          region={region}
                          isSelected={selectedIds.has(region.id)}
                          isFocused={focusedId === region.id}
                          isActive={activeId === region.id}
                          isHidden={hiddenRegionIds.has(region.id)}
                          isOtherPage={pageIdx !== currentPageIndex && allPages.length > 1}
                          onSelect={(e) => handleItemClick(e, region)}
                          onFocus={() => onFocus(region.id)}
                          onToggleVisibility={() => onToggleVisibility(region.id)}
                          onPlayRegion={onPlayRegion ? () => onPlayRegion(region.id) : undefined}
                        />
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
  );
}

export const SegmentList = memo(SegmentListComponent);
