import { BookOpen } from 'lucide-react';

export function QuranHeader() {
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
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Read and recite the Words of Allah. Navigate by Surah or Para for your convenience.
      </p>
    </div>
  );
}
