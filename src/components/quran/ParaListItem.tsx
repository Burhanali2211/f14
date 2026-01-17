import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Para, toArabicNumber } from '@/lib/quran-types';
import { surahs } from '@/data/quran';

interface ParaListItemProps {
  para: Para;
}

export function ParaListItem({ para }: ParaListItemProps) {
  const startSurah = surahs.find(s => s.number === para.startSurah);
  const endSurah = surahs.find(s => s.number === para.endSurah);

  return (
    <Link
      to={`/quran/para/${para.number}`}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
    >
        <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition-colors duration-300">
          <span className="quran-arabic-text text-2xl font-bold text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors !leading-none !p-0">
            {toArabicNumber(para.number)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="quran-arabic-text text-2xl font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors !leading-tight !py-1" dir="rtl">
              {para.arabicName}
            </h3>
            <span className="text-sm text-muted-foreground font-medium">
              Para {para.number}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {para.englishName}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
          <span className="quran-arabic-text text-sm font-medium text-foreground !leading-tight !py-0.5" dir="rtl">
            {startSurah?.arabicName} {toArabicNumber(para.startAyah)}
          </span>
        <span className="quran-arabic-text text-xs text-muted-foreground !leading-tight" dir="rtl">
          to {endSurah?.arabicName} {toArabicNumber(para.endAyah)}
        </span>
      </div>

      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors flex-shrink-0" />
    </Link>
  );
}
