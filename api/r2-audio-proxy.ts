export const config = {
  runtime: 'edge',
};

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kalaam-reader';

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
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createPresignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;
  
  const canonicalUri = `/${bucket}/${key}`;
  
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  });
  
  const canonicalQueryString = queryParams.toString().split('&').sort().join('&');
  
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  
  const canonicalRequest = [
    'GET',
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

export default async function handler(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
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
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return new Response(JSON.stringify({ error: 'R2 credentials not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const url = new URL(request.url);
    const r2Key = url.searchParams.get('key');

    if (!r2Key || !r2Key.startsWith('audio/')) {
      return new Response(JSON.stringify({ error: 'Invalid or missing audio key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const presignedUrl = await createPresignedUrl(R2_BUCKET_NAME!, r2Key, 3600);
    
    const rangeHeader = request.headers.get('Range');
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const r2Response = await fetch(presignedUrl, {
      method: 'GET',
      headers: fetchHeaders,
    });

    if (!r2Response.ok && r2Response.status !== 206) {
      return new Response(JSON.stringify({ error: 'Failed to fetch audio from R2' }), {
        status: r2Response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const contentType = r2Response.headers.get('Content-Type') || 'audio/mpeg';
    const contentLength = r2Response.headers.get('Content-Length');
    const contentRange = r2Response.headers.get('Content-Range');
    const acceptRanges = r2Response.headers.get('Accept-Ranges');

    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      ...corsHeaders,
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }
    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges;
    } else {
      responseHeaders['Accept-Ranges'] = 'bytes';
    }

    return new Response(r2Response.body, {
      status: r2Response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Error proxying audio:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
