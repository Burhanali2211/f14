import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kalaam-reader';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_FILE_SIZE = 500 * 1024 * 1024;

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

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_SERVICE_KEY!,
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
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return new Response(JSON.stringify({ error: 'R2 credentials not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const auth = await verifyUser(request.headers.get('authorization'));
    const userId = auth?.userId || 'anonymous';

    const body = await request.json();
    const { filename, contentType, fileSize, pieceId, useProxy } = body;

    if (!filename || !contentType || !fileSize) {
      return new Response(JSON.stringify({ error: 'Missing required fields: filename, contentType, fileSize' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isValidAudioContentType(contentType, filename)) {
      return new Response(JSON.stringify({ error: 'Invalid content type. Please upload an audio file.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const r2Key = `audio/${userId}/${timestamp}_${sanitizedFilename}`;

    if (useProxy) {
      if (userId !== 'anonymous') {
        const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_audio_files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY!,
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
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const [audioRecord] = await insertResponse.json();

        return new Response(JSON.stringify({
          r2Key,
          audioId: audioRecord.id,
          useProxy: true,
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return new Response(JSON.stringify({
        r2Key,
        audioId: `anon_${timestamp}`,
        useProxy: true,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const uploadUrl = await createPresignedUrl(R2_BUCKET_NAME!, r2Key, contentType, 3600);

    if (userId !== 'anonymous') {
      const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_audio_files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY!,
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
          headers: { 'Content-Type': 'application/json' },
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({
      uploadUrl,
      r2Key,
      audioId: `anon_${timestamp}`,
      expiresIn: 3600,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
