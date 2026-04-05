import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Globe, AlignRight, AlignLeft, Moon } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { getDuaById, duaCategories } from '@/data/duas';

const COLOR_MAP: Record<string, { badge: string; text: string; border: string; bg: string }> = {
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
  },
  violet: {
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/5',
  },
  amber: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
  },
  rose: {
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
  },
};

function parseArabicText(text: string) {
  // Split on double-newline for paragraphs, handle **[...]** headings
  return text.split(/\n\n+/).map((block, i) => {
    const headingMatch = block.match(/^\*\*\[(.+?)\]\*\*/);
    if (headingMatch) {
      return { type: 'heading' as const, key: i, content: headingMatch[1], rest: block.replace(/^\*\*\[.+?\]\*\*\s*/, '') };
    }
    return { type: 'paragraph' as const, key: i, content: block };
  });
}

export default function DuaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { theme } = useTheme();
  const [showTranslation, setShowTranslation] = useState(false);
  const [arabicFontSize, setArabicFontSize] = useState<'md' | 'lg' | 'xl'>('lg');

  const dua = id ? getDuaById(id) : null;

  if (!dua) {
    return <Navigate to="/duas" replace />;
  }

  const category = duaCategories.find(c => c.id === dua.category);
  const colors = COLOR_MAP[category?.color ?? 'violet'];

  const fontSizeClass = {
    md: 'text-xl leading-[2.4rem]',
    lg: 'text-2xl leading-[2.8rem]',
    xl: 'text-3xl leading-[3.4rem]',
  }[arabicFontSize];

  const arabicBlocks = parseArabicText(dua.arabic);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={`${dua.name} (${dua.nameAr}) - Dua & Ziyarat | Followers of 14`}
        description={`${dua.name}: ${dua.description || 'Listen and read the full text of ' + dua.name}. Available with Arabic text and English translation on Followers of 14.`}
        keywords={`${dua.name}, ${dua.nameAr}, dua lyrics, ziyarat, islamic prayer, ${category?.name || ''}, followers of 14, f14`}
      />


      <Header />

      <main className="container py-8 flex-1 px-4 sm:px-6 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/duas" className="hover:text-foreground transition-colors">Duas & Ziyarat</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{dua.name}</span>
        </nav>

        {/* Back button */}
        <Link
          to="/duas"
          className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Duas & Ziyarat
        </Link>

        {/* Header card */}
        <div className={`rounded-3xl border-2 ${colors.border} ${colors.bg} p-8 mb-8`}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              {/* Category badge */}
              {category && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-4 ${colors.badge}`}>
                  <Moon className="w-3 h-3" />
                  {category.name}
                </span>
              )}

              <h1 className={`text-3xl sm:text-4xl font-bold font-arabic mb-2 ${colors.text}`}>
                {dua.nameAr}
              </h1>
              <h2 className="text-2xl font-bold text-foreground mb-1">{dua.name}</h2>
              {dua.nameUrdu && (
                <p className="text-lg font-arabic text-muted-foreground mb-4">{dua.nameUrdu}</p>
              )}
              <p className="text-base text-muted-foreground leading-relaxed">{dua.description}</p>
            </div>
          </div>

          {/* Meta info */}
          <div className="mt-6 pt-6 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dua.occasion && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">When to Recite</p>
                <p className="text-sm text-foreground">{dua.occasion}</p>
              </div>
            )}
            {dua.source && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Source</p>
                <p className="text-sm text-foreground">{dua.source}</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1 rounded-xl border border-border p-1">
            <button
              onClick={() => setArabicFontSize('md')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${arabicFontSize === 'md' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="text-xs">A</span>
            </button>
            <button
              onClick={() => setArabicFontSize('lg')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${arabicFontSize === 'lg' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="text-sm">A</span>
            </button>
            <button
              onClick={() => setArabicFontSize('xl')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${arabicFontSize === 'xl' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="text-base">A</span>
            </button>
          </div>

          {dua.translation && (
            <Button
              variant={showTranslation ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTranslation(v => !v)}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              {showTranslation ? 'Hide Translation' : 'Show Translation'}
            </Button>
          )}
        </div>

        {/* Arabic text */}
        <div className={`rounded-3xl border ${
          theme === 'light' ? 'bg-card border-border/60 shadow-sm' : 'bg-card border-border/40'
        } p-6 sm:p-10 mb-6`}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/40">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Arabic Text</span>
            <AlignRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </div>

          <div dir="rtl" className="space-y-6">
            {arabicBlocks.map((block) => {
              if (block.type === 'heading') {
                return (
                  <div key={block.key}>
                    <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border mb-4 ${colors.badge}`}>
                      {block.content}
                    </div>
                    {block.rest && (
                      <p className={`font-arabic ${fontSizeClass} text-foreground leading-loose text-right`}>
                        {block.rest}
                      </p>
                    )}
                  </div>
                );
              }
              return (
                <p key={block.key} className={`font-arabic ${fontSizeClass} text-foreground leading-loose text-right`}>
                  {block.content}
                </p>
              );
            })}
          </div>
        </div>

        {/* Translation */}
        {showTranslation && dua.translation && (
          <div className={`rounded-3xl border ${
            theme === 'light' ? 'bg-card border-border/60 shadow-sm' : 'bg-card border-border/40'
          } p-6 sm:p-10 mb-6`}>
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/40">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">English Translation</span>
              <AlignLeft className="w-4 h-4 text-muted-foreground ml-auto" />
            </div>
            <div className="space-y-4">
              {dua.translation.split(/\n\n+/).map((para, i) => (
                <p key={i} className="text-base leading-relaxed text-foreground/90">
                  {para}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Related duas */}
        {category && category.duas.filter(d => d.id !== dua.id).length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-bold text-foreground mb-4">More in {category.name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {category.duas.filter(d => d.id !== dua.id).map(related => (
                <Link
                  key={related.id}
                  to={`/duas/${related.id}`}
                  className={`p-4 rounded-2xl border-2 ${colors.border} hover:${colors.bg} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <p className={`font-arabic text-lg font-bold mb-1 ${colors.text}`}>{related.nameAr}</p>
                  <p className="text-sm font-semibold text-foreground">{related.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{related.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
