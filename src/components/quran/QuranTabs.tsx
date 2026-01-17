import { Scroll, BookOpen } from 'lucide-react';

export type QuranViewTab = 'surah' | 'para';

interface QuranTabsProps {
  activeTab: QuranViewTab;
  onTabChange: (tab: QuranViewTab) => void;
}

export function QuranTabs({ activeTab, onTabChange }: QuranTabsProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-1.5 bg-muted/50 rounded-2xl mb-8 max-w-md mx-auto">
      <button
        onClick={() => onTabChange('surah')}
        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
          activeTab === 'surah'
            ? 'bg-primary text-primary-foreground shadow-lg'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
        }`}
      >
        <BookOpen className="w-5 h-5" />
        <span>Surah</span>
        <span className="font-arabic text-sm">(سورہ)</span>
      </button>
      
      <button
        onClick={() => onTabChange('para')}
        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
          activeTab === 'para'
            ? 'bg-emerald-500 text-white shadow-lg'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
        }`}
      >
        <Scroll className="w-5 h-5" />
        <span>Para</span>
        <span className="font-arabic text-sm">(پارہ)</span>
      </button>
    </div>
  );
}
