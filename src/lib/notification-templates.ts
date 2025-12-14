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
  eventDate?: string;
  hijriDate?: string;
  additionalInfo?: string;
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
  const eventDate = announcement.eventDate || '';
  const hijriDate = announcement.hijriDate || '';

  switch (eventType) {
    case 'birthday':
      return getBirthdayTemplate(announcement, announcementId, imamName, eventDate, hijriDate);
    
    case 'martyrdom':
      return getMartyrdomTemplate(announcement, announcementId, imamName, eventDate, hijriDate);
    
    case 'death':
      return getDeathTemplate(announcement, announcementId, imamName, eventDate, hijriDate);
    
    case 'other':
      return getOtherEventTemplate(announcement, announcementId, imamName, eventDate, hijriDate);
    
    default:
      return getGeneralTemplate(announcement, announcementId);
  }
}

function getBirthdayTemplate(
  announcement: AnnouncementData,
  id: string,
  imamName: string,
  eventDate: string,
  hijriDate: string
): NotificationTemplate {
  const title = imamName 
    ? `🎂 Birth Anniversary: ${imamName}`
    : announcement.title || 'Birth Anniversary';
  
  let body = announcement.message;
  if (imamName && eventDate) {
    body = `${imamName}'s birth anniversary is approaching.\n\n${announcement.message}`;
    if (hijriDate) {
      body += `\n\n📅 ${eventDate} (${hijriDate})`;
    } else if (eventDate) {
      body += `\n\n📅 ${eventDate}`;
    }
  }

  return {
    title,
    body,
    icon: '/main.png',
    badge: '/main.png',
    tag: `birthday-${id}`,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: false,
    data: {
      url: '/calendar',
      type: 'announcement',
      eventType: 'birthday',
      announcementId: id,
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
  eventDate: string,
  hijriDate: string
): NotificationTemplate {
  const title = imamName
    ? `🕯️ Martyrdom: ${imamName}`
    : announcement.title || 'Martyrdom Commemoration';
  
  let body = announcement.message;
  if (imamName && eventDate) {
    body = `Commemorating the martyrdom of ${imamName}.\n\n${announcement.message}`;
    if (hijriDate) {
      body += `\n\n📅 ${eventDate} (${hijriDate})`;
    } else if (eventDate) {
      body += `\n\n📅 ${eventDate}`;
    }
  }

  return {
    title,
    body,
    icon: '/main.png',
    badge: '/main.png',
    tag: `martyrdom-${id}`,
    vibrate: [300, 200, 300],
    requireInteraction: false,
    data: {
      url: '/calendar',
      type: 'announcement',
      eventType: 'martyrdom',
      announcementId: id,
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
  eventDate: string,
  hijriDate: string
): NotificationTemplate {
  const title = imamName
    ? `💙 Passing: ${imamName}`
    : announcement.title || 'Commemoration';
  
  let body = announcement.message;
  if (imamName && eventDate) {
    body = `Commemorating the passing of ${imamName}.\n\n${announcement.message}`;
    if (hijriDate) {
      body += `\n\n📅 ${eventDate} (${hijriDate})`;
    } else if (eventDate) {
      body += `\n\n📅 ${eventDate}`;
    }
  }

  return {
    title,
    body,
    icon: '/main.png',
    badge: '/main.png',
    tag: `death-${id}`,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: {
      url: '/calendar',
      type: 'announcement',
      eventType: 'death',
      announcementId: id,
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
  eventDate: string,
  hijriDate: string
): NotificationTemplate {
  const title = announcement.title || 'Important Event';
  
  let body = announcement.message;
  if (imamName) {
    body = `${imamName}: ${announcement.message}`;
  }
  if (eventDate) {
    if (hijriDate) {
      body += `\n\n📅 ${eventDate} (${hijriDate})`;
    } else {
      body += `\n\n📅 ${eventDate}`;
    }
  }

  return {
    title,
    body,
    icon: '/main.png',
    badge: '/main.png',
    tag: `event-${id}`,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: {
      url: '/calendar',
      type: 'announcement',
      eventType: 'other',
      announcementId: id,
      imamName,
      eventDate,
      hijriDate
    }
  };
}

function getGeneralTemplate(
  announcement: AnnouncementData,
  id: string
): NotificationTemplate {
  return {
    title: announcement.title || 'Announcement',
    body: announcement.message,
    icon: '/main.png',
    badge: '/main.png',
    tag: `announcement-${id}`,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: {
      url: '/',
      type: 'announcement',
      eventType: 'general',
      announcementId: id
    }
  };
}
