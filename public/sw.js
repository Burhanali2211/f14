// Service Worker for Background Notifications
const CACHE_NAME = 'sacred-recitations-v1';
const NOTIFICATION_TITLE = 'Upcoming Event';
const VERSION_FILE = '/version.json';

// Get app version from version.json
async function getAppVersion() {
  try {
    const response = await fetch(`${VERSION_FILE}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching version:', error);
  }
  return null;
}

// Install event - cache resources
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean up old caches and check for version updates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Get current app version
      const version = await getAppVersion();
      
      // Clear all caches if version changed
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map((cacheName) => {
        // Always delete old cache names that don't match current version
        if (cacheName !== CACHE_NAME) {
          return caches.delete(cacheName);
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);
      
      // If version is available, notify clients to check for updates
      if (version) {
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'APP_VERSION_CHECK',
            version: version,
          });
        });
      }
      
      return self.clients.claim();
    })()
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: NOTIFICATION_TITLE,
    body: 'You have an upcoming event reminder',
    icon: '/main.png',
    badge: '/main.png',
    tag: 'event-reminder',
    requireInteraction: false,
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || NOTIFICATION_TITLE,
        body: data.body || notificationData.body,
        data: data.data || {},
        tag: data.tag || 'event-reminder'
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      vibrate: [200, 100, 200],
      silent: false,
      actions: [
        {
          action: 'view',
          title: 'View Recitations',
          icon: '/main.png'
        },
        {
          action: 'subscribe',
          title: 'Subscribe',
          icon: '/main.png'
        }
      ]
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action; // undefined when clicking notification body, 'view' or 'subscribe' when clicking buttons

  // Handle Subscribe action
  if (action === 'subscribe') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Find existing window or open new one
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Send message to handle subscription
            client.postMessage({
              type: 'SUBSCRIBE_NOTIFICATIONS',
              imamId: notificationData.imamId,
              imamSlug: notificationData.imamSlug,
              announcementId: notificationData.announcementId
            });
            return client.focus();
          }
        }
        // Open new window to settings page for subscription
        if (clients.openWindow) {
          return clients.openWindow('/settings?subscribe=true');
        }
      })
    );
    return;
  }

  // Handle View action or notification body click (when action is undefined or 'view')
  // Determine URL: if imam slug exists, navigate to their recitations page
  let urlToOpen = notificationData.url || '/';
  
  // If we have imam slug, navigate to their page
  if (notificationData.imamSlug) {
    urlToOpen = `/figure/${notificationData.imamSlug}`;
  } else if (notificationData.type === 'announcement') {
    // For announcements without imam, go to calendar or home
    urlToOpen = notificationData.eventType && notificationData.eventType !== 'general' ? '/calendar' : '/';
  } else {
    urlToOpen = '/calendar';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Send message to navigate
          client.postMessage({
            type: 'NAVIGATE',
            url: urlToOpen,
            announcementId: notificationData.announcementId,
            imamSlug: notificationData.imamSlug
          });
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background sync for scheduled notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-events') {
    event.waitUntil(syncEvents());
  }
});

async function syncEvents() {
  try {
    // This will be called periodically to check for upcoming events
    // The main app will handle the actual notification scheduling
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_EVENTS',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Error syncing events:', error);
  }
}

// Message handler for scheduled notifications and announcements
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay, data } = event.data;
    
    console.log(`[Service Worker] Scheduling notification: ${title} in ${delay}ms`);
    
    // Use a more reliable scheduling method that persists
    const scheduledTime = Date.now() + delay;
    
    // Store in IndexedDB for persistence (fallback to setTimeout for now)
    // Schedule notification using setTimeout
    const timeoutId = setTimeout(() => {
      console.log(`[Service Worker] Sending notification: ${title}`);
      self.registration.showNotification(title, {
        body,
        icon: '/main.png',
        badge: '/main.png',
        tag: `event-${data?.eventId || Date.now()}`,
        data: data || {},
        requireInteraction: false,
        vibrate: [200, 100, 200],
        silent: false,
        actions: [
          {
            action: 'view',
            title: 'View Recitations',
            icon: '/main.png'
          },
          {
            action: 'subscribe',
            title: 'Subscribe',
            icon: '/main.png'
          }
        ]
      }).catch((error) => {
        console.error('[Service Worker] Error showing notification:', error);
      });
    }, delay);
    
    // Store timeout ID for potential cleanup
    if (!self.scheduledTimeouts) {
      self.scheduledTimeouts = new Map();
    }
    self.scheduledTimeouts.set(scheduledTime, timeoutId);
  }
  // Removed ANNOUNCEMENT_NOTIFICATION and BROADCAST_ANNOUNCEMENT handlers
  // Announcements are now handled via Realtime database listeners in App.tsx
  // This prevents duplicate notifications on mobile devices
});
