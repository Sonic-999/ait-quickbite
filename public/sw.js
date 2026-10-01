/**
 * AIT QuickBite - Service Worker
 * Strategy: Cache First, Network Fallback for static assets (images, CSS, JS, fonts)
 * Network First with Cache Fallback for navigation and menu data
 * Built for ultra-fast instant loads on campus Wi-Fi
 */

const CACHE_VERSION = 'v1.1.0';
const STATIC_CACHE = `quickbite-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `quickbite-images-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `quickbite-dynamic-${CACHE_VERSION}`;

const CORE_APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-192x192-maskable.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/icon.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];

// 1. Install Event: Pre-cache App Shell
self.addEventListener('install', (event) => {
  console.log('[QuickBite SW] Installing Service Worker version:', CACHE_VERSION);
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[QuickBite SW] Pre-caching core app shell assets');
        return cache.addAll(CORE_APP_SHELL).catch((err) => {
          console.warn('[QuickBite SW] Pre-cache partial warning (will load on demand):', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches & claim clients
self.addEventListener('activate', (event) => {
  console.log('[QuickBite SW] Activating Service Worker...');
  const expectedCaches = [STATIC_CACHE, IMAGE_CACHE, DYNAMIC_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (!expectedCaches.includes(cacheName)) {
              console.log('[QuickBite SW] Removing outdated cache:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Helper: Check if request is a static asset
function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('/node_modules/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  );
}

// Helper: Check if request is an image asset
function isImageAsset(url, request) {
  return (
    request.destination === 'image' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico') ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('source.unsplash.com')
  );
}

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST /checkout, POST /vendor/orders)
  if (request.method !== 'GET') {
    return;
  }

  // Skip browser extensions and WebSockets
  if (!url.protocol.startsWith('http')) {
    return;
  }

  if (url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // A. Navigation Requests (HTML Pages / React SPA)
  // Network first with cache fallback to /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[QuickBite SW] Offline navigation - serving cached App Shell');
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // B. Static Assets (CSS, JS, Fonts) & Images:
  // "CACHE FIRST, NETWORK FALLBACK" Strategy
  if (isStaticAsset(url) || isImageAsset(url, request)) {
    const targetCache = isImageAsset(url, request) ? IMAGE_CACHE : STATIC_CACHE;

    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Found in cache: Return immediately (instant load!)
          // Stale-while-revalidate in background for non-hashed resources
          if (!url.pathname.includes('/assets/')) {
            fetch(request)
              .then((freshResponse) => {
                if (freshResponse && (freshResponse.ok || freshResponse.type === 'opaque')) {
                  caches.open(targetCache).then((cache) => cache.put(request, freshResponse));
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        // Not in cache: Network Fallback
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
              const responseToCache = networkResponse.clone();
              caches.open(targetCache).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((fetchError) => {
            console.warn('[QuickBite SW] Fetch failed for asset:', url.pathname, fetchError.message);

            // If image request fails offline, provide a fallback SVG icon
            if (isImageAsset(url, request)) {
              return caches.match('/icons/icon.svg');
            }
            throw fetchError;
          });
      })
    );
    return;
  }

  // C. API Requests (e.g. GET /api/menu):
  // Network first with dynamic cache fallback for offline browsing
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/menu')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && url.pathname.includes('/menu')) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedApi = await caches.match(request);
          if (cachedApi) {
            console.log('[QuickBite SW] Serving cached menu data during network outage');
            return cachedApi;
          }
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              error: 'Campus network connection offline. Reconnecting...',
            }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          );
        })
    );
    return;
  }

  // D. Default: Cache First, Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request)
        .then((response) => {
          if (response && (response.ok || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

// 4. Handle client messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
