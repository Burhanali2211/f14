import { useState, useEffect } from 'react';
import { Bookmark, Clock, ChevronRight, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { QuranHeader, QuranTabs, QuranList, QuranViewTab } from '@/components/quran';

export default function QuranPage() {
  const [activeTab, setActiveTab] = useState<QuranViewTab>('surah');
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [lastRead, setLastRead] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const savedBookmarks = JSON.parse(localStorage.getItem('f14-bookmarks') || '[]');
    const savedLastRead = JSON.parse(localStorage.getItem('f14-last-read') || 'null');
    setBookmarks(savedBookmarks);
    setLastRead(savedLastRead);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="The Holy Quran - Read Quran Online | Followers of 14"
        description="Read the Holy Quran online. Browse all 114 Surahs or 30 Paras. Arabic text with translations available."
      />
      
      <Header />
      
      <main className="container py-8 flex-1 px-4 sm:px-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <QuranHeader />
        
        {/* Offline Status Indicator */}
        {isOffline && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Offline Mode Active</p>
              <p className="text-xs opacity-80">You can still read all 114 Surahs offline. Your progress is saved locally.</p>
            </div>
          </div>
        )}
        
        {/* Quick Access Sections */}
        {(lastRead || bookmarks.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Last Read Card */}
            {lastRead && (
              <Link 
                to={`/quran/surah/${lastRead.surahNumber}#ayah-${lastRead.ayahNumber}`}
                className="group relative flex items-center gap-3.5 p-4 rounded-2xl border border-border/40 bg-card/40 hover:bg-primary/5 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-0.5">Continue Reading</p>
                  <h3 className="text-base font-bold text-foreground line-clamp-1">
                    {lastRead.surahName || `Surah ${lastRead.surahNumber}`}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">Ayah {lastRead.ayahNumber}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            )}

            {/* Latest Bookmark Card */}
            {bookmarks.length > 0 && (
              <Link 
                to={`/quran/surah/${bookmarks[0].surahNumber}#ayah-${bookmarks[0].ayahNumber}`}
                className="group relative flex items-center gap-3.5 p-4 rounded-2xl border border-border/40 bg-card/40 hover:bg-primary/5 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <Bookmark className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-0.5">Latest Bookmark</p>
                  <h3 className="text-base font-bold text-foreground line-clamp-1">
                    {bookmarks[0].surahName || `Surah ${bookmarks[0].surahNumber}`}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">Ayah {bookmarks[0].ayahNumber}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            )}
          </div>
        )}


        <QuranTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <QuranList activeTab={activeTab} />
      </main>
    </div>
  );
}

