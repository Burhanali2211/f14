// Service Worker V3 - Optimized for Reliability, Offline Support, and Persistence
// Implements pure IndexedDB-based notification scheduling, improved caching, and periodic sync

const CACHE_VERSION = 'v4';
const CACHE_NAME = `sacred-recitations-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `sacred-static-${CACHE_VERSION}`;
const NOTIFICATION_TITLE = 'Upcoming Event';
const UPDATE_NOTIFICATION_TITLE = 'Update Available';
const VERSION_FILE = '/version.json';
const VERSION_CHECK_INTERVAL = 60 * 1000; // Check every minute for higher reliability
const MAX_CACHE_SIZE = 100; // Maximum number of items in dynamic cache

const STATIC_ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/main.png',
  '/manifest.json',
];

const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.woff2',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.ico'
];

const NO_CACHE_PATTERNS = [
  /supabase\.co/,
  /\.supabase\.co/,
  /\/rest\/v1\//,
  /\/auth\/v1\//,
  /\/storage\/v1\//,
  /\/realtime\//,
  /api\//,
  /version\.json/,
  /\?t=/,
  /sockjs-node/,
  /hot-update/,
  /__vite/,
];

let isIntervalRunning = false;

// --- IndexedDB Core ---

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('app-version-db', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('versions')) {
        db.createObjectStore('versions', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('scheduledNotifications')) {
        db.createObjectStore('scheduledNotifications', { keyPath: 'id' });
      }
    };
  });
}

// Generic IDB transaction wrapper for reliability
function withStore(storeName, mode, callback) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], mode);
      const store = tx.objectStore(storeName);
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      
      const result = callback(store);
      
      // If the callback returns a request, handle its success/error specifically if needed
      // but resolve/reject based on transaction completion for durability
      if (result && result.onsuccess !== undefined) {
        result.onsuccess = (e) => {
          if (mode === 'readonly') resolve(e.target.result);
        };
      }
    });
  });
}

// --- Version Management ---

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
    console.error('[SW] Error fetching version:', error);
  }
  return null;
}

async function getStoredVersion() {
  try {
    const result = await withStore('versions', 'readonly', store => store.get('current'));
    return result ? result.value : null;
  } catch (error) {
    console.error('[SW] Error getting stored version:', error);
    return null;
  }
}

async function storeVersion(version) {
  try {
    await withStore('versions', 'readwrite', store => 
      store.put({ key: 'current', value: version, timestamp: Date.now() })
    );
  } catch (error) {
    console.error('[SW] Error storing version:', error);
  }
}

async function getShownVersions() {
  try {
    const result = await withStore('versions', 'readonly', store => store.get('shown'));
    return result ? result.value : [];
  } catch (error) {
    console.error('[SW] Error getting shown versions:', error);
    return [];
  }
}

async function markVersionAsShown(version) {
  try {
    const versionId = version.buildHash || `v${version.version}-${version.buildTime}`;
    const shownVersions = await getShownVersions();
    
    if (shownVersions.includes(versionId)) return;
    
    shownVersions.push(versionId);
    if (shownVersions.length > 10) shownVersions.shift();
    
    await withStore('versions', 'readwrite', store => 
      store.put({ key: 'shown', value: shownVersions, timestamp: Date.now() })
    );
  } catch (error) {
    console.error('[SW] Error marking version as shown:', error);
  }
}

function hasVersionChanged(current, stored) {
  if (!current) return false;
  if (!stored) return true;
  if (current.buildHash && stored.buildHash) return current.buildHash !== stored.buildHash;
  if (current.version !== stored.version) return true;
  return (current.buildTime || 0) > (stored.buildTime || 0);
}

// --- Notification Logic ---

async function checkNotificationPermission() {
  if (typeof Notification === 'undefined') return false;
  return Notification.permission === 'granted';
}

async function notifyClientsAboutUpdate(version) {
  const versionId = version.buildHash || `v${version.version}-${version.buildTime}`;
  const shownVersions = await getShownVersions();
  if (shownVersions.includes(versionId)) return;

  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => {
    client.postMessage({
      type: 'APP_UPDATE_AVAILABLE',
      version,
      timestamp: Date.now(),
    });
  });
  
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;

  try {
    const versionInfo = version.buildHash 
      ? `v${version.version} (${version.buildHash.substring(0, 8)})`
      : `v${version.version}`;
    
    await self.registration.showNotification(UPDATE_NOTIFICATION_TITLE, {
      body: `New version ${versionInfo} is available. Click to update now!`,
      icon: '/main.png',
      badge: '/main.png',
      tag: 'app-update',
      data: { type: 'app-update', version, url: '/' },
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'update', title: 'Update Now' },
        { action: 'later', title: 'Later' }
      ]
    });
    
    await markVersionAsShown(version);
  } catch (error) {
    console.error('[SW] Error showing update notification:', error);
  }
}

async function checkForUpdates() {
  try {
    const currentVersion = await getAppVersion();
    if (!currentVersion) return;
    
    const storedVersion = await getStoredVersion();
    if (hasVersionChanged(currentVersion, storedVersion)) {
      await storeVersion(currentVersion);
      await notifyClientsAboutUpdate(currentVersion);
    } else if (!storedVersion) {
      await storeVersion(currentVersion);
      await markVersionAsShown(currentVersion);
    }
  } catch (error) {
    console.error('[SW] Error checking for updates:', error);
  }
}

// --- Scheduled Notifications ---

async function storeScheduledNotification(notification) {
  try {
    await withStore('scheduledNotifications', 'readwrite', store => store.put(notification));
    console.log('[SW] Notification stored in IDB:', notification.id);
  } catch (error) {
    console.error('[SW] Error storing notification:', error);
  }
}

async function getScheduledNotifications() {
  try {
    const result = await withStore('scheduledNotifications', 'readonly', store => store.getAll());
    return result || [];
  } catch (error) {
    console.error('[SW] Error getting notifications:', error);
    return [];
  }
}

async function removeScheduledNotification(id) {
  try {
    await withStore('scheduledNotifications', 'readwrite', store => store.delete(id));
  } catch (error) {
    console.error('[SW] Error removing notification:', error);
  }
}

async function processScheduledNotifications() {
  try {
    const notifications = await getScheduledNotifications();
    const now = Date.now();
    
    for (const notification of notifications) {
      // Due now or in the past
      if (notification.scheduledTime <= now) {
        const hasPermission = await checkNotificationPermission();
        if (hasPermission) {
          await self.registration.showNotification(notification.title, {
            body: notification.body,
            icon: '/main.png',
            badge: '/main.png',
            tag: notification.tag || `event-${notification.id}`,
            data: notification.data || {},
            vibrate: [200, 100, 200],
            actions: [
              { action: 'view', title: 'View Recitations' },
              { action: 'subscribe', title: 'Subscribe' }
            ]
          });
        }
        await removeScheduledNotification(notification.id);
      } 
      // Handle very near-term notifications (within 1 minute) if we want more precision, 
      // but the prompt asked to remove setTimeout entirely from the specific lines.
      // We rely on the 1-minute interval for everything now.
    }
  } catch (error) {
    console.error('[SW] Error processing notifications:', error);
  }
}

async function cleanupScheduledNotifications() {
  try {
    const notifications = await getScheduledNotifications();
    const now = Date.now();
    // Keep entries for 24 hours after they were due, then purge
    const purgeThreshold = now - (24 * 60 * 60 * 1000);
    
    for (const notification of notifications) {
      if (notification.scheduledTime < purgeThreshold) {
        await removeScheduledNotification(notification.id);
      }
    }
  } catch (error) {
    console.error('[SW] Error cleaning up notifications:', error);
  }
}

// --- Cache Management ---

async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      await trimCache(cacheName, maxItems);
    }
  } catch (error) {
    console.error('[SW] Error trimming cache:', error);
  }
}

// --- Event Listeners ---

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE_NAME);
        await cache.addAll(STATIC_ASSETS_TO_CACHE);
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Install failed:', error);
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => (name.startsWith('sacred-') && name !== CACHE_NAME && name !== STATIC_CACHE_NAME))
            .map(name => caches.delete(name))
        );
        
        await self.clients.claim();
        await checkForUpdates();
        await processScheduledNotifications();
        
        if (!isIntervalRunning) {
          isIntervalRunning = true;
          setInterval(() => {
            checkForUpdates().catch(console.error);
            processScheduledNotifications().catch(console.error);
            cleanupScheduledNotifications().catch(console.error);
          }, VERSION_CHECK_INTERVAL);
        }
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Bypass patterns (Supabase, API, etc.)
  if (NO_CACHE_PATTERNS.some(p => p.test(url.href))) {
    event.respondWith(fetch(request));
    return;
  }

  // 2. Non-GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // 3. Static Assets (Cache-First)
  const isStatic = STATIC_EXTENSIONS.some(ext => url.pathname.endsWith(ext)) || 
                   STATIC_ASSETS_TO_CACHE.includes(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            const cacheToUse = STATIC_CACHE_NAME;
            caches.open(cacheToUse).then(cache => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. HTML/Navigation (Network-First with offline fallback)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match('/index.html') || caches.match(request))
    );
    return;
  }

  // 5. Dynamic/Other Assets (Network-First)
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            trimCache(CACHE_NAME, MAX_CACHE_SIZE);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-events' || event.tag === 'periodic-sync') {
    event.waitUntil(processScheduledNotifications());
  }
});

// Support for Periodic Background Sync API if available
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(processScheduledNotifications());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      let urlToOpen = '/calendar';
      
      if (data.type === 'app-update') {
        if (event.action === 'later') return;
        urlToOpen = '/';
      } else if (data.url) {
        urlToOpen = data.url;
      } else if (data.imamSlug) {
        urlToOpen = `/figure/${data.imamSlug}`;
      }

      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url: urlToOpen, ...data });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })()
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SCHEDULE_NOTIFICATION': {
      const { title, body, delay, data } = event.data;
      const scheduledTime = Date.now() + delay;
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      storeScheduledNotification({
        id, title, body, scheduledTime,
        data: data || {},
        tag: `event-${data?.eventId || id}`
      });
      break;
    }

    case 'CANCEL_NOTIFICATION': {
      const { id, tag } = event.data;
      if (id) {
        removeScheduledNotification(id);
      } else if (tag) {
        getScheduledNotifications().then(notifs => {
          const toCancel = notifs.find(n => n.tag === tag);
          if (toCancel) removeScheduledNotification(toCancel.id);
        });
      }
      break;
    }

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CHECK_FOR_UPDATES':
      checkForUpdates().then(() => {
        if (event.ports?.[0]) event.ports[0].postMessage({ success: true });
      });
      break;

    case 'CLEAR_CACHES':
      caches.keys()
        .then(names => Promise.all(names.map(n => caches.delete(n))))
        .then(() => {
          if (event.ports?.[0]) event.ports[0].postMessage({ success: true });
        });
      break;
  }
});
