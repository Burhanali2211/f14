import { Scroll, BookOpen } from 'lucide-react';

export type QuranViewTab = 'surah' | 'para';

interface QuranTabsProps {
  activeTab: QuranViewTab;
  onTabChange: (tab: QuranViewTab) => void;
}

export function QuranTabs({ activeTab, onTabChange }: QuranTabsProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 p-1 bg-muted/40 rounded-2xl mb-6 max-w-sm mx-auto">
      <button
        onClick={() => onTabChange('surah')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          activeTab === 'surah'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span>Surah</span>
      </button>
      
      <button
        onClick={() => onTabChange('para')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          activeTab === 'para'
            ? 'bg-emerald-500 text-white shadow-md'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Scroll className="w-4 h-4" />
        <span>Para</span>
      </button>
    </div>
  );
}

