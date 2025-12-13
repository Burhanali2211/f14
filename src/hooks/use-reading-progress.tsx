import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ReadingProgress {
  pieceId: string;
  scrollPosition: number;
  currentVerse: number;
  completed: boolean;
  lastRead: string;
}

interface ReadingProgressContextType {
  getProgress: (pieceId: string) => ReadingProgress | undefined;
  saveProgress: (pieceId: string, progress: Partial<ReadingProgress>) => void;
  markAsCompleted: (pieceId: string) => void;
  clearProgress: (pieceId: string) => void;
  getAllProgress: () => ReadingProgress[];
  getRecentlyRead: (limit?: number) => ReadingProgress[];
}

const ReadingProgressContext = createContext<ReadingProgressContextType | undefined>(undefined);

export function ReadingProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Record<string, ReadingProgress>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('reading-progress');
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('reading-progress', JSON.stringify(progress));
  }, [progress]);

  const getProgress = (pieceId: string) => progress[pieceId];

  const saveProgress = (pieceId: string, update: Partial<ReadingProgress>) => {
    setProgress(prev => ({
      ...prev,
      [pieceId]: {
        pieceId,
        scrollPosition: 0,
        currentVerse: 0,
        completed: false,
        ...prev[pieceId],
        ...update,
        lastRead: new Date().toISOString(),
      },
    }));
  };

  const markAsCompleted = (pieceId: string) => {
    saveProgress(pieceId, { completed: true });
  };

  const clearProgress = (pieceId: string) => {
    setProgress(prev => {
      const { [pieceId]: _, ...rest } = prev;
      return rest;
    });
  };

  const getAllProgress = () => Object.values(progress);

  const getRecentlyRead = (limit = 5) => {
    return Object.values(progress)
      .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())
      .slice(0, limit);
  };

  return (
    <ReadingProgressContext.Provider value={{
      getProgress,
      saveProgress,
      markAsCompleted,
      clearProgress,
      getAllProgress,
      getRecentlyRead,
    }}>
      {children}
    </ReadingProgressContext.Provider>
  );
}

export function useReadingProgress() {
  const context = useContext(ReadingProgressContext);
  if (!context) {
    throw new Error('useReadingProgress must be used within a ReadingProgressProvider');
  }
  return context;
}
