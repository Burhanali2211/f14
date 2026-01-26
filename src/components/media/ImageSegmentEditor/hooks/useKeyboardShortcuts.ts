import { useEffect, useCallback, useRef } from 'react';
import type { ImageRegion } from '../types';

interface KeyboardShortcutHandlers {
  onTogglePlayPause: () => void;
  onSetStartTime: () => void;
  onSetEndTime: () => void;
  onNewSegment: () => void;
  onDeleteSelected: () => void;
  onCopySegment: () => void;
  onPasteSegment: () => void;
  onDuplicateSegment: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSeekBackward: (seconds: number) => void;
  onSeekForward: (seconds: number) => void;
  onAdjustStartTime: (delta: number) => void;
  onAdjustEndTime: (delta: number) => void;
  onDeselect: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  selectedRegionId: string | null;
  editingRegionId: string | null;
  hasAudio: boolean;
}

export function useKeyboardShortcuts({
  onTogglePlayPause,
  onSetStartTime,
  onSetEndTime,
  onNewSegment,
  onDeleteSelected,
  onCopySegment,
  onPasteSegment,
  onDuplicateSegment,
  onUndo,
  onRedo,
  onSeekBackward,
  onSeekForward,
  onAdjustStartTime,
  onAdjustEndTime,
  onDeselect,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  selectedRegionId,
  editingRegionId,
  hasAudio,
}: KeyboardShortcutHandlers) {
  const clipboardRef = useRef<ImageRegion | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      if (e.key === 'Escape') {
        (target as HTMLInputElement).blur();
      }
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    switch (e.key) {
      case ' ':
        if (hasAudio) {
          e.preventDefault();
          onTogglePlayPause();
        }
        break;

      case 's':
        if (!ctrl && editingRegionId && hasAudio) {
          e.preventDefault();
          onSetStartTime();
        }
        break;

      case 'e':
        if (!ctrl && editingRegionId && hasAudio) {
          e.preventDefault();
          onSetEndTime();
        }
        break;

      case 'n':
        if (!ctrl) {
          e.preventDefault();
          onNewSegment();
        }
        break;

      case 'd':
        if (ctrl) {
          e.preventDefault();
          onDuplicateSegment();
        } else if (selectedRegionId) {
          e.preventDefault();
          onDeleteSelected();
        }
        break;

      case 'Delete':
      case 'Backspace':
        if (selectedRegionId && !editingRegionId) {
          e.preventDefault();
          onDeleteSelected();
        }
        break;

      case 'c':
        if (ctrl && selectedRegionId) {
          e.preventDefault();
          onCopySegment();
        }
        break;

      case 'v':
        if (ctrl) {
          e.preventDefault();
          onPasteSegment();
        }
        break;

      case 'z':
        if (ctrl) {
          e.preventDefault();
          if (shift) {
            onRedo();
          } else {
            onUndo();
          }
        }
        break;

      case 'y':
        if (ctrl) {
          e.preventDefault();
          onRedo();
        }
        break;

      case 'ArrowLeft':
        if (hasAudio) {
          e.preventDefault();
          onSeekBackward(shift ? 5 : 1);
        }
        break;

      case 'ArrowRight':
        if (hasAudio) {
          e.preventDefault();
          onSeekForward(shift ? 5 : 1);
        }
        break;

      case '[':
        if (editingRegionId) {
          e.preventDefault();
          onAdjustStartTime(-0.1);
        }
        break;

      case ']':
        if (editingRegionId) {
          e.preventDefault();
          onAdjustEndTime(0.1);
        }
        break;

      case 'Escape':
        e.preventDefault();
        onDeselect();
        break;

      case 'PageUp':
        e.preventDefault();
        onPrevPage();
        break;

      case 'PageDown':
        e.preventDefault();
        onNextPage();
        break;

      case '=':
      case '+':
        if (ctrl) {
          e.preventDefault();
          onZoomIn();
        }
        break;

      case '-':
        if (ctrl) {
          e.preventDefault();
          onZoomOut();
        }
        break;

      case '0':
        if (ctrl) {
          e.preventDefault();
          onResetZoom();
        }
        break;
    }
  }, [
    hasAudio,
    selectedRegionId,
    editingRegionId,
    onTogglePlayPause,
    onSetStartTime,
    onSetEndTime,
    onNewSegment,
    onDeleteSelected,
    onCopySegment,
    onPasteSegment,
    onDuplicateSegment,
    onUndo,
    onRedo,
    onSeekBackward,
    onSeekForward,
    onAdjustStartTime,
    onAdjustEndTime,
    onDeselect,
    onPrevPage,
    onNextPage,
    onZoomIn,
    onZoomOut,
    onResetZoom,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    clipboardRef,
  };
}
