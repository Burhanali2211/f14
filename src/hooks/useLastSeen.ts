import { useState, useEffect, useCallback } from 'react';

export interface LastSeenBookmark {
  type: 'surah' | 'para';
  surahNumber?: number;
  paraNumber?: number;
  ayahNumber: number;
  surahName?: string;
  paraName?: string;
  timestamp: number;
}

const STORAGE_KEY = 'quran-last-seen';

export function useLastSeen() {
  const [lastSeen, setLastSeen] = useState<LastSeenBookmark | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setLastSeen(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const saveLastSeen = useCallback((bookmark: Omit<LastSeenBookmark, 'timestamp'>) => {
    const newBookmark: LastSeenBookmark = {
      ...bookmark,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmark));
    setLastSeen(newBookmark);
  }, []);

  const clearLastSeen = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLastSeen(null);
  }, []);

  return { lastSeen, saveLastSeen, clearLastSeen };
}
