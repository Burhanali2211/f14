// Service Worker for Background Notifications
const CACHE_NAME = 'sacred-recitations-v1';
const NOTIFICATION_TITLE = 'Upcoming Event';

// Install event - cache resources
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  return self.clients.claim();
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
      actions: [
        {
          action: 'view',
          title: 'View Event'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Default action or 'view' action
  const urlToOpen = event.notification.data?.url || '/calendar';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate to calendar
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Send message to navigate to calendar
          client.postMessage({
            type: 'NAVIGATE',
            url: urlToOpen
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

// Message handler for scheduled notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay, data } = event.data;
    
    console.log(`[Service Worker] Scheduling notification: ${title} in ${delay}ms`);
    
    // Schedule notification using setTimeout
    setTimeout(() => {
      console.log(`[Service Worker] Sending notification: ${title}`);
      self.registration.showNotification(title, {
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
      }).catch((error) => {
        console.error('[Service Worker] Error showing notification:', error);
      });
    }, delay);
  }
});
