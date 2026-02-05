import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kalaam-reader';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || [];

/** Read body as JSON - works with Web API Request and Node.js IncomingMessage */
async function getJsonBody(req: Request | NodeJS.ReadableStream & { json?: () => Promise<unknown> }): Promise<unknown> {
  if (typeof (req as Request).json === 'function') {
    return (req as Request).json();
  }
  const nodeReq = req as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  return new Promise<unknown>((resolve, reject) => {
    nodeReq.on('data', (chunk: Buffer | Uint8Array) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    nodeReq.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve(text ? JSON.parse(text) : {});
      } catch (e) {
        reject(e);
      }
    });
    nodeReq.on('error', reject);
  });
}

/** Get header value - works with Web API Headers and Node.js IncomingMessage.headers */
function getHeader(headers: Headers | Record<string, string | string[] | undefined>, name: string): string {
  if (!headers) return '';
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) || '';
  }
  const obj = headers as Record<string, string | string[] | undefined>;
  const lower = name.toLowerCase();
  const v = obj[lower] ?? obj[name];
  if (Array.isArray(v)) return v[0] || '';
  return typeof v === 'string' ? v : '';
}

function getCorsHeaders(headers: Headers | Record<string, string | string[] | undefined>): Record<string, string> {
  const origin = getHeader(headers, 'Origin') || '';
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

function createPresignedUrl(bucket: string, key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, { expiresIn });
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
  const corsHeaders = getCorsHeaders(request.headers);

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

    const auth = await verifyUser(getHeader(request.headers, 'authorization') || null);
    const rawUserId = auth?.userId || 'anonymous';
    const userId = rawUserId === 'anonymous'
      ? 'anonymous'
      : String(rawUserId).slice(0, 128).replace(/[^a-zA-Z0-9-]/g, '_');

    const body = (await getJsonBody(request)) as Record<string, unknown>;
    const { filename, contentType, fileSize, pieceId } = body;

    if (!filename || !contentType || !fileSize) {
      return new Response(JSON.stringify({ error: 'Missing required fields: filename, contentType, fileSize' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!isValidAudioContentType(contentType, filename)) {
      return new Response(JSON.stringify({ error: 'Invalid content type. Please upload an audio file.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const r2Key = `audio/${userId}/${timestamp}_${sanitizedFilename}`;

    // Always use direct upload (presigned URL) - matches api-server behavior, works in dev and prod
    const uploadUrl = await createPresignedUrl(R2_BUCKET_NAME!, r2Key, contentType, 3600);

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
          content_type: contentType,
          size_bytes: fileSize,
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
