/**
 * Audio Proxy Edge Function
 * 
 * Proxies audio streams from external sources to avoid CORS issues.
 * Supports various audio formats and sources including:
 * - Direct audio URLs (MP3, OGG, WAV, M4A, etc.)
 * - YouTube audio streams
 * - Other streaming sources
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Type, Content-Length, Accept-Ranges',
};

interface AudioProxyRequest {
  url: string;
  range?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  try {
    // Parse request
    const url = new URL(req.url);
    const audioUrl = url.searchParams.get('url');
    const range = req.headers.get('range');

    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: 'URL parameter is required' }),
        { 
          status: 400, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(audioUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { 
          status: 400, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Security: Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ error: 'Only HTTP/HTTPS URLs are allowed' }),
        { 
          status: 400, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Proxying audio from: ${audioUrl}`);

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Don't compress audio
        'Referer': parsedUrl.origin,
      },
    };

    // Add range header if present (for seeking support)
    if (range) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Range': range,
      };
    }

    // Fetch the audio stream
    const response = await fetch(audioUrl, fetchOptions);

    if (!response.ok) {
      console.error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch audio: ${response.status} ${response.statusText}` 
        }),
        { 
          status: response.status, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get content type from response or infer from URL
    let contentType = response.headers.get('content-type');
    if (!contentType) {
      const extension = parsedUrl.pathname.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'mp3': 'audio/mpeg',
        'ogg': 'audio/ogg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'flac': 'audio/flac',
        'webm': 'audio/webm',
      };
      contentType = mimeTypes[extension || ''] || 'audio/mpeg';
    }

    // Prepare response headers
    const responseHeaders: HeadersInit = {
      ...CORS_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };

    // Handle range requests (for seeking)
    if (range && response.status === 206) {
      const contentRange = response.headers.get('content-range');
      const contentLength = response.headers.get('content-length');
      
      if (contentRange) {
        responseHeaders['Content-Range'] = contentRange;
      }
      if (contentLength) {
        responseHeaders['Content-Length'] = contentLength;
      }
      responseHeaders['Accept-Ranges'] = 'bytes';
    } else {
      // If no range, get content length if available
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        responseHeaders['Content-Length'] = contentLength;
      }
      responseHeaders['Accept-Ranges'] = 'bytes';
    }

    // Stream the audio data
    const audioData = await response.arrayBuffer();

    return new Response(audioData, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('Audio proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to proxy audio', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }
});
