import { useState, useCallback, useRef, useEffect } from 'react';
import type { ZoomPanState } from '../types';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

interface UseZoomPanOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  enabled?: boolean;
}

export function useZoomPan({ containerRef, imageRef, enabled = true }: UseZoomPanOptions) {
  const [state, setState] = useState<ZoomPanState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
  });

  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const setZoom = useCallback((newZoom: number) => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)),
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_STEP),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_STEP),
    }));
  }, []);

  const resetZoomPan = useCallback(() => {
    setState({
      zoom: 1,
      panX: 0,
      panY: 0,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
  }, []);

  const fitToWidth = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const imageWidth = imageRef.current.naturalWidth;
    const newZoom = containerWidth / imageWidth;
    setState({
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)),
      panX: 0,
      panY: 0,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
  }, [containerRef, imageRef]);

  const fitToHeight = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;
    const containerHeight = containerRef.current.clientHeight;
    const imageHeight = imageRef.current.naturalHeight;
    const newZoom = containerHeight / imageHeight;
    setState({
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)),
      panX: 0,
      panY: 0,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });
  }, [containerRef, imageRef]);

  const setPan = useCallback((x: number, y: number) => {
    setState(prev => ({ ...prev, panX: x, panY: y }));
  }, []);

  const startPanning = useCallback((clientX: number, clientY: number) => {
    if (!enabled || state.zoom <= 1) return;
    isPanningRef.current = true;
    lastPanPointRef.current = { x: clientX, y: clientY };
  }, [enabled, state.zoom]);

  const updatePan = useCallback((clientX: number, clientY: number) => {
    if (!isPanningRef.current || !enabled) return;
    
    const deltaX = clientX - lastPanPointRef.current.x;
    const deltaY = clientY - lastPanPointRef.current.y;
    
    setState(prev => ({
      ...prev,
      panX: prev.panX + deltaX,
      panY: prev.panY + deltaY,
    }));
    
    lastPanPointRef.current = { x: clientX, y: clientY };
  }, [enabled]);

  const stopPanning = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enabled || !containerRef.current) return;
    
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom + delta));
      
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomRatio = newZoom / state.zoom;
      const newPanX = mouseX - (mouseX - state.panX) * zoomRatio;
      const newPanY = mouseY - (mouseY - state.panY) * zoomRatio;
      
      setState(prev => ({
        ...prev,
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY,
      }));
    }
  }, [enabled, containerRef, state.zoom, state.panX, state.panY]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, enabled, handleWheel]);

  const getTransformStyle = useCallback(() => {
    return {
      transform: `scale(${state.zoom}) translate(${state.panX / state.zoom}px, ${state.panY / state.zoom}px)`,
      transformOrigin: '0 0',
      transition: isPanningRef.current ? 'none' : 'transform 0.1s ease-out',
    };
  }, [state.zoom, state.panX, state.panY]);

  const screenToImageCoords = useCallback((screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: screenX, y: screenY };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - state.panX) / state.zoom,
      y: (screenY - rect.top - state.panY) / state.zoom,
    };
  }, [containerRef, state.zoom, state.panX, state.panY]);

  return {
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoomPan,
    fitToWidth,
    fitToHeight,
    setPan,
    startPanning,
    updatePan,
    stopPanning,
    isPanning: isPanningRef.current,
    getTransformStyle,
    screenToImageCoords,
    canZoomIn: state.zoom < MAX_ZOOM,
    canZoomOut: state.zoom > MIN_ZOOM,
    isZoomed: state.zoom !== 1,
  };
}
