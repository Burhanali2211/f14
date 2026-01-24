import { useState, useCallback, useMemo, useRef } from 'react';
import type { ImageRegion } from '../types';

interface UseSegmentSelectionOptions {
  regions: ImageRegion[];
  currentTime: number;
  onRegionsDelete?: (ids: string[]) => void;
}

export function useSegmentSelection({ 
  regions, 
  currentTime,
  onRegionsDelete 
}: UseSegmentSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  const activeId = useMemo(() => {
    const active = regions.find(r => currentTime >= r.startTime && currentTime < r.endTime);
    return active?.id ?? null;
  }, [regions, currentTime]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const select = useCallback((id: string, options?: { addToSelection?: boolean; rangeSelect?: boolean }) => {
    if (options?.addToSelection) {
      setSelectedIds(prev => {
        const idx = prev.indexOf(id);
        if (idx >= 0) {
          return prev.filter(x => x !== id);
        }
        return [...prev, id];
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
        setSelectedIds(rangeIds);
      }
    } else {
      setSelectedIds([id]);
    }
    
    lastSelectedIdRef.current = id;
    setFocusedId(id);
  }, [regions]);

  const focus = useCallback((id: string | null) => {
    setFocusedId(id);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(regions.map(r => r.id));
    if (regions.length > 0) {
      lastSelectedIdRef.current = regions[regions.length - 1].id;
    }
  }, [regions]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
    setFocusedId(null);
    lastSelectedIdRef.current = null;
  }, []);

  const selectByPage = useCallback((pageIndex: number) => {
    const pageRegions = regions.filter(r => r.imageIndex === pageIndex);
    setSelectedIds(pageRegions.map(r => r.id));
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
    setSelectedIds(inRange.map(r => r.id));
    if (inRange.length > 0) {
      lastSelectedIdRef.current = inRange[inRange.length - 1].id;
    }
  }, [regions]);

  const invertSelection = useCallback(() => {
    setSelectedIds(prev => {
      const prevSet = new Set(prev);
      return regions.filter(r => !prevSet.has(r.id)).map(r => r.id);
    });
  }, [regions]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length > 0 && onRegionsDelete) {
      onRegionsDelete(selectedIds);
      deselectAll();
    }
  }, [selectedIds, onRegionsDelete, deselectAll]);

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);
  const isFocused = useCallback((id: string) => focusedId === id, [focusedId]);
  const isActive = useCallback((id: string) => activeId === id, [activeId]);

  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;
  const hasMultiSelection = selectedCount > 1;

  const selectedRegions = useMemo(() => 
    regions.filter(r => selectedSet.has(r.id)),
  [regions, selectedSet]);

  const focusedRegion = useMemo(() =>
    focusedId ? regions.find(r => r.id === focusedId) : null,
  [regions, focusedId]);

  const activeRegion = useMemo(() =>
    activeId ? regions.find(r => r.id === activeId) : null,
  [regions, activeId]);

  return {
    selectedIds: selectedSet,
    focusedId,
    activeId,
    
    select,
    focus,
    selectAll,
    deselectAll,
    selectByPage,
    selectByTimeRange,
    invertSelection,
    deleteSelected,
    
    isSelected,
    isFocused,
    isActive,
    
    selectedCount,
    hasSelection,
    hasMultiSelection,
    selectedRegions,
    focusedRegion,
    activeRegion,
  };
}
