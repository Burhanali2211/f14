const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

type NotificationType = 'contact' | 'new_user' | 'upload_request' | 'new_recitation' | 'question';

interface NotificationData {
  [key: string]: any;
}

export async function sendTelegramNotification(
  type: NotificationType,
  data: NotificationData
): Promise<boolean> {
    try {
      const apiUrl = '/.netlify/functions/telegram-notify';

      const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data: {
          ...data,
          chat_id: TELEGRAM_CHAT_ID,
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to send telegram notification:', await response.text());
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error sending telegram notification:', error);
    return false;
  }
}

export async function notifyContact(data: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<boolean> {
  return sendTelegramNotification('contact', data);
}

export async function notifyNewUser(data: {
  full_name: string;
  email: string;
  phone_number?: string;
  address?: string;
}): Promise<boolean> {
  return sendTelegramNotification('new_user', data);
}

export async function notifyUploadRequest(data: {
  user_name: string;
  user_email: string;
  request_type?: string;
  details?: string;
}): Promise<boolean> {
  return sendTelegramNotification('upload_request', data);
}

export async function notifyNewRecitation(data: {
  title: string;
  category?: string;
  language?: string;
  reciter?: string;
  uploader_name?: string;
}): Promise<boolean> {
  return sendTelegramNotification('new_recitation', data);
}

export async function notifyQuestion(data: {
  user_name?: string;
  user_email?: string;
  question: string;
}): Promise<boolean> {
  return sendTelegramNotification('question', data);
}
