import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const SITE_URL = 'https://followersof14.com';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSlug(title: string): string {
  return encodeURIComponent(
    title
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  );
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    const now = new Date().toISOString();

    const [piecesRes, categoriesRes, imamsRes, artistsRes] = await Promise.all([
      supabase.from('pieces').select('id, title, reciter, updated_at, created_at').order('updated_at', { ascending: false }),
      supabase.from('categories').select('id, name, slug, updated_at'),
      supabase.from('imams').select('id, name, slug, updated_at'),
      supabase.from('artists').select('id, name, slug, updated_at'),
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    const staticPages = [
      { path: '/ahlulbayt', priority: '0.8', changefreq: 'weekly' },
      { path: '/calendar', priority: '0.7', changefreq: 'weekly' },
      { path: '/fiqh', priority: '0.7', changefreq: 'weekly' },
      { path: '/contact', priority: '0.5', changefreq: 'monthly' },
    ];

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    if (categoriesRes.data) {
      for (const category of categoriesRes.data) {
        const lastmod = category.updated_at || now;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/category/${escapeXml(category.slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    if (imamsRes.data) {
      for (const imam of imamsRes.data) {
        const lastmod = imam.updated_at || now;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/figure/${escapeXml(imam.slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    if (artistsRes.data) {
      for (const artist of artistsRes.data) {
        const lastmod = artist.updated_at || now;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/artist/${escapeXml(artist.slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    if (piecesRes.data) {
      for (const piece of piecesRes.data) {
        const lastmod = piece.updated_at || piece.created_at || now;
        const titleSlug = generateSlug(piece.title);
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/piece/${escapeXml(piece.id)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += '</urlset>';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Robots-Tag': 'noindex',
      },
      body: xml,
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return {
      statusCode: 500,
      body: 'Error generating sitemap',
    };
  }
};
