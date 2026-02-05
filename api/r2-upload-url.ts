// Edge runtime for fast cold starts - avoids 30s timeout on Node.js + AWS SDK
export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kalaam-reader';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || [];

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode('AWS4' + secretKey).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Create presigned PUT URL for R2 - Edge compatible (no AWS SDK) */
async function createPresignedPutUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

  const canonicalUri = `/${bucket}/${key}`;
  const signedHeaders = 'content-type;host';

  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': signedHeaders,
  };

  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const canonicalRequestHash = toHex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest))
  );

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY!, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  return `${endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin);
  const allowOrigin = isAllowed ? origin : (ALLOWED_ORIGINS[0] || '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = FETCH_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function isValidAudioContentType(contentType: string, filename: string): boolean {
  if (contentType.startsWith('audio/')) return true;
  if (contentType === 'video/mp4' || contentType === 'video/3gpp') return true;
  if (contentType === 'application/octet-stream' || contentType === '') {
    const audioExtensions = [
      '.mp3', '.wav', '.ogg', '.webm', '.aac', '.m4a', '.mp4', '.flac',
      '.opus', '.wma', '.aiff', '.aif', '.amr', '.3gp', '.3gpp', '.3g2',
      '.mid', '.midi', '.mp2', '.ra', '.ram', '.ac3', '.caf', '.mka',
      '.oga', '.spx', '.wv', '.ape', '.alac', '.dts', '.mpc', '.snd', '.au'
    ];
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return audioExtensions.includes(ext);
  }
  return false;
}

async function verifyUser(authHeader: string | null): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;

  try {
    const response = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    });

    if (!response.ok) return null;

    const user = await response.json();
    return user?.id ? { userId: user.id } : null;
  } catch {
    return null;
  }
}

export default async function handler(request: Request) {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return new Response(JSON.stringify({ error: 'R2 credentials not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const auth = await verifyUser(request.headers.get('authorization'));
    const rawUserId = auth?.userId || 'anonymous';
    const userId = rawUserId === 'anonymous'
      ? 'anonymous'
      : String(rawUserId).slice(0, 128).replace(/[^a-zA-Z0-9-]/g, '_');

    const body = await request.json() as Record<string, unknown>;
    const { filename, contentType, fileSize, pieceId } = body;

    if (!filename || !contentType || !fileSize) {
      return new Response(JSON.stringify({ error: 'Missing required fields: filename, contentType, fileSize' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!isValidAudioContentType(String(contentType), String(filename))) {
      return new Response(JSON.stringify({ error: 'Invalid content type. Please upload an audio file.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (Number(fileSize) > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const sanitizedFilename = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const r2Key = `audio/${userId}/${timestamp}_${sanitizedFilename}`;

    const uploadUrl = await createPresignedPutUrl(R2_BUCKET_NAME!, r2Key, String(contentType), 3600);

    if (userId !== 'anonymous') {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return new Response(JSON.stringify({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const insertResponse = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/user_audio_files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: userId,
          r2_key: r2Key,
          filename: sanitizedFilename,
          content_type: String(contentType),
          size_bytes: Number(fileSize),
          piece_id: pieceId || null,
        }),
      });

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        console.error('Failed to create audio record:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to create audio record' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const [audioRecord] = await insertResponse.json();

      return new Response(JSON.stringify({
        uploadUrl,
        r2Key,
        audioId: audioRecord.id,
        expiresIn: 3600,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      uploadUrl,
      r2Key,
      audioId: `anon_${timestamp}`,
      expiresIn: 3600,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating upload URL:', errorMessage, 'Stack:', error instanceof Error ? error.stack : '');
    return new Response(JSON.stringify({
      error: isTimeout ? 'Request timed out. Please try again.' : 'Internal server error',
    }), {
      status: isTimeout ? 504 : 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
