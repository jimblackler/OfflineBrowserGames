/// <reference lib="webworker" />

const CACHE_NAME = 'offline-cache';

export {};

const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

serviceWorker.addEventListener('install', event => {
  event.waitUntil(serviceWorker.skipWaiting());
});

serviceWorker.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await serviceWorker.clients.claim();
  })());
});

serviceWorker.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Cache-First strategy for hashed assets (under /dist/)
  if (new URL(event.request.url).pathname.startsWith('/dist/')) {
    event.respondWith((async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      const networkResponse = await fetch(event.request);
      if (networkResponse.status === 200) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
        } catch {
          // Ignore errors
        }
      }
      return networkResponse;
    })());
    return;
  }

  // Network-First strategy for other requests (HTML, CSS, images, etc.)
  event.respondWith((async () => {
    try {
      const networkResponse = await fetch(event.request);
      if (networkResponse.status === 200) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
        } catch {
          // Ignore errors
        }
      }
      return networkResponse;
    } catch {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response('Offline content not available', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' })
      });
    }
  })());
});
