import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, BookOpen,
  Settings, Sun, Moon, Eye, EyeOff,
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { surahs } from '@/data/quran';
import { getSurahVerses } from '@/data/quran/verses';
import type { SurahVerses } from '@/data/quran/verses';
import { toArabicNumber } from '@/lib/quran-types';
import { AyahDisplay, Bismillah } from '@/components/quran';
import { useTheme } from '@/hooks/use-theme';

// ─── Reading preference constants ──────────────────────────────────────────

const ARABIC_SIZES  = [18, 20, 22, 24, 26, 28, 30, 32] as const;
const URDU_SIZES    = [13, 14, 15, 16, 17, 18, 19, 20] as const;
const ENGLISH_SIZES = [12, 13, 14, 15, 16, 17, 18] as const;
const SIZE_LABELS   = ['Small', 'Normal', 'Standard', 'Large', 'Larger', 'X-Large', 'Huge', 'Max'];

const LINE_GAPS   = [2.4, 2.8, 3.2, 3.6, 4.0, 4.4] as const;
const LINE_LABELS = ['Compact', 'Snug', 'Normal', 'Relaxed', 'Spacious', 'Wide'];

const LS_ARABIC_FONT  = 'quran-reader-font';
const LS_URDU_FONT    = 'quran-reader-urdu-font';
const LS_ENGLISH_FONT = 'quran-reader-eng-font';
const LS_LINE         = 'quran-reader-line';
const LS_URDU         = 'quran-reader-urdu';
const LS_ENGLISH      = 'quran-reader-english';

type FontTarget = 'arabic' | 'urdu' | 'english';

function readPref<T>(key: string, fallback: T, parse: (v: string) => T): T {
  try { const v = localStorage.getItem(key); return v !== null ? parse(v) : fallback; }
  catch { return fallback; }
}

function clampToArray<T>(value: T, arr: readonly T[], fallback: T): T {
  return arr.includes(value) ? value : fallback;
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function QuranSurahPage() {
  const { surahNumber } = useParams<{ surahNumber: string }>();
  const number = parseInt(surahNumber || '1', 10);
  const { theme, toggleTheme } = useTheme();

  // Reading preferences
  const [arabicFontSize, setArabicFontSize] = useState<number>(() =>
    readPref(LS_ARABIC_FONT, 22, v => clampToArray(parseInt(v, 10), ARABIC_SIZES, 22)),
  );
  const [urduFontSize, setUrduFontSize] = useState<number>(() =>
    readPref(LS_URDU_FONT, 17, v => clampToArray(parseInt(v, 10), URDU_SIZES, 17)),
  );
  const [englishFontSize, setEnglishFontSize] = useState<number>(() =>
    readPref(LS_ENGLISH_FONT, 14, v => clampToArray(parseInt(v, 10), ENGLISH_SIZES, 14)),
  );
  const [lineSpacing, setLineSpacing] = useState<number>(() =>
    readPref(LS_LINE, 3.2, v => clampToArray(parseFloat(v), LINE_GAPS, 3.2)),
  );
  const [showUrdu, setShowUrdu]       = useState(() => readPref(LS_URDU, true, v => v === 'true'));
  const [showEnglish, setShowEnglish] = useState(() => readPref(LS_ENGLISH, true, v => v === 'true'));

  // Which language the A−/A+ buttons control
  const [fontTarget, setFontTarget] = useState<FontTarget>('arabic');

  // Verse data
  const [verses, setVerses]           = useState<SurahVerses | undefined>(undefined);
  const [versesLoading, setVersesLoading] = useState(true);

  // UI
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setVersesLoading(true);
    setVerses(undefined);
    getSurahVerses(number).then(data => { setVerses(data); setVersesLoading(false); });
  }, [number]);

  // Persist helpers
  const setArabic  = (s: number) => { setArabicFontSize(s);  localStorage.setItem(LS_ARABIC_FONT, String(s)); };
  const setUrdu    = (s: number) => { setUrduFontSize(s);    localStorage.setItem(LS_URDU_FONT,   String(s)); };
  const setEnglish = (s: number) => { setEnglishFontSize(s); localStorage.setItem(LS_ENGLISH_FONT,String(s)); };
  const setLine    = (g: number) => { setLineSpacing(g);      localStorage.setItem(LS_LINE,        String(g)); };
  const toggleUrdu    = () => setShowUrdu(p    => { localStorage.setItem(LS_URDU,    String(!p)); return !p; });
  const toggleEnglish = () => setShowEnglish(p => { localStorage.setItem(LS_ENGLISH, String(!p)); return !p; });

  // Derive current sizes / index for the selected font target
  const currentSizes  = fontTarget === 'arabic' ? ARABIC_SIZES : fontTarget === 'urdu' ? URDU_SIZES : ENGLISH_SIZES;
  const currentValue  = fontTarget === 'arabic' ? arabicFontSize : fontTarget === 'urdu' ? urduFontSize : englishFontSize;
  const currentIdx    = currentSizes.indexOf(currentValue as never);
  const currentLabel  = SIZE_LABELS[currentIdx] ?? 'Standard';
  function decreaseFont() {
    if (currentIdx <= 0) return;
    const fn = fontTarget === 'arabic' ? setArabic : fontTarget === 'urdu' ? setUrdu : setEnglish;
    fn(currentSizes[currentIdx - 1]);
  }
  function increaseFont() {
    if (currentIdx >= currentSizes.length - 1) return;
    const fn = fontTarget === 'arabic' ? setArabic : fontTarget === 'urdu' ? setUrdu : setEnglish;
    fn(currentSizes[currentIdx + 1]);
  }
  function jumpToIdx(idx: number) {
    const fn = fontTarget === 'arabic' ? setArabic : fontTarget === 'urdu' ? setUrdu : setEnglish;
    fn(currentSizes[idx]);
  }

  const lineIdx = LINE_GAPS.indexOf(lineSpacing as typeof LINE_GAPS[number]);

  const surah     = surahs.find(s => s.number === number);
  const prevSurah = surahs.find(s => s.number === number - 1);
  const nextSurah = surahs.find(s => s.number === number + 1);

  // ── Not found ────────────────────────────────────────────────────────────
  if (!surah) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <BookOpen className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Surah not found</h1>
        <Link to="/quran" className="text-primary underline text-sm">← Back to Quran</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Surah ${surah.englishName} (${surah.arabicName}) | The Holy Quran`}
        description={`Read Surah ${surah.englishName} — ${surah.englishMeaning}. ${surah.verseCount} verses.`}
      />

      {/* ── Fixed top bar ──────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-3 sm:px-5 bg-background/90 backdrop-blur-md border-b border-border/40">
        <Link
          to="/quran"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Back to Quran"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        <div className="flex flex-col items-center min-w-0 px-2">
          <span className="font-arabic-heading text-base sm:text-lg font-bold text-foreground leading-tight truncate max-w-[180px] sm:max-w-xs">
            {surah.arabicName}
          </span>
          <span className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-xs">
            {surah.englishName} · {number} of 114
          </span>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Reading settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <main className="pt-14 pb-10 px-3 sm:px-5 max-w-2xl mx-auto">

        {/* Surah info card */}
        <div className="bg-card rounded-2xl border border-border/40 p-5 sm:p-7 mt-4 mb-5 text-center">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="font-arabic-heading text-xl sm:text-2xl font-bold text-primary leading-none">
              {toArabicNumber(surah.number)}
            </span>
          </div>
          <h1 className="font-arabic-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-1 sm:mb-2">
            {surah.arabicName}
          </h1>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-1">
            {surah.englishName}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{surah.englishMeaning}</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
              {toArabicNumber(surah.verseCount)} Verses
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              surah.revelationType === 'meccan'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {surah.revelationType === 'meccan' ? 'Meccan' : 'Medinan'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-semibold">
              {surah.rukuCount} Ruku
            </span>
          </div>
        </div>

        {/* Verses area */}
        {versesLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : verses ? (
          <>
            {verses.bismillah && number !== 1 && number !== 9 && <Bismillah />}

            <div>
              {verses.ayahs.map((ayah, idx) => (
                <div key={ayah.number}>
                  {/* Ayah separator — shown between cards (not before the first) */}
                  {idx > 0 && (
                    <div className="flex items-center gap-3 py-2.5 px-1 select-none" aria-hidden>
                      <div className="h-px flex-1 bg-border/25" />
                      <span className="text-[11px] font-medium text-muted-foreground/40 tabular-nums">
                        ﴿{toArabicNumber(ayah.number)}﴾
                      </span>
                      <div className="h-px flex-1 bg-border/25" />
                    </div>
                  )}
                  <AyahDisplay
                    ayah={ayah}
                    showUrdu={showUrdu}
                    showEnglish={showEnglish}
                    arabicFontSize={arabicFontSize}
                    urduFontSize={urduFontSize}
                    englishFontSize={englishFontSize}
                    lineSpacing={lineSpacing}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-card rounded-2xl border border-border/40 p-6 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-bold mb-1">Verses Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              The full text for Surah {surah.englishName} will be available soon, In Sha Allah.
            </p>
          </div>
        )}

        {/* Bottom prev / next */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-border/40">
          {prevSurah ? (
            <Link to={`/quran/surah/${prevSurah.number}`}>
              <Button variant="outline" className="gap-1.5 rounded-xl px-3 h-10">
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[160px] text-sm">
                  {prevSurah.englishName}
                </span>
              </Button>
            </Link>
          ) : <div />}
          {nextSurah ? (
            <Link to={`/quran/surah/${nextSurah.number}`}>
              <Button variant="outline" className="gap-1.5 rounded-xl px-3 h-10">
                <span className="truncate max-w-[90px] sm:max-w-[160px] text-sm">
                  {nextSurah.englishName}
                </span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </Button>
            </Link>
          ) : <div />}
        </div>
      </main>

      {/* ── Settings bottom sheet ───────────────────────────────────────── */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 max-h-[90vh] overflow-y-auto"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-5 pb-3 pt-1">
            <SheetTitle className="text-base font-semibold">Reading Settings</SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-8 space-y-6">

            {/* ── Text Size ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Text Size</p>
                  <p className="text-xs text-muted-foreground">Adjust size per language</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {currentLabel}
                </span>
              </div>

              {/* Language selector */}
              <div className="flex gap-0.5 p-1 bg-muted/50 rounded-xl border border-border/30 mb-3">
                {(['arabic', 'urdu', 'english'] as FontTarget[]).map(target => (
                  <button
                    key={target}
                    onClick={() => setFontTarget(target)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      fontTarget === target
                        ? 'bg-background shadow-sm text-foreground border border-border/30'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {target === 'arabic' ? (
                      <span className="font-arabic">عربی</span>
                    ) : target === 'urdu' ? (
                      <span className="font-arabic">اردو</span>
                    ) : (
                      'English'
                    )}
                  </button>
                ))}
              </div>

              {/* A− · dots · A+ */}
              <div className="flex items-center gap-3">
                <button
                  onClick={decreaseFont}
                  disabled={currentIdx <= 0}
                  className="w-12 h-12 rounded-2xl border-2 border-border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform bg-muted/40"
                  aria-label="Smaller text"
                >
                  <span className="text-base font-bold leading-none">A−</span>
                </button>

                <div className="flex-1 flex items-center justify-center gap-1.5">
                  {currentSizes.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => jumpToIdx(i)}
                      className={`rounded-full transition-all duration-200 ${
                        i === currentIdx
                          ? 'w-3.5 h-3.5 bg-primary'
                          : 'w-2.5 h-2.5 bg-muted-foreground/25 hover:bg-muted-foreground/50'
                      }`}
                      aria-label={SIZE_LABELS[i]}
                    />
                  ))}
                </div>

                <button
                  onClick={increaseFont}
                  disabled={currentIdx >= currentSizes.length - 1}
                  className="w-12 h-12 rounded-2xl border-2 border-border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform bg-muted/40"
                  aria-label="Larger text"
                >
                  <span className="text-lg font-bold leading-none">A+</span>
                </button>
              </div>

              {/* Live preview — all three languages */}
              <div className="mt-3 p-3 rounded-xl bg-muted/30 space-y-2">
                <p
                  className="quran-arabic-text text-foreground text-right"
                  dir="rtl"
                  lang="ar"
                  style={{ fontSize: arabicFontSize, lineHeight: lineSpacing }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
                {showUrdu && (
                  <p
                    className="quran-urdu-text text-muted-foreground text-right"
                    dir="rtl"
                    lang="ur"
                    style={{ fontSize: urduFontSize }}
                  >
                    اللہ کے نام سے جو رحمن و رحیم ہے
                  </p>
                )}
                {showEnglish && (
                  <p
                    className="text-muted-foreground/85 font-sans"
                    style={{ fontSize: englishFontSize }}
                  >
                    In the name of Allah, the Most Gracious, the Most Merciful.
                  </p>
                )}
              </div>
            </section>

            <div className="h-px bg-border/40" />

            {/* ── Line Spacing ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Line Spacing</p>
                  <p className="text-xs text-muted-foreground">Space between Arabic text lines</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {LINE_LABELS[lineIdx] ?? 'Normal'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => lineIdx > 0 && setLine(LINE_GAPS[lineIdx - 1])}
                  disabled={lineIdx === 0}
                  className="w-12 h-12 rounded-2xl border-2 border-border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform bg-muted/40"
                  aria-label="Less spacing"
                >
                  <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current text-foreground">
                    <rect x="2" y="4" width="16" height="2" rx="1"/>
                    <rect x="2" y="9" width="16" height="2" rx="1"/>
                    <rect x="2" y="14" width="16" height="2" rx="1"/>
                  </svg>
                </button>

                <div className="flex-1 flex items-center justify-center gap-1.5">
                  {LINE_GAPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setLine(LINE_GAPS[i])}
                      className={`rounded-full transition-all duration-200 ${
                        i === lineIdx
                          ? 'w-3.5 h-3.5 bg-primary'
                          : 'w-2.5 h-2.5 bg-muted-foreground/25 hover:bg-muted-foreground/50'
                      }`}
                      aria-label={LINE_LABELS[i]}
                    />
                  ))}
                </div>

                <button
                  onClick={() => lineIdx < LINE_GAPS.length - 1 && setLine(LINE_GAPS[lineIdx + 1])}
                  disabled={lineIdx === LINE_GAPS.length - 1}
                  className="w-12 h-12 rounded-2xl border-2 border-border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform bg-muted/40"
                  aria-label="More spacing"
                >
                  <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current text-foreground">
                    <rect x="2" y="2" width="16" height="2" rx="1"/>
                    <rect x="2" y="9" width="16" height="2" rx="1"/>
                    <rect x="2" y="16" width="16" height="2" rx="1"/>
                  </svg>
                </button>
              </div>
            </section>

            <div className="h-px bg-border/40" />

            {/* ── Screen Theme ── */}
            <section>
              <p className="text-sm font-semibold text-foreground mb-1">Screen Theme</p>
              <p className="text-xs text-muted-foreground mb-3">Choose what's easier on your eyes</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`flex items-center justify-center gap-2 h-12 rounded-2xl border-2 font-medium text-sm transition-all ${
                    theme === 'light'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <Sun className="w-4 h-4" /> Light
                </button>
                <button
                  onClick={() => theme === 'light' && toggleTheme()}
                  className={`flex items-center justify-center gap-2 h-12 rounded-2xl border-2 font-medium text-sm transition-all ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <Moon className="w-4 h-4" /> Dark
                </button>
              </div>
            </section>

            <div className="h-px bg-border/40" />

            {/* ── Translations ── */}
            <section>
              <p className="text-sm font-semibold text-foreground mb-1">Show Translations</p>
              <p className="text-xs text-muted-foreground mb-3">
                Turn on or off the text below each verse
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={toggleUrdu}
                  className={`flex items-center justify-center gap-2 h-12 rounded-2xl border-2 font-medium text-sm transition-all ${
                    showUrdu
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {showUrdu ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="font-arabic text-base">اردو</span>
                </button>
                <button
                  onClick={toggleEnglish}
                  className={`flex items-center justify-center gap-2 h-12 rounded-2xl border-2 font-medium text-sm transition-all ${
                    showEnglish
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {showEnglish ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  English
                </button>
              </div>
            </section>

          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
