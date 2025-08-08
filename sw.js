const CACHE_NAME = 'inmuebles-v-admin-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/index.css',
  'https://res.cloudinary.com/dcm5pug0v/image/upload/v1753987097/Inmobiliaria_V_logo_2-removebg-preview_vfth4r.png',
  'https://res.cloudinary.com/dcm5pug0v/image/upload/v1753922572/8944aae38e7675be7b918a8e0ac2a5db_unrmac.gif'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching App Shell');
        return cache.addAll(APP_SHELL_URLS);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Always go to the network for Firestore requests to get fresh data.
  if (event.request.url.includes('firestore.googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For all other GET requests, use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return networkResponse;
        }).catch(error => {
          console.error('[Service Worker] Fetch failed:', error);
          // Here you could return a fallback offline page if you had one.
        });
      })
  );
});
