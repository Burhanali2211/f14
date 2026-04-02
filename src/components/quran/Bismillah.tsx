export function Bismillah() {
  return (
    <div className="relative text-center py-10 md:py-14 mb-6 bg-card/40 backdrop-blur-sm rounded-2xl border border-border/30 overflow-hidden shadow-soft">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-50" />
      <p 
        className="quran-arabic-text relative text-3xl sm:text-4xl md:text-5xl text-primary px-4 leading-relaxed"
        dir="rtl"
        lang="ar"
      >
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </p>
      <div className="relative flex flex-col items-center gap-3 mt-4">
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest px-8 text-center italic opacity-80">
          In the name of Allah, the Most Gracious, the Most Merciful
        </p>
      </div>
    </div>
  );
}

