const CACHE_NAME = 'shiden-cache-v2';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/favicon.ico',
  '/data/stages.json',
  '/data/kenju.json',
  '/data/chapter2_flow.json',
  '/data/story_assets.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 外部(Firebase Storageなど)の画像や、ローカルの静的アセットをキャッシュ対象にする
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // キャッシュ対象の拡張子
  const cacheableExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.json', '.txt', '.mid', '.csv'];
  const isCacheable = cacheableExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext)) || url.href.includes('firebasestorage.googleapis.com');

  if (isCacheable) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response; // キャッシュがあればそれを返す
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !url.href.includes('firebasestorage.googleapis.com')) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  } else {
    event.respondWith(fetch(event.request));
  }
});
