import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AppSettings {
  // Reading settings
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: 'amiri' | 'noto-nastaliq' | 'gulzar' | 'scheherazade' | 'lateef' | 'noto-sans-arabic' | 'reem-kufi';
  textAlign: 'right' | 'center' | 'justify';
  
  // Display settings
  showVerseNumbers: boolean;
  highlightCurrentVerse: boolean;
  autoScrollWhilePlaying: boolean;
  rememberReadingPosition: boolean;
  
  // Appearance
  readerBackground: 'default' | 'sepia' | 'dark' | 'paper' | 'parchment' | 'cream' | 'night' | 'blue-light' | 'green-light' | 'warm-white';
  compactMode: boolean;
  animationsEnabled: boolean;
  
  // Accessibility
  highContrast: boolean;
  reducedMotion: boolean;
}

const defaultSettings: AppSettings = {
  fontSize: 24,
  lineHeight: 2.2,
  letterSpacing: 0,
  fontFamily: 'noto-nastaliq',
  textAlign: 'right',
  showVerseNumbers: true,
  highlightCurrentVerse: true,
  autoScrollWhilePlaying: true,
   // default to not auto-jumping users back down the page
  rememberReadingPosition: false,
  readerBackground: 'default',
  compactMode: false,
  animationsEnabled: true,
  highContrast: false,
  reducedMotion: false,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app-settings');
      if (stored) {
        try {
          return { ...defaultSettings, ...JSON.parse(stored) };
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    
    // Apply reduced motion preference
    if (settings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    
    // Apply high contrast
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('app-settings');
    document.documentElement.classList.remove('reduce-motion', 'high-contrast');
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
