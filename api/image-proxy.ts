export const config = {
  runtime: 'edge',
};

/** Allowed origins for image proxying - prevents SSRF and __cf_bm cookie issues */
const ALLOWED_HOSTS = [
  'supabase.co',
  'supabase.in',
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some((h) => parsed.hostname.endsWith(h));
  } catch {
    return false;
  }
}

export default async function handler(request: Request) {
  const corsHeaders: HeadersInit = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

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
    const cacheControl = res.headers.get('Cache-Control') || 'public, max-age=86400, s-maxage=604800';

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
