export const config = {
  runtime: 'edge',
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || [];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin);
  const allowOrigin = isAllowed ? origin : (ALLOWED_ORIGINS[0] || '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
  };
}

interface TelegramPayload {
  type: 'contact' | 'new_user' | 'upload_request' | 'new_recitation' | 'question';
  data: Record<string, unknown>;
}

function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function formatContactMessage(data: Record<string, unknown>): string {
  return `📬 *NEW CONTACT MESSAGE*

👤 *Name:* ${escapeMarkdown(data.name || 'Unknown')}
📧 *Email:* ${escapeMarkdown(data.email || 'Not provided')}
📝 *Subject:* ${escapeMarkdown(data.subject || 'No subject')}

💬 *Message:*
${escapeMarkdown(data.message || 'No message')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

function formatNewUserMessage(data: Record<string, unknown>): string {
  return `🎉 *NEW USER REGISTERED*

👤 *Name:* ${escapeMarkdown(data.full_name || 'Unknown')}
📧 *Email:* ${escapeMarkdown(data.email || 'Not provided')}
📱 *Phone:* ${escapeMarkdown(data.phone_number || 'Not provided')}
📍 *Address:* ${escapeMarkdown(data.address || 'Not provided')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

function formatUploadRequestMessage(data: Record<string, unknown>): string {
  return `📤 *UPLOAD REQUEST*

👤 *User:* ${escapeMarkdown(data.user_name || 'Unknown')}
📧 *Email:* ${escapeMarkdown(data.user_email || 'Not provided')}
📝 *Request:* ${escapeMarkdown(data.request_type || 'General')}

💬 *Details:*
${escapeMarkdown(data.details || 'No details provided')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

function formatNewRecitationMessage(data: Record<string, unknown>): string {
  return `📖 *NEW RECITATION ADDED*

📌 *Title:* ${escapeMarkdown(data.title || 'Untitled')}
🏷️ *Category:* ${escapeMarkdown(data.category || 'Unknown')}
🌐 *Language:* ${escapeMarkdown(data.language || 'Unknown')}
🎤 *Reciter:* ${escapeMarkdown(data.reciter || 'Unknown')}
👤 *Uploaded by:* ${escapeMarkdown(data.uploader_name || 'Unknown')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

function formatQuestionMessage(data: Record<string, unknown>): string {
  return `❓ *NEW QUESTION*

👤 *From:* ${escapeMarkdown(data.user_name || 'Anonymous')}
📧 *Email:* ${escapeMarkdown(data.user_email || 'Not provided')}

💬 *Question:*
${escapeMarkdown(data.question || 'No question')}

⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;
}

async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
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
          // eslint-disable-next-line no-useless-escape -- [ and ] must be escaped in character class
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
      if (TELEGRAM_WEBHOOK_SECRET) {
        const providedSecret = request.headers.get('x-webhook-secret');
        if (providedSecret !== TELEGRAM_WEBHOOK_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      }

      if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Telegram credentials not configured');
        return new Response(JSON.stringify({ error: 'Telegram not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const body: TelegramPayload = await request.json();
    const { type, data } = body;

    if (!type || !data) {
        return new Response(JSON.stringify({ error: 'Missing type or data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

    let message: string;
    
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
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    const success = await sendTelegramMessage(TELEGRAM_CHAT_ID!, message);

    return new Response(JSON.stringify({ success }), {
      status: success ? 200 : 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing telegram notification:', errorMessage, 'Stack:', error instanceof Error ? error.stack : '');
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
