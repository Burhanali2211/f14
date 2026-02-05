// Service Worker for Background Notifications and Update Detection
const CACHE_NAME = 'sacred-recitations-v1';
const AUDIO_CACHE_NAME = 'audio-chunks-v1';
const AUDIO_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const NOTIFICATION_TITLE = 'Upcoming Event';
const UPDATE_NOTIFICATION_TITLE = 'Update Available';
const VERSION_FILE = '/version.json';

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

// Store last known version in IndexedDB (with proper error handling)
async function getStoredVersion() {
  try {
    const db = await openDB();
    const tx = db.transaction(['versions'], 'readonly');
    const store = tx.objectStore('versions');
    const result = await new Promise((resolve, reject) => {
      const req = store.get('current');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return result ? result.value : null;
  } catch (error) {
    console.warn('[SW] IndexedDB getStoredVersion failed (quota/private mode):', error?.name);
    return null;
  }
}

async function storeVersion(version) {
  try {
    const db = await openDB();
    const tx = db.transaction(['versions'], 'readwrite');
    const store = tx.objectStore('versions');
    await new Promise((resolve, reject) => {
      const req = store.put({ key: 'current', value: version, timestamp: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn('[SW] IndexedDB storeVersion failed:', error?.name);
  }
}

// Get list of shown versions from IndexedDB
async function getShownVersions() {
  try {
    const db = await openDB();
    const tx = db.transaction(['versions'], 'readonly');
    const store = tx.objectStore('versions');
    const result = await new Promise((resolve, reject) => {
      const req = store.get('shown');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return result ? result.value : [];
  } catch (error) {
    console.warn('[SW] IndexedDB getShownVersions failed:', error?.name);
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
      if (shownVersions.length > 10) shownVersions.shift();
      const db = await openDB();
      const tx = db.transaction(['versions'], 'readwrite');
      const store = tx.objectStore('versions');
      await new Promise((resolve, reject) => {
        const req = store.put({ key: 'shown', value: shownVersions, timestamp: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (error) {
    console.warn('[SW] IndexedDB markVersionAsShown failed:', error?.name);
  }
}

// Check if version has been shown. On IndexedDB failure, return TRUE to avoid spam.
async function hasVersionBeenShown(version) {
  try {
    const shownVersions = await getShownVersions();
    const versionId = version.buildHash || `v${version.version}-${version.buildTime}`;
    return shownVersions.includes(versionId);
  } catch (error) {
    console.warn('[SW] IndexedDB hasVersionBeenShown failed, assuming shown to prevent spam:', error?.name);
    return true; // Conservative: assume shown to avoid notification spam
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

// Notify about update - send to ONE client only to avoid duplicate notifications.
// If app has focused tab: notify that client. If app in background: show browser notification.
async function notifyClientsAboutUpdate(version) {
  const alreadyShown = await hasVersionBeenShown(version);
  if (alreadyShown) {
    console.log('[SW] Version already shown, skipping');
    return;
  }

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const focusedClient = clients.find((c) => c.focused);
  const visibleClient = clients.find((c) => c.visibilityState === 'visible');

  // Prefer focused client, then any visible client
  const targetClient = focusedClient || visibleClient || clients[0];

  if (targetClient) {
    // App has at least one tab open - notify ONLY that one client (no browser notification)
    targetClient.postMessage({
      type: 'APP_UPDATE_AVAILABLE',
      version: version,
      timestamp: Date.now(),
    });
    await markVersionAsShown(version);
    console.log('[SW] Update sent to single client');
  } else {
    // App in background - show ONE browser notification
    try {
      const versionInfo = version.buildHash
        ? `v${version.version} (${version.buildHash.substring(0, 8)})`
        : `v${version.version}`;
      await self.registration.showNotification(UPDATE_NOTIFICATION_TITLE, {
        body: `New version ${versionInfo} is available. Click to update.`,
        icon: '/main.png',
        badge: '/main.png',
        tag: 'app-update',
        data: { type: 'app-update', version: version, url: '/' },
        requireInteraction: true,
        vibrate: [200, 100, 200],
        silent: false,
        actions: [
          { action: 'update', title: 'Update Now', icon: '/main.png' },
          { action: 'later', title: 'Later', icon: '/main.png' }
        ]
      });
      await markVersionAsShown(version);
      console.log('[SW] Update notification shown (app in background)');
    } catch (err) {
      console.warn('[SW] Could not show notification:', err?.message);
    }
  }
}

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

// Fetch event - cache audio proxy responses for teleprompter
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!url.includes('/api/r2-audio-proxy')) return;

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response.ok && (response.status === 200 || response.status === 206)) {
          const clone = response.clone();
          cache.put(event.request, clone);
        }
        return response;
      } catch (err) {
        return fetch(event.request);
      }
    })()
  );
});

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
      // Clear old caches (preserve CACHE_NAME and AUDIO_CACHE_NAME)
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);
      
      // Check for updates once on activate (no interval - SW is killed when idle, intervals don't persist)
      // Main app (UpdateNotification) handles periodic checks every 5 min and on tab focus
      await checkForUpdates();

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
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        
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
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })()
    );
    return;
  }

  // Handle Subscribe action
  if (action === 'subscribe') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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
        if (self.clients.openWindow) {
          return self.clients.openWindow('/settings?subscribe=true');
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
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
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

// Message handler - SCHEDULE_NOTIFICATION removed: setTimeout does NOT work in service workers.
// SW is event-driven and killed when idle; timers are cleared on termination.
// Use server-side push notifications or Notification Triggers API for scheduled notifications.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    // Reply to client: SW cannot schedule - use push or keep app open
    const port = event.ports && event.ports[0];
    if (port) {
      port.postMessage({ success: false, reason: 'Service workers cannot persist timers. Use push notifications.' });
    }
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

  // Handle audio prefetch for teleprompter - fetch in chunks with Range for progress, cache full response
  if (event.data && event.data.type === 'PREFETCH_AUDIO') {
    const { audioUrl, fileSize } = event.data;
    const client = event.source;
    if (!client || !audioUrl) return;

    (async () => {
      try {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const fullReq = new Request(audioUrl);
        const cached = await cache.match(fullReq);
        if (cached) {
          client.postMessage({ type: 'PREFETCH_PROGRESS', progress: 100 });
          return;
        }

        if (fileSize && fileSize > 0) {
          const totalChunks = Math.ceil(fileSize / AUDIO_CHUNK_SIZE);
          for (let i = 0; i < totalChunks; i++) {
            const start = i * AUDIO_CHUNK_SIZE;
            const end = Math.min(start + AUDIO_CHUNK_SIZE - 1, fileSize - 1);
            const req = new Request(audioUrl, { headers: { Range: `bytes=${start}-${end}` } });
            const res = await fetch(req);
            if (res.ok) await cache.put(req, res.clone());
            const progress = Math.round(((i + 1) / totalChunks) * 100);
            client.postMessage({ type: 'PREFETCH_PROGRESS', progress });
            if (i < totalChunks - 1) await new Promise((r) => setTimeout(r, 100));
          }
        }
        const res = await fetch(audioUrl);
        if (res.ok) await cache.put(fullReq, res.clone());
        client.postMessage({ type: 'PREFETCH_PROGRESS', progress: 100 });
      } catch (err) {
        console.error('[SW] Prefetch error:', err);
        client.postMessage({ type: 'PREFETCH_ERROR', error: err?.message || 'Prefetch failed' });
      }
    })();
  }
  
  // Removed ANNOUNCEMENT_NOTIFICATION and BROADCAST_ANNOUNCEMENT handlers
  // Announcements are now handled via Realtime database listeners in App.tsx
  // This prevents duplicate notifications on mobile devices
});
