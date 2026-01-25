import { useState, useCallback, useMemo, useRef } from 'react';
import type { ImageRegion } from '../types';

interface UseSegmentSelectionOptions {
  regions: ImageRegion[];
  onRegionsDelete?: (ids: string[]) => void;
}

export function useSegmentSelection({ 
  regions, 
  onRegionsDelete 
}: UseSegmentSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  const select = useCallback((id: string, options?: { addToSelection?: boolean; rangeSelect?: boolean }) => {
    if (options?.addToSelection) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else if (options?.rangeSelect && lastSelectedIdRef.current) {
      const sortedRegions = [...regions].sort((a, b) => a.startTime - b.startTime);
      const lastIdx = sortedRegions.findIndex(r => r.id === lastSelectedIdRef.current);
      const currentIdx = sortedRegions.findIndex(r => r.id === id);
      
      if (lastIdx !== -1 && currentIdx !== -1) {
        const [startIdx, endIdx] = lastIdx < currentIdx 
          ? [lastIdx, currentIdx] 
          : [currentIdx, lastIdx];
        
        const rangeIds = sortedRegions.slice(startIdx, endIdx + 1).map(r => r.id);
        setSelectedIds(new Set(rangeIds));
      }
    } else {
      setSelectedIds(new Set([id]));
    }
    
    lastSelectedIdRef.current = id;
    setFocusedId(id);
  }, [regions]);

  const focus = useCallback((id: string | null) => {
    setFocusedId(id);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(regions.map(r => r.id)));
    if (regions.length > 0) {
      lastSelectedIdRef.current = regions[regions.length - 1].id;
    }
  }, [regions]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setFocusedId(null);
    lastSelectedIdRef.current = null;
  }, []);

  const selectByPage = useCallback((pageIndex: number) => {
    const pageRegions = regions.filter(r => r.imageIndex === pageIndex);
    setSelectedIds(new Set(pageRegions.map(r => r.id)));
    if (pageRegions.length > 0) {
      lastSelectedIdRef.current = pageRegions[pageRegions.length - 1].id;
    }
  }, [regions]);

  const selectByTimeRange = useCallback((startTime: number, endTime: number) => {
    const inRange = regions.filter(r => 
      (r.startTime >= startTime && r.startTime < endTime) ||
      (r.endTime > startTime && r.endTime <= endTime) ||
      (r.startTime <= startTime && r.endTime >= endTime)
    );
    setSelectedIds(new Set(inRange.map(r => r.id)));
    if (inRange.length > 0) {
      lastSelectedIdRef.current = inRange[inRange.length - 1].id;
    }
  }, [regions]);

  const invertSelection = useCallback(() => {
    setSelectedIds(prev => {
      return new Set(regions.filter(r => !prev.has(r.id)).map(r => r.id));
    });
  }, [regions]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size > 0 && onRegionsDelete) {
      onRegionsDelete(Array.from(selectedIds));
      deselectAll();
    }
  }, [selectedIds, onRegionsDelete, deselectAll]);

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;
  const hasMultiSelection = selectedCount > 1;

  const selectedRegions = useMemo(() => 
    regions.filter(r => selectedIds.has(r.id)),
  [regions, selectedIds]);

  const focusedRegion = useMemo(() =>
    focusedId ? regions.find(r => r.id === focusedId) : null,
  [regions, focusedId]);

  return {
    selectedIds,
    focusedId,
    
    select,
    focus,
    selectAll,
    deselectAll,
    selectByPage,
    selectByTimeRange,
    invertSelection,
    deleteSelected,
    
    selectedCount,
    hasSelection,
    hasMultiSelection,
    selectedRegions,
    focusedRegion,
  };
}
