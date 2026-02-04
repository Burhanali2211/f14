import type { 
  TeleprompterSession, 
  TeleprompterProgress, 
  TeleprompterSegment
} from './teleprompter-types';

const SESSIONS_KEY = 'teleprompter_sessions';
const PROGRESS_KEY = 'teleprompter_progress';
const AUTOSAVE_KEY = 'teleprompter_autosave';
const UNDO_HISTORY_KEY = 'teleprompter_undo_history';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getSessions(): Record<string, TeleprompterSession> {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function getSession(pieceId: string): TeleprompterSession | null {
  const sessions = getSessions();
  return Object.values(sessions).find(s => s.pieceId === pieceId) || null;
}

export function getSessionById(sessionId: string): TeleprompterSession | null {
  const sessions = getSessions();
  return sessions[sessionId] || null;
}

export function saveSession(session: TeleprompterSession): TeleprompterSession {
  const sessions = getSessions();
  session.updatedAt = new Date().toISOString();
  session.lastEditedAt = new Date().toISOString();
  sessions[session.id] = session;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  saveUndoState(session.id, session);
  return session;
}

export function createSession(
  pieceId: string, 
  audioUrl?: string | null,
  initialSegments?: TeleprompterSegment[]
): TeleprompterSession {
  const existing = getSession(pieceId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const session: TeleprompterSession = {
    id: generateId(),
    pieceId,
    audioUrl: audioUrl || null,
    segments: initialSegments || [],
    playbackSpeed: 1.0,
    scrollBehavior: 'smooth',
    highlightMode: 'background',
    fontSize: 24,
    isDraft: true,
    lastEditedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  return saveSession(session);
}

export function deleteSession(sessionId: string): void {
  const sessions = getSessions();
  delete sessions[sessionId];
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  
  const progress = getAllProgress();
  delete progress[sessionId];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  
  clearUndoHistory(sessionId);
  clearAutosave(sessionId);
}

export function finishTeleprompterTask(pieceId: string): void {
  const session = getSession(pieceId);
  if (session) {
    deleteSession(session.id);
  }
  localStorage.removeItem(`image-regions-${pieceId}`);
}

export function updateSessionSegments(
  sessionId: string, 
  segments: TeleprompterSegment[],
  audioDuration?: number
): TeleprompterSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const finalSegments = audioDuration != null && audioDuration > 0
    ? clipSegmentsToDuration(segments, audioDuration)
    : segments;

  session.segments = finalSegments.map((seg, idx) => ({ ...seg, index: idx }));
  return saveSession(session);
}

export function updateSessionSettings(
  sessionId: string,
  settings: Partial<Pick<TeleprompterSession, 'playbackSpeed' | 'scrollBehavior' | 'highlightMode' | 'fontSize' | 'audioUrl'>>
): TeleprompterSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;
  
  Object.assign(session, settings);
  return saveSession(session);
}

export function addSegment(
  sessionId: string,
  text: string,
  startTime: number,
  endTime: number,
  insertAtIndex?: number,
  audioDuration?: number
): TeleprompterSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const clippedStart = audioDuration != null ? clipTime(startTime, audioDuration) : startTime;
  const clippedEnd = audioDuration != null ? clipTime(endTime, audioDuration) : endTime;
  const finalEnd = clippedEnd > clippedStart ? clippedEnd : Math.min(clippedStart + 0.5, audioDuration ?? clippedStart + 1);

  const newSegment: TeleprompterSegment = {
    id: generateId(),
    text,
    startTime: clippedStart,
    endTime: finalEnd,
    index: insertAtIndex ?? session.segments.length,
  };

  if (insertAtIndex !== undefined) {
    session.segments.splice(insertAtIndex, 0, newSegment);
    session.segments = session.segments.map((seg, idx) => ({ ...seg, index: idx }));
  } else {
    session.segments.push(newSegment);
  }

  return saveSession(session);
}

export function updateSegment(
  sessionId: string,
  segmentId: string,
  updates: Partial<Omit<TeleprompterSegment, 'id' | 'index'>>,
  audioDuration?: number
): TeleprompterSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const segmentIndex = session.segments.findIndex(s => s.id === segmentId);
  if (segmentIndex === -1) return null;

  let finalUpdates = { ...updates };
  if (audioDuration != null && (updates.startTime !== undefined || updates.endTime !== undefined)) {
    const start = updates.startTime ?? session.segments[segmentIndex]!.startTime;
    const end = updates.endTime ?? session.segments[segmentIndex]!.endTime;
    finalUpdates = {
      ...finalUpdates,
      startTime: clipTime(start, audioDuration),
      endTime: Math.min(clipTime(end, audioDuration), audioDuration),
    };
    if ((finalUpdates.endTime ?? end) <= (finalUpdates.startTime ?? start)) {
      finalUpdates.endTime = Math.min((finalUpdates.startTime ?? start) + 0.5, audioDuration);
    }
  }

  session.segments[segmentIndex] = {
    ...session.segments[segmentIndex],
    ...finalUpdates,
  };

  return saveSession(session);
}

export function deleteSegment(sessionId: string, segmentId: string): TeleprompterSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  session.segments = session.segments
    .filter(s => s.id !== segmentId)
    .map((seg, idx) => ({ ...seg, index: idx }));

  return saveSession(session);
}

export function splitSegment(
  sessionId: string,
  segmentId: string,
  splitTime: number,
  audioDuration?: number
): TeleprompterSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const segmentIndex = session.segments.findIndex(s => s.id === segmentId);
  if (segmentIndex === -1) return null;

  const segment = session.segments[segmentIndex];
  const clampedSplit = audioDuration != null ? clipTime(splitTime, audioDuration) : splitTime;
  if (clampedSplit <= segment.startTime || clampedSplit >= segment.endTime) return null;

  const maxEnd = audioDuration != null ? Math.min(segment.endTime, audioDuration) : segment.endTime;

  const firstPart: TeleprompterSegment = {
    ...segment,
    endTime: clampedSplit,
  };

  const secondPart: TeleprompterSegment = {
    id: generateId(),
    text: '',
    startTime: clampedSplit,
    endTime: maxEnd,
    index: segmentIndex + 1,
  };

  session.segments.splice(segmentIndex, 1, firstPart, secondPart);
  session.segments = session.segments.map((seg, idx) => ({ ...seg, index: idx }));

  return saveSession(session);
}

export function mergeSegments(
  sessionId: string,
  segmentId1: string,
  segmentId2: string,
  audioDuration?: number
): TeleprompterSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const idx1 = session.segments.findIndex(s => s.id === segmentId1);
  const idx2 = session.segments.findIndex(s => s.id === segmentId2);
  if (idx1 === -1 || idx2 === -1 || Math.abs(idx1 - idx2) !== 1) return null;

  const [first, second] = idx1 < idx2 
    ? [session.segments[idx1], session.segments[idx2]]
    : [session.segments[idx2], session.segments[idx1]];

  const mergedEnd = audioDuration != null
    ? Math.min(second!.endTime, audioDuration)
    : second!.endTime;

  const merged: TeleprompterSegment = {
    id: first!.id,
    text: `${first!.text}\n${second!.text}`.trim(),
    startTime: first!.startTime,
    endTime: mergedEnd,
    index: Math.min(idx1, idx2),
    isHeader: first!.isHeader || second!.isHeader,
  };

  session.segments = session.segments
    .filter(s => s.id !== first!.id && s.id !== second!.id);
  session.segments.splice(merged.index, 0, merged);
  session.segments = session.segments.map((seg, idx) => ({ ...seg, index: idx }));

  return saveSession(session);
}

export function reorderSegments(
  sessionId: string,
  fromIndex: number,
  toIndex: number
): TeleprompterSession | null {
  const session = getSessionById(sessionId);
  if (!session) return null;

  const segments = [...session.segments];
  const [moved] = segments.splice(fromIndex, 1);
  segments.splice(toIndex, 0, moved);
  session.segments = segments.map((seg, idx) => ({ ...seg, index: idx }));

  return saveSession(session);
}

export function getAllProgress(): Record<string, TeleprompterProgress> {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function getProgress(sessionId: string): TeleprompterProgress | null {
  const allProgress = getAllProgress();
  return allProgress[sessionId] || null;
}

export function saveProgress(progress: TeleprompterProgress): TeleprompterProgress {
  const allProgress = getAllProgress();
  allProgress[progress.sessionId] = progress;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
  return progress;
}

export function updateProgress(
  sessionId: string,
  updates: Partial<Omit<TeleprompterProgress, 'sessionId'>>
): TeleprompterProgress {
  const existing = getProgress(sessionId) || {
    sessionId,
    currentTime: 0,
    currentSegment: 0,
    completedSegments: [],
    isCompleted: false,
    practiceCount: 0,
    totalPracticeTime: 0,
    lastPracticedAt: null,
  };

  const updated = { ...existing, ...updates };
  return saveProgress(updated);
}

export function markSegmentCompleted(sessionId: string, segmentIndex: number): TeleprompterProgress {
  const progress = getProgress(sessionId) || {
    sessionId,
    currentTime: 0,
    currentSegment: 0,
    completedSegments: [],
    isCompleted: false,
    practiceCount: 0,
    totalPracticeTime: 0,
    lastPracticedAt: null,
  };

  if (!progress.completedSegments.includes(segmentIndex)) {
    progress.completedSegments = [...progress.completedSegments, segmentIndex].sort((a, b) => a - b);
  }

  return saveProgress(progress);
}

export function resetProgress(sessionId: string): TeleprompterProgress {
  return saveProgress({
    sessionId,
    currentTime: 0,
    currentSegment: 0,
    completedSegments: [],
    isCompleted: false,
    practiceCount: 0,
    totalPracticeTime: 0,
    lastPracticedAt: null,
  });
}

export function incrementPracticeCount(sessionId: string, practiceTime: number): TeleprompterProgress {
  const progress = getProgress(sessionId) || {
    sessionId,
    currentTime: 0,
    currentSegment: 0,
    completedSegments: [],
    isCompleted: false,
    practiceCount: 0,
    totalPracticeTime: 0,
    lastPracticedAt: null,
  };

  progress.practiceCount += 1;
  progress.totalPracticeTime += practiceTime;
  progress.lastPracticedAt = new Date().toISOString();

  return saveProgress(progress);
}

interface AutosaveData {
  sessionId: string;
  segments: TeleprompterSegment[];
  timestamp: string;
}

export function getAutosave(sessionId: string): AutosaveData | null {
  try {
    const key = `${AUTOSAVE_KEY}_${sessionId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveAutosave(sessionId: string, segments: TeleprompterSegment[]): void {
  const key = `${AUTOSAVE_KEY}_${sessionId}`;
  const data: AutosaveData = {
    sessionId,
    segments,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(data));
}

export function clearAutosave(sessionId: string): void {
  localStorage.removeItem(`${AUTOSAVE_KEY}_${sessionId}`);
}

export function hasUnsavedChanges(sessionId: string): boolean {
  const autosave = getAutosave(sessionId);
  if (!autosave) return false;
  
  const session = getSessionById(sessionId);
  if (!session) return false;
  
  return JSON.stringify(autosave.segments) !== JSON.stringify(session.segments);
}

interface UndoHistory {
  past: TeleprompterSession[];
  future: TeleprompterSession[];
}

function getUndoHistory(sessionId: string): UndoHistory {
  try {
    const key = `${UNDO_HISTORY_KEY}_${sessionId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { past: [], future: [] };
  } catch {
    return { past: [], future: [] };
  }
}

function saveUndoHistory(sessionId: string, history: UndoHistory): void {
  const key = `${UNDO_HISTORY_KEY}_${sessionId}`;
  const limitedHistory = {
    past: history.past.slice(-20),
    future: history.future.slice(-20),
  };
  localStorage.setItem(key, JSON.stringify(limitedHistory));
}

function saveUndoState(sessionId: string, session: TeleprompterSession): void {
  const history = getUndoHistory(sessionId);
  history.past.push(JSON.parse(JSON.stringify(session)));
  history.future = [];
  saveUndoHistory(sessionId, history);
}

export function undo(sessionId: string): TeleprompterSession | null {
  const history = getUndoHistory(sessionId);
  if (history.past.length < 2) return null;

  const current = history.past.pop()!;
  const previous = history.past[history.past.length - 1];
  history.future.unshift(current);
  
  saveUndoHistory(sessionId, history);
  
  const sessions = getSessions();
  sessions[sessionId] = previous;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  
  return previous;
}

export function redo(sessionId: string): TeleprompterSession | null {
  const history = getUndoHistory(sessionId);
  if (history.future.length === 0) return null;

  const next = history.future.shift()!;
  history.past.push(next);
  
  saveUndoHistory(sessionId, history);
  
  const sessions = getSessions();
  sessions[sessionId] = next;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  
  return next;
}

export function canUndo(sessionId: string): boolean {
  const history = getUndoHistory(sessionId);
  return history.past.length > 1;
}

export function canRedo(sessionId: string): boolean {
  const history = getUndoHistory(sessionId);
  return history.future.length > 0;
}

export function clearUndoHistory(sessionId: string): void {
  localStorage.removeItem(`${UNDO_HISTORY_KEY}_${sessionId}`);
}

/**
 * Clips segment times to fit within [0, audioDuration].
 * Ensures total segment duration does not exceed audio length for accessibility.
 */
export function clipSegmentsToDuration(
  segments: TeleprompterSegment[],
  audioDuration: number
): TeleprompterSegment[] {
  if (!Number.isFinite(audioDuration) || audioDuration <= 0) return segments;

  const maxEnd = Math.max(0, audioDuration);

  return segments.map((seg, idx) => ({
    ...seg,
    index: idx,
    startTime: Math.max(0, Math.min(seg.startTime, maxEnd)),
    endTime: Math.max(0, Math.min(seg.endTime, maxEnd)),
  })).map(seg => {
    if (seg.endTime <= seg.startTime) {
      return { ...seg, endTime: Math.min(seg.startTime + 0.5, maxEnd) };
    }
    return seg;
  });
}

/**
 * Clips a single time value to [0, audioDuration].
 */
function clipTime(time: number, audioDuration: number): number {
  if (!Number.isFinite(audioDuration) || audioDuration <= 0) return time;
  return Math.max(0, Math.min(time, audioDuration));
}

export function parseTextToSegments(
  text: string,
  defaultSegmentDuration: number = 5,
  audioDuration?: number
): TeleprompterSegment[] {
  const paragraphs = text.split('|').filter(p => p.trim());
  let currentTime = 0;

  let segments = paragraphs.map((para, index) => {
    const lines = para.split('\n').filter(l => l.trim());
    const estimatedDuration = Math.max(defaultSegmentDuration, lines.length * 2);

    const segment: TeleprompterSegment = {
      id: generateId(),
      text: lines.join('\n'),
      startTime: currentTime,
      endTime: currentTime + estimatedDuration,
      index,
      isHeader: lines.length === 1 && lines[0].length < 50,
    };

    currentTime += estimatedDuration;
    return segment;
  });

  if (Number.isFinite(audioDuration) && audioDuration > 0 && segments.length > 0) {
    const totalDuration = segments[segments.length - 1]!.endTime;
    if (totalDuration > audioDuration) {
      const scale = audioDuration / totalDuration;
      segments = segments.map((seg, idx) => ({
        ...seg,
        index: idx,
        startTime: seg.startTime * scale,
        endTime: Math.min(seg.endTime * scale, audioDuration),
      }));
      segments[segments.length - 1] = {
        ...segments[segments.length - 1]!,
        endTime: audioDuration,
      };
    }
  }

  return segments;
}

export function findSegmentAtTime(
  segments: TeleprompterSegment[],
  time: number
): TeleprompterSegment | null {
  return segments.find(s => time >= s.startTime && time < s.endTime) || null;
}

export function findSegmentIndexAtTime(
  segments: TeleprompterSegment[],
  time: number
): number {
  const index = segments.findIndex(s => time >= s.startTime && time < s.endTime);
  return index !== -1 ? index : (time >= (segments[segments.length - 1]?.endTime || 0) ? segments.length - 1 : 0);
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseTime(timeStr: string): number {
  const match = timeStr.match(/^(\d+):(\d{2})(?:\.(\d{2}))?$/);
  if (!match) return 0;
  const [, mins, secs, ms = '0'] = match;
  return parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 100;
}
