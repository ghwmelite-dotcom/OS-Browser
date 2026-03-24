const CACHE_NAME = 'os-browser-mini-v10';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  // Skip waiting immediately — take over from old SW
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Wipe ALL caches on activate — ensures fresh content
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => caches.open(CACHE_NAME))
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first with cache fallback (GET only — POST can't be cached)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('workers.dev') || url.hostname.includes('askozzy.work')) {
    if (event.request.method !== 'GET') return; // Don't intercept POST/PUT/DELETE
    event.respondWith(
      fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML and JS: network-first (so new deploys take effect immediately)
  // Other static assets (images, fonts): cache-first
  const isNavigationOrScript = event.request.mode === 'navigate' ||
    url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/';

  if (isNavigationOrScript) {
    event.respondWith(
      fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'OS Browser Mini', body: 'New notification' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.url || '/',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].navigate(event.notification.data);
      } else {
        self.clients.openWindow(event.notification.data);
      }
    })
  );
});
