import { toArabicNumber } from '@/lib/quran-types';
import type { Ayah } from '@/data/quran/verses';

interface AyahDisplayProps {
  ayah: Ayah;
  showUrdu?: boolean;
  showEnglish?: boolean;
}

export function AyahDisplay({ ayah, showUrdu = true, showEnglish = true }: AyahDisplayProps) {
  return (
    <div className="group bg-card rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300 overflow-hidden">
      <div className="p-5 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
            <span className="font-sans text-sm sm:text-base font-bold text-primary">
              {ayah.number}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/30">
            <span className="font-sans text-xs text-muted-foreground">
              Ayah {ayah.number}
            </span>
          </div>
        </div>
        
        <div className="space-y-6">
          <div 
            className="text-right py-4"
            dir="rtl"
            lang="ar"
          >
            <p className="quran-arabic-text text-2xl sm:text-3xl md:text-[2rem] lg:text-[2.25rem] text-foreground">
              {ayah.arabicText}
              <span className="inline-block mx-3 text-primary/70 text-lg sm:text-xl">
                ﴿{toArabicNumber(ayah.number)}﴾
              </span>
            </p>
          </div>
          
          {showUrdu && (
            <div 
              className="text-right border-t border-border/30 pt-5"
              dir="rtl"
              lang="ur"
            >
              <p className="quran-urdu-text text-lg sm:text-xl md:text-[1.35rem] text-muted-foreground">
                {ayah.urduTranslation}
              </p>
            </div>
          )}
          
          {showEnglish && (
            <div className="border-t border-border/30 pt-5">
              <p className="text-base sm:text-lg text-muted-foreground/80 leading-relaxed font-sans">
                {ayah.englishTranslation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
