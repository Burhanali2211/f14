import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { surahs, paras } from '@/data/quran';
import { SurahListItem } from './SurahListItem';
import { ParaListItem } from './ParaListItem';
import { QuranViewTab } from './QuranTabs';

interface QuranListProps {
  activeTab: QuranViewTab;
}

export function QuranList({ activeTab }: QuranListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;
    const query = searchQuery.toLowerCase();
    return surahs.filter(surah => 
      surah.arabicName.includes(searchQuery) ||
      surah.englishName.toLowerCase().includes(query) ||
      surah.englishMeaning.toLowerCase().includes(query) ||
      surah.number.toString() === query
    );
  }, [searchQuery]);

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
      <div className="relative mb-6 max-w-md mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={activeTab === 'surah' ? 'Search surah by name or number...' : 'Search para by name or number...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl bg-card border-border/40"
        />
      </div>

      <div className="space-y-3">
        {activeTab === 'surah' ? (
          filteredSurahs.length > 0 ? (
            filteredSurahs.map(surah => (
              <SurahListItem key={surah.number} surah={surah} />
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
