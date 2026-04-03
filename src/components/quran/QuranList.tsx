import { useState, useMemo, useEffect } from 'react';
import { Search, BookOpen, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { surahs, paras } from '@/data/quran';
import { SurahListItem } from './SurahListItem';
import { ParaListItem } from './ParaListItem';
import { QuranViewTab } from './QuranTabs';
import { getSurahsInRevelationOrder } from '@/data/quran/revelation-order';

type SortMode = 'standard' | 'chronological';
const LS_SORT_MODE = 'quran-sort-mode';

interface QuranListProps {
  activeTab: QuranViewTab;
}

export function QuranList({ activeTab }: QuranListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    try {
      const saved = localStorage.getItem(LS_SORT_MODE) as SortMode | null;
      return saved === 'chronological' ? 'chronological' : 'standard';
    } catch {
      return 'standard';
    }
  });

  // Persist sort mode
  useEffect(() => {
    localStorage.setItem(LS_SORT_MODE, sortMode);
  }, [sortMode]);

  const filteredSurahs = useMemo(() => {
    let list = surahs;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = surahs.filter(surah =>
        surah.arabicName.includes(searchQuery) ||
        surah.englishName.toLowerCase().includes(query) ||
        surah.englishMeaning.toLowerCase().includes(query) ||
        surah.number.toString() === query
      );
    }
    if (sortMode === 'chronological') {
      const ordered = getSurahsInRevelationOrder(list.map(s => s.number));
      return ordered.map(n => list.find(s => s.number === n)!);
    }
    return list;
  }, [searchQuery, sortMode]);

  const filteredParas = useMemo(() => {
    if (!searchQuery.trim()) return paras;
    const query = searchQuery.toLowerCase();
    return paras.filter(para =>
      para.arabicName.includes(searchQuery) ||
      para.englishName.toLowerCase().includes(query) ||
      para.number.toString() === query
    );
  }, [searchQuery]);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4 max-w-md mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={activeTab === 'surah' ? 'Search surah by name or number...' : 'Search para by name or number...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl bg-card border-border/40"
        />
      </div>

      {/* Sort toggle — only shown for surah tab */}
      {activeTab === 'surah' && (
        <div className="flex justify-center mb-5">
          <div className="flex items-center gap-0.5 p-1 bg-muted/50 rounded-xl border border-border/30">
            <button
              onClick={() => setSortMode('standard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                sortMode === 'standard'
                  ? 'bg-background text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Standard Order
            </button>
            <button
              onClick={() => setSortMode('chronological')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                sortMode === 'chronological'
                  ? 'bg-background text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Revelation Order
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {activeTab === 'surah' ? (
          filteredSurahs.length > 0 ? (
            filteredSurahs.map(surah => (
              <SurahListItem key={surah.number} surah={surah} sortMode={sortMode} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No surahs found matching "{searchQuery}"
            </div>
          )
        ) : (
          filteredParas.length > 0 ? (
            filteredParas.map(para => (
              <ParaListItem key={para.number} para={para} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No paras found matching "{searchQuery}"
            </div>
          )
        )}
      </div>
    </div>
  );
}
