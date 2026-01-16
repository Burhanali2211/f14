// Service Worker for Background Notifications and Update Detection
const CACHE_NAME = 'sacred-recitations-v1';
const NOTIFICATION_TITLE = 'Upcoming Event';
const UPDATE_NOTIFICATION_TITLE = 'Update Available';
const VERSION_FILE = '/version.json';
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

// Get app version from version.json
async function getAppVersion() {
  try {
    const response = await fetch(`${VERSION_FILE}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching version:', error);
  }
  return null;
}

// Store last known version in IndexedDB
async function getStoredVersion() {
  try {
    const db = await openDB();
    const tx = db.transaction(['versions'], 'readonly');
    const store = tx.objectStore('versions');
    const result = await store.get('current');
    return result ? result.value : null;
  } catch (error) {
    console.error('Error getting stored version:', error);
    return null;
  }
}

async function storeVersion(version) {
  try {
    const db = await openDB();
    const tx = db.transaction(['versions'], 'readwrite');
    const store = tx.objectStore('versions');
    await store.put({ key: 'current', value: version, timestamp: Date.now() });
  } catch (error) {
    console.error('Error storing version:', error);
  }
}

// Get list of shown versions from IndexedDB
async function getShownVersions() {
  try {
    const db = await openDB();
    const tx = db.transaction(['versions'], 'readonly');
    const store = tx.objectStore('versions');
    const result = await store.get('shown');
    return result ? result.value : [];
  } catch (error) {
    console.error('Error getting shown versions:', error);
    return [];
  }
}

// Mark version as shown
async function markVersionAsShown(version) {
  try {
    const shownVersions = await getShownVersions();
    const versionId = version.buildHash || `v${version.version}-${version.buildTime}`;
    
    if (!shownVersions.includes(versionId)) {
      shownVersions.push(versionId);
      // Keep only last 10 versions
      if (shownVersions.length > 10) {
        shownVersions.shift();
      }
      
      const db = await openDB();
      const tx = db.transaction(['versions'], 'readwrite');
      const store = tx.objectStore('versions');
      await store.put({ key: 'shown', value: shownVersions, timestamp: Date.now() });
    }
  } catch (error) {
    console.error('Error marking version as shown:', error);
  }
}

// Check if version has been shown
async function hasVersionBeenShown(version) {
  try {
    const shownVersions = await getShownVersions();
    const versionId = version.buildHash || `v${version.version}-${version.buildTime}`;
    return shownVersions.includes(versionId);
  } catch (error) {
    console.error('Error checking if version shown:', error);
    return false;
  }
}

// Open IndexedDB for version storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('app-version-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('versions')) {
        db.createObjectStore('versions', { keyPath: 'key' });
      }
    };
  });
}

// Check if version has changed
function hasVersionChanged(current, stored) {
  if (!current) return false;
  if (!stored) return true;
  
  if (current.version !== stored.version) return true;
  if (current.buildTime > stored.buildTime) return true;
  if (current.buildHash && stored.buildHash && current.buildHash !== stored.buildHash) return true;
  
  return false;
}

// Send update notification to all clients (only if not already shown)
async function notifyClientsAboutUpdate(version) {
  // Check if this version has already been shown
  const alreadyShown = await hasVersionBeenShown(version);
  if (alreadyShown) {
    console.log('[Service Worker] Version already shown, skipping notification:', version);
    return;
  }

  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  
  // Send message to all clients (they will check if already shown)
  clients.forEach((client) => {
    client.postMessage({
      type: 'APP_UPDATE_AVAILABLE',
      version: version,
      timestamp: Date.now(),
    });
  });
  
  // Show browser notification if permission granted (only once per version)
  try {
    // Try to show notification (will fail if permission not granted)
    try {
      // Format version info
      const versionInfo = version.buildHash 
        ? `v${version.version} (${version.buildHash.substring(0, 8)})`
        : `v${version.version}`;
      
      await self.registration.showNotification(UPDATE_NOTIFICATION_TITLE, {
        body: `New version ${versionInfo} is available. Click to update now!`,
        icon: '/main.png',
        badge: '/main.png',
        tag: 'app-update', // Same tag ensures only one notification shows
        data: {
          type: 'app-update',
          version: version,
          url: '/',
        },
        requireInteraction: true,
        vibrate: [200, 100, 200],
        silent: false,
        actions: [
          {
            action: 'update',
            title: 'Update Now',
            icon: '/main.png'
          },
          {
            action: 'later',
            title: 'Later',
            icon: '/main.png'
          }
        ]
      });
      
      // Mark as shown
      await markVersionAsShown(version);
      console.log('[Service Worker] Update notification shown for version:', versionInfo);
    } catch (notifError) {
      // Permission might not be granted, that's okay - client will show dialog instead
      console.log('[Service Worker] Could not show notification (permission may not be granted):', notifError);
    }
  } catch (error) {
    console.error('[Service Worker] Error showing update notification:', error);
  }
}

// Periodic version check
let versionCheckInterval = null;

async function checkForUpdates() {
  try {
    const currentVersion = await getAppVersion();
    if (!currentVersion) return;
    
    const storedVersion = await getStoredVersion();
    
    if (hasVersionChanged(currentVersion, storedVersion)) {
      // Check if this version has already been shown
      const alreadyShown = await hasVersionBeenShown(currentVersion);
      if (alreadyShown) {
        console.log('[Service Worker] Version already shown, skipping:', currentVersion);
        // Still update stored version
        await storeVersion(currentVersion);
        return;
      }
      
      console.log('[Service Worker] New version detected:', currentVersion);
      
      // Store new version
      await storeVersion(currentVersion);
      
      // Notify clients (will check if already shown)
      await notifyClientsAboutUpdate(currentVersion);
    } else if (!storedVersion) {
      // First time - just store the version and mark as shown (first load)
      await storeVersion(currentVersion);
      await markVersionAsShown(currentVersion);
    }
  } catch (error) {
    console.error('[Service Worker] Error checking for updates:', error);
  }
}

// Install event - cache resources and skip waiting
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches and check for version updates
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    (async () => {
      // Clear all old caches
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME) {
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);
      
      // Check for updates immediately
      await checkForUpdates();
      
      // Set up periodic version checks
      if (versionCheckInterval) {
        clearInterval(versionCheckInterval);
      }
      versionCheckInterval = setInterval(checkForUpdates, VERSION_CHECK_INTERVAL);
      
      // Notify clients about activation
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'SERVICE_WORKER_ACTIVATED',
          timestamp: Date.now(),
        });
      });
      
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
  const action = event.action; // undefined when clicking notification body, 'view', 'subscribe', 'update', or 'later' when clicking buttons

  // Handle app update notifications
  if (notificationData.type === 'app-update') {
    if (action === 'later' || action === 'dismiss') {
      // User dismissed - do nothing
      return;
    }
    
    // Update action or notification body click
    event.waitUntil(
      (async () => {
        // Clear all caches
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        
        // Notify clients to update
        const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Send update message
            client.postMessage({
              type: 'FORCE_APP_UPDATE',
              version: notificationData.version,
            });
            await client.focus();
            // Reload the page
            if (client.navigate) {
              await client.navigate('/');
            }
            return;
          }
        }
        
        // Open new window if no existing window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })()
    );
    return;
  }

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
  
  // Handle manual update check request from client
  if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
    checkForUpdates().then(() => {
      event.ports[0]?.postMessage({ success: true });
    }).catch((error) => {
      console.error('[Service Worker] Error checking for updates:', error);
      event.ports[0]?.postMessage({ success: false, error: error.message });
    });
  }
  
  // Removed ANNOUNCEMENT_NOTIFICATION and BROADCAST_ANNOUNCEMENT handlers
  // Announcements are now handled via Realtime database listeners in App.tsx
  // This prevents duplicate notifications on mobile devices
});
