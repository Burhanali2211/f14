import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { realtimeManager } from '@/lib/unified-realtime-manager';
import { getNotificationTemplate } from '@/lib/notification-templates';

const STORAGE_KEY = 'shown_notification_ids';
const RETENTION_MS = 24 * 60 * 60 * 1000;

interface AnnouncementPayload {
  id: string;
  title: string;
  message: string;
  sent_at: string | null;
  created_at: string;
  event_type?: string | null;
  imam_id?: string | null;
  event_date?: string | null;
  hijri_date?: string | null;
  template_data?: { imamName?: string };
  thumbnail_url?: string | null;
}

function getShownNotificationIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();

    const data = JSON.parse(stored);
    const now = Date.now();
    const validIds = new Set<string>();

    for (const [id, timestamp] of Object.entries(data)) {
      if (now - (timestamp as number) < RETENTION_MS) {
        validIds.add(id);
      }
    }

    if (validIds.size !== Object.keys(data).length) {
      const updated: Record<string, number> = {};
      validIds.forEach(id => {
        updated[id] = data[id] || now;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    return validIds;
  } catch {
    return new Set();
  }
}

function markNotificationAsShown(id: string, shownIds: Set<string>): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data[id] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    shownIds.add(id);
  } catch {
  }
}

export function useAnnouncementNotifications() {
  const shownIdsRef = useRef<Set<string>>(getShownNotificationIds());
  const processingLocksRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => { });
      } catch {
      }
    }
  }, []);

  const fetchImamSlug = useCallback(async (imamId: string): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from('imams')
        .select('slug')
        .eq('id', imamId)
        .maybeSingle();
      return data?.slug || null;
    } catch {
      return null;
    }
  }, []);

  const showNotification = useCallback(async (announcement: AnnouncementPayload, imamSlug: string | null) => {
    const template = getNotificationTemplate({
      title: announcement.title,
      message: announcement.message,
      eventType: (announcement.event_type as 'birthday' | 'death' | 'martyrdom' | 'other' | 'general') || 'general',
      imamName: announcement.template_data?.imamName || '',
      imamId: announcement.imam_id || null,
      imamSlug,
      eventDate: announcement.event_date || '',
      hijriDate: announcement.hijri_date || '',
      thumbnailUrl: announcement.thumbnail_url || null,
    }, announcement.id);

    playNotificationSound();

    const notificationOptions = {
      body: template.body,
      icon: template.icon,
      badge: template.badge,
      image: template.image,
      tag: template.tag,
      data: template.data,
      requireInteraction: template.requireInteraction,
      vibrate: template.vibrate,
      silent: false,
      renotify: false,
      timestamp: Date.now(),
      actions: [
        { action: 'view', title: 'View Recitations', icon: '/main.png' },
        { action: 'subscribe', title: 'Subscribe', icon: '/main.png' }
      ],
    };

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(template.title, notificationOptions as NotificationOptions);
      } catch {
        new Notification(template.title, {
          body: template.body,
          icon: template.icon,
          tag: template.tag,
        });
      }
    } else {
      new Notification(template.title, {
        body: template.body,
        icon: template.icon,
        tag: template.tag,
      });
    }
  }, [playNotificationSound]);

  const processNotification = useCallback(async (announcement: AnnouncementPayload): Promise<boolean> => {
    const { id } = announcement;

    if (processingLocksRef.current.has(id) || shownIdsRef.current.has(id)) {
      return false;
    }

    processingLocksRef.current.add(id);

    try {
      if (shownIdsRef.current.has(id)) {
        return false;
      }

      markNotificationAsShown(id, shownIdsRef.current);
      return true;
    } finally {
      setTimeout(() => {
        processingLocksRef.current.delete(id);
      }, 2000);
    }
  }, []);

  const handleAnnouncement = useCallback(async (announcement: AnnouncementPayload) => {
    if (!announcement.sent_at || Notification.permission !== 'granted') {
      return;
    }

    const shouldProcess = await processNotification(announcement);
    if (!shouldProcess) return;

    const imamSlug = announcement.imam_id ? await fetchImamSlug(announcement.imam_id) : null;
    await showNotification(announcement, imamSlug);
  }, [processNotification, fetchImamSlug, showNotification]);

  useEffect(() => {
    // Use unified realtime manager instead of creating separate channel

    let lastAnnouncementId: string | null = null;

    // Subscribe to announcement events from unified manager
    const unsubscribe = realtimeManager.on('announcement', (payload: any) => {
      if (payload.new) {
        handleAnnouncement(payload.new as AnnouncementPayload);
      }
    });

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          const { data } = await supabase
            .from('announcements')
            .select('id, title, message, sent_at, event_type, imam_id, event_date, hijri_date, template_data, thumbnail_url')
            .not('sent_at', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);

          if (data) {
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            for (const ann of data) {
              if (ann.sent_at && new Date(ann.sent_at).getTime() > fiveMinutesAgo) {
                await handleAnnouncement(ann as AnnouncementPayload);
              }
            }
          }
        } catch (error) {
          logger.error('Error checking missed announcements:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fallback polling (only if realtime fails) - reduced frequency
    const pollInterval = setInterval(async () => {
      const status = realtimeManager.getStatus();
      if (status.isConnected) return; // Skip polling if realtime is working

      try {
        const { data } = await supabase
          .from('announcements')
          .select('id, title, message, sent_at, event_type, imam_id, event_date, hijri_date, template_data, thumbnail_url')
          .not('sent_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && data.id !== lastAnnouncementId) {
          lastAnnouncementId = data.id;
          await handleAnnouncement(data as AnnouncementPayload);
        }
      } catch {
      }
    }, 30000); // Increased interval to 30s

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
      unsubscribe(); // Unsubscribe from unified manager

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [handleAnnouncement]);

  return null;
}
