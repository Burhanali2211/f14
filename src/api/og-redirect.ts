export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysacmemkrnmczmtkfqad.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const SITE_URL = 'https://followersof14.com';
const SITE_NAME = 'Followers of 14';
const SITE_ALT_NAME = 'Khanda Azaadars | Lyrics Hub';
const DEFAULT_IMAGE = `${SITE_URL}/main.png`;
const DEFAULT_DESCRIPTION = 'Followers of 14 (Khanda Azaadars, Lyrics Hub) - The #1 destination for Islamic poetry. Find any recitation by name - Naat, Noha, Dua, Manqabat, Marsiya with full text, audio & video.';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

async function supabaseQuery(table: string, select: string, filter: { column: string; value: string }) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&${filter.column}=eq.${encodeURIComponent(filter.value)}&limit=1`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) return null;
  const data = await response.json();
  return data[0] || null;
}

export default async function handler(request: Request) {
  const url = new URL(request.url);

  const pieceMatch = url.pathname.match(/^\/piece\/([a-zA-Z0-9-]+)/);
  const categoryMatch = url.pathname.match(/^\/category\/([a-zA-Z0-9-]+)/);
  const figureMatch = url.pathname.match(/^\/figure\/([a-zA-Z0-9-]+)/);

  let title = SITE_NAME;
  let description = DEFAULT_DESCRIPTION;
  let image = DEFAULT_IMAGE;
  const pageUrl = SITE_URL + url.pathname;

  try {
    if (pieceMatch) {
      const pieceId = pieceMatch[1];
      const piece = await supabaseQuery(
        'pieces',
        'id,title,text_content,image_url,reciter,category:categories(name),imam:imams(name)',
        { column: 'id', value: pieceId }
      );

      if (piece) {
        title = `${piece.title}${piece.reciter ? ` | ${piece.reciter}` : ''} | ${SITE_NAME}`;
        
        const categoryName = piece.category?.name || '';
        const imamName = piece.imam?.name || '';
        const reciter = piece.reciter || '';
        
        let desc = `${piece.title}`;
        if (reciter) desc += ` by ${reciter}`;
        desc += ' - Read complete text, lyrics & audio.';
        if (piece.text_content) {
          const textPreview = piece.text_content.replace(/\n/g, ' ').trim();
          desc += ` "${truncateText(textPreview, 80)}..."`;
        }
        desc += ` Free on ${SITE_NAME}.`;
        description = truncateText(desc, 160);

        if (piece.image_url) {
          const firstImage = piece.image_url.split(',')[0]?.trim();
          if (firstImage && !firstImage.toLowerCase().endsWith('.pdf')) {
            image = firstImage.startsWith('http') ? firstImage : `${SITE_URL}${firstImage}`;
          }
        }
      }
    } else if (categoryMatch) {
      const categorySlug = categoryMatch[1];
      const category = await supabaseQuery(
        'categories',
        'name,description',
        { column: 'slug', value: categorySlug }
      );

      if (category) {
        title = `${category.name} | ${SITE_NAME} | ${SITE_ALT_NAME}`;
        description = category.description || `Browse ${category.name} collection - Complete text, lyrics & audio. Free on ${SITE_NAME}.`;
      }
    } else if (figureMatch) {
      const figureSlug = figureMatch[1];
      const imam = await supabaseQuery(
        'imams',
        'name,title,description',
        { column: 'slug', value: figureSlug }
      );

      if (imam) {
        title = `${imam.name}${imam.title ? ` - ${imam.title}` : ''} | ${SITE_NAME}`;
        description = imam.description || `${imam.name} collection - Complete text, lyrics & audio. Free on ${SITE_NAME}.`;
      }
    }
  } catch (error) {
    console.error('Error fetching data for OG tags:', error);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="Followers of 14, khanda azaadars, lyrics hub, naat, noha, dua, manqabat, marsiya, islamic poetry">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:site_name" content="${SITE_NAME} - ${SITE_ALT_NAME}">
  <meta property="og:locale" content="en_US">
  <meta property="og:locale:alternate" content="ur_PK">
  <meta property="og:locale:alternate" content="ar_SA">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  
  <!-- WhatsApp specific -->
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  
  <link rel="icon" type="image/png" href="${SITE_URL}/main.png">
  <link rel="canonical" href="${escapeHtml(pageUrl)}">
  
  <!-- Redirect real users to the actual page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}">
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(pageUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
