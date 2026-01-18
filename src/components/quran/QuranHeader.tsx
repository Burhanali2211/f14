import { BookOpen, BookmarkCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLastSeen } from '@/hooks/useLastSeen';

export function QuranHeader() {
  const { lastSeen } = useLastSeen();
  
  const getContinueLink = () => {
    if (!lastSeen) return null;
    if (lastSeen.type === 'surah' && lastSeen.surahNumber) {
      return `/quran/surah/${lastSeen.surahNumber}#ayah-${lastSeen.ayahNumber}`;
    }
    if (lastSeen.type === 'para' && lastSeen.paraNumber) {
      return `/quran/para/${lastSeen.paraNumber}#ayah-${lastSeen.ayahNumber}`;
    }
    return null;
  };

  const continueLink = getContinueLink();

  return (
    <div className="text-center mb-8">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <BookOpen className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="quran-arabic-text text-5xl sm:text-6xl font-bold text-foreground mb-4 !leading-tight" dir="rtl">
        القرآن الکریم
      </h1>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
        The Holy Quran
      </h2>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
        Read and recite the Words of Allah. Navigate by Surah or Para for your convenience.
      </p>

      {continueLink && lastSeen && (
        <Link to={continueLink}>
          <Button className="gap-2" size="lg">
            <BookmarkCheck className="w-5 h-5" />
            Continue Reading
            <span className="text-primary-foreground/80 text-sm">
              ({lastSeen.type === 'surah' ? `Surah ${lastSeen.surahName}` : `Para ${lastSeen.paraName}`}, Ayah {lastSeen.ayahNumber})
            </span>
          </Button>
        </Link>
      )}
    </div>
  );
}
