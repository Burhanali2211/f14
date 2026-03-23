import { toArabicNumber } from '@/lib/quran-types';
import type { Ayah } from '@/data/quran/verses';

interface AyahDisplayProps {
  ayah: Ayah;
  showUrdu?: boolean;
  showEnglish?: boolean;
  arabicFontSize?: number;
  urduFontSize?: number;
  englishFontSize?: number;
  lineSpacing?: number;
}

export function AyahDisplay({
  ayah,
  showUrdu = true,
  showEnglish = true,
  arabicFontSize = 22,
  urduFontSize = 17,
  englishFontSize = 14,
  lineSpacing = 3.2,
}: AyahDisplayProps) {
  return (
    <div className="bg-card rounded-xl sm:rounded-2xl border border-border/40 overflow-hidden">
      <div className="p-4 sm:p-5">

        {/* Ayah number badge */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="font-sans text-xs font-bold text-primary leading-none">{ayah.number}</span>
          </div>
          <div className="h-px flex-1 bg-border/25" />
        </div>

        {/* Arabic text
            The verse-end bracket ﴿١﴾ is rendered as plain inline text — no span,
            no inline-block — so it naturally flows with the paragraph and never
            orphans onto its own line with the quran-arabic-text padding applied. */}
        <div dir="rtl" lang="ar" className="mb-1">
          <p
            className="quran-arabic-text text-foreground text-right"
            style={{ fontSize: arabicFontSize, lineHeight: lineSpacing }}
          >
            {ayah.arabicText}
            {' '}﴿{toArabicNumber(ayah.number)}﴾
          </p>
        </div>

        {/* Urdu translation */}
        {showUrdu && (
          <div
            dir="rtl"
            lang="ur"
            className="mt-3 pt-3 border-t border-border/25"
          >
            <p
              className="quran-urdu-text text-muted-foreground text-right"
              style={{ fontSize: urduFontSize }}
            >
              {ayah.urduTranslation}
            </p>
          </div>
        )}

        {/* English translation */}
        {showEnglish && (
          <div className="mt-3 pt-3 border-t border-border/25">
            <p
              className="text-muted-foreground/85 font-sans leading-6"
              style={{ fontSize: englishFontSize }}
            >
              {ayah.englishTranslation}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
