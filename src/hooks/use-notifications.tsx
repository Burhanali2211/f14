import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import type { AhlulBaitEvent } from '@/lib/supabase-types';

export interface NotificationPermission {
  state: NotificationPermissionState;
  granted: boolean;
}

export interface ScheduledNotification {
  eventId: string;
  title: string;
  body: string;
  scheduledTime: number;
  timeoutId?: number;
}

class NotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private checkInterval: number | null = null;

  async initialize(): Promise<boolean> {
    if (!('Notification' in window)) {
      logger.warn('Notifications are not supported');
      return false;
    }

    // Service worker is optional - notifications can work without it
    if ('serviceWorker' in navigator) {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        this.serviceWorkerRegistration = registration;

        // Wait for service worker to be ready (but don't block if it fails)
        try {
          await navigator.serviceWorker.ready;
        } catch (swError) {
          logger.warn('Service worker ready check failed, continuing anyway:', swError);
        }
      } catch (error) {
        logger.warn('Service Worker registration failed, notifications will still work:', error);
        // Continue without service worker - notifications can still work
      }
    }
    
    return true; // Return true even without service worker
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      logger.warn('Notifications are not supported in this browser');
      return { state: 'denied', granted: false };
    }

    // Always check current permission state
    let currentPermission = Notification.permission;

    // If permission is already granted, return immediately
    if (currentPermission === 'granted') {
      return { state: 'granted', granted: true };
    }

    // If permission is denied, return immediately
    if (currentPermission === 'denied') {
      logger.warn('Notification permission is denied');
      return { state: 'denied', granted: false };
    }

    // Permission is 'default', request it
    try {
      // Ensure service worker is ready before requesting permission
      if (this.serviceWorkerRegistration) {
        await this.serviceWorkerRegistration.ready;
      }

      // Request permission - this will show the browser's native permission dialog
      const permission = await Notification.requestPermission();

      const granted = permission === 'granted';

      // Update user profile if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            notification_permission_granted: granted,
            notifications_enabled: granted
          })
          .eq('id', user.id);
        
        if (error) {
          logger.error('Error updating notification permission in DB:', error);
        }
      }

      return { state: permission, granted };
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      return { state: 'denied', granted: false };
    }
  }

  getPermissionState(): NotificationPermission {
    if (!('Notification' in window)) {
      return { state: 'denied', granted: false };
    }

    return {
      state: Notification.permission,
      granted: Notification.permission === 'granted'
    };
  }

  async isEnabled(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('profiles')
      .select('notifications_enabled, notification_permission_granted')
      .eq('id', user.id)
      .single();

    return data?.notifications_enabled === true && 
           data?.notification_permission_granted === true &&
           this.getPermissionState().granted;
  }

  async enableNotifications(): Promise<boolean> {
    // Check permission first
    const currentPermission = this.getPermissionState();
    if (!currentPermission.granted) {
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .update({ notifications_enabled: true })
      .eq('id', user.id);

    if (error) {
      logger.error('Error enabling notifications:', error);
      return false;
    }

    // Subscribe to push notifications
    await this.subscribeToPushNotifications();

    // Start periodic check
    this.startPeriodicCheck();

    // Schedule notifications for upcoming events (including a test notification)
    // Use setTimeout to ensure it runs after the state is updated
    setTimeout(async () => {
      try {
        await this.scheduleUpcomingEventNotifications(true);
      } catch (error) {
        logger.error('Error scheduling test notification:', error);
      }
    }, 500);
    
    return true;
  }

  private async subscribeToPushNotifications(): Promise<void> {
    try {
      if (!this.serviceWorkerRegistration) {
        logger.warn('Service worker not available for push subscription');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if we already have a subscription
      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        // Note: For production, you need VAPID keys. For now, we'll use a placeholder
        // In production, get VAPID public key from your backend
        const applicationServerKey = this.urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HI2vO0g8bWnQz8' // Placeholder - replace with your VAPID public key
        );
        
        try {
          subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });
        } catch (pushError: any) {
          // If push subscription fails (e.g., no VAPID key), continue without it
          logger.warn('Push subscription failed (this is okay for now):', pushError.message);
          return;
        }
      }

      if (subscription) {
        // Store subscription in database
        const subscriptionData = {
          endpoint: subscription.endpoint,
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        };

        const { error: subError } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            endpoint: subscriptionData.endpoint,
            p256dh: subscriptionData.p256dh,
            auth: subscriptionData.auth,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,endpoint'
          });

        if (subError) {
          logger.error('Error storing push subscription:', subError);
        }
      }
    } catch (error) {
      logger.error('Error subscribing to push notifications:', error);
      // Don't fail if push subscription doesn't work - notifications can still work via service worker
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  async disableNotifications(): Promise<void> {
    // Clear all scheduled notifications
    this.clearAllScheduledNotifications();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Unsubscribe from push notifications
    if (this.serviceWorkerRegistration) {
      try {
        const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          // Remove from database
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }
      } catch (error) {
        logger.error('Error unsubscribing from push:', error);
      }
    }

    await supabase
      .from('profiles')
      .update({ notifications_enabled: false })
      .eq('id', user.id);
  }

  async scheduleUpcomingEventNotifications(isNewEnablement: boolean = false): Promise<void> {
    if (!(await this.isEnabled())) {
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch upcoming events
      const { data: events, error } = await supabase
        .from('ahlul_bait_events')
        .select(`
          *,
          imam:imams(*)
        `)
        .eq('is_annual', true);

      if (error) {
        logger.error('Error fetching events for notifications:', error);
        return;
      }

      if (!events || events.length === 0) return;

      // Calculate next occurrence for each event
      const eventsWithNextOccurrence = events
        .map((event: any) => {
          const eventDate = new Date(event.event_date);
          const currentYear = today.getFullYear();
          
          let eventThisYear = new Date(currentYear, eventDate.getMonth(), eventDate.getDate());
          
          if (eventThisYear < today) {
            eventThisYear = new Date(currentYear + 1, eventDate.getMonth(), eventDate.getDate());
          }
          
          const daysUntil = Math.ceil((eventThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            ...event,
            nextOccurrence: eventThisYear,
            daysUntil
          };
        })
        .filter((event: any) => event.daysUntil >= 0 && event.daysUntil <= 30)
        .sort((a: any, b: any) => a.daysUntil - b.daysUntil);

      // Schedule notification for the next upcoming event
      if (eventsWithNextOccurrence.length > 0) {
        const nextEvent = eventsWithNextOccurrence[0];
        // If this is a new enablement, send a test notification in 1-2 minutes
        await this.scheduleEventNotification(nextEvent, isNewEnablement);
      }
    } catch (error) {
      logger.error('Error scheduling event notifications:', error);
    }
  }

  private async scheduleEventNotification(event: AhlulBaitEvent & { nextOccurrence: Date; daysUntil: number }, isTestNotification: boolean = false): Promise<void> {
    // Clear any existing notification for this event
    this.clearScheduledNotification(event.id);

    const now = Date.now();
    const eventTime = event.nextOccurrence.getTime();
    const timeUntilEvent = eventTime - now;

    // For test notifications (when user first enables), send in 1-2 minutes
    // Otherwise, schedule based on event timing
    let notificationDelay: number;
    let notificationTitle: string;
    let notificationBody: string;

    if (isTestNotification) {
      // Test notification - send in 2 minutes (120 seconds) to ensure it works
      notificationDelay = 120 * 1000; // 2 minutes
      notificationTitle = 'Notifications Enabled!';
      notificationBody = 'You will receive notifications for upcoming events. This is a test notification.';
    } else if (timeUntilEvent < 2 * 60 * 1000) {
      // Event is very soon - send immediately
      notificationDelay = 2000; // 2 seconds
      notificationTitle = `Upcoming Event: ${event.event_name}`;
      const timeRemaining = this.formatTimeRemaining(timeUntilEvent);
      notificationBody = `${event.imam?.name || 'Ahlul Bait'} - ${timeRemaining} left until this event`;
    } else if (timeUntilEvent <= 24 * 60 * 60 * 1000) {
      // Event is within 24 hours - schedule for 1 hour before
      notificationDelay = Math.max(timeUntilEvent - (60 * 60 * 1000), 2 * 60 * 1000); // At least 2 minutes
      const timeRemaining = this.formatTimeRemaining(timeUntilEvent);
      notificationTitle = `Upcoming Event: ${event.event_name}`;
      notificationBody = `${event.imam?.name || 'Ahlul Bait'} - ${timeRemaining} left`;
    } else {
      // Event is more than 24 hours away - schedule for 1 day before
      notificationDelay = timeUntilEvent - (24 * 60 * 60 * 1000);
      const timeRemaining = this.formatTimeRemaining(timeUntilEvent);
      notificationTitle = `Upcoming Event: ${event.event_name}`;
      notificationBody = `${event.imam?.name || 'Ahlul Bait'} - ${timeRemaining} left`;
    }

    const scheduledTime = now + notificationDelay;

    const notification: ScheduledNotification = {
      eventId: event.id,
      title: notificationTitle,
      body: notificationBody,
      scheduledTime
    };

    // Schedule using setTimeout (for browser notifications)
    const timeoutId = window.setTimeout(() => {
      this.sendNotification(notification.title, notification.body, {
        eventId: event.id,
        eventName: event.event_name,
        url: `/calendar`
      });
      this.scheduledNotifications.delete(event.id);
    }, notificationDelay);

    notification.timeoutId = timeoutId;
    this.scheduledNotifications.set(event.id, notification);

    // Also schedule via service worker for background notifications
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title: notification.title,
        body: notification.body,
        delay: notificationDelay,
        data: {
          eventId: event.id,
          eventName: event.event_name,
          url: '/calendar'
        }
      });
    } else if (this.serviceWorkerRegistration?.waiting) {
      // If service worker is waiting, activate it
      this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  private formatTimeRemaining(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  private sendNotification(title: string, body: string, data?: any): void {
    if (!this.getPermissionState().granted) {
      logger.warn('Cannot send notification: permission not granted');
      return;
    }

    // Try service worker first (preferred for background notifications)
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.showNotification(title, {
        body,
        icon: '/main.png',
        badge: '/main.png',
        tag: `event-${data?.eventId || Date.now()}`,
        data: data || {},
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: 'view',
            title: 'View Event'
          }
        ]
      }).then(() => {
        // Notification sent via service worker
      }).catch((error) => {
        logger.error('Error sending notification via service worker:', error);
        // Fallback to regular Notification API
        this.sendNotificationFallback(title, body, data);
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      this.sendNotificationFallback(title, body, data);
    } else {
      logger.warn('Cannot send notification: no service worker and Notification API not available');
    }
  }

  private sendNotificationFallback(title: string, body: string, data?: any): void {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/main.png',
        tag: `event-${data?.eventId || Date.now()}`,
        data: data || {}
      });
      
      notification.onclick = () => {
        window.focus();
        if (data?.url) {
          window.location.href = data.url;
        }
        notification.close();
      };
    } catch (error) {
      logger.error('Error sending notification via Notification API:', error);
    }
  }

  private clearScheduledNotification(eventId: string): void {
    const notification = this.scheduledNotifications.get(eventId);
    if (notification?.timeoutId) {
      clearTimeout(notification.timeoutId);
    }
    this.scheduledNotifications.delete(eventId);
  }

  private clearAllScheduledNotifications(): void {
    this.scheduledNotifications.forEach((notification) => {
      if (notification.timeoutId) {
        clearTimeout(notification.timeoutId);
      }
    });
    this.scheduledNotifications.clear();
  }

  startPeriodicCheck(): void {
    // Check for upcoming events every hour
    this.checkInterval = window.setInterval(() => {
      this.scheduleUpcomingEventNotifications();
    }, 60 * 60 * 1000); // 1 hour
  }

  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Singleton instance
const notificationService = new NotificationService();

export function useNotifications() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>({
    state: 'default',
    granted: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const initialized = await notificationService.initialize();
        if (!mounted) return;

        setIsInitialized(initialized);
        
        const perm = notificationService.getPermissionState();
        setPermission(perm);

        if (initialized) {
          const enabled = await notificationService.isEnabled();
          setIsEnabled(enabled);

          if (enabled) {
            notificationService.startPeriodicCheck();
            await notificationService.scheduleUpcomingEventNotifications(false);
          }
        }
      } catch (error) {
        logger.error('Error initializing notifications:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      notificationService.stopPeriodicCheck();
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const perm = await notificationService.requestPermission();
      
      setPermission(perm);

      if (perm.granted) {
        const enabled = await notificationService.enableNotifications();
        setIsEnabled(enabled);
        
        if (enabled) {
          toast({
            title: "Notifications enabled",
            description: "You'll receive a test notification in 1-2 minutes",
          });
          
          // The enableNotifications method already schedules notifications
          // Just ensure service worker is ready
          if (notificationService.serviceWorkerRegistration) {
            await notificationService.serviceWorkerRegistration.update();
          }
        }
        
        return enabled;
      } else {
        toast({
          title: "Permission denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disableNotifications = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await notificationService.disableNotifications();
      setIsEnabled(false);
      toast({
        title: "Notifications disabled",
        description: "You won't receive event reminders anymore",
      });
    } catch (error) {
      logger.error('Error disabling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable notifications",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleNotifications = useCallback(async (): Promise<void> => {
    if (isEnabled) {
      await disableNotifications();
    } else {
      await requestPermission();
    }
  }, [isEnabled, requestPermission, disableNotifications]);

  return {
    isInitialized,
    isEnabled,
    permission,
    isLoading,
    requestPermission,
    disableNotifications,
    toggleNotifications
  };
}
