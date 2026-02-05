import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, Filter, Grid3X3, List, SortAsc, 
  ArrowUpDown, Video, Eye, ArrowUpRight, X, Play, Headphones
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PieceCard } from '@/components/PieceCard';
import { SearchBar } from '@/components/SearchBar';
import { VirtualizedPieceList } from '@/pages/CategoryPageVirtualized';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  generateCollectionPageStructuredData,
  generateBreadcrumbStructuredData,
} from '@/lib/seo-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { getTextAlignmentClass, getTextDirection, getKarbalaPlaceholder, getFirstImageUrl, getProxiedImageUrl } from '@/lib/utils';
import type { Category, Piece } from '@/lib/supabase-types';

type SortOption = 'title' | 'recent' | 'popular' | 'reciter';
type ViewMode = 'grid' | 'list';

const PAGE_SIZE = 10;

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [reciters, setReciters] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedReciter, setSelectedReciter] = useState<string>('all');
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  const sortFromUrl = (searchParams.get('sort') as SortOption) || 'recent';
  const isAllCategory = slug === 'all';

  const fetchCategory = useCallback(async (append = false, appendOffset = 0) => {
    const effectiveSort = append ? sortBy : (searchParams.get('sort') as SortOption) || 'recent';
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      logger.debug('Fetching category:', slug);

      if (isAllCategory) {
        setCategory({ id: '__all__', name: 'All Recitations', slug: 'all', description: null } as Category);
        const orderCol = effectiveSort === 'popular' ? 'view_count' : effectiveSort === 'recent' ? 'created_at' : 'title';
        const ascending = effectiveSort === 'title' || effectiveSort === 'reciter';
        const offset = append ? appendOffset : 0;

        const { data: piecesData, error: piecesError } = await safeQuery(async () => {
          const result = await supabase
            .from('pieces')
            .select('id, title, image_url, reciter, language, view_count, video_url, created_at, category_id, text_content')
            .order(orderCol, { ascending })
            .range(offset, offset + PAGE_SIZE - 1);
          return result;
        });

        if (piecesError) {
          logger.error('Error fetching pieces:', piecesError);
        } else if (piecesData) {
          const typedPieces = (piecesData as Piece[]) || [];
          setPieces(append ? (prev) => [...prev, ...typedPieces] : typedPieces);
          setHasMore(typedPieces.length === PAGE_SIZE);
          if (!append) {
            setLanguages([...new Set(typedPieces.map((p: Piece) => p.language))]);
            setReciters([...new Set(typedPieces.map((p: Piece) => p.reciter).filter(Boolean))] as string[]);
          }
        }
      } else {
        const { data: catData, error: catError } = await safeQuery(async () => {
          const result = await supabase
            .from('categories')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();
          return result;
        });

        if (catError) {
          logger.error('Error fetching category:', catError);
          setLoading(false);
          return;
        }

        if (!catData) {
          logger.warn('Category not found:', slug);
          setLoading(false);
          return;
        }

        logger.debug('Category loaded:', catData.name);
        setCategory(catData as Category);

        const { data: piecesData, error: piecesError } = await safeQuery(async () => {
          const result = await supabase
            .from('pieces')
            .select('id, title, image_url, reciter, language, view_count, video_url, created_at, category_id, text_content')
            .eq('category_id', catData.id);
          return result;
        });

        if (piecesError) {
          logger.error('Error fetching pieces:', piecesError);
        } else if (piecesData) {
          const typedPieces = piecesData as Piece[];
          setPieces(typedPieces);
          setHasMore(false);
          setLanguages([...new Set(typedPieces.map(p => p.language))]);
          setReciters([...new Set(typedPieces.map(p => p.reciter).filter(Boolean))] as string[]);
        }
      }
    } catch (error) {
      logger.error('Unexpected error in fetchCategory:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [slug, isAllCategory, sortBy, searchParams]);

  useEffect(() => {
    if (slug) {
      setSortBy(sortFromUrl);
      fetchCategory();
    }
  }, [slug, fetchCategory]);

  const piecesRef = useRef<Piece[]>([]);
  piecesRef.current = pieces;

  const loadMore = useCallback(() => {
    if (isAllCategory && hasMore && !loadingMore) {
      fetchCategory(true, piecesRef.current.length);
    }
  }, [isAllCategory, hasMore, loadingMore, fetchCategory]);

  const filteredPieces = useMemo(() => {
    let filtered = [...pieces];

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(p => p.language === selectedLanguage);
    }

    if (selectedReciter !== 'all') {
      filtered = filtered.filter(p => p.reciter === selectedReciter);
    }

    if (hasVideo === true) {
      filtered = filtered.filter(p => p.video_url);
    } else if (hasVideo === false) {
      filtered = filtered.filter(p => !p.video_url);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.reciter?.toLowerCase().includes(query) ||
        p.text_content.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popular':
          return b.view_count - a.view_count;
        case 'reciter':
          return (a.reciter || '').localeCompare(b.reciter || '');
        case 'title':
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return filtered;
  }, [pieces, selectedLanguage, selectedReciter, hasVideo, searchQuery, sortBy]);

  const clearFilters = useCallback(() => {
    setSelectedLanguage('all');
    setSelectedReciter('all');
    setHasVideo(null);
    setSearchQuery('');
    setSortBy('title');
  }, []);

  const hasActiveFilters = useMemo(() => 
    selectedLanguage !== 'all' || 
    selectedReciter !== 'all' || 
    hasVideo !== null ||
    searchQuery.trim() !== '',
    [selectedLanguage, selectedReciter, hasVideo, searchQuery]
  );

  const stats = useMemo(() => ({
    total: filteredPieces.length,
    withVideo: filteredPieces.filter(p => p.video_url).length,
    totalViews: filteredPieces.reduce((sum, p) => sum + p.view_count, 0),
  }), [filteredPieces]);

  const seoData = useMemo(() => {
    if (!category) return null;
    
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const categoryUrl = `${siteUrl}/category/${category.slug}`;
    const imageUrl = category.bg_image_url 
      ? (category.bg_image_url.startsWith('http') ? category.bg_image_url : `${siteUrl}${category.bg_image_url}`)
      : `${siteUrl}/main.png`;
    
    const description = category.description || `Browse ${category.name} - Complete Islamic poetry collection on Followers of 14. Read ${category.name} with text, audio, and video. Free access to the best ${category.name} recitations online.`;
    const keywords = `${category.name}, ${category.name} collection, islamic poetry, Naat, Noha, Dua, Manqabat, Marsiya, Followers of 14, read ${category.name} online, free ${category.name}, ${category.name} recitation`;
    
    const collectionStructuredData = generateCollectionPageStructuredData(
      category,
      filteredPieces,
      siteUrl
    );
    
    const breadcrumbStructuredData = generateBreadcrumbStructuredData(
      [
        { name: 'Home', url: '/' },
        { name: category.name, url: `/category/${category.slug}` },
      ],
      siteUrl
    );
    
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [collectionStructuredData, breadcrumbStructuredData],
    };
    
    return {
      title: `${category.name} - Complete Collection | Followers of 14`,
      description,
      keywords,
      image: imageUrl,
      url: categoryUrl,
      type: 'website' as const,
      category: category.name,
      structuredData,
      canonicalUrl: categoryUrl,
    };
  }, [category, filteredPieces]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-8 flex-1 px-4">
          <Skeleton className="h-12 w-40 mb-6 rounded-xl" />
          <Skeleton className="h-14 w-72 mb-4 rounded-xl" />
          <Skeleton className="h-8 w-96 mb-8 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-16 text-center flex-1 px-4">
          <div className="max-w-md mx-auto">
            <h1 className="font-display text-3xl font-bold mb-4">Category Not Found</h1>
            <p className="text-muted-foreground mb-8">The category you're looking for doesn't exist.</p>
            <Button asChild size="lg" className="h-14 px-8 text-lg rounded-xl">
              <Link to="/" title="Go to Home">
                <ChevronLeft className="w-5 h-5 mr-2" />
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
      {seoData && (
        <SEOHead
          title={seoData.title}
          description={seoData.description}
          keywords={seoData.keywords}
          image={seoData.image}
          url={seoData.url}
          type={seoData.type}
          category={seoData.category}
          structuredData={seoData.structuredData}
          canonicalUrl={seoData.canonicalUrl}
        />
      )}
      
      <Header />
      
      <main className="container py-6 sm:py-8 flex-1 px-4 sm:px-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 py-2 px-3 -ml-3 rounded-xl hover:bg-secondary/50 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 
            className={`font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 ${getTextAlignmentClass(category.name)}`}
            dir={getTextDirection(category.name)}
          >
            {category.name}
          </h1>
          {category.description && (
            <p 
              className={`text-muted-foreground text-lg sm:text-xl mb-6 ${getTextAlignmentClass(category.description)}`}
              dir={getTextDirection(category.description)}
            >
              {category.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="gap-2 py-2 px-4 text-base rounded-xl">
              <SortAsc className="w-4 h-4" />
              {stats.total} pieces
            </Badge>
            {stats.withVideo > 0 && (
              <Badge variant="outline" className="gap-2 py-2 px-4 text-base rounded-xl">
                <Video className="w-4 h-4" />
                {stats.withVideo} with video
              </Badge>
            )}
            <Badge variant="outline" className="gap-2 py-2 px-4 text-base rounded-xl">
              <Eye className="w-4 h-4" />
              {stats.totalViews.toLocaleString()} views
            </Badge>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar 
                onSearch={setSearchQuery}
                placeholder={`Search in ${category.name}...`}
                initialValue={searchQuery}
              />
            </div>
            
            <div className="flex gap-3">
              <div className="inline-flex items-center bg-card rounded-xl p-1.5 border border-border/50 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-12 w-12 sm:h-11 sm:w-auto sm:px-4 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-secondary/50 text-muted-foreground'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="w-5 h-5" />
                  <span className="hidden sm:inline ml-2">Grid</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-12 w-12 sm:h-11 sm:w-auto sm:px-4 rounded-lg transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-secondary/50 text-muted-foreground'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-5 h-5" />
                  <span className="hidden sm:inline ml-2">List</span>
                </Button>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-12 sm:h-11 px-4 gap-2 rounded-xl">
                    <ArrowUpDown className="w-5 h-5" />
                    <span className="hidden sm:inline">Sort</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px] rounded-xl p-2">
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy('title');
                      if (isAllCategory) {
                        setSearchParams({ sort: 'title' });
                        fetchCategory();
                      }
                    }}
                    className="cursor-pointer h-12 rounded-lg text-base"
                  >
                    Title (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy('recent');
                      if (isAllCategory) {
                        setSearchParams({ sort: 'recent' });
                        fetchCategory();
                      }
                    }}
                    className="cursor-pointer h-12 rounded-lg text-base"
                  >
                    Recently Added
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy('popular');
                      if (isAllCategory) {
                        setSearchParams({ sort: 'popular' });
                        fetchCategory();
                      }
                    }}
                    className="cursor-pointer h-12 rounded-lg text-base"
                  >
                    Most Popular
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy('reciter');
                      if (isAllCategory) {
                        setSearchParams({ sort: 'reciter' });
                        fetchCategory();
                      }
                    }}
                    className="cursor-pointer h-12 rounded-lg text-base"
                  >
                    By Reciter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(languages.length > 1 || reciters.length > 0) && (
            <div className="flex flex-wrap gap-3">
              {languages.length > 1 && (
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-[160px] h-12 rounded-xl text-base">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="h-12 text-base">All Languages</SelectItem>
                    {languages.map(lang => (
                      <SelectItem key={lang} value={lang} className="h-12 text-base">{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {reciters.length > 0 && (
                <Select value={selectedReciter} onValueChange={setSelectedReciter}>
                  <SelectTrigger className="w-[180px] h-12 rounded-xl text-base">
                    <SelectValue placeholder="Reciter" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="h-12 text-base">All Reciters</SelectItem>
                    {reciters.map(reciter => (
                      <SelectItem key={reciter} value={reciter} className="h-12 text-base">{reciter}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                variant={hasVideo === true ? 'default' : 'outline'}
                onClick={() => setHasVideo(hasVideo === true ? null : true)}
                className="h-12 px-5 gap-2 rounded-xl text-base"
              >
                <Video className="w-5 h-5" />
                With Video
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="h-12 px-4 gap-2 rounded-xl text-base text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {filteredPieces.length > 0 ? (
          filteredPieces.length > 30 ? (
            <VirtualizedPieceList 
              pieces={filteredPieces} 
              viewMode={viewMode}
              itemHeight={viewMode === 'list' ? 140 : 320}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredPieces.map((piece, i) => (
                <PieceCard key={piece.id} piece={piece} index={i} compact={true} />
              ))}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredPieces.map((piece, i) => {
                const isRTL = getTextDirection(piece.title) === 'rtl';
                const textAlign = getTextAlignmentClass(piece.title);
                const hasAudio = !!piece.audio_url;
                const hasVideoContent = !!piece.video_url;
                
                return (
                  <Link
                    key={piece.id}
                    to={`/piece/${piece.id}`}
                    className="group flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-card hover:bg-secondary/30 border-2 border-border/40 hover:border-primary/40 transition-all duration-300 hover:shadow-lg active:scale-[0.99] animate-slide-up opacity-0"
                    style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'forwards' }}
                  >
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl overflow-hidden flex-shrink-0 shadow-md group-hover:shadow-lg transition-all duration-300">
                      <img 
                        src={getProxiedImageUrl(getFirstImageUrl(piece.image_url)) || getKarbalaPlaceholder(piece.id)} 
                        alt={piece.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getKarbalaPlaceholder(piece.id);
                        }}
                      />
                      
                      {(hasVideoContent || hasAudio) && (
                        <div className="absolute top-2 right-2">
                          <div className={`w-8 h-8 rounded-lg ${hasVideoContent ? 'bg-accent/90' : 'bg-primary/90'} backdrop-blur-sm flex items-center justify-center`}>
                            {hasVideoContent ? (
                              <Video className="w-4 h-4 text-white" />
                            ) : (
                              <Headphones className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 
                        className={`font-arabic-heading text-lg sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-[2.0] line-clamp-2 mb-2 ${textAlign}`}
                        style={{
                          fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif",
                        }}
                        dir={getTextDirection(piece.title)}
                      >
                        {piece.title}
                      </h3>
                      
                      <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {piece.reciter && (
                          <Badge variant="secondary" className="text-sm px-3 py-1 rounded-lg">
                            {piece.reciter}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-sm px-3 py-1 rounded-lg">
                          {piece.language}
                        </Badge>
                        {piece.view_count > 0 && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            <span>{piece.view_count.toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-all duration-300">
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 text-primary group-hover:text-white transition-colors" fill="currentColor" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : null}

        {filteredPieces.length > 0 && isAllCategory && hasMore && (
          <div className="flex justify-center mt-10">
            <Button
              variant="outline"
              size="lg"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-xl px-8 h-12"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}

        {filteredPieces.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border-2 border-dashed border-border">
            <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              {hasActiveFilters ? 'No matches found' : 'No recitations yet'}
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              {hasActiveFilters 
                ? 'Try adjusting your filters'
                : 'Recitations will appear here once added'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} size="lg" className="h-12 px-6 rounded-xl">
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
