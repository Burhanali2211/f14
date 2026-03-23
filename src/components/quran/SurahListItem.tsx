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
      className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-card border border-border/40 hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      {/* Surah number avatar */}
      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border transition-all duration-200 ${
        isMeccan
          ? 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/18'
          : 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/18'
      }`}>
        <span className={`font-bold text-base leading-none ${
          isMeccan ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {surah.number}
        </span>
        {sortMode === 'chronological' && revOrder && (
          <span className="text-[9px] text-muted-foreground/55 leading-none mt-0.5">
            #{revOrder}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top row: Arabic name + type badge */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className="quran-arabic-text text-lg font-bold text-foreground group-hover:text-primary transition-colors !leading-tight !py-0"
            dir="rtl"
          >
            {surah.arabicName}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
            isMeccan
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            {isMeccan ? 'Meccan' : 'Medinan'}
          </span>
        </div>

        {/* Middle row: English name · meaning */}
        <div className="flex items-center gap-1.5 text-sm mb-1">
          <span className="font-medium text-foreground/75 truncate">{surah.englishName}</span>
          <span className="text-muted-foreground/35 flex-shrink-0">·</span>
          <span className="text-muted-foreground/60 truncate text-xs">{surah.englishMeaning}</span>
        </div>

        {/* Bottom row: verse count, juz, revelation position */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
          <span>{surah.verseCount} verses</span>
          <span className="text-muted-foreground/30">·</span>
          <span>Juz {surah.startJuz}</span>
          {sortMode === 'chronological' && revOrder && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-primary/55">Revealed {revOrder} of 114</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
