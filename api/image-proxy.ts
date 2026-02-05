export const config = {
  runtime: 'edge',
};

/** Allowed origins for image proxying - prevents SSRF and __cf_bm cookie issues */
const ALLOWED_HOSTS = [
  'supabase.co',
  'supabase.in',
];

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || [];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin);
  const allowOrigin = isAllowed ? origin : (ALLOWED_ORIGINS[0] || '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some((h) => parsed.hostname.endsWith(h));
  } catch {
    return false;
  }
}

export default async function handler(request: Request) {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const decodedUrl = decodeURIComponent(targetUrl);
    if (!isAllowedUrl(decodedUrl)) {
      return new Response(JSON.stringify({ error: 'URL not allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const res = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'FollowersOf14-ImageProxy/1.0',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    // Long cache for stable URLs (render URLs include width/height, so immutable per variant)
    const cacheControl = 'public, max-age=604800, s-maxage=31536000, immutable';

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        ...corsHeaders,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error proxying image:', errorMessage, 'Stack:', error instanceof Error ? error.stack : '');
    const isProd = process.env.NODE_ENV === 'production';
    return new Response(JSON.stringify({
      error: 'Internal server error',
      ...(isProd ? {} : { details: errorMessage }),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
