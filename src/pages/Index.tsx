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
    popularPieces,
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

  // Show event toast when component mounts
  useEffect(() => {
    showUpcomingEventToast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate SEO data for homepage
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const seoStructuredData = generateWebSiteStructuredData(siteUrl);

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Head for homepage */}
      <SEOHead
        title="Followers of 14 - Complete Islamic Poetry & Recitation Platform"
        description="Followers of 14 - Your complete destination for Islamic poetry, Naat, Manqabat, Noha, Dua, Marsiya and more. Read, listen, and watch with text, audio, and video. Free access to the best Islamic spiritual content."
        keywords="Followers of 14, islamic poetry, Naat, Noha, Dua, Manqabat, Marsiya, Islamic content, Urdu poetry, Arabic poetry, recitation, Islamic recitation, spiritual content, Islamic literature, read online, free recitation"
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

        {/* Main Content */}
        {!searchQuery.trim() && (
          <>
            <CategoriesSection categories={categories} loading={loading} />
            <AhlulbaytSection imams={imams} />
            <ArtistsSection artists={artists} />
            <ContinueReadingSection pieces={continueReadingPieces} />
            <FavoritesSection pieces={favoritePieces} />
            <PopularPiecesSection pieces={popularPieces} />
            <RecentPiecesSection pieces={recentPieces} />
            <CTASection />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
