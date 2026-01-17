import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { surahs } from '@/data/quran';
import { getSurahVerses } from '@/data/quran/verses';
import { toArabicNumber } from '@/lib/quran-types';
import { AyahDisplay, Bismillah, TranslationToggle } from '@/components/quran';

export default function QuranSurahPage() {
  const { surahNumber } = useParams<{ surahNumber: string }>();
  const number = parseInt(surahNumber || '1', 10);
  
  const [showUrdu, setShowUrdu] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  
  const surah = surahs.find(s => s.number === number);
  const prevSurah = surahs.find(s => s.number === number - 1);
  const nextSurah = surahs.find(s => s.number === number + 1);
  const verses = getSurahVerses(number);

  if (!surah) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-8 flex-1 px-4 sm:px-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Surah not found</h1>
            <Link to="/quran" className="text-primary hover:underline">
              Back to Quran
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={`Surah ${surah.englishName} (${surah.arabicName}) | The Holy Quran`}
        description={`Read Surah ${surah.englishName} - ${surah.englishMeaning}. ${surah.verseCount} verses. ${surah.revelationType === 'meccan' ? 'Revealed in Mecca' : 'Revealed in Medina'}.`}
      />
      
      <Header />
      
      <main className="container py-8 flex-1 px-4 sm:px-6">
        <Link 
          to="/quran" 
          className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Quran
        </Link>

        <div className="flex items-center justify-between mb-6">
          {prevSurah ? (
            <Link to={`/quran/surah/${prevSurah.number}`}>
              <Button variant="outline" className="gap-2 rounded-xl">
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{prevSurah.englishName}</span>
              </Button>
            </Link>
          ) : (
            <div />
          )}

          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              Surah {number} of 114
            </span>
          </div>

          {nextSurah ? (
            <Link to={`/quran/surah/${nextSurah.number}`}>
              <Button variant="outline" className="gap-2 rounded-xl">
                <span className="hidden sm:inline">{nextSurah.englishName}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <div className="bg-card rounded-3xl border border-border/40 p-8 mb-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="font-arabic-heading text-3xl font-bold text-primary leading-none">
                {toArabicNumber(surah.number)}
              </span>
            </div>
            
            <h1 className="font-arabic-heading text-5xl sm:text-6xl font-bold text-foreground mb-4">
              {surah.arabicName}
            </h1>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {surah.englishName}
            </h2>
            <p className="text-xl text-muted-foreground mb-6">
              {surah.englishMeaning}
            </p>
            
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold">
                {toArabicNumber(surah.verseCount)} Verses
              </span>
              <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                surah.revelationType === 'meccan'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                {surah.revelationType === 'meccan' ? 'Meccan (مکی)' : 'Medinan (مدنی)'}
              </span>
              <span className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold">
                {surah.rukuCount} Ruku
              </span>
            </div>
          </div>
        </div>

        {verses ? (
          <>
            <TranslationToggle
              showUrdu={showUrdu}
              showEnglish={showEnglish}
              onToggleUrdu={() => setShowUrdu(!showUrdu)}
              onToggleEnglish={() => setShowEnglish(!showEnglish)}
            />
            
            {verses.bismillah && number !== 1 && number !== 9 && (
              <Bismillah />
            )}
            
            <div className="space-y-4">
              {verses.ayahs.map((ayah) => (
                <AyahDisplay
                  key={ayah.number}
                  ayah={ayah}
                  showUrdu={showUrdu}
                  showEnglish={showEnglish}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-card rounded-3xl border border-border/40 p-8 text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Verses Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              The complete Arabic text with translations for Surah {surah.englishName} will be available soon, In Sha Allah.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/40">
          {prevSurah ? (
            <Link to={`/quran/surah/${prevSurah.number}`}>
              <Button variant="outline" className="gap-2 rounded-xl">
                <ChevronLeft className="w-4 h-4" />
                <span>{prevSurah.englishName}</span>
              </Button>
            </Link>
          ) : (
            <div />
          )}

          {nextSurah ? (
            <Link to={`/quran/surah/${nextSurah.number}`}>
              <Button variant="outline" className="gap-2 rounded-xl">
                <span>{nextSurah.englishName}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
