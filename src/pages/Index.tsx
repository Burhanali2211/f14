import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { UpcomingEvents } from '@/components/UpcomingEvents';
import { HeroSection } from '@/components/sections/HeroSection';
import { CategoriesSection } from '@/components/sections/CategoriesSection';
import { AhlulbaytSection } from '@/components/sections/AhlulbaytSection';
import { ArtistsSection } from '@/components/sections/ArtistsSection';
import { ContinueReadingSection } from '@/components/sections/ContinueReadingSection';
import { FavoritesSection } from '@/components/sections/FavoritesSection';
import { PopularPiecesSection } from '@/components/sections/PopularPiecesSection';
import { RecentPiecesSection } from '@/components/sections/RecentPiecesSection';
import { CTASection } from '@/components/sections/CTASection';
import { useIndexData } from '@/hooks/use-index-data';
import { useSearch } from '@/hooks/use-search';
import { useEventToast } from '@/hooks/use-event-toast';
import { generateWebSiteStructuredData } from '@/lib/seo-utils';

export default function Index() {
  const {
    categories,
    imams,
    recentPieces,
    continueReadingPieces,
    favoritePieces,
    artists,
    siteSettings,
    stats,
    loading,
  } = useIndexData();

  const {
    searchResults,
    isSearching,
    searchQuery,
    handleSearch,
  } = useSearch();

  const { showUpcomingEventToast } = useEventToast();

  useEffect(() => {
    showUpcomingEventToast();
  }, []);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const seoStructuredData = generateWebSiteStructuredData(siteUrl);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Followers of 14 | Khanda Azaadars | Lyrics Hub - Islamic Poetry & Recitations"
        description="Followers of 14 (Khanda Azaadars, Lyrics Hub) - The #1 destination for Islamic poetry. Find any Naat, Noha, Dua, Manqabat, Marsiya by name with full text, audio & video. Search thousands of recitations in Urdu, Arabic, Persian. Free access."
        keywords="Followers of 14, followers of fourteen, F14, khanda azaadars, khanda azadars, lyrics hub, islamic lyrics, naat lyrics, noha lyrics, marsiya lyrics, manqabat lyrics, dua lyrics, islamic poetry, naat, noha, dua, manqabat, marsiya, salam, qasida, islamic recitation, read online, free recitation"
        image={`${siteUrl}/main.png`}
        url={siteUrl}
        type="website"
        structuredData={seoStructuredData}
        canonicalUrl={siteUrl}
      />
      
      <Header />
      
      <HeroSection
        siteSettings={siteSettings}
        stats={stats}
        recentPiecesCount={recentPieces.length}
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        onSearch={handleSearch}
      />

      <main className="container pb-16 sm:pb-20 md:pb-24 px-4 sm:px-5 md:px-6">
        <UpcomingEvents />

        {!searchQuery.trim() && (
          <>
            <CategoriesSection categories={categories} loading={loading} />
            <AhlulbaytSection imams={imams} />
            <ArtistsSection artists={artists} />
            <ContinueReadingSection pieces={continueReadingPieces} />
            <FavoritesSection pieces={favoritePieces} />
            <PopularPiecesSection />
            <RecentPiecesSection pieces={recentPieces} />
            <CTASection />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
