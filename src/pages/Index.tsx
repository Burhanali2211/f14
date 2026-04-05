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
        title="Followers of 14 | Islamic Lyrics Hub - Noha, Manqabat, Quran, Naat"
        description="Followers of 14 - The complete Islamic lyrics repository. Find lyrics of Noha, Manqabat, Quran, Naat, and Dua in Urdu, Arabic, Persian. Search any recitation by name and read complete lyrics."
        keywords="Followers of 14, islamic lyrics, noha lyrics, manqabat, manqabat lyrics, quran lyrics, islamic poetry hub, followersof14, shia poetry, azadari lyrics, karbala lyrics"
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
