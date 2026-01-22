export interface TeleprompterSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  index: number;
  isHeader?: boolean;
  notes?: string;
}

export interface TeleprompterSession {
  id: string;
  pieceId: string;
  audioUrl: string | null;
  segments: TeleprompterSegment[];
  playbackSpeed: number;
  scrollBehavior: 'smooth' | 'instant' | 'auto';
  highlightMode: 'background' | 'border' | 'scale' | 'glow';
  fontSize: number;
  isDraft: boolean;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeleprompterProgress {
  sessionId: string;
  currentTime: number;
  currentSegment: number;
  completedSegments: number[];
  isCompleted: boolean;
  practiceCount: number;
  totalPracticeTime: number;
  lastPracticedAt: string | null;
}

export interface TeleprompterState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentSegmentIndex: number;
  isFullscreen: boolean;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  isLooping: boolean;
  loopStart: number | null;
  loopEnd: number | null;
}

export const DEFAULT_SESSION: Omit<TeleprompterSession, 'id' | 'pieceId' | 'createdAt' | 'updatedAt'> = {
  audioUrl: null,
  segments: [],
  playbackSpeed: 1.0,
  scrollBehavior: 'smooth',
  highlightMode: 'background',
  fontSize: 24,
  isDraft: true,
  lastEditedAt: new Date().toISOString(),
};

export const DEFAULT_PROGRESS: Omit<TeleprompterProgress, 'sessionId'> = {
  currentTime: 0,
  currentSegment: 0,
  completedSegments: [],
  isCompleted: false,
  practiceCount: 0,
  totalPracticeTime: 0,
  lastPracticedAt: null,
};
