import { createContext, useContext, useState, ReactNode } from 'react';

interface FontSizeContextType {
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const MIN_SIZE = 16;
const MAX_SIZE = 32;
const DEFAULT_SIZE = 22;
const STEP = 2;

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fontSize');
      return stored ? parseInt(stored, 10) : DEFAULT_SIZE;
    }
    return DEFAULT_SIZE;
  });

  const increaseFontSize = () => {
    setFontSize(prev => {
      const newSize = Math.min(prev + STEP, MAX_SIZE);
      localStorage.setItem('fontSize', newSize.toString());
      return newSize;
    });
  };

  const decreaseFontSize = () => {
    setFontSize(prev => {
      const newSize = Math.max(prev - STEP, MIN_SIZE);
      localStorage.setItem('fontSize', newSize.toString());
      return newSize;
    });
  };

  const resetFontSize = () => {
    setFontSize(DEFAULT_SIZE);
    localStorage.setItem('fontSize', DEFAULT_SIZE.toString());
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, increaseFontSize, decreaseFontSize, resetFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
