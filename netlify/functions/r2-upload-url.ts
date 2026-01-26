import { Handler } from '@netlify/functions';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kalaam-audio';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/flac',
];

function getS3Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function verifyUser(authHeader: string | undefined): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = getSupabaseAdmin();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  return { userId: user.id };
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const auth = await verifyUser(event.headers.authorization || event.headers.Authorization);
    if (!auth) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { filename, contentType, fileSize, pieceId } = body;

    if (!filename || !contentType || !fileSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: filename, contentType, fileSize' }),
      };
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}` }),
      };
    }

    if (fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` }),
      };
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const r2Key = `audio/${auth.userId}/${timestamp}_${sanitizedFilename}`;

    const s3 = getS3Client();

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    const supabase = getSupabaseAdmin();
    const { data: audioRecord, error: insertError } = await supabase
      .from('user_audio_files')
      .insert({
        user_id: auth.userId,
        r2_key: r2Key,
        filename: sanitizedFilename,
        content_type: contentType,
        size_bytes: fileSize,
        piece_id: pieceId || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create audio record:', insertError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create audio record' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        uploadUrl,
        r2Key,
        audioId: audioRecord.id,
        expiresIn: 3600,
      }),
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
