import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Users } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { PieceCard } from '@/components/PieceCard';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { generateBreadcrumbStructuredData } from '@/lib/seo-utils';
import type { Piece, Imam } from '@/lib/supabase-types';

export default function FigurePage() {
  const { slug } = useParams<{ slug: string }>();
  const [imam, setImam] = useState<Imam | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      // Optimized: Fetch imam with optimized fields
      const { data: imamData, error: imamError } = await safeQuery(async () =>
        await (supabase as any)
          .from('imams')
          .select('id, name, slug, title, description, order_index, image_url')
          .eq('slug', slug)
          .maybeSingle()
      );

      if (imamError) {
        logger.error('Error fetching imam:', imamError);
      } else if (imamData) {
        setImam(imamData as Imam);

        // Optimized: Fetch pieces with only needed fields
        const { data: piecesData, error: piecesError } = await safeQuery(async () =>
          await supabase
            .from('pieces')
            .select('id, title, image_url, reciter, language, view_count, video_url, created_at, category_id, text_content')
            .eq('imam_id', imamData.id)
            .order('created_at', { ascending: false })
        );

        if (piecesError) {
          logger.error('Error fetching pieces:', piecesError);
        } else if (piecesData) {
          setPieces(piecesData as unknown as Piece[]);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Generate SEO data
  const seoData = useMemo(() => {
    if (!imam) return null;
    
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const figureUrl = `${siteUrl}/figure/${imam.slug}`;
    const imageUrl = imam.image_url 
      ? (imam.image_url.startsWith('http') ? imam.image_url : `${siteUrl}${imam.image_url}`)
      : `${siteUrl}/main.png`;
    
    const description = imam.description || `Browse recitations in honor of ${imam.name}${imam.title ? ` (${imam.title})` : ''} - islamic poetry collection on Kalam Reader.`;
    const keywords = `${imam.name}, ${imam.title || ''}, islamic poetry, Naat, Noha, Dua, Manqabat, Marsiya, ${imam.name} recitations`;
    
    // Generate breadcrumb structured data
    const breadcrumbStructuredData = generateBreadcrumbStructuredData(
      [
        { name: 'Home', url: '/' },
        { name: imam.name, url: `/figure/${imam.slug}` },
      ],
      siteUrl
    );
    
    // Generate Person structured data for imam
    const personStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: imam.name,
      ...(imam.title && { jobTitle: imam.title }),
      ...(imam.description && { description: imam.description }),
      ...(imam.image_url && { image: imageUrl }),
    };
    
    // Generate CollectionPage for pieces
    const collectionStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Recitations in honor of ${imam.name}`,
      description,
      url: figureUrl,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: pieces.length,
        itemListElement: pieces.slice(0, 10).map((piece, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Article',
            name: piece.title,
            url: `${siteUrl}/piece/${piece.id}`,
          },
        })),
      },
    };
    
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [personStructuredData, collectionStructuredData, breadcrumbStructuredData],
    };
    
    return {
      title: `${imam.name}${imam.title ? ` (${imam.title})` : ''} - Recitations | Kalam Reader`,
      description,
      keywords,
      image: imageUrl,
      url: figureUrl,
      type: 'website' as const,
      structuredData,
      canonicalUrl: figureUrl,
    };
  }, [imam, pieces]);

  if (!imam) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Holy Personality not found</h1>
            <Link to="/" className="text-primary hover:underline">
              Go back home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Generate SEO data
  const seoData = useMemo(() => {
    if (!imam) return null;
    
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const figureUrl = `${siteUrl}/figure/${imam.slug}`;
    const imageUrl = imam.image_url 
      ? (imam.image_url.startsWith('http') ? imam.image_url : `${siteUrl}${imam.image_url}`)
      : `${siteUrl}/main.png`;
    
    const description = imam.description || `Browse recitations in honor of ${imam.name}${imam.title ? ` (${imam.title})` : ''} - islamic poetry collection on Kalam Reader.`;
    const keywords = `${imam.name}, ${imam.title || ''}, islamic poetry, Naat, Noha, Dua, Manqabat, Marsiya, ${imam.name} recitations`;
    
    // Generate breadcrumb structured data
    const breadcrumbStructuredData = generateBreadcrumbStructuredData(
      [
        { name: 'Home', url: '/' },
        { name: imam.name, url: `/figure/${imam.slug}` },
      ],
      siteUrl
    );
    
    // Generate Person structured data for imam
    const personStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: imam.name,
      ...(imam.title && { jobTitle: imam.title }),
      ...(imam.description && { description: imam.description }),
      ...(imam.image_url && { image: imageUrl }),
    };
    
    // Generate CollectionPage for pieces
    const collectionStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Recitations in honor of ${imam.name}`,
      description,
      url: figureUrl,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: pieces.length,
        itemListElement: pieces.slice(0, 10).map((piece, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Article',
            name: piece.title,
            url: `${siteUrl}/piece/${piece.id}`,
          },
        })),
      },
    };
    
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [personStructuredData, collectionStructuredData, breadcrumbStructuredData],
    };
    
    return {
      title: `${imam.name}${imam.title ? ` (${imam.title})` : ''} - Recitations | Kalam Reader`,
      description,
      keywords,
      image: imageUrl,
      url: figureUrl,
      type: 'website' as const,
      structuredData,
      canonicalUrl: figureUrl,
    };
  }, [imam, pieces]);

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Head */}
      {seoData && (
        <SEOHead
          title={seoData.title}
          description={seoData.description}
          keywords={seoData.keywords}
          image={seoData.image}
          url={seoData.url}
          type={seoData.type}
          structuredData={seoData.structuredData}
          canonicalUrl={seoData.canonicalUrl}
        />
      )}
      
      <Header />
      
      <main className="container py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                {imam.name}
              </h1>
              {(imam.description || imam.title) && (
                <p className="text-muted-foreground mt-1">{imam.description || imam.title}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {pieces.length} recitation{pieces.length !== 1 ? 's' : ''} in honor of {imam.name}
          </p>
        </div>

        {/* Pieces Grid */}
        {pieces.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pieces.map((piece, index) => (
              <PieceCard key={piece.id} piece={piece} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No recitations found for {imam.name} yet.
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
