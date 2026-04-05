import { Link } from 'react-router-dom';
import { Surah } from '@/lib/quran-types';
import { REVELATION_ORDER } from '@/data/quran/revelation-order';

interface SurahListItemProps {
  surah: Surah;
  sortMode?: 'standard' | 'chronological';
}

export function SurahListItem({ surah, sortMode = 'standard' }: SurahListItemProps) {
  const isMeccan = surah.revelationType === 'meccan';
  const revOrder = REVELATION_ORDER[surah.number];

  return (
    <Link
      to={`/quran/surah/${surah.number}`}
      className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      {/* Surah number avatar */}
      <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border transition-all duration-200 ${
        isMeccan
          ? 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/18'
          : 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/18'
      }`}>
        <span className={`font-bold text-sm leading-none ${
          isMeccan ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {sortMode === 'chronological' ? revOrder : surah.number}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top row: Arabic name + type badge */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className="quran-arabic-text text-base font-bold text-foreground group-hover:text-primary transition-colors !leading-tight !py-0"
            dir="rtl"
          >
            {surah.arabicName}
          </span>
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-tighter ${
            isMeccan
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            {isMeccan ? 'Meccan' : 'Medinan'}
          </span>
        </div>

        {/* Middle row: English name · meaning */}
        <div className="flex items-center gap-1.5 text-xs mb-1">
          {sortMode === 'chronological' && (
            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold text-[10px] flex-shrink-0">
              #{surah.number}
            </span>
          )}
          <span className="font-semibold text-foreground/80 truncate">{surah.englishName}</span>
          <span className="text-muted-foreground/35 flex-shrink-0">·</span>
          <span className="text-muted-foreground/60 truncate italic">{surah.englishMeaning}</span>
        </div>

        {/* Bottom row: verse count, juz */}
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/50">
          <span>{surah.verseCount} verses</span>
          <span className="text-muted-foreground/30">·</span>
          <span>Juz {surah.startJuz}</span>
        </div>
      </div>
    </Link>

  );
}
