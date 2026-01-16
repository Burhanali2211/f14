import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import {
  fetchAllPiecesForSitemap,
  fetchAllCategoriesForSitemap,
  fetchAllImamsForSitemap,
} from '@/lib/seo-db-integration';
import type { Piece, Category, Imam } from '@/lib/supabase-types';

/**
 * Sitemap page - generates XML sitemap dynamically
 * Accessible at /sitemap.xml
 */
export default function SitemapPage() {
  const [sitemap, setSitemap] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSitemap();
  }, []);

  const generateSitemap = async () => {
    try {
      const siteUrl = window.location.origin;
      const now = new Date().toISOString();
      
      // Fetch all pieces, categories, and imams using optimized queries
      const [piecesRes, categoriesRes, imamsRes] = await Promise.all([
        fetchAllPiecesForSitemap(),
        fetchAllCategoriesForSitemap(),
        fetchAllImamsForSitemap(),
      ]);

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Homepage
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}/</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>1.0</priority>\n`;
      xml += `  </url>\n`;
      
      // Categories
      if (categoriesRes.data) {
        (categoriesRes.data as Category[]).forEach((category) => {
          const lastmod = category.updated_at || now;
          xml += `  <url>\n`;
          xml += `    <loc>${siteUrl}/category/${category.slug}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          xml += `  </url>\n`;
        });
      }
      
      // Imams/Figures
      if (imamsRes.data) {
        (imamsRes.data as Imam[]).forEach((imam) => {
          const lastmod = imam.updated_at || now;
          xml += `  <url>\n`;
          xml += `    <loc>${siteUrl}/figure/${imam.slug}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>weekly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          xml += `  </url>\n`;
        });
      }
      
      // Pieces (most important for SEO)
      if (piecesRes.data) {
        (piecesRes.data as Piece[]).forEach((piece) => {
          const lastmod = piece.updated_at || piece.created_at || now;
          xml += `  <url>\n`;
          xml += `    <loc>${siteUrl}/piece/${piece.id}</loc>\n`;
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
          xml += `    <changefreq>monthly</changefreq>\n`;
          xml += `    <priority>0.9</priority>\n`;
          xml += `  </url>\n`;
        });
      }
      
      xml += '</urlset>';
      
      setSitemap(xml);
    } catch (error) {
      logger.error('Error generating sitemap:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Generating sitemap...</p>
        </div>
      </div>
    );
  }

  // Return XML content - browser will handle content type
  return (
    <pre className="whitespace-pre-wrap break-all p-4 text-xs font-mono" style={{ fontFamily: 'monospace' }}>
      {sitemap}
    </pre>
  );
}
