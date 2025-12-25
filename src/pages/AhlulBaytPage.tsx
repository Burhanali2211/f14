import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Loader2, ChevronLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { getCachedData, setCachedData, getCacheKey } from '@/lib/data-cache';
import { getTableVersion } from '@/lib/cache-change-detector';
import type { Imam } from '@/lib/supabase-types';

export default function AhlulBaytPage() {
  const [imams, setImams] = useState<Imam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Check cache first
      const cacheKey = getCacheKey('ahlul-bayt-all');
      const cached = getCachedData<Imam[]>(cacheKey);

      if (cached) {
        // Check if cache is stale
        const imamsVersion = await getTableVersion('imams');
        if (imamsVersion && cached.version && imamsVersion <= cached.version) {
          // Cache is still valid
          logger.debug('Using cached Ahlul Bayt data');
          setImams(cached.data);
          setLoading(false);
          return;
        }
      }

      // Cache miss or stale - fetch from API
      const { data, error } = await safeQuery(async () =>
        await (supabase as any)
          .from('imams')
          .select('id, name, slug, title, description, order_index, image_url')
          .order('order_index', { ascending: true, nullsFirst: false })
          .order('name', { ascending: true })
      );

      if (error) {
        logger.error('Error fetching imams:', error);
      } else if (data) {
        const sortedImams = (data as Imam[]).sort((a, b) => {
          const orderA = a.order_index || 999;
          const orderB = b.order_index || 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.name || '').localeCompare(b.name || '');
        });
        setImams(sortedImams);

        // Cache the data
        const imamsVersion = await getTableVersion('imams');
        setCachedData(cacheKey, sortedImams, imamsVersion);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Generate SEO data
  const seoData = useMemo(() => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const pageUrl = `${siteUrl}/ahlul-bayt`;
    
    return {
      title: 'Browse by Ahlul Bayt (AS) - All Holy Personalities',
      description: 'Explore recitations in honor of all the Holy Personalities of Ahlul Bayt (AS). Browse Naat, Noha, Dua, Manqabat, and Marsiya dedicated to the Holy Family.',
      keywords: 'Ahlul Bayt, Holy Personalities, Islamic poetry, Naat, Noha, Dua, Manqabat, Marsiya, Ahlul Bayt recitations',
      url: pageUrl,
      image: `${siteUrl}/main.png`,
      type: 'website',
    };
  }, []);

  if (loading) {
    return (
      <>
        <SEOHead {...seoData} />
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container py-20">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead {...seoData} />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 md:py-12">
          {/* Back Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Browse by Ahlulbayt (AS)</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Recitations in honor of the Holy Personalities
              </p>
            </div>
          </div>

          {/* Grid of Personalities */}
          {imams.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {imams.map((imam, i) => (
                <Link
                  key={imam.id}
                  to={`/figure/${imam.slug}`}
                  className="group p-4 md:p-6 rounded-xl bg-card hover:bg-secondary/50 border border-border/40 hover:border-primary/30 transition-all duration-300 animate-slide-up opacity-0 text-center hover:shadow-lg"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    {imam.image_url ? (
                      <img
                        src={imam.image_url}
                        alt={imam.name}
                        className="w-full h-full rounded-2xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Users className="w-8 h-8 md:w-10 md:h-10 text-primary group-hover:text-primary-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm md:text-base group-hover:text-primary transition-colors mb-1">
                    {imam.name}
                  </h3>
                  {(imam.description || imam.title) && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">
                      {imam.description || imam.title}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No personalities found.</p>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}

