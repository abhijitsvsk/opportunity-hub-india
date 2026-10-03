const CACHE_NAME = 'opphub-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/dashboard',
  '/login'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Ignore failures if some routes aren't built yet
      return Promise.all(
        ASSETS_TO_CACHE.map(url => 
          fetch(url).then(response => {
            if (response.ok) return cache.put(url, response);
          }).catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets - cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|css|js|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Default: Network with offline fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then(response => response || caches.match('/')))
  );
});
