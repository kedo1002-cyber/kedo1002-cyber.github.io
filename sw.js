const CACHE = 'kedo-brain-v11';
const STATIC = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/js/state.js',
  '/js/particles.js',
  '/js/reflection.js',
  '/js/habits.js',
  '/js/router.js',
  '/js/actions.js',
  '/js/views/home.js',
  '/js/views/agenda.js',
  '/js/views/journal.js',
  '/js/views/dash.js',
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

  /* Navegación: cache-first → app arranca instantáneo sin esperar la red */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html')
        .then(cached => cached || fetch(e.request))
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  /* Todo lo demás: cache-first
     El bump de CACHE en cada deploy garantiza que los archivos nuevos
     se descarguen en la instalación del SW, no en cada apertura. */
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
