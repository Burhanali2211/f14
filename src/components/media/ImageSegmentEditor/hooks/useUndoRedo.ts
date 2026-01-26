import { useState, useCallback, useRef, useMemo } from 'react';
import type { ImageRegion } from '../types';

type Operation = 
  | { type: 'add'; region: ImageRegion }
  | { type: 'delete'; region: ImageRegion; index: number }
  | { type: 'update'; id: string; prev: Partial<ImageRegion>; next: Partial<ImageRegion> }
  | { type: 'batch'; operations: Operation[] }
  | { type: 'full'; regions: ImageRegion[] };

interface HistoryState {
  past: Operation[];
  present: ImageRegion[];
  future: Operation[];
}

const MAX_HISTORY_SIZE = 50;

function applyOperation(regions: ImageRegion[], op: Operation): ImageRegion[] {
  switch (op.type) {
    case 'add':
      return [...regions, op.region];
    case 'delete':
      return regions.filter(r => r.id !== op.region.id);
    case 'update':
      return regions.map(r => r.id === op.id ? { ...r, ...op.next } : r);
    case 'batch':
      return op.operations.reduce((acc, subOp) => applyOperation(acc, subOp), regions);
    case 'full':
      return op.regions;
    default:
      return regions;
  }
}

function reverseOperation(op: Operation): Operation {
  switch (op.type) {
    case 'add':
      return { type: 'delete', region: op.region, index: -1 };
    case 'delete':
      return { type: 'add', region: op.region };
    case 'update':
      return { type: 'update', id: op.id, prev: op.next, next: op.prev };
    case 'batch':
      return { type: 'batch', operations: [...op.operations].reverse().map(reverseOperation) };
    case 'full':
      return op;
    default:
      return op;
  }
}

function computeDiff(prev: ImageRegion[] | null | undefined, next: ImageRegion[] | null | undefined): Operation | null {
  if (!prev || !next) return null;
  if (prev === next) return null;
  if (prev.length === 0 && next.length === 0) return null;
  
  if (next.length === prev.length + 1) {
    const added = next.find(n => !prev.some(p => p.id === n.id));
    if (added) return { type: 'add', region: added };
  }
  
  if (next.length === prev.length - 1) {
    const deleted = prev.find(p => !next.some(n => n.id === p.id));
    if (deleted) {
      const index = prev.findIndex(p => p.id === deleted.id);
      return { type: 'delete', region: deleted, index };
    }
  }
  
  if (next.length === prev.length) {
    const changes: Operation[] = [];
    for (let i = 0; i < prev.length; i++) {
      const p = prev[i];
      const n = next.find(x => x.id === p.id);
      if (n && n !== p) {
        const prevDiff: Partial<ImageRegion> = {};
        const nextDiff: Partial<ImageRegion> = {};
        for (const key of Object.keys(n) as (keyof ImageRegion)[]) {
          if (p[key] !== n[key]) {
            (prevDiff as any)[key] = p[key];
            (nextDiff as any)[key] = n[key];
          }
        }
        if (Object.keys(nextDiff).length > 0) {
          changes.push({ type: 'update', id: p.id, prev: prevDiff, next: nextDiff });
        }
      }
    }
    if (changes.length === 1) return changes[0];
    if (changes.length > 1) return { type: 'batch', operations: changes };
    return null;
  }
  
  return { type: 'full', regions: [...next] };
}

export function useUndoRedo(initialRegions: ImageRegion[]) {
  const safeInitial = initialRegions || [];
  
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: safeInitial,
    future: [],
  });
  
  const isBatchingRef = useRef(false);
  const batchStartRef = useRef<ImageRegion[] | null>(null);
  const lastPresentRef = useRef<ImageRegion[]>(safeInitial);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const newPast = [...prev.past];
      const lastOp = newPast.pop()!;
      const reversed = reverseOperation(lastOp);
      const previousState = applyOperation(prev.present, reversed);
      
      lastPresentRef.current = previousState;
      return {
        past: newPast,
        present: previousState,
        future: [lastOp, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const newFuture = [...prev.future];
      const nextOp = newFuture.shift()!;
      const nextState = applyOperation(prev.present, nextOp);
      
      lastPresentRef.current = nextState;
      return {
        past: [...prev.past, nextOp],
        present: nextState,
        future: newFuture,
      };
    });
  }, []);

  const startBatch = useCallback(() => {
    if (isBatchingRef.current) return;
    isBatchingRef.current = true;
    batchStartRef.current = [...lastPresentRef.current];
  }, []);

  const endBatch = useCallback(() => {
    if (!isBatchingRef.current) return;
    isBatchingRef.current = false;
    
    const batchStart = batchStartRef.current;
    batchStartRef.current = null;
    
    if (!batchStart) return;
    
    setHistory(prev => {
      const diff = computeDiff(batchStart, prev.present);
      if (!diff) return prev;
      
      return {
        past: [...prev.past.slice(-MAX_HISTORY_SIZE + 1), diff],
        present: prev.present,
        future: [],
      };
    });
  }, []);

  const setRegions = useCallback((newRegions: ImageRegion[] | ((prev: ImageRegion[]) => ImageRegion[])) => {
    setHistory(prev => {
      const nextRegions = typeof newRegions === 'function' 
        ? newRegions(prev.present) 
        : newRegions;
      
      if (!nextRegions) return prev;
      
      if (isBatchingRef.current) {
        lastPresentRef.current = nextRegions;
        return { ...prev, present: nextRegions };
      }
      
      const diff = computeDiff(prev.present, nextRegions);
      if (!diff) return prev;
      
      lastPresentRef.current = nextRegions;
      return {
        past: [...prev.past.slice(-MAX_HISTORY_SIZE + 1), diff],
        present: nextRegions,
        future: [],
      };
    });
  }, []);

  const setRegionsWithoutHistory = useCallback((newRegions: ImageRegion[]) => {
    const safeRegions = newRegions || [];
    lastPresentRef.current = safeRegions;
    setHistory(prev => ({
      ...prev,
      present: safeRegions,
    }));
  }, []);

  const resetHistory = useCallback((regions: ImageRegion[]) => {
    const safeRegions = regions || [];
    isBatchingRef.current = false;
    batchStartRef.current = null;
    lastPresentRef.current = safeRegions;
    setHistory({
      past: [],
      present: safeRegions,
      future: [],
    });
  }, []);

  const memoryUsage = useMemo(() => {
    const pastSize = history.past.reduce((acc, op) => {
      if (op.type === 'full') return acc + op.regions.length * 100;
      if (op.type === 'batch') return acc + op.operations.length * 50;
      return acc + 50;
    }, 0);
    return pastSize;
  }, [history.past]);

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
    memoryUsage,
  };
}
