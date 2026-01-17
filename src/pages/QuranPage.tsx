import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { QuranHeader, QuranTabs, QuranList, QuranViewTab } from '@/components/quran';

export default function QuranPage() {
  const [activeTab, setActiveTab] = useState<QuranViewTab>('surah');

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
        
        <QuranTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <QuranList activeTab={activeTab} />
      </main>

      <Footer />
    </div>
  );
}
