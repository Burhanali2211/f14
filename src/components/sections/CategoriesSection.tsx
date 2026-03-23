import { CategoryCard } from '@/components/CategoryCard';
import { QuranCategoryCard } from '@/components/quran/QuranCategoryCard';
import { DuasCategoryCard } from '@/components/duas/DuasCategoryCard';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/lib/supabase-types';
import { Sparkles } from 'lucide-react';

interface CategoriesSectionProps {
  categories: Category[];
  loading: boolean;
}

export function CategoriesSection({ categories, loading }: CategoriesSectionProps) {
  const { theme } = useTheme();
  
  // Determine optimal columns based on total card count (Quran + Duas + db categories)
    const getGridCols = () => {
      const total = categories.length + 2; // +2 for Quran and Duas cards
      if (total <= 2) return 'grid-cols-2 sm:grid-cols-2';
      if (total <= 3) return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3';
      if (total <= 4) return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4';
      // For 5+ cards, use 2 cols on mobile, scale up on larger screens
      return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    };

  return (
    <section className="py-12 sm:py-16 md:py-18 lg:py-20">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Modern Header */}
        <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-14">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border mb-4 sm:mb-6 ${
            theme === 'light'
              ? 'bg-primary/12 border-primary/30 shadow-sm'
              : 'bg-primary/10 border-primary/20'
          }`}>
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider">
              Explore Collections
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-fade-in">
              Discover Categories
            </span>
          </h2>
          
          <p className={`text-base sm:text-lg md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed ${
            theme === 'light'
              ? 'text-foreground/80'
              : 'text-muted-foreground'
          }`}>
            Journey through our curated collection of Islamic recitations and spiritual content
          </p>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-4 lg:gap-5 w-full">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-[160px] sm:h-[220px] md:h-[200px] lg:h-[220px] w-full bg-card rounded-2xl md:rounded-3xl border animate-pulse ${
                    theme === 'light'
                      ? 'border-border/50 shadow-md'
                      : 'border-border/40 shadow-lg'
                  }`} 
                />
              ))}
            </div>
        ) : (
            <div className={`grid ${getGridCols()} gap-3 sm:gap-5 md:gap-4 lg:gap-5 w-full`}>
              <QuranCategoryCard index={0} />
              <DuasCategoryCard index={1} />
              {categories.map((category, i) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={i + 2}
                />
              ))}
            </div>
        )}
      </div>
    </section>
  );
}
