import { useState, useCallback, useRef } from 'react';
import type { ImageRegion } from '../types';

interface HistoryState {
  past: ImageRegion[][];
  present: ImageRegion[];
  future: ImageRegion[][];
}

const MAX_HISTORY_SIZE = 50;

export function useUndoRedo(initialRegions: ImageRegion[]) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialRegions,
    future: [],
  });
  
  const isBatchingRef = useRef(false);
  const batchedChangesRef = useRef<ImageRegion[] | null>(null);

  const pushToHistory = useCallback((newRegions: ImageRegion[]) => {
    if (isBatchingRef.current) {
      batchedChangesRef.current = newRegions;
      return;
    }

    setHistory(prev => ({
      past: [...prev.past.slice(-MAX_HISTORY_SIZE + 1), prev.present],
      present: newRegions,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const newPast = [...prev.past];
      const previousState = newPast.pop()!;
      
      return {
        past: newPast,
        present: previousState,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const newFuture = [...prev.future];
      const nextState = newFuture.shift()!;
      
      return {
        past: [...prev.past, prev.present],
        present: nextState,
        future: newFuture,
      };
    });
  }, []);

  const startBatch = useCallback(() => {
    isBatchingRef.current = true;
    batchedChangesRef.current = null;
  }, []);

  const endBatch = useCallback(() => {
    isBatchingRef.current = false;
    if (batchedChangesRef.current) {
      setHistory(prev => ({
        past: [...prev.past.slice(-MAX_HISTORY_SIZE + 1), prev.present],
        present: batchedChangesRef.current!,
        future: [],
      }));
      batchedChangesRef.current = null;
    }
  }, []);

  const setRegions = useCallback((newRegions: ImageRegion[] | ((prev: ImageRegion[]) => ImageRegion[])) => {
    setHistory(prev => {
      const nextRegions = typeof newRegions === 'function' 
        ? newRegions(prev.present) 
        : newRegions;
      
      if (isBatchingRef.current) {
        batchedChangesRef.current = nextRegions;
        return { ...prev, present: nextRegions };
      }
      
      return {
        past: [...prev.past.slice(-MAX_HISTORY_SIZE + 1), prev.present],
        present: nextRegions,
        future: [],
      };
    });
  }, []);

  const setRegionsWithoutHistory = useCallback((newRegions: ImageRegion[]) => {
    setHistory(prev => ({
      ...prev,
      present: newRegions,
    }));
  }, []);

  const resetHistory = useCallback((regions: ImageRegion[]) => {
    setHistory({
      past: [],
      present: regions,
      future: [],
    });
  }, []);

  return {
    regions: history.present,
    setRegions,
    setRegionsWithoutHistory,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    historyLength: history.past.length,
    futureLength: history.future.length,
    startBatch,
    endBatch,
    resetHistory,
  };
}
