export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SITE_URL = 'https://followersof14.online';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function supabaseQuery(baseUrl: string, anonKey: string, table: string, select: string) {
  const url = `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=updated_at.desc`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) return [];
  return response.json();
}

export default async function handler(request: Request) {
  const supabaseUrl = SUPABASE_URL;
  const supabaseKey = SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return new Response('Missing Supabase configuration', { status: 500 });
  }

  try {
    const now = new Date().toISOString();

    const [pieces, categories, imams, artists] = await Promise.all([
      supabaseQuery(supabaseUrl, supabaseKey, 'pieces', 'id,title,updated_at,created_at'),
      supabaseQuery(supabaseUrl, supabaseKey, 'categories', 'id,name,slug,updated_at'),
      supabaseQuery(supabaseUrl, supabaseKey, 'imams', 'id,name,slug,updated_at'),
      supabaseQuery(supabaseUrl, supabaseKey, 'artists', 'id,name,slug,updated_at'),
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

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
      { path: '/quran', priority: '0.9', changefreq: 'weekly' },
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

    if (Array.isArray(categories)) {
      for (const category of categories) {
        const lastmod = category.updated_at || now;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/category/${escapeXml(category.slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    if (Array.isArray(imams)) {
      for (const imam of imams) {
        const lastmod = imam.updated_at || now;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/figure/${escapeXml(imam.slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    if (Array.isArray(artists)) {
      for (const artist of artists) {
        const lastmod = artist.updated_at || now;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/artist/${escapeXml(artist.slug)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    if (Array.isArray(pieces)) {
      for (const piece of pieces) {
        const lastmod = piece.updated_at || piece.created_at || now;
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/piece/${escapeXml(piece.id)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += '</urlset>';

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
