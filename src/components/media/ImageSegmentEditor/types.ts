export interface ImageRegion {
  id: string;
  imageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  endTime: number;
  order: number;
  label?: string;
  color?: string;
}

export interface SelectionState {
  selectedIds: Set<string>;
  focusedId: string | null;
  activeId: string | null;
  hoveredId: string | null;
  lastSelectedId: string | null;
}

export interface EditorState {
  regions: ImageRegion[];
  currentPageIndex: number;
  selection: SelectionState;
  hiddenRegionIds: Set<string>;
  zoom: number;
  pan: { x: number; y: number };
  viewMode: 'image' | 'timeline';
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLooping: boolean;
  loopStart: number | null;
  loopEnd: number | null;
}

export interface UndoableAction {
  type: 'ADD_REGION' | 'DELETE_REGION' | 'UPDATE_REGION' | 'BATCH_DELETE' | 'BATCH_UPDATE' | 'REORDER_REGIONS';
  payload: any;
  timestamp: number;
}

export interface HistoryState {
  past: ImageRegion[][];
  present: ImageRegion[];
  future: ImageRegion[][];
}

export interface DragState {
  isDragging: boolean;
  dragType: 'draw' | 'resize-top' | 'resize-bottom' | 'move' | 'pan' | null;
  regionId: string | null;
  startY: number;
  startX: number;
  originalY: number;
  originalHeight: number;
}

export interface SegmentFormData {
  label: string;
  startMM: string;
  startSS: string;
  startCC: string;
  endMM: string;
  endSS: string;
  endCC: string;
  color?: string;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: string;
  description: string;
}

export interface ZoomPanState {
  zoom: number;
  panX: number;
  panY: number;
  minZoom: number;
  maxZoom: number;
}

export interface SnapGuide {
  type: 'segment-start' | 'segment-end' | 'round-time';
  time: number;
  label: string;
}

export interface EditorContextValue {
  regions: ImageRegion[];
  currentPageIndex: number;
  selectedRegionId: string | null;
  editingRegionId: string | null;
  audioState: AudioState;
  zoomPanState: ZoomPanState;
  viewMode: 'image' | 'timeline';
  hiddenRegionIds: Set<string>;
  canUndo: boolean;
  canRedo: boolean;
  setCurrentPageIndex: (index: number) => void;
  setSelectedRegionId: (id: string | null) => void;
  setEditingRegionId: (id: string | null) => void;
  addRegion: (region: Omit<ImageRegion, 'id' | 'order'>) => void;
  updateRegion: (id: string, updates: Partial<ImageRegion>) => void;
  deleteRegion: (id: string) => void;
  deleteRegions: (ids: string[]) => void;
  toggleRegionVisibility: (id: string) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetZoomPan: () => void;
  setViewMode: (mode: 'image' | 'timeline') => void;
  seekTo: (time: number) => void;
  togglePlayPause: () => void;
  setPlaybackRate: (rate: number) => void;
  playRegion: (regionId: string) => void;
}

export const formatTimeParts = (seconds: number): { mm: string; ss: string; cc: string } => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return {
    mm: mins.toString().padStart(2, '0'),
    ss: secs.toString().padStart(2, '0'),
    cc: ms.toString().padStart(2, '0')
  };
};

export const parseTimeParts = (mm: string, ss: string, cc: string): number => {
  const mins = parseInt(mm || '0');
  const secs = parseInt(ss || '0');
  const ms = parseInt(cc || '0');
  return mins * 60 + secs + ms / 100;
};

export const formatTimeDisplay = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const SEGMENT_COLORS = [
  'rgba(245, 158, 11, 0.3)',
  'rgba(59, 130, 246, 0.3)',
  'rgba(16, 185, 129, 0.3)',
  'rgba(239, 68, 68, 0.3)',
  'rgba(168, 85, 247, 0.3)',
  'rgba(236, 72, 153, 0.3)',
  'rgba(20, 184, 166, 0.3)',
  'rgba(251, 146, 60, 0.3)',
];

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { key: ' ', action: 'togglePlayPause', description: 'Play/Pause' },
  { key: 's', action: 'setStartTime', description: 'Set segment start to current time' },
  { key: 'e', action: 'setEndTime', description: 'Set segment end to current time' },
  { key: 'n', action: 'newSegment', description: 'Create new segment at current time' },
  { key: 'd', action: 'deleteSelected', description: 'Delete selected segment' },
  { key: 'Delete', action: 'deleteSelected', description: 'Delete selected segment' },
  { key: 'c', ctrl: true, action: 'copySegment', description: 'Copy segment' },
  { key: 'v', ctrl: true, action: 'pasteSegment', description: 'Paste segment' },
  { key: 'd', ctrl: true, action: 'duplicateSegment', description: 'Duplicate segment' },
  { key: 'z', ctrl: true, action: 'undo', description: 'Undo' },
  { key: 'z', ctrl: true, shift: true, action: 'redo', description: 'Redo' },
  { key: 'y', ctrl: true, action: 'redo', description: 'Redo' },
  { key: 'ArrowLeft', action: 'seekBackward1s', description: 'Seek back 1s' },
  { key: 'ArrowRight', action: 'seekForward1s', description: 'Seek forward 1s' },
  { key: 'ArrowLeft', shift: true, action: 'seekBackward5s', description: 'Seek back 5s' },
  { key: 'ArrowRight', shift: true, action: 'seekForward5s', description: 'Seek forward 5s' },
  { key: '[', action: 'adjustStartEarlier', description: 'Move start time earlier' },
  { key: ']', action: 'adjustEndLater', description: 'Move end time later' },
  { key: 'Escape', action: 'deselect', description: 'Deselect / Cancel' },
  { key: 'PageUp', action: 'prevPage', description: 'Previous page' },
  { key: 'PageDown', action: 'nextPage', description: 'Next page' },
  { key: '=', ctrl: true, action: 'zoomIn', description: 'Zoom in' },
  { key: '-', ctrl: true, action: 'zoomOut', description: 'Zoom out' },
  { key: '0', ctrl: true, action: 'resetZoom', description: 'Reset zoom' },
];
