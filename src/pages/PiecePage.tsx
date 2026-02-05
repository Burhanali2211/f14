import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, User, Bookmark, Eye,
  Users, ArrowUp, Heart, Share2, Home, Settings,
  ZoomIn, ZoomOut, RotateCcw, Music, Play, Pause, Volume2, VolumeX,
  FastForward, Rewind, Timer, ScrollText
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SettingsPanel } from '@/components/SettingsPanel';
import { FullscreenImageViewer } from '@/components/FullscreenImageViewer';
import { RecitationLayout } from '@/components/RecitationLayout';
import { SEOHead } from '@/components/SEOHead';
import { EnhancedVideoPlayer } from '@/components/media/EnhancedVideoPlayer';
import { EnhancedImageViewer } from '@/components/media/EnhancedImageViewer';
import { EnhancedPDFViewer } from '@/components/media/EnhancedPDFViewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/hooks/use-settings';
import { useFavorites } from '@/hooks/use-favorites';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import {
  generateMetaDescription,
  generateKeywords,
  generateArticleStructuredData,
  generateBreadcrumbStructuredData,
} from '@/lib/seo-utils';
import { normalizeImageUrl, getFirstImageUrl, getProxiedImageUrls } from '@/lib/utils';
import type { Piece, Category, Imam } from '@/lib/supabase-types';

type MediaType = 'video' | 'images' | 'pdf' | 'text' | 'none';

export default function PiecePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const { addToRecentlyViewed, isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { saveProgress, getProgress } = useReadingProgress();
  
  const [piece, setPiece] = useState<Piece | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [imam, setImam] = useState<Imam | null>(null);
  const [siblingPieces, setSiblingPieces] = useState<{ prev?: Piece; next?: Piece }>({});
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const contentRef = useRef<HTMLDivElement>(null);
    const verseRefs = useRef<(HTMLDivElement | null)[]>([]);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    const [audioStreamUrl, setAudioStreamUrl] = useState<string | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [audioMuted, setAudioMuted] = useState(false);
    const [audioLoading, setAudioLoading] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const favorite = piece ? isFavorite(piece.id) : false;

  const fetchPiece = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    
    try {
        const { data, error } = await safeQuery(async () => {
          const result = await supabase
            .from('pieces')
            .select(`
              id, title, text_content, image_url, video_url, audio_url, reciter, language,
              view_count, created_at, updated_at, category_id, imam_id, tags,
              category:categories(id, name, slug, description),
              imam:imams(id, name, slug, title, description)
            `)
            .eq('id', id)
            .maybeSingle();
          return result;
        });

      if (error || !data) {
        setLoading(false);
        return;
      }

      const typedPiece = data as any;
      setPiece(typedPiece as Piece);

      if (typedPiece.category) {
        setCategory(typedPiece.category as Category);
        
        const { data: siblings } = await safeQuery(async () => {
          const result = await supabase
            .from('pieces')
            .select('id, title, category_id')
            .eq('category_id', typedPiece.category_id)
            .order('title');
          return result;
        });
        
        if (siblings) {
          const currentIndex = siblings.findIndex(s => s.id === id);
          setSiblingPieces({
            prev: currentIndex > 0 ? siblings[currentIndex - 1] as Piece : undefined,
            next: currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] as Piece : undefined,
          });
        }
      }

      if (typedPiece.imam) {
        setImam(typedPiece.imam as Imam);
      }
    } catch (error) {
      logger.error('Error fetching piece:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const incrementViewCount = useCallback(async () => {
    if (id) {
      try {
        await safeQuery(async () => {
          const result = await supabase.rpc('increment_view_count', { piece_id: id });
          return result;
        });
      } catch {}
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPiece();
      incrementViewCount();
      addToRecentlyViewed(id);
    }
  }, [id, fetchPiece, incrementViewCount, addToRecentlyViewed]);

  useEffect(() => {
    if (!settings.rememberReadingPosition || !piece || !id) return;
    const progress = getProgress(id);
    if (progress?.scrollPosition > 0) {
      const timeoutId = setTimeout(() => {
        if (window.scrollY < 100) {
          window.scrollTo({ top: progress.scrollPosition, behavior: 'smooth' });
        }
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [piece, id, getProgress, settings.rememberReadingPosition]);

  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      if (id) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          saveProgress(id, { scrollPosition: window.scrollY, currentVerse });
        }, 500);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [id, currentVerse, saveProgress]);

  useEffect(() => {
    if (!contentRef.current) return;
    const verseElements = Array.from(contentRef.current.querySelectorAll<HTMLElement>('[data-verse-index]'));
    if (verseElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry;
          }
        }
        if (bestEntry?.target instanceof HTMLElement) {
          const indexAttr = bestEntry.target.getAttribute('data-verse-index');
          if (indexAttr !== null) {
            const index = parseInt(indexAttr, 10);
            if (!Number.isNaN(index)) setCurrentVerse(prev => prev !== index ? index : prev);
          }
        }
      },
      { root: null, rootMargin: '0px 0px -40% 0px', threshold: [0.25, 0.5, 0.75] }
    );

    verseElements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [piece?.id, settings.compactMode, settings.fontSize, settings.lineHeight]);

  const handleFavorite = () => {
    if (!piece) return;
    if (favorite) {
      removeFavorite(piece.id);
      toast({ title: "Removed from favorites" });
    } else {
      addFavorite(piece.id);
      toast({ title: "Added to favorites" });
    }
  };

  const handleShare = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: piece?.title, url: window.location.href });
        } catch {}
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link copied!", description: "Share link copied to clipboard" });
      }
    };

    const loadAudioStreamUrl = useCallback(async () => {
      const audioR2Key = (piece as any)?.audio_url;
      if (!audioR2Key || !audioR2Key.startsWith('audio/')) return;
      
      setAudioLoading(true);
      try {
        const proxyUrl = `/api/r2-audio-proxy?key=${encodeURIComponent(audioR2Key)}`;
        setAudioStreamUrl(proxyUrl);
      } catch (error) {
        console.error('Failed to load audio stream URL:', error);
      } finally {
        setAudioLoading(false);
      }
    }, [piece]);

    useEffect(() => {
      if ((piece as any)?.audio_url) {
        loadAudioStreamUrl();
      }
    }, [piece, loadAudioStreamUrl]);

    const toggleAudioPlayback = () => {
      if (audioRef.current) {
        if (isAudioPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        setIsAudioPlaying(!isAudioPlaying);
      }
    };

    const handleAudioTimeUpdate = () => {
      if (audioRef.current) {
        setAudioProgress(audioRef.current.currentTime);
      }
    };

    const handleAudioLoadedMetadata = () => {
      if (audioRef.current) {
        setAudioDuration(audioRef.current.duration);
      }
    };

    const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setAudioProgress(time);
      }
    };

    const formatAudioTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSkipForward = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5);
        setAudioProgress(audioRef.current.currentTime);
      }
    };

    const handleSkipBackward = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
        setAudioProgress(audioRef.current.currentTime);
      }
    };

    const handleSpeedChange = (speed: number) => {
      setPlaybackSpeed(speed);
      if (audioRef.current) {
        audioRef.current.playbackRate = speed;
      }
    };

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeed;
      }
    }, [playbackSpeed, audioStreamUrl, isAudioPlaying]);

  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case 'jameel-noori-nastaleeq': return "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif";
      case 'al-majeed': return "'AlMajeed', serif";
      case 'cairo': return "'Cairo', sans-serif";
      case 'tajawal': return "'Tajawal', sans-serif";
      case 'noto-sans-arabic': return "'Noto Sans Arabic', sans-serif";
      case 'ibm-plex-sans-arabic': return "'IBM Plex Sans Arabic', sans-serif";
      case 'noto-nastaliq': return "'Noto Nastaliq Urdu', serif";
      case 'lateef': return "'Lateef', serif";
      case 'scheherazade': return "'Scheherazade New', serif";
      default: return "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif";
    }
  };

  const getReaderBgClass = () => {
    switch (settings.readerBackground) {
      case 'sepia': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-50';
      case 'dark': return 'bg-zinc-900 text-zinc-100';
      case 'paper': return 'bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100';
      case 'parchment': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-950 dark:text-amber-50';
      case 'cream': return 'bg-amber-50 dark:bg-amber-950/20 text-zinc-900 dark:text-zinc-100';
      case 'night': return 'bg-slate-950 text-slate-100';
      default: return 'bg-card text-foreground';
    }
  };

    const { imageUrls, pdfUrl, primaryMedia } = useMemo(() => {
      const hasVideo = !!piece?.video_url;
      const normalizedUrls = piece?.image_url ? normalizeImageUrl(piece.image_url) : [];
      const images: string[] = [];
      let pdf: string | null = null;
      
        const isPdf = (url: string) => {
          if (!url) return false;
          try {
            const urlObj = new URL(url);
            const path = urlObj.pathname.toLowerCase();
            const search = urlObj.search.toLowerCase();
            
            // Check path and common Supabase storage patterns
            return path.endsWith('.pdf') || 
                   path.includes('.pdf/') || 
                   search.includes('.pdf?') ||
                   url.toLowerCase().includes('.pdf');
          } catch {
            // Fallback if URL is invalid or relative
            const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
            return cleanUrl.endsWith('.pdf') || url.toLowerCase().includes('.pdf');
          }
        };


      for (const url of normalizedUrls) {
        if (isPdf(url)) {
          pdf = url;
        } else {
          images.push(url);
        }
      }

      const proxiedImages = getProxiedImageUrls(images);
      
      let media: MediaType = 'none';
      if (hasVideo) media = 'video';
      else if (pdf) media = 'pdf';
      else if (images.length > 0) media = 'images';
      else if (piece?.text_content && piece.text_content.trim().length >= 10) media = 'text';
      
      return { imageUrls: proxiedImages, pdfUrl: pdf, primaryMedia: media };
    }, [piece?.image_url, piece?.video_url, piece?.text_content]);

  const hasTextContent = piece?.text_content && piece.text_content.trim().length >= 10;

  const seoData = useMemo(() => {
    if (!piece) return null;
    const siteUrl = window.location.origin;
    const pieceUrl = `${siteUrl}/piece/${piece.id}`;
    const firstImageUrl = getFirstImageUrl(piece.image_url);
    const imageUrl = firstImageUrl
      ? (firstImageUrl.startsWith('http') ? firstImageUrl : `${siteUrl}${firstImageUrl}`)
      : `${siteUrl}/main.png`;
    
    return {
      title: piece.title,
      description: generateMetaDescription(piece),
      keywords: generateKeywords(piece, category || undefined, imam || undefined),
      image: imageUrl,
      url: pieceUrl,
      type: 'article' as const,
      author: piece.reciter || undefined,
      publishedTime: piece.created_at,
      modifiedTime: piece.updated_at || piece.created_at,
      category: category?.name,
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          generateArticleStructuredData(piece, category || undefined, imam || undefined, siteUrl),
          generateBreadcrumbStructuredData([
            { name: 'Home', url: '/' },
            ...(category ? [{ name: category.name, url: `/category/${category.slug}` }] : []),
            { name: piece.title, url: `/piece/${piece.id}` },
          ], siteUrl),
        ],
      },
      canonicalUrl: pieceUrl,
    };
  }, [piece, category, imam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-8 max-w-4xl flex-1 px-4">
          <Skeleton className="h-10 w-24 rounded-lg mb-6" />
          <Skeleton className="h-14 w-full mb-6 rounded-xl" />
          <Skeleton className="h-[60vh] w-full mb-6 rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-16 text-center flex-1 px-4">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Bookmark className="w-12 h-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Not Found</h1>
            <p className="text-muted-foreground mb-6">This recitation doesn't exist or has been removed.</p>
            <Button asChild size="lg" className="rounded-xl gap-2">
              <Link to="/" title="Go to Home"><Home className="w-5 h-5" />Go Home</Link>
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
          author={seoData.author}
          publishedTime={seoData.publishedTime}
          modifiedTime={seoData.modifiedTime}
          category={seoData.category}
          structuredData={seoData.structuredData}
          canonicalUrl={seoData.canonicalUrl}
        />
      )}
      
      <Header />
      
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{category?.name || 'Home'}</span>
              <span className="sm:hidden">Back</span>
            </button>

              <div className="flex items-center gap-1.5">
                {(hasTextContent || imageUrls.length > 0 || pdfUrl || (piece as any).audio_url) && (
                  <button
                    onClick={() => navigate(`/piece/${id}/teleprompter`)}
                    className="w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-all active:scale-90"
                    aria-label="Open Teleprompter"
                    title="Open Teleprompter Mode"
                  >
                    <ScrollText className="w-5 h-5" />
                  </button>
                )}
                
                <button
                  onClick={handleFavorite}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                  favorite ? 'bg-red-500/10 text-red-500' : 'bg-secondary hover:bg-secondary/80'
                }`}
                aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-5 h-5 ${favorite ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-90"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-10 h-10 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-90"
                aria-label="Reading Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="container py-6 max-w-4xl flex-1 px-4">
        <header className="mb-6 text-center">
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 leading-relaxed"
            style={{ fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif" }}
            dir="rtl"
          >
            {piece.title}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            {category && (
              <Link to={`/category/${category.slug}`} title={`Browse ${category.name} recitations`}>
                <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Bookmark className="w-3.5 h-3.5" />
                  {category.name}
                </Badge>
              </Link>
            )}
            {imam && (
              <Link to={`/figure/${imam.slug}`} title={`Browse recitations for ${imam.name}`}>
                <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Users className="w-3.5 h-3.5" />
                  {imam.name}
                </Badge>
              </Link>
            )}
            {piece.reciter && (
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3 rounded-lg">
                <User className="w-3.5 h-3.5" />
                {piece.reciter}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 rounded-lg">
              <Eye className="w-3.5 h-3.5" />
              {piece.view_count?.toLocaleString() || 0}
            </Badge>
          </div>
        </header>

          <div className="space-y-8">
            {piece.video_url && (
              <section>
                <EnhancedVideoPlayer src={piece.video_url} title={piece.title} />
              </section>
            )}

            {audioStreamUrl && (
              <section>
                <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Music className="w-4 h-4 text-primary" />
                    <span>Audio Recitation</span>
                  </div>
                  
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={handleSkipBackward}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-all active:scale-90"
                            title="Backward 5s"
                          >
                            <Rewind className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                          </button>
                          
                          <button
                            onClick={toggleAudioPlayback}
                            disabled={audioLoading}
                            className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
                          >
                            {isAudioPlaying ? (
                              <Pause className="w-6 h-6" />
                            ) : (
                              <Play className="w-6 h-6 ml-1" />
                            )}
                          </button>

                          <button
                            onClick={handleSkipForward}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-all active:scale-90"
                            title="Forward 5s"
                          >
                            <FastForward className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                          </button>
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <input
                            type="range"
                            min={0}
                            max={audioDuration || 100}
                            value={audioProgress}
                            onChange={handleAudioSeek}
                            className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                          />
                          <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground font-medium">
                            <span>{formatAudioTime(audioProgress)}</span>
                            <span>{formatAudioTime(audioDuration)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="relative group">
                            <button
                              className="w-10 h-10 rounded-lg bg-secondary hover:bg-secondary/80 flex flex-col items-center justify-center transition-all"
                            >
                              <Timer className="w-3 h-3 mb-0.5" />
                              <span className="text-[10px] font-bold">{playbackSpeed}x</span>
                            </button>
                            <div className="absolute bottom-full mb-2 right-0 hidden group-hover:flex flex-col bg-card border border-border rounded-xl shadow-xl p-1 z-50 min-w-[80px]">
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => handleSpeedChange(speed)}
                                  className={`px-3 py-1.5 text-[11px] font-medium rounded-lg hover:bg-secondary transition-colors text-left ${
                                    playbackSpeed === speed ? 'bg-primary/10 text-primary' : ''
                                  }`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setAudioMuted(!audioMuted);
                              if (audioRef.current) {
                                audioRef.current.muted = !audioMuted;
                              }
                            }}
                            className="w-10 h-10 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all"
                          >
                            {audioMuted ? (
                              <VolumeX className="w-5 h-5" />
                            ) : (
                              <Volume2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  
                  <audio
                    ref={audioRef}
                    src={audioStreamUrl}
                    onTimeUpdate={handleAudioTimeUpdate}
                    onLoadedMetadata={handleAudioLoadedMetadata}
                    onEnded={() => setIsAudioPlaying(false)}
                    onPlay={() => setIsAudioPlaying(true)}
                    onPause={() => setIsAudioPlaying(false)}
                  />
                </div>
              </section>
            )}

            {imageUrls.length > 0 && (
              <section>
                <EnhancedImageViewer
                  images={imageUrls}
                  title={piece.title}
                  onOpenFullscreen={(index) => {
                    setCurrentImageIndex(index);
                    setImageViewerOpen(true);
                  }}
                />
              </section>
            )}


            {pdfUrl && (
              <section>
                <EnhancedPDFViewer
                  pdfUrl={pdfUrl}
                  title={piece.title}
                  onOpenFullscreen={() => window.open(pdfUrl, '_blank')}
                />
              </section>
            )}

          {hasTextContent && (
            <section>
              <div className="flex items-center justify-center gap-3 mb-4">
                <button
                  onClick={() => updateSetting('fontSize', Math.max(16, settings.fontSize - 2))}
                  className="w-11 h-11 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-90"
                  aria-label="Decrease font size"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                
                <div className="px-4 py-2 rounded-xl bg-card border border-border min-w-[60px] text-center">
                  <span className="text-sm font-semibold">{settings.fontSize}</span>
                </div>
                
                <button
                  onClick={() => updateSetting('fontSize', Math.min(40, settings.fontSize + 2))}
                  className="w-11 h-11 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-90"
                  aria-label="Increase font size"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => {
                    updateSetting('fontSize', 24);
                    updateSetting('lineHeight', 2.2);
                  }}
                  className="w-11 h-11 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-90"
                  aria-label="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <article 
                ref={contentRef}
                className={`rounded-2xl px-4 py-6 sm:px-6 sm:py-8 border border-border/40 ${getReaderBgClass()}`}
                dir="rtl"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
              >
                <RecitationLayout
                  textContent={piece.text_content || ''}
                  title={piece.title}
                  reciter={piece.reciter}
                  showHeader={false}
                  className="max-w-3xl mx-auto"
                  fontSize={settings.fontSize}
                  lineHeight={settings.lineHeight}
                  letterSpacing={settings.letterSpacing}
                  fontFamily={getFontFamily()}
                  compactMode={settings.compactMode}
                  highlightCurrentVerse={settings.highlightCurrentVerse}
                  currentVerse={currentVerse}
                  showVerseNumbers={settings.showVerseNumbers}
                  coupletLayout="two-column"
                  onVerseRef={(index, el) => { verseRefs.current[index] = el; }}
                />
              </article>

              <div className="flex justify-center mt-4">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all active:scale-95"
                >
                  <ArrowUp className="w-4 h-4" />
                  Back to top
                </button>
              </div>
            </section>
          )}
        </div>

        {(siblingPieces.prev || siblingPieces.next) && (
          <>
            <div className="flex justify-center my-10">
              <div className="flex items-center gap-3">
                <div className="w-16 h-px bg-gradient-to-r from-transparent to-border" />
                <div className="w-3 h-3 rounded-full bg-primary/30" />
                <div className="w-16 h-px bg-gradient-to-l from-transparent to-border" />
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-3">
              {siblingPieces.prev ? (
                <Link
                  to={`/piece/${siblingPieces.prev.id}`}
                  className="p-4 bg-card rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:shadow-md active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-xs font-medium">Previous</span>
                  </div>
                  <p 
                    className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2" 
                    dir="rtl"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif" }}
                  >
                    {siblingPieces.prev.title}
                  </p>
                </Link>
              ) : <div />}
              
              {siblingPieces.next ? (
                <Link
                  to={`/piece/${siblingPieces.next.id}`}
                  className="p-4 bg-card rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:shadow-md active:scale-[0.98] group text-right"
                >
                  <div className="flex items-center justify-end gap-1.5 text-muted-foreground mb-2">
                    <span className="text-xs font-medium">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <p 
                    className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2" 
                    dir="rtl"
                    style={{ fontFamily: "'Noto Nastaliq Urdu', 'Lateef', 'Cairo', sans-serif" }}
                  >
                    {siblingPieces.next.title}
                  </p>
                </Link>
              ) : <div />}
            </nav>
          </>
        )}
      </main>

      <Footer />
      
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {imageUrls.length > 0 && (
        <FullscreenImageViewer
          src={imageUrls[currentImageIndex] || imageUrls[0]}
          alt={piece.title}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          images={imageUrls.length > 1 ? imageUrls : undefined}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          />
        )}
      </div>
    );
  }
