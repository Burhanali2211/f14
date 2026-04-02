import { BookOpen } from 'lucide-react';

export function QuranHeader() {
  return (
    <div className="text-center mb-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-8 h-8 text-primary" />
      </div>
      
      <h1 className="quran-arabic-text text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-3 !leading-tight px-4" dir="rtl">
        القرآن الکریم
      </h1>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
        The Holy Quran
      </h2>
      <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto px-6">
        Read and recite the Words of Allah. Navigate by Surah or Para for your convenience.
      </p>
    </div>
  );
}

