import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Scroll } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { paras, surahs } from '@/data/quran';
import { toArabicNumber } from '@/lib/quran-types';

export default function QuranParaPage() {
  const { paraNumber } = useParams<{ paraNumber: string }>();
  const number = parseInt(paraNumber || '1', 10);
  
  const para = paras.find(p => p.number === number);
  const prevPara = paras.find(p => p.number === number - 1);
  const nextPara = paras.find(p => p.number === number + 1);

  const startSurah = surahs.find(s => s.number === para?.startSurah);
  const endSurah = surahs.find(s => s.number === para?.endSurah);

  if (!para) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-8 flex-1 px-4 sm:px-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Para not found</h1>
            <Link to="/quran" className="text-primary hover:underline" title="Back to Quran">
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
        title={`Para ${para.number} - ${para.englishName} (${para.arabicName}) | The Holy Quran`}
        description={`Read Para ${para.number} (${para.englishName}) of the Holy Quran. Starts from Surah ${startSurah?.englishName} and ends at Surah ${endSurah?.englishName}.`}
      />
      
      <Header />
      
      <main className="container py-8 flex-1 px-4 sm:px-6">
        <Link 
          to="/quran" 
          title="Back to Quran"
          className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Quran
        </Link>

        <div className="flex items-center justify-between mb-6">
          {prevPara ? (
            <Link to={`/quran/para/${prevPara.number}`} title={`Previous: Para ${prevPara.number}`}>
              <Button variant="outline" className="gap-2 rounded-xl">
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Para {prevPara.number}</span>
              </Button>
            </Link>
          ) : (
            <div />
          )}

          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              Para {number} of 30
            </span>
          </div>

          {nextPara ? (
            <Link to={`/quran/para/${nextPara.number}`} title={`Next: Para ${nextPara.number}`}>
              <Button variant="outline" className="gap-2 rounded-xl">
                <span className="hidden sm:inline">Para {nextPara.number}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>

          <div className="bg-card rounded-3xl border border-border/40 p-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="font-arabic-heading text-3xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                  {toArabicNumber(para.number)}
                </span>
              </div>
              
              <h1 className="font-arabic-heading text-5xl sm:text-6xl font-bold text-foreground mb-4">
                {para.arabicName}
              </h1>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Para {para.number}
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                {para.englishName}
              </p>
              
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                  Starts: {startSurah?.arabicName} ({startSurah?.englishName}) - Ayah {toArabicNumber(para.startAyah)}
                </span>
                <span className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold">
                  Ends: {endSurah?.arabicName} ({endSurah?.englishName}) - Ayah {toArabicNumber(para.endAyah)}
                </span>
              </div>
            </div>
          </div>

        <div className="bg-card rounded-3xl border border-border/40 p-8 text-center">
          <Scroll className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Verses Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            The complete Arabic text with translations for Para {para.number} will be available soon, In Sha Allah.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
