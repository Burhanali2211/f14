# Teleprompter & Image Segment Editor - Technical Report

## Executive Summary
This report provides a comprehensive overview of the Teleprompter and Image Segment Editor features for the Kalaam Reader platform. The purpose is to identify the current architecture, known issues, and provide actionable recommendations for AI-assisted planning and improvements.

---

## 1. System Overview

### 1.1 Purpose
The Teleprompter and Image Segment Editor serve complementary purposes:
- **Teleprompter**: Text-based synchronized display of lyrics/recitation content with audio playback
- **Image Segment Editor**: Visual annotation tool for mapping image regions (PDF pages or images) to audio timestamps

Both tools enable users to create synchronized presentations where visual content follows along with audio playback.

### 1.2 Core User Workflow
1. User uploads a piece (recitation/nasheed) with images/PDF and audio
2. User opens Image Segment Editor to draw regions on images and sync them with audio timestamps
3. Regions are saved locally (auto-save) and synced to Supabase cloud
4. During playback, the current region highlights based on audio position

---

## 2. Architecture Analysis

### 2.1 File Structure
```
src/components/media/ImageSegmentEditor/
├── index.tsx                    # Main editor component (510 lines)
├── types.ts                     # TypeScript interfaces and utilities
├── components/
│   ├── EditorHeader.tsx         # Header with save/preview/audio controls
│   ├── ImageCanvas.tsx          # Canvas for drawing/editing regions
│   ├── PageNavigation.tsx       # Multi-page navigation
│   ├── RecoveryDialog.tsx       # Local vs cloud data conflict resolution
│   ├── SegmentEditor.tsx        # Individual segment time editing panel
│   ├── SegmentList.tsx          # List view of all segments
│   ├── SelectionToolbar.tsx     # Bulk selection actions
│   ├── TimeInput.tsx            # Time input component (MM:SS.CC)
│   ├── TimelineView.tsx         # Timeline-based segment visualization
│   ├── Toolbar.tsx              # Main toolbar (zoom, undo/redo)
│   └── WaveformTimeline.tsx     # Audio waveform with segment markers
├── hooks/
│   ├── useAudioPlayer.ts        # Audio playback control hook
│   ├── useAutoSave.ts           # Local storage + cloud sync hook
│   ├── useKeyboardShortcuts.ts  # Keyboard shortcut handling
│   ├── useSegmentSelection.ts   # Multi-selection state management
│   ├── useUndoRedo.ts           # History management for undo/redo
│   └── useZoomPan.ts            # Zoom and pan controls
```

### 2.2 Related Teleprompter Files
```
src/lib/teleprompter-types.ts    # Text-based segment types
src/lib/teleprompter-storage.ts  # LocalStorage operations for text teleprompter
src/components/media/TeleprompterView.tsx      # Text teleprompter dialog
src/components/media/TeleprompterEditor.tsx    # Text segment editor
src/pages/ImageSegmentEditorPage.tsx           # Image editor page wrapper
```

### 2.3 Data Models

#### ImageRegion (Image-based segments)
```typescript
interface ImageRegion {
  id: string;
  imageIndex: number;    // Which page/image this region belongs to
  x: number;             // X position (percentage, currently always 0)
  y: number;             // Y position (percentage 0-100)
  width: number;         // Width (percentage, currently always 100)
  height: number;        // Height (percentage)
  startTime: number;     // Audio start time (seconds)
  endTime: number;       // Audio end time (seconds)
  order: number;         // Display order
  label?: string;        // Optional user-defined label
  color?: string;        // Optional custom color
}
```

#### TeleprompterSegment (Text-based segments)
```typescript
interface TeleprompterSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  index: number;
  isHeader?: boolean;
  notes?: string;
}
```

### 2.4 Storage Architecture

#### Local Storage
- **Key**: `image-regions-{pieceId}`
- **Auto-save**: Every 500ms after changes (debounced)
- **Data stored**: Regions array + version number + savedAt timestamp + syncedToCloud flag

#### Cloud Storage (Supabase)
- **Table**: `piece_image_segments`
- **Columns**: `piece_id`, `regions` (JSONB), `version`, `created_at`, `updated_at`
- **Sync interval**: Every 30 seconds if there are unsaved changes
- **Conflict resolution**: Dialog shown when local version > cloud version and not synced

---

## 3. Current Features

### 3.1 Image Segment Editor Features
| Feature | Status | Notes |
|---------|--------|-------|
| Draw regions on image | ✅ Working | Click and drag to create horizontal bands |
| Resize regions | ✅ Working | Drag top/bottom handles |
| Move regions | ✅ Working | Drag region body |
| Edit segment times | ✅ Working | Manual input or capture from current audio position |
| Multi-selection | ✅ Working | Ctrl+click, Shift+click for range |
| Undo/Redo | ✅ Working | 50-level history |
| Keyboard shortcuts | ✅ Working | Space, S, E, arrow keys, etc. |
| PDF support | ✅ Working | PDF.js renders pages as images |
| Audio waveform | ⚠️ Partial | WaveSurfer.js integration sometimes fails |
| Zoom/Pan | ✅ Working | Zoom and pan on image canvas |
| Auto-save | ✅ Working | Local + cloud sync |
| AirSend | ✅ Working | Receive audio from mobile device |

### 3.2 Teleprompter Features
| Feature | Status | Notes |
|---------|--------|-------|
| Text segment playback | ✅ Working | Highlights current segment |
| Audio sync | ✅ Working | Follows audio playback position |
| Settings (font size, highlight mode) | ✅ Working | Persisted per session |
| Keyboard controls | ✅ Working | Standard media controls |

---

## 4. Known Issues & Problems

### 4.1 Critical Issues

#### 4.1.1 Audio Playback Synchronization
**Problem**: The `useAudioPlayer` hook uses `requestAnimationFrame` for time updates, which can cause:
- Dropped frames during heavy rendering
- Inconsistent timing precision (RAF runs at ~60fps = ~16ms resolution)
- Segments may not highlight at exactly the right moment

**Code Location**: `src/components/media/ImageSegmentEditor/hooks/useAudioPlayer.ts` (lines 66-91)

**Current Implementation**:
```typescript
useEffect(() => {
  const updateTime = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      setState(prev => ({ ...prev, currentTime }));
      onTimeUpdate?.(currentTime);
      // Loop check runs here, may miss exact boundaries
      if (state.isLooping && state.loopEnd !== null && currentTime >= state.loopEnd) {
        audioRef.current.currentTime = state.loopStart ?? 0;
      }
    }
    if (state.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
  };
  // ...
}, [state.isPlaying, state.isLooping, state.loopStart, state.loopEnd, onTimeUpdate]);
```

#### 4.1.2 Region Selection State Management
**Problem**: Selection state is managed in multiple places causing potential inconsistencies:
- `useSegmentSelection` hook manages `selectedIds` as array internally but exposes as Set
- `focusedId` vs `selectedIds` distinction is confusing
- State sync between ImageCanvas and SegmentList may lag

**Code Location**: `src/components/media/ImageSegmentEditor/hooks/useSegmentSelection.ts`

#### 4.1.3 WaveSurfer Integration Issues
**Problem**: WaveSurfer.js waveform sometimes fails to load or sync with audio:
- Separate audio element (`useAudioPlayer`) and WaveSurfer instance
- Manual sync attempts in WaveformTimeline may drift
- No error recovery for waveform load failures

**Code Location**: `src/components/media/ImageSegmentEditor/components/WaveformTimeline.tsx` (lines 51-131)

#### 4.1.4 Cloud Sync Race Conditions
**Problem**: The auto-save system can have race conditions:
- Multiple save operations might overlap
- Version numbers could conflict between tabs
- No optimistic concurrency control

**Code Location**: `src/components/media/ImageSegmentEditor/hooks/useAutoSave.ts`

### 4.2 Performance Issues

#### 4.2.1 Re-renders on Every Audio Time Update
**Problem**: Every audio time update causes re-renders:
- `activeId` computed on every time change
- SegmentList re-renders to show active segment
- ImageCanvas re-renders to update active highlighting

**Impact**: CPU usage spikes during playback, especially with many segments.

#### 4.2.2 PDF Rendering Memory Usage
**Problem**: All PDF pages rendered to canvas at scale 2x:
- Large PDFs consume significant memory
- Pages stored as data URLs (base64)
- No lazy loading or virtualization

**Code Location**: `src/components/media/ImageSegmentEditor/index.tsx` (lines 96-141)

### 4.3 UX Issues

#### 4.3.1 Confusing Selection Model
- "Selected" vs "Focused" distinction not clear to users
- Selected = blue border, Focused = editing, Active = playing
- Users don't understand multi-selection behavior

#### 4.3.2 Time Input Complexity
- MM:SS.CC format requires precise input
- No relative adjustment buttons in quick access
- Centiseconds (CC) often unnecessary precision

#### 4.3.3 No Visual Feedback for Cloud Sync Status
- Sync errors only shown in console
- No visual indicator of pending sync
- Users unsure if data is saved to cloud

---

## 5. Code Quality Observations

### 5.1 Positive Patterns
- Good TypeScript type coverage
- Custom hooks for separation of concerns
- Memoization used in many components
- Comprehensive keyboard shortcuts

### 5.2 Areas for Improvement

#### 5.2.1 Component Size
- `index.tsx` (510 lines) handles too many responsibilities
- Should extract more logic into hooks or context

#### 5.2.2 State Lifting Issues
- Many callbacks passed through multiple levels
- Would benefit from context or state management library

#### 5.2.3 Inconsistent Error Handling
- Some errors logged to console only
- No user-facing error boundaries
- Audio failures silently ignored

---

## 6. Recommended Improvements

### 6.1 High Priority

#### 6.1.1 Audio Timing Precision
```typescript
// Use timeupdate event instead of RAF for better precision
audio.addEventListener('timeupdate', () => {
  setState(prev => ({ ...prev, currentTime: audio.currentTime }));
});

// Add more frequent custom polling only when needed
const preciseTimer = setInterval(() => {
  if (isPlaying && audioRef.current) {
    // Only update state every 100ms to reduce re-renders
    const newTime = audioRef.current.currentTime;
    if (Math.abs(newTime - lastTimeRef.current) > 0.1) {
      updateCurrentTime(newTime);
      lastTimeRef.current = newTime;
    }
  }
}, 100);
```

#### 6.1.2 Single Audio Source
```typescript
// Unify WaveSurfer and HTMLAudioElement
// Option 1: Use WaveSurfer as primary audio source
const ws = WaveSurfer.create({...});
// Use ws.backend.getAudioElement() for all operations

// Option 2: Hide WaveSurfer waveform, only use for visualization
// Keep current HTMLAudioElement for playback
```

#### 6.1.3 Optimistic Sync with Conflict Resolution
```typescript
// Add version-based conflict detection
const syncToCloud = async () => {
  const { data: current } = await supabase
    .from('piece_image_segments')
    .select('version')
    .eq('piece_id', pieceId)
    .single();
  
  if (current?.version !== localVersionRef.current - 1) {
    // Show conflict dialog
    setShowConflictDialog(true);
    return;
  }
  // Proceed with update
};
```

### 6.2 Medium Priority

#### 6.2.1 Reduce Re-renders During Playback
```typescript
// Batch time updates
const [displayTime, setDisplayTime] = useState(0);
useEffect(() => {
  const interval = setInterval(() => {
    if (audioRef.current) {
      setDisplayTime(Math.floor(audioRef.current.currentTime * 10) / 10);
    }
  }, 100); // Update display every 100ms instead of every frame
  return () => clearInterval(interval);
}, []);

// Use useMemo for active segment calculation with throttled time
const activeId = useMemo(() => {
  return regions.find(r => displayTime >= r.startTime && displayTime < r.endTime)?.id ?? null;
}, [regions, displayTime]); // Only recalculates when displayTime changes
```

#### 6.2.2 PDF Lazy Loading
```typescript
// Only render current page + neighbors
const [renderedPages, setRenderedPages] = useState<Map<number, string>>(new Map());

const renderPage = async (pageIndex: number) => {
  if (renderedPages.has(pageIndex)) return;
  // Render page...
  setRenderedPages(prev => new Map(prev).set(pageIndex, dataUrl));
};

useEffect(() => {
  // Render current, prev, next pages
  [currentPageIndex - 1, currentPageIndex, currentPageIndex + 1]
    .filter(i => i >= 0 && i < pdf.numPages)
    .forEach(renderPage);
}, [currentPageIndex]);
```

#### 6.2.3 State Management Refactor
```typescript
// Create EditorContext to avoid prop drilling
const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }) {
  // All state management here
  const selection = useSegmentSelection(...);
  const audio = useAudioPlayer(...);
  const history = useUndoRedo(...);
  
  return (
    <EditorContext.Provider value={{ selection, audio, history, ... }}>
      {children}
    </EditorContext.Provider>
  );
}
```

### 6.3 Low Priority

#### 6.3.1 Better Visual Sync Status
```typescript
// Add sync status indicator component
function SyncStatusIndicator({ status }: { status: SaveStatus }) {
  if (status.isSyncingToCloud) return <Loader2 className="animate-spin" />;
  if (status.syncError) return <AlertCircle className="text-destructive" />;
  if (status.hasUnsavedChanges) return <Cloud className="text-yellow-500" />;
  return <CheckCircle className="text-green-500" />;
}
```

#### 6.3.2 Simplified Time Input
```typescript
// Add quick adjustment buttons
<div className="flex items-center gap-1">
  <Button size="sm" onClick={() => adjustTime(-1)}>-1s</Button>
  <Button size="sm" onClick={() => adjustTime(-0.1)}>-0.1s</Button>
  <TimeDisplay value={time} />
  <Button size="sm" onClick={() => adjustTime(0.1)}>+0.1s</Button>
  <Button size="sm" onClick={() => adjustTime(1)}>+1s</Button>
</div>
```

---

## 7. Database Schema Reference

### 7.1 Current Schema (piece_image_segments)
```sql
CREATE TABLE piece_image_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_id UUID REFERENCES pieces(id) ON DELETE CASCADE,
  regions JSONB NOT NULL DEFAULT '[]',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(piece_id)
);
```

### 7.2 Recommended Schema Updates
```sql
-- Add last_modified_by for multi-user tracking
ALTER TABLE piece_image_segments 
ADD COLUMN last_modified_by UUID REFERENCES auth.users(id);

-- Add index for faster lookups
CREATE INDEX idx_piece_image_segments_piece_id 
ON piece_image_segments(piece_id);

-- Consider separate table for regions if scaling needed
CREATE TABLE image_segment_regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_set_id UUID REFERENCES piece_image_segments(id) ON DELETE CASCADE,
  image_index INTEGER NOT NULL,
  y_position NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  label TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. Testing Checklist

### 8.1 Functional Tests
- [ ] Create new segment by dragging on image
- [ ] Resize segment by dragging handles
- [ ] Move segment by dragging body
- [ ] Edit segment times in panel
- [ ] Delete single segment
- [ ] Multi-select and delete
- [ ] Undo/redo operations
- [ ] Copy/paste segments
- [ ] Play/pause audio
- [ ] Seek audio with keyboard
- [ ] Set start/end time from audio position (S/E keys)
- [ ] Navigate between pages
- [ ] Save and reload (local storage)
- [ ] Save and reload (cloud sync)
- [ ] Recovery dialog for conflicts
- [ ] PDF rendering
- [ ] AirSend audio transfer

### 8.2 Edge Cases
- [ ] Very long audio (>1 hour)
- [ ] Many segments (>100)
- [ ] Large PDF (>50 pages)
- [ ] Network disconnection during sync
- [ ] Browser tab losing focus
- [ ] Mobile/touch interactions
- [ ] Multiple tabs open same piece

---

## 9. Summary for AI Planning

### What Works Well
1. Basic region creation and editing
2. Audio playback and basic sync
3. Keyboard shortcuts
4. Undo/redo history
5. PDF support
6. Auto-save to local storage

### What Needs Fixing
1. **Audio timing precision** - Switch from RAF to more reliable timing
2. **Waveform integration** - Either fix dual-audio issue or remove waveform
3. **Re-render performance** - Throttle time updates, optimize active segment calculation
4. **Cloud sync reliability** - Add conflict detection, better error handling
5. **Selection UX** - Clarify selected/focused/active states

### Recommended Approach
1. First, fix audio timing to use `timeupdate` events + throttled state updates
2. Then, unify audio sources (pick one: HTMLAudioElement or WaveSurfer)
3. Next, add EditorContext to clean up prop drilling
4. Finally, add proper sync status indicators and error handling

### Estimated Effort
- Audio timing fix: 2-4 hours
- Audio unification: 4-6 hours
- Performance optimization: 3-5 hours
- State management refactor: 6-8 hours
- Sync improvements: 4-6 hours
- UX polish: 4-6 hours

**Total estimated: 23-35 hours of development work**

---

*Report generated for AI-assisted planning. Provide this document to Claude AI for context when requesting specific improvements or fixes.*
