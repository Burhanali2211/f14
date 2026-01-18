import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Surah } from '@/lib/quran-types';

interface SurahListItemProps {
  surah: Surah;
}

export function SurahListItem({ surah }: SurahListItemProps) {
  return (
    <Link
      to={`/quran/surah/${surah.number}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
    >
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors duration-300">
          <span className="text-2xl font-bold text-primary group-hover:text-white transition-colors">
            {surah.number}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="quran-arabic-text text-2xl font-bold text-foreground group-hover:text-primary transition-colors !leading-tight !py-1" dir="rtl">
              {surah.arabicName}
            </h3>
            <span className="text-sm text-muted-foreground font-medium">
              {surah.englishName}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {surah.englishMeaning}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-sm font-medium text-foreground">
            {surah.verseCount} آیات
          </span>
        <span className={`quran-arabic-text text-xs px-2 py-0.5 rounded-full !leading-tight ${
          surah.revelationType === 'meccan' 
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }`} dir="rtl">
          {surah.revelationType === 'meccan' ? 'مکی' : 'مدنی'}
        </span>
      </div>

      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </Link>
  );
}
