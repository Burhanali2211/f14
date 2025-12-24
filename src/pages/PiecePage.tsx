import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, User, Globe, Bookmark, Eye,
  Clock, Users, Maximize2, ArrowUp, ListTree
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ReaderToolbar } from '@/components/ReaderToolbar';
import { SettingsPanel } from '@/components/SettingsPanel';
import { VideoPlayer } from '@/components/VideoPlayer';
import { FullscreenImageViewer } from '@/components/FullscreenImageViewer';
import { RecitationLayout } from '@/components/RecitationLayout';
import { PDFLikeViewer } from '@/components/PDFLikeViewer';
import { FullscreenPDFViewer } from '@/components/FullscreenPDFViewer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/hooks/use-settings';
import { useFavorites } from '@/hooks/use-favorites';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import {
  generateMetaDescription,
  generateKeywords,
  generateArticleStructuredData,
  generateBreadcrumbStructuredData,
} from '@/lib/seo-utils';
import { getCachedData, setCachedData, getCacheKey } from '@/lib/data-cache';
import { getTableVersion } from '@/lib/cache-change-detector';
import type { Piece, Category, Imam } from '@/lib/supabase-types';

export default function PiecePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { addToRecentlyViewed } = useFavorites();
  const { saveProgress, getProgress } = useReadingProgress();
  
  const [piece, setPiece] = useState<Piece | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [imam, setImam] = useState<Imam | null>(null);
  const [siblingPieces, setSiblingPieces] = useState<{ prev?: Piece; next?: Piece }>({});
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [outline, setOutline] = useState<{ index: number; title: string; isHeader: boolean }[]>([]);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchPiece = useCallback(async () => {
    try {
      // Check cache first
      const cacheKey = getCacheKey('piece', { id });
      const cached = getCachedData<{
        piece: Piece;
        category: Category | null;
        imam: Imam | null;
        siblings: { prev?: Piece; next?: Piece };
      }>(cacheKey);

      if (cached) {
        // Check if cache is stale
        const piecesVersion = await getTableVersion('pieces');
        if (piecesVersion && cached.version && piecesVersion <= cached.version) {
          // Cache is still valid
          logger.debug('Using cached piece data');
          setPiece(cached.data.piece);
          setCategory(cached.data.category);
          setImam(cached.data.imam);
          setSiblingPieces(cached.data.siblings);
          setLoading(false);
          return;
        }
      }

      // Cache miss or stale - fetch from API
      // Optimized: Fetch piece with category and imam in single query for SEO
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('pieces')
          .select(`
            id,
            title,
            text_content,
            image_url,
            video_url,
            reciter,
            language,
            view_count,
            created_at,
            updated_at,
            category_id,
            imam_id,
            tags,
            category:categories(id, name, slug, description),
            imam:imams(id, name, slug, title, description)
          `)
          .eq('id', id)
          .maybeSingle()
      );

      if (error) {
        logger.error('Error fetching piece:', error);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const typedPiece = data as any;
      setPiece(typedPiece as Piece);

      // Extract category and imam from joined data
      let fetchedSiblings: { prev?: Piece; next?: Piece } = {};
      
      if (typedPiece.category) {
        setCategory(typedPiece.category as Category);
        
        // Fetch sibling pieces for navigation (optimized query)
        const { data: siblings, error: siblingsError } = await safeQuery(async () =>
          await supabase
            .from('pieces')
            .select('id, title, category_id')
            .eq('category_id', typedPiece.category_id)
            .order('title')
        );
        
        if (siblingsError) {
          logger.error('Error fetching siblings:', siblingsError);
        } else if (siblings) {
          const currentIndex = siblings.findIndex(s => s.id === id);
          fetchedSiblings = {
            prev: currentIndex > 0 ? siblings[currentIndex - 1] as Piece : undefined,
            next: currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] as Piece : undefined,
          };
          setSiblingPieces(fetchedSiblings);
        }
      }

      // Extract imam from joined data
      if (typedPiece.imam) {
        setImam(typedPiece.imam as Imam);
      }

      // Cache the data
      const piecesVersion = await getTableVersion('pieces');
      setCachedData(
        cacheKey,
        {
          piece: typedPiece as Piece,
          category: typedPiece.category as Category | null,
          imam: typedPiece.imam as Imam | null,
          siblings: fetchedSiblings,
        },
        piecesVersion
      );
    } catch (error) {
      logger.error('Unexpected error in fetchPiece:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const incrementViewCount = useCallback(async () => {
    if (id) {
      try {
        const { error } = await safeQuery(async () =>
          await supabase.rpc('increment_view_count', { piece_id: id })
        );
        if (error) {
          logger.error('Error incrementing view count:', error);
        }
      } catch (error) {
        logger.error('Unexpected error incrementing view count:', error);
      }
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPiece();
      incrementViewCount();
      addToRecentlyViewed(id);
    }
  }, [id, fetchPiece, incrementViewCount, addToRecentlyViewed]);

  // Restore reading progress - delayed to allow page to open at top first.
  // This is optional and can be disabled via settings.rememberReadingPosition
  useEffect(() => {
    if (!settings.rememberReadingPosition) {
      return;
    }

    if (piece && id) {
      const progress = getProgress(id);
      if (progress && progress.scrollPosition > 0) {
        // Delay restoration significantly so page opens at top first
        // This gives users a moment to see the top before restoring position
        const timeoutId = setTimeout(() => {
          // Only restore if user hasn't scrolled manually
          const currentScroll = window.scrollY || document.documentElement.scrollTop;
          if (currentScroll < 100) { // Only restore if still near top
            window.scrollTo({ top: progress.scrollPosition, behavior: 'smooth' });
          }
        }, 2000); // Increased delay to 2 seconds
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [piece, id, getProgress, settings.rememberReadingPosition]);

  // Save reading progress on scroll - debounced for performance
  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      if (id) {
        // Clear existing timeout
        clearTimeout(scrollTimeout);
        // Debounce scroll handler to avoid excessive saves
        scrollTimeout = setTimeout(() => {
          saveProgress(id, { 
            scrollPosition: window.scrollY,
            currentVerse
          });
        }, 500); // Save every 500ms instead of every scroll event
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [id, currentVerse, saveProgress]);

  // Track which verse is currently in view using IntersectionObserver
  useEffect(() => {
    if (!contentRef.current) return;

    const verseElements = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>('[data-verse-index]')
    );

    if (verseElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible verse in the viewport
        let bestEntry: IntersectionObserverEntry | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry;
          }
        }

        if (bestEntry && bestEntry.target instanceof HTMLElement) {
          const indexAttr = bestEntry.target.getAttribute('data-verse-index');
          if (indexAttr !== null) {
            const index = parseInt(indexAttr, 10);
            if (!Number.isNaN(index)) {
              setCurrentVerse((prev) => (prev !== index ? index : prev));
            }
          }
        }
      },
      {
        root: null,
        rootMargin: '0px 0px -40% 0px', // bias slightly toward upper-middle of viewport
        threshold: [0.25, 0.5, 0.75],
      }
    );

    verseElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [piece?.id, settings.compactMode, settings.fontSize, settings.lineHeight]);

  const handlePrevious = () => {
    if (siblingPieces.prev) {
      navigate(`/piece/${siblingPieces.prev.id}`);
    }
  };

  const handleNext = () => {
    if (siblingPieces.next) {
      navigate(`/piece/${siblingPieces.next.id}`);
    }
  };

  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case 'cairo': return "'Cairo', sans-serif";
      case 'tajawal': return "'Tajawal', sans-serif";
      case 'noto-sans-arabic': return "'Noto Sans Arabic', sans-serif";
      case 'ibm-plex-sans-arabic': return "'IBM Plex Sans Arabic', sans-serif";
      case 'noto-nastaliq': return "'Noto Nastaliq Urdu', serif";
      case 'lateef': return "'Lateef', serif";
      case 'scheherazade': return "'Scheherazade New', serif";
      default: return "'Cairo', sans-serif";
    }
  };

  const getReaderBgClass = () => {
    // Ensure smooth transitions between themes
    const baseTransition = settings.animationsEnabled ? 'transition-colors duration-300' : '';
    
    switch (settings.readerBackground) {
      case 'sepia': 
        return `${baseTransition} bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-50 reader-bg-sepia`;
      case 'dark': 
        return `${baseTransition} bg-zinc-900 text-zinc-100 reader-bg-dark`;
      case 'paper': 
        return `${baseTransition} bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100 reader-bg-paper`;
      case 'parchment': 
        return `${baseTransition} bg-amber-100 dark:bg-amber-900/40 text-amber-950 dark:text-amber-50 reader-bg-parchment`;
      case 'cream': 
        return `${baseTransition} bg-amber-50 dark:bg-amber-950/20 text-zinc-900 dark:text-zinc-100 reader-bg-cream`;
      case 'night': 
        return `${baseTransition} bg-slate-950 text-slate-100 reader-bg-night`;
      case 'blue-light': 
        return `${baseTransition} bg-blue-50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-50 reader-bg-blue-light`;
      case 'green-light': 
        return `${baseTransition} bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-50 reader-bg-green-light`;
      case 'warm-white': 
        return `${baseTransition} bg-orange-50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-50 reader-bg-warm-white`;
      default: 
        return `${baseTransition} bg-card text-foreground`;
    }
  };

  const handleJumpToVerse = (index: number) => {
    const target = verseRefs.current[index];
    if (target) {
      const rect = target.getBoundingClientRect();
      const absoluteY = rect.top + window.scrollY;
      const offset = 120; // account for sticky header + toolbar
      window.scrollTo({
        top: Math.max(absoluteY - offset, 0),
        behavior: 'smooth',
      });
    }
  };

  // Calculate word count and reading time (safe even if piece is null)
  const wordCount = piece?.text_content ? piece.text_content.split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 150); // ~150 words per minute for poetry

  // Helper function to split comma-separated image URLs
  const getImageUrls = useMemo(() => {
    if (!piece?.image_url) return [];
    return piece.image_url.split(',').map(url => url.trim()).filter(url => url.length > 0);
  }, [piece?.image_url]);

  const currentImageUrl = getImageUrls[currentImageIndex] || getImageUrls[0] || '';

  // Generate SEO data (must be called before early returns to maintain hook order)
  const seoData = useMemo(() => {
    if (!piece) return null;
    
    const siteUrl = window.location.origin;
    const pieceUrl = `${siteUrl}/piece/${piece.id}`;
    // Get first image URL for SEO (handle comma-separated URLs)
    const firstImageUrl = piece.image_url 
      ? piece.image_url.split(',')[0].trim()
      : '';
    const imageUrl = firstImageUrl
      ? (firstImageUrl.startsWith('http') ? firstImageUrl : `${siteUrl}${firstImageUrl}`)
      : `${siteUrl}/main.png`;
    
    const metaDescription = generateMetaDescription(piece);
    const keywords = generateKeywords(piece, category || undefined, imam || undefined);
    
    // Generate structured data
    const articleStructuredData = generateArticleStructuredData(
      piece,
      category || undefined,
      imam || undefined,
      siteUrl
    );
    
    // Generate breadcrumb structured data
    const breadcrumbItems = [
      { name: 'Home', url: '/' },
      ...(category ? [{ name: category.name, url: `/category/${category.slug}` }] : []),
      { name: piece.title, url: `/piece/${piece.id}` },
    ];
    const breadcrumbStructuredData = generateBreadcrumbStructuredData(breadcrumbItems, siteUrl);
    
    // Combine structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [articleStructuredData, breadcrumbStructuredData],
    };
    
    return {
      title: piece.title,
      description: metaDescription,
      keywords,
      image: imageUrl,
      url: pieceUrl,
      type: 'article' as const,
      author: piece.reciter || undefined,
      publishedTime: piece.created_at,
      modifiedTime: piece.updated_at || piece.created_at,
      category: category?.name,
      structuredData,
      canonicalUrl: pieceUrl,
    };
  }, [piece, category, imam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-8 max-w-4xl flex-1">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <div className="flex gap-2 mb-8">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-32 w-full mb-8 rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-16 text-center flex-1">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Bookmark className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-semibold mb-2">Content Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The recitation you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* SEO Head */}
      {seoData && (
        <SEOHead
          title={seoData.title}
          description={seoData.description}
          keywords={seoData.keywords}
          image={seoData.image}
          url={seoData.url}
          type={seoData.type}
          author={seoData.author}
          publishedTime={seoData.publishedTime}
          modifiedTime={seoData.modifiedTime}
          category={seoData.category}
          structuredData={seoData.structuredData}
          canonicalUrl={seoData.canonicalUrl}
        />
      )}
      
      <Header />
      
      <ReaderToolbar
        pieceId={piece.id}
        pieceTitle={piece.title}
        textContent={piece.text_content}
        onSettingsOpen={() => setSettingsOpen(true)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={!!siblingPieces.prev}
        hasNext={!!siblingPieces.next}
      />
      
      <main className="container py-8 max-w-5xl flex-1">
        {/* Breadcrumb */}
        <Link 
          to={category ? `/category/${category.slug}` : '/'}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          {category ? category.name : 'Home'}
        </Link>

        {/* Header */}
        <header className="mb-8 text-center">
          {/* Cover Image - Enhanced */}
          {currentImageUrl && (
            <div 
              className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-6 cursor-pointer group bg-muted/30"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Preserve current image index instead of resetting to 0
                setImageViewerOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setImageViewerOpen(true);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={getImageUrls.length > 1 ? `Click to view ${getImageUrls.length} images in fullscreen` : 'Click to view image in fullscreen'}
            >
              <img 
                src={currentImageUrl} 
                alt={`${piece.title}${piece.reciter ? ` by ${piece.reciter}` : ''}${category ? ` - ${category.name}` : ''}`}
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] pointer-events-none"
                loading="lazy"
                itemProp="image"
                draggable={false}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.classList.add('bg-muted');
                    parent.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground">Image unavailable</div>';
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white text-xs flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" />
                  {getImageUrls.length > 1 ? `Click to view ${getImageUrls.length} images` : 'Click to view full size'}
                </div>
              </div>
              {getImageUrls.length > 1 && (
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs pointer-events-none">
                  {getImageUrls.length} {getImageUrls.length === 1 ? 'image' : 'images'}
                </div>
              )}
            </div>
          )}
          
          <h1 
            className="font-arabic-heading text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-6 leading-[1.8] md:leading-[1.85] lg:leading-[1.9] break-words"
            style={{
              wordSpacing: '0.15em',
              letterSpacing: '0.03em',
              fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
            }}
            dir="rtl"
          >
            {piece.title}
          </h1>
          
          {/* Meta Info */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {category && (
              <Badge variant="secondary" className="gap-1.5">
                <Bookmark className="w-3 h-3" />
                {category.name}
              </Badge>
            )}
            {imam && (
              <Link to={`/figure/${imam.slug}`}>
                <Badge variant="secondary" className="gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                  <Users className="w-3 h-3" />
                  {imam.name}
                </Badge>
              </Link>
            )}
            {piece.reciter && (
              <Badge variant="outline" className="gap-1.5">
                <User className="w-3 h-3" />
                {piece.reciter}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5">
              <Globe className="w-3 h-3" />
              {piece.language}
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Clock className="w-3 h-3" />
              {readingTime} min read
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <Eye className="w-3 h-3" />
              {piece.view_count} views
            </Badge>
          </div>

          {/* Tags */}
          {piece.tags && piece.tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {piece.tags.map((tag, i) => (
                <span key={i} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Reader utilities: progress + quick outline (only when we have text) */}
        {piece.text_content && piece.text_content.trim().length >= 10 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
            {/* Scroll progress */}
            <div className="flex-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                <span className="text-xs font-medium">
                  {Math.max(1, currentVerse + 1)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Current verse</span>
                  <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-border/60 bg-card hover:bg-muted transition-colors"
                  >
                    <ArrowUp className="w-3 h-3" />
                    Top
                  </button>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((currentVerse + 1) / Math.max(currentVerse + 2, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Outline quick jump (if we have multiple sections discovered) */}
            {outline.length > 1 && (
              <div className="flex items-center gap-2">
                <div className="hidden md:block text-xs text-muted-foreground">
                  Quick jump
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {outline.slice(0, 4).map((item, idx) => (
                    <button
                      key={`${item.index}-${idx}`}
                      type="button"
                      onClick={() => handleJumpToVerse(item.index)}
                      className="inline-flex items-center max-w-[160px] gap-1 px-2.5 py-1.5 rounded-full bg-card border border-border/60 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <ListTree className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media Player(s) */}
        {piece.video_url && (
          <div className="mb-8 space-y-4">
            <div>
              {isOffline ? (
                <div className="bg-card rounded-2xl p-6 text-center text-muted-foreground aspect-video flex items-center justify-center border border-dashed border-border">
                  <p>Video unavailable offline</p>
                </div>
              ) : (
                <VideoPlayer src={piece.video_url} />
              )}
            </div>
          </div>
        )}

        {/* Check if this is a PDF upload (has multiple images and placeholder text) */}
        {(() => {
          const isPDFUpload = getImageUrls.length > 1 && 
            piece.text_content && 
            piece.text_content.includes('Recitation from PDF pages');
          
          // Show PDF-like viewer for multiple images from PDF upload
          if (isPDFUpload && getImageUrls.length > 1) {
            return (
              <article 
                className={`rounded-2xl p-6 md:p-10 lg:p-12 shadow-card border border-border/50 ${getReaderBgClass()} ${
                  !settings.animationsEnabled ? '' : 'transition-all duration-300'
                }`}
              >
                <PDFLikeViewer
                  images={getImageUrls}
                  title={piece.title}
                  onImageClick={(index) => {
                    setCurrentImageIndex(index);
                    setPdfViewerOpen(true);
                  }}
                />
              </article>
            );
          }
          
          return null;
        })()}

        {/* Image-Only Recitation Display (single image) */}
        {currentImageUrl && 
         (!piece.text_content || piece.text_content.trim().length < 10) && 
         !(getImageUrls.length > 1 && piece.text_content && piece.text_content.includes('Recitation from PDF pages')) ? (
          <article 
            className={`rounded-2xl p-6 md:p-10 lg:p-12 shadow-card border border-border/50 ${getReaderBgClass()} ${
              !settings.animationsEnabled ? '' : 'transition-all duration-300'
            }`}
          >
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              {getImageUrls.length > 1 && (
                <div className="flex items-center gap-2 mb-4">
                  {getImageUrls.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        currentImageIndex === index
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Page {index + 1}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative w-full flex justify-center">
                <img 
                  src={currentImageUrl} 
                  alt={`${piece.title} - Page ${currentImageIndex + 1}${piece.reciter ? ` by ${piece.reciter}` : ''}${category ? ` - ${category.name}` : ''}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => {
                    // Preserve current image index instead of resetting to 0
                    setImageViewerOpen(true);
                  }}
                  loading="lazy"
                  itemProp="image"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="text-center text-muted-foreground p-8">Image unavailable</div>';
                    }
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {getImageUrls.length > 1 
                  ? `Click image to view all ${getImageUrls.length} images in full size`
                  : 'Click image to view in full size'}
              </p>
            </div>
          </article>
        ) : null}
        
        {/* Text Content - Reader View with Layout System */}
        {piece.text_content && 
         piece.text_content.trim().length >= 10 && 
         !(getImageUrls.length > 1 && piece.text_content.includes('Recitation from PDF pages')) && (
          <article 
            ref={contentRef}
            className={`rounded-2xl px-4 py-6 md:px-8 md:py-10 lg:px-12 lg:py-12 shadow-card border border-border/40 select-none ${getReaderBgClass()}`}
            dir="rtl"
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              WebkitTouchCallout: 'none',
            } as React.CSSProperties}
          >
            <RecitationLayout
              textContent={piece.text_content}
              title={piece.title}
              reciter={piece.reciter}
              showHeader={false}
              className="max-w-4xl mx-auto"
              fontSize={settings.fontSize}
              lineHeight={settings.lineHeight}
              letterSpacing={settings.letterSpacing}
              fontFamily={getFontFamily()}
              compactMode={settings.compactMode}
              highlightCurrentVerse={settings.highlightCurrentVerse}
              currentVerse={currentVerse}
              showVerseNumbers={settings.showVerseNumbers}
              coupletLayout="two-column"
              onSectionMeta={(meta) => {
                setOutline((prev) => {
                  // Avoid duplicates for same index/title
                  if (prev.some(p => p.index === meta.index && p.title === meta.title)) {
                    return prev;
                  }
                  return [...prev, meta];
                });
              }}
              onVerseRef={(index, el) => {
                verseRefs.current[index] = el;
              }}
            />
          </article>
        )}

        {/* Decorative Element */}
        <div className="flex justify-center my-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-border" />
            <div className="w-3 h-3 rounded-full bg-accent" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-border" />
          </div>
        </div>

        {/* Navigation to siblings */}
        {(siblingPieces.prev || siblingPieces.next) && (
          <div className="flex items-center justify-between gap-4 mt-8">
            {siblingPieces.prev ? (
              <Link
                to={`/piece/${siblingPieces.prev.id}`}
                className="flex-1 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors group"
              >
                <span className="text-xs text-muted-foreground">Previous</span>
                <p className="font-arabic text-lg font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1" dir="rtl">
                  {siblingPieces.prev.title}
                </p>
              </Link>
            ) : <div className="flex-1" />}
            
            {siblingPieces.next ? (
              <Link
                to={`/piece/${siblingPieces.next.id}`}
                className="flex-1 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors text-right group"
              >
                <span className="text-xs text-muted-foreground">Next</span>
                <p className="font-arabic text-lg font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1" dir="rtl">
                  {siblingPieces.next.title}
                </p>
              </Link>
            ) : <div className="flex-1" />}
          </div>
        )}
      </main>

      <Footer />
      
      <SettingsPanel 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />

      {/* Fullscreen PDF Viewer for PDF uploads */}
      {getImageUrls.length > 1 && piece.text_content && piece.text_content.includes('Recitation from PDF pages') && (
        <FullscreenPDFViewer
          images={getImageUrls}
          title={piece.title}
          isOpen={pdfViewerOpen}
          onClose={() => setPdfViewerOpen(false)}
          initialPage={currentImageIndex}
        />
      )}

      {/* Fullscreen Image Viewer for single images */}
      {currentImageUrl && !(getImageUrls.length > 1 && piece.text_content && piece.text_content.includes('Recitation from PDF pages')) && (
        <FullscreenImageViewer
          src={currentImageUrl}
          alt={piece.title}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          images={getImageUrls.length > 1 ? getImageUrls : undefined}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
        />
      )}
    </div>
  );
}

// Utility function
function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle = false;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

