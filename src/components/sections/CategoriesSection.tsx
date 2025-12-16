import { CategoryCard } from '@/components/CategoryCard';
import type { Category } from '@/lib/supabase-types';

interface CategoriesSectionProps {
  categories: Category[];
  loading: boolean;
}

export function CategoriesSection({ categories, loading }: CategoriesSectionProps) {
  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Browse Categories
          </h2>
          <p className="text-muted-foreground">Explore our collection of Islamic content</p>
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, i) => (
            <CategoryCard key={category.id} category={category} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
