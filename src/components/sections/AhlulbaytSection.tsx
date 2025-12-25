import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import type { Imam } from '@/lib/supabase-types';

interface AhlulbaytSectionProps {
  imams: Imam[];
}

export function AhlulbaytSection({ imams }: AhlulbaytSectionProps) {
  if (imams.length === 0) return null;

  const displayedImams = imams.slice(0, 8);
  const hasMore = imams.length > 8;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Browse by Ahlulbayt (AS)</h2>
            <p className="text-sm text-muted-foreground">Recitations in honor of the Holy Personalities</p>
          </div>
        </div>
        {hasMore && (
          <Link
            to="/ahlul-bayt"
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
          >
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">All</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayedImams.map((imam, i) => (
          <Link
            key={imam.id}
            to={`/figure/${imam.slug}`}
            className="group p-4 rounded-xl bg-card hover:bg-secondary/50 transition-all duration-300 animate-slide-up opacity-0 text-center"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary group-hover:scale-105 transition-all duration-300">
              <Users className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
              {imam.name}
            </h3>
            {(imam.description || imam.title) && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{imam.description || imam.title}</p>
            )}
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <Link
            to="/ahlul-bayt"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-all duration-300 group"
          >
            <span>View All </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </section>
  );
}
