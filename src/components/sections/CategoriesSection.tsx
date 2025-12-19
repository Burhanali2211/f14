import { CategoryCard } from '@/components/CategoryCard';
import type { Category } from '@/lib/supabase-types';

interface CategoriesSectionProps {
  categories: Category[];
  loading: boolean;
}

export function CategoriesSection({ categories, loading }: CategoriesSectionProps) {
  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 md:mb-10">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2 sm:mb-3">
            Browse Categories
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            Explore our collection of Islamic content
          </p>
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="h-40 sm:h-44 md:h-48 lg:h-52 bg-card rounded-xl sm:rounded-2xl animate-pulse shadow-sm" 
            />
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {categories.map((category, i) => (
            <CategoryCard key={category.id} category={category} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No categories available</p>
        </div>
      )}
    </section>
  );
}
