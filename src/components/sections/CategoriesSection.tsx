import { CategoryCard } from '@/components/CategoryCard';
import type { Category } from '@/lib/supabase-types';
import { Sparkles } from 'lucide-react';

interface CategoriesSectionProps {
  categories: Category[];
  loading: boolean;
}

export function CategoriesSection({ categories, loading }: CategoriesSectionProps) {
  // Determine optimal columns based on category count for better spacing
  const getGridCols = () => {
    const count = categories.length;
    if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 3) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4';
    // For 5+ categories, use full responsive grid
    return 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
  };

  return (
    <section className="py-12 sm:py-16 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Header */}
        <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
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
          
          <p className="text-base sm:text-lg md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Journey through our curated collection of Islamic recitations and spiritual content
          </p>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 md:gap-4 lg:gap-5 w-full">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="h-[200px] sm:h-[220px] md:h-[200px] lg:h-[220px] w-full bg-card rounded-2xl md:rounded-3xl border border-border/40 shadow-lg animate-pulse" 
              />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className={`grid ${getGridCols()} gap-4 sm:gap-5 md:gap-4 lg:gap-5 w-full`}>
            {categories.map((category, i) => (
              <CategoryCard 
                key={category.id} 
                category={category} 
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 sm:py-20 md:py-24">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border border-border/40 shadow-lg">
                <svg 
                  className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 sm:mb-3">
                No Categories Yet
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                Categories will appear here once they're added through the admin dashboard.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
