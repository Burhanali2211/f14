import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { Ayah } from '@/data/quran/verses';
import { Button } from '@/components/ui/button';

interface AyahDisplayProps {
  ayah: Ayah;
  showUrdu?: boolean;
  showEnglish?: boolean;
  surahNumber?: number;
  surahName?: string;
  paraNumber?: number;
  paraName?: string;
  isLastSeen?: boolean;
  onMarkLastSeen?: () => void;
}

export function AyahDisplay({ 
  ayah, 
  showUrdu = true, 
  showEnglish = true,
  surahNumber,
  surahName,
  paraNumber,
  paraName,
  isLastSeen,
  onMarkLastSeen
}: AyahDisplayProps) {
  return (
    <div 
      id={`ayah-${ayah.number}`}
      className={`group bg-card rounded-2xl border transition-all duration-300 overflow-hidden ${
        isLastSeen 
          ? 'border-primary/50 ring-2 ring-primary/20' 
          : 'border-border/40 hover:border-primary/30'
      }`}
    >
      <div className="p-5 sm:p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
              <span className="font-sans text-sm sm:text-base font-bold text-primary">
                {ayah.number}
              </span>
            </div>
            {onMarkLastSeen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkLastSeen}
                className={`h-9 px-3 gap-1.5 ${isLastSeen ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                title={isLastSeen ? 'Currently marked as last seen' : 'Mark as last seen'}
              >
                {isLastSeen ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                <span className="text-xs hidden sm:inline">{isLastSeen ? 'Last Seen' : 'Mark'}</span>
              </Button>
            )}
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
            <p 
              className="quran-arabic-text text-2xl sm:text-3xl md:text-[2rem] lg:text-[2.25rem] text-foreground"
              style={{ lineHeight: 2.4 }}
            >
              {ayah.arabicText}
                <span className="inline-block mx-3 text-primary/70 text-lg sm:text-xl font-sans">
                  ﴿{ayah.number}﴾
                </span>
            </p>
          </div>
          
          {showUrdu && (
            <div 
              className="text-right border-t border-border/30 pt-5"
              dir="rtl"
              lang="ur"
            >
              <p 
                className="quran-urdu-text text-lg sm:text-xl md:text-[1.35rem] text-muted-foreground"
                style={{ lineHeight: 2.2 }}
              >
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
