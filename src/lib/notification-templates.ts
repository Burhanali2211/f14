import type { EventType } from './supabase-types';

export interface NotificationTemplate {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag: string;
  vibrate: number[];
  image?: string;
  requireInteraction: boolean;
  data: {
    url: string;
    type: 'announcement';
    eventType: string;
    [key: string]: any;
  };
}

export interface AnnouncementData {
  title: string;
  message: string;
  eventType?: EventType | 'general';
  imamName?: string;
  imamId?: string | null;
  imamSlug?: string | null;
  eventDate?: string;
  hijriDate?: string;
  additionalInfo?: string;
  thumbnailUrl?: string | null;
}

/**
 * Get notification template based on event type
 */
export function getNotificationTemplate(
  announcement: AnnouncementData,
  announcementId: string
): NotificationTemplate {
  const eventType = announcement.eventType || 'general';
  const imamName = announcement.imamName || '';
  const imamId = announcement.imamId || null;
  const imamSlug = announcement.imamSlug || null;
  const eventDate = announcement.eventDate || '';
  const hijriDate = announcement.hijriDate || '';
  const thumbnailUrl = announcement.thumbnailUrl;

  switch (eventType) {
    case 'birthday':
      return getBirthdayTemplate(announcement, announcementId, imamName, imamId, imamSlug, eventDate, hijriDate, thumbnailUrl);
    
    case 'martyrdom':
      return getMartyrdomTemplate(announcement, announcementId, imamName, imamId, imamSlug, eventDate, hijriDate, thumbnailUrl);
    
    case 'death':
      return getDeathTemplate(announcement, announcementId, imamName, imamId, imamSlug, eventDate, hijriDate, thumbnailUrl);
    
    case 'other':
      return getOtherEventTemplate(announcement, announcementId, imamName, imamId, imamSlug, eventDate, hijriDate, thumbnailUrl);
    
    default:
      return getGeneralTemplate(announcement, announcementId, imamId, imamSlug, thumbnailUrl);
  }
}

function getBirthdayTemplate(
  announcement: AnnouncementData,
  id: string,
  imamName: string,
  imamId: string | null,
  imamSlug: string | null,
  eventDate: string,
  hijriDate: string,
  thumbnailUrl?: string | null
): NotificationTemplate {
  const title = imamName 
    ? `🎂 Birth Anniversary: ${imamName}`
    : announcement.title || 'Birth Anniversary';
  
  let body = announcement.message;
  if (imamName && eventDate) {
    body = `${imamName}'s birth anniversary is approaching.\n\n${announcement.message}`;
    if (hijriDate) {
      body += `\n\n📅 Date: ${eventDate} (${hijriDate})`;
    } else if (eventDate) {
      body += `\n\n📅 Date: ${eventDate}`;
    }
  }

  // Determine URL: if imam slug exists, navigate to their recitations page
  const url = imamSlug ? `/figure/${imamSlug}` : '/calendar';

  return {
    title,
    body,
    icon: thumbnailUrl || '/main.png',
    badge: '/main.png',
    image: thumbnailUrl || undefined,
    tag: `birthday-${id}`,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: false,
    data: {
      url,
      type: 'announcement',
      eventType: 'birthday',
      announcementId: id,
      imamId,
      imamSlug,
      imamName,
      eventDate,
      hijriDate
    }
  };
}

function getMartyrdomTemplate(
  announcement: AnnouncementData,
  id: string,
  imamName: string,
  imamId: string | null,
  imamSlug: string | null,
  eventDate: string,
  hijriDate: string,
  thumbnailUrl?: string | null
): NotificationTemplate {
  const title = imamName
    ? `🕊️ Martyrdom: ${imamName}`
    : announcement.title || 'Martyrdom Commemoration';
  
  let body = announcement.message;
  if (imamName && eventDate) {
    body = `Commemorating the martyrdom of ${imamName}.\n\n${announcement.message}`;
    if (hijriDate) {
      body += `\n\n📅 Date: ${eventDate} (${hijriDate})`;
    } else if (eventDate) {
      body += `\n\n📅 Date: ${eventDate}`;
    }
  }

  // Determine URL: if imam slug exists, navigate to their recitations page
  const url = imamSlug ? `/figure/${imamSlug}` : '/calendar';

  return {
    title,
    body,
    icon: thumbnailUrl || '/main.png',
    badge: '/main.png',
    image: thumbnailUrl || undefined,
    tag: `martyrdom-${id}`,
    vibrate: [300, 200, 300],
    requireInteraction: false,
    data: {
      url,
      type: 'announcement',
      eventType: 'martyrdom',
      announcementId: id,
      imamId,
      imamSlug,
      imamName,
      eventDate,
      hijriDate
    }
  };
}

function getDeathTemplate(
  announcement: AnnouncementData,
  id: string,
  imamName: string,
  imamId: string | null,
  imamSlug: string | null,
  eventDate: string,
  hijriDate: string,
  thumbnailUrl?: string | null
): NotificationTemplate {
  const title = imamName
    ? `🕯️ Passing: ${imamName}`
    : announcement.title || 'Commemoration';
  
  let body = announcement.message;
  if (imamName && eventDate) {
    body = `Commemorating the passing of ${imamName}.\n\n${announcement.message}`;
    if (hijriDate) {
      body += `\n\n📅 Date: ${eventDate} (${hijriDate})`;
    } else if (eventDate) {
      body += `\n\n📅 Date: ${eventDate}`;
    }
  }

  // Determine URL: if imam slug exists, navigate to their recitations page
  const url = imamSlug ? `/figure/${imamSlug}` : '/calendar';

  return {
    title,
    body,
    icon: thumbnailUrl || '/main.png',
    badge: '/main.png',
    image: thumbnailUrl || undefined,
    tag: `death-${id}`,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: {
      url,
      type: 'announcement',
      eventType: 'death',
      announcementId: id,
      imamId,
      imamSlug,
      imamName,
      eventDate,
      hijriDate
    }
  };
}

function getOtherEventTemplate(
  announcement: AnnouncementData,
  id: string,
  imamName: string,
  imamId: string | null,
  imamSlug: string | null,
  eventDate: string,
  hijriDate: string,
  thumbnailUrl?: string | null
): NotificationTemplate {
  const title = announcement.title || '📢 Important Event';
  
  let body = announcement.message;
  if (imamName) {
    body = `${imamName}: ${announcement.message}`;
  }
  if (eventDate) {
    if (hijriDate) {
      body += `\n\n📅 Date: ${eventDate} (${hijriDate})`;
    } else {
      body += `\n\n📅 Date: ${eventDate}`;
    }
  }

  // Determine URL: if imam slug exists, navigate to their recitations page
  const url = imamSlug ? `/figure/${imamSlug}` : '/calendar';

  return {
    title,
    body,
    icon: thumbnailUrl || '/main.png',
    badge: '/main.png',
    image: thumbnailUrl || undefined,
    tag: `event-${id}`,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: {
      url,
      type: 'announcement',
      eventType: 'other',
      announcementId: id,
      imamId,
      imamSlug,
      imamName,
      eventDate,
      hijriDate
    }
  };
}

function getGeneralTemplate(
  announcement: AnnouncementData,
  id: string,
  imamId: string | null,
  imamSlug: string | null,
  thumbnailUrl?: string | null
): NotificationTemplate {
  // Determine URL: if imam slug exists, navigate to their recitations page
  const url = imamSlug ? `/figure/${imamSlug}` : '/';

  return {
    title: announcement.title || '📢 Announcement',
    body: announcement.message,
    icon: thumbnailUrl || '/main.png',
    badge: '/main.png',
    image: thumbnailUrl || undefined,
    tag: `announcement-${id}`,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: {
      url,
      type: 'announcement',
      eventType: 'general',
      announcementId: id,
      imamId,
      imamSlug
    }
  };
}
