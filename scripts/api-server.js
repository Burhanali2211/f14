import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kalaam-reader';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

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

async function hmacSha256(key, message) {
  const crypto = await import('crypto');
  return crypto.createHmac('sha256', key).update(message).digest();
}

async function getSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = await hmacSha256('AWS4' + secretKey, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function toHex(buffer) {
  return buffer.toString('hex');
}

async function createPresignedUrl(bucket, key, method, contentType, expiresIn = 3600) {
  const crypto = await import('crypto');
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
    'X-Amz-SignedHeaders': 'content-type;host',
  });
  
  const canonicalQueryString = queryParams.toString().split('&').sort().join('&');
  
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  
  const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));
  
  return `${endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

async function verifyUser(authHeader) {
  if (!authHeader?.startsWith('Bearer ') || !supabase) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { userId: user.id };
  } catch {
    return null;
  }
}

app.post('/api/r2-upload-url', async (req, res) => {
  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return res.status(500).json({ error: 'R2 credentials not configured' });
    }

    const auth = await verifyUser(req.headers.authorization);
    const userId = auth?.userId || 'anonymous';

    const { filename, contentType, fileSize, pieceId } = req.body;

    if (!filename || !contentType || !fileSize) {
      return res.status(400).json({ error: 'Missing required fields: filename, contentType, fileSize' });
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return res.status(400).json({ error: `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}` });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({ error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` });
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const r2Key = `audio/${userId}/${timestamp}_${sanitizedFilename}`;

    const uploadUrl = await createPresignedUrl(R2_BUCKET_NAME, r2Key, 'PUT', contentType, 3600);

    if (userId !== 'anonymous' && supabase) {
      const { data: audioRecord, error: insertError } = await supabase
        .from('user_audio_files')
        .insert({
          user_id: userId,
          r2_key: r2Key,
          filename: sanitizedFilename,
          content_type: contentType,
          size_bytes: fileSize,
          piece_id: pieceId || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create audio record:', insertError);
        return res.status(500).json({ error: 'Failed to create audio record' });
      }

      return res.json({
        uploadUrl,
        r2Key,
        audioId: audioRecord.id,
        expiresIn: 3600,
      });
    }

    return res.json({
      uploadUrl,
      r2Key,
      audioId: `anon_${timestamp}`,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/r2-stream-url', async (req, res) => {
  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return res.status(500).json({ error: 'R2 credentials not configured' });
    }

    const { audioId, r2Key } = req.body;

    let key = r2Key;
    
    if (!key && audioId && supabase) {
      const { data: audioRecord, error } = await supabase
        .from('user_audio_files')
        .select('r2_key')
        .eq('id', audioId)
        .single();

      if (error || !audioRecord) {
        return res.status(404).json({ error: 'Audio file not found' });
      }
      key = audioRecord.r2_key;
    }

    if (!key) {
      return res.status(400).json({ error: 'Missing audioId or r2Key' });
    }

    const streamUrl = await createPresignedUrl(R2_BUCKET_NAME, key, 'GET', 'audio/mpeg', 3600);

    return res.json({ streamUrl });
  } catch (error) {
    console.error('Error generating stream URL:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/r2-delete', async (req, res) => {
  try {
    const auth = await verifyUser(req.headers.authorization);
    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { audioId } = req.body;
    if (!audioId || !supabase) {
      return res.status(400).json({ error: 'Missing audioId' });
    }

    const { data: audioRecord, error: fetchError } = await supabase
      .from('user_audio_files')
      .select('r2_key, user_id')
      .eq('id', audioId)
      .single();

    if (fetchError || !audioRecord) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    if (audioRecord.user_id !== auth.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    const { error: deleteError } = await supabase
      .from('user_audio_files')
      .delete()
      .eq('id', audioId);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete audio record' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting audio:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3001;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function formatContactMessage(data) {
  return `📬 *NEW CONTACT MESSAGE*
  
👤 *Name:* ${escapeMarkdown(data.name || 'Unknown')}
📧 *Email:* ${escapeMarkdown(data.email || 'Not provided')}
📝 *Subject:* ${escapeMarkdown(data.subject || 'No subject')}

💬 *Message:*
${escapeMarkdown(data.message || 'No message')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

function formatNewUserMessage(data) {
  return `🎉 *NEW USER REGISTERED*

👤 *Name:* ${escapeMarkdown(data.full_name || 'Unknown')}
📧 *Email:* ${escapeMarkdown(data.email || 'Not provided')}
📱 *Phone:* ${escapeMarkdown(data.phone_number || 'Not provided')}
📍 *Address:* ${escapeMarkdown(data.address || 'Not provided')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

function formatUploadRequestMessage(data) {
  return `📤 *UPLOAD REQUEST*

👤 *User:* ${escapeMarkdown(data.user_name || 'Unknown')}
📧 *Email:* ${escapeMarkdown(data.user_email || 'Not provided')}
📝 *Request:* ${escapeMarkdown(data.request_type || 'General')}

💬 *Details:*
${escapeMarkdown(data.details || 'No details provided')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

function formatNewRecitationMessage(data) {
  return `📖 *NEW RECITATION ADDED*

📌 *Title:* ${escapeMarkdown(data.title || 'Untitled')}
🏷️ *Category:* ${escapeMarkdown(data.category || 'Unknown')}
🌐 *Language:* ${escapeMarkdown(data.language || 'Unknown')}
🎤 *Reciter:* ${escapeMarkdown(data.reciter || 'Unknown')}
👤 *Uploaded by:* ${escapeMarkdown(data.uploader_name || 'Unknown')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

function formatQuestionMessage(data) {
  return `❓ *NEW QUESTION*

👤 *From:* ${escapeMarkdown(data.user_name || 'Anonymous')}
📧 *Email:* ${escapeMarkdown(data.user_email || 'Not provided')}

💬 *Question:*
${escapeMarkdown(data.question || 'No question')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

async function sendTelegramMessage(chatId, message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error:', errorText);
      
      const fallbackResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.replace(/[\\*_`\[\]()~>#+=|{}.!-]/g, ''),
          disable_web_page_preview: true,
        }),
      });
      
      return fallbackResponse.ok;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

app.post('/api/telegram-notify', async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Telegram credentials not configured');
      return res.status(500).json({ error: 'Telegram not configured' });
    }

    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Missing type or data' });
    }

    let message;
    
    switch (type) {
      case 'contact':
        message = formatContactMessage(data);
        break;
      case 'new_user':
        message = formatNewUserMessage(data);
        break;
      case 'upload_request':
        message = formatUploadRequestMessage(data);
        break;
      case 'new_recitation':
        message = formatNewRecitationMessage(data);
        break;
      case 'question':
        message = formatQuestionMessage(data);
        break;
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }

    const success = await sendTelegramMessage(TELEGRAM_CHAT_ID, message);

    return res.status(success ? 200 : 500).json({ success });
  } catch (error) {
    console.error('Error processing telegram notification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sitemap', async (req, res) => {
  res.set('Content-Type', 'application/xml');
  res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>http://localhost:8000/</loc></url></urlset>');
});

app.get('/api/og-redirect', async (req, res) => {
  res.redirect('http://localhost:8000' + (req.query.path || '/'));
});

app.listen(PORT, () => {
  console.log(`✓ API server running on http://localhost:${PORT}`);
});
