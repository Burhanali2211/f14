import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ChildModeContextType {
  isChildMode: boolean;
  setChildMode: (enabled: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

const ChildModeContext = createContext<ChildModeContextType | undefined>(undefined);

const STORAGE_KEY = 'child-mode-settings';

interface StoredSettings {
  isChildMode: boolean;
  soundEnabled: boolean;
  highContrast: boolean;
}

export function ChildModeProvider({ children }: { children: ReactNode }) {
  const [isChildMode, setIsChildMode] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [highContrast, setHighContrastState] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const settings: StoredSettings = JSON.parse(stored);
        setIsChildMode(settings.isChildMode ?? false);
        setSoundEnabledState(settings.soundEnabled ?? true);
        setHighContrastState(settings.highContrast ?? false);
      } catch (e) {
      }
    }
  }, []);

  useEffect(() => {
    const settings: StoredSettings = {
      isChildMode,
      soundEnabled,
      highContrast,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [isChildMode, soundEnabled, highContrast]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const setChildMode = (enabled: boolean) => {
    setIsChildMode(enabled);
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
  };

  return (
    <ChildModeContext.Provider
      value={{
        isChildMode,
        setChildMode,
        soundEnabled,
        setSoundEnabled,
        highContrast,
        setHighContrast,
      }}
    >
      {children}
    </ChildModeContext.Provider>
  );
}

export function useChildMode() {
  const context = useContext(ChildModeContext);
  if (context === undefined) {
    throw new Error('useChildMode must be used within a ChildModeProvider');
  }
  return context;
}
