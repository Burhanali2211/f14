import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
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

  return (
    <div className="min-h-screen bg-background">
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

      <main className="container pb-20">
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
