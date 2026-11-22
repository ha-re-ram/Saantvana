const CACHE = 'saantvana-shell-v4';

self.addEventListener('install', (event) => {
  const scope = self.registration.scope;
  const shellUrls = [
    new URL('./', scope).pathname,
    new URL('./index.html', scope).pathname,
    new URL('./manifest.webmanifest', scope).pathname,
    new URL('./icon.svg', scope).pathname
  ];
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(shellUrls).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const pathname = new URL(event.request.url).pathname;
          const type = response.headers.get('content-type') || '';
          if (
            !pathname.endsWith('.wasm') &&
            !type.includes('application/onnx') &&
            !type.includes('video/') &&
            !type.includes('audio/')
          ) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
        }
        return response;
      }).catch(() => {
        const scope = self.registration.scope;
        return caches.match(new URL('./index.html', scope).pathname) || caches.match(new URL('./', scope).pathname);
      });
    })
  );
});
