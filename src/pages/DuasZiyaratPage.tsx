import { Link } from 'react-router-dom';
import { ChevronLeft, HandHeart, BookOpen, Moon, Star, Heart } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { useTheme } from '@/hooks/use-theme';
import { duaCategories } from '@/data/duas';
import type { DuaCategoryInfo } from '@/data/duas';

const COLOR_MAP: Record<string, { icon: string; bg: string; border: string; text: string; hover: string }> = {
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    hover: 'group-hover:border-emerald-500/50 group-hover:bg-emerald-500/5',
  },
  violet: {
    icon: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    hover: 'group-hover:border-violet-500/50 group-hover:bg-violet-500/5',
  },
  amber: {
    icon: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    hover: 'group-hover:border-amber-500/50 group-hover:bg-amber-500/5',
  },
  rose: {
    icon: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    hover: 'group-hover:border-rose-500/50 group-hover:bg-rose-500/5',
  },
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ziyarat: Star,
  'duas-imams': BookOpen,
  taqibaat: Moon,
  general: Heart,
};

function CategorySection({ category }: { category: DuaCategoryInfo }) {
  const { theme } = useTheme();
  const colors = COLOR_MAP[category.color] ?? COLOR_MAP.violet;
  const Icon = CATEGORY_ICONS[category.id] ?? HandHeart;

  return (
    <div className="mb-12">
      {/* Category Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{category.name}</h2>
          <p className="text-sm font-arabic text-muted-foreground">{category.nameAr}</p>
        </div>
      </div>

      <p className={`text-base mb-6 ${theme === 'light' ? 'text-foreground/70' : 'text-muted-foreground'}`}>
        {category.description}
      </p>

      {/* Duas Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {category.duas.map((dua) => (
          <Link
            key={dua.id}
            to={`/duas/${dua.id}`}
            className={`group relative overflow-hidden p-6 rounded-2xl bg-card border-2 ${colors.border} ${colors.hover} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
          >
            <div className="relative z-10">
              <h3 className={`text-xl font-bold mb-1 transition-colors duration-200 ${colors.text}`}>
                {dua.nameAr}
              </h3>
              <h4 className="text-base font-semibold text-foreground mb-3">{dua.name}</h4>
              {dua.nameUrdu && (
                <p className="text-sm font-arabic text-muted-foreground mb-3">{dua.nameUrdu}</p>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {dua.description}
              </p>
              {dua.occasion && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                  <Moon className="w-3 h-3" />
                  {dua.occasion.length > 40 ? dua.occasion.slice(0, 40) + '…' : dua.occasion}
                </div>
              )}
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-current" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DuasZiyaratPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Duas & Ziyarat - Islamic Supplications | Followers of 14"
        description="Read Ziyarat e Ashura, Dua e Kumail, Dua e Ahd, Taqibaat e Nimaaz, Dua Tawassul, Dua Nudba and more Islamic supplications in Arabic with translation."
      />

      <Header />

      <main className="container py-8 flex-1 px-4 sm:px-6">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Home
        </Link>

        {/* Page Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border-2 border-violet-500/20 flex items-center justify-center">
              <HandHeart className="w-9 h-9 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
                Duas & Ziyarat
              </h1>
              <p className="text-xl font-arabic text-muted-foreground mt-1">أدعية وزيارات</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            A sacred collection of Islamic supplications, salutations, and post-prayer recitations from the Ahlul Bayt (a.s.) — in Arabic with English translation.
          </p>
        </div>

        {/* Categories */}
        {duaCategories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </main>

      <Footer />
    </div>
  );
}
