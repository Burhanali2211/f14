export function Bismillah() {
  return (
    <div className="text-center py-10 mb-8 bg-card rounded-2xl border border-border/30">
      <p 
        className="quran-arabic-text text-3xl sm:text-4xl md:text-5xl text-primary px-4"
        dir="rtl"
        lang="ar"
      >
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </p>
      <p className="text-sm text-muted-foreground mt-4 font-sans">
        In the name of Allah, the Most Gracious, the Most Merciful
      </p>
    </div>
  );
}
