const CACHE = 'kedo-brain-v26';
const STATIC = [
  '/',
  '/index.html',
  '/styles.css?v=25',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/js/state.js',
  '/js/gestures.js',
  '/js/particles.js',
  '/js/reflection.js',
  '/js/habits.js',
  '/js/router.js',
  '/js/actions.js',
  '/js/views/home.js',
  '/js/views/agenda.js',
  '/js/views/journal.js',
  '/js/views/dash.js',
  '/js/views/areas.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname === 'api.anthropic.com') return;

  /* Navegación: network-first → siempre baja el HTML más nuevo cuando hay red.
     Fallback a caché para modo offline. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put('/index.html', clone)); }
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  /* Todo lo demás: cache-first.
     El bump de CACHE + query param en CSS garantiza descarga fresca en cada deploy. */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
        return res;
      });
    })
  );
});
