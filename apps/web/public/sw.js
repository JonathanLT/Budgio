const CACHE_VERSION = 'v1';
const STATIC_CACHE = `budgio-static-${CACHE_VERSION}`;
const API_CACHE = `budgio-api-${CACHE_VERSION}`;

const STATIC_PRECACHE = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Cross-origin: skip
  if (url.origin !== self.location.origin) return;

  // Next.js static assets: cache-first (immutable hashes)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((res) => {
              cache.put(request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // API calls: network-first, stale cache on failure
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request, { cacheName: API_CACHE });
          if (cached) return cached;
          return new Response(JSON.stringify({ message: 'Hors ligne — données non disponibles' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })
    );
    return;
  }

  // HTML navigation: network-first, cached page or offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request, { cacheName: STATIC_CACHE });
          if (cached) return cached;
          const root = await caches.match('/', { cacheName: STATIC_CACHE });
          if (root) return root;
          return new Response(
            '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Budgio — Hors ligne</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b}.card{text-align:center;padding:2rem;background:#fff;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:20rem}h1{font-size:2rem;margin:0 0 .5rem}p{color:#64748b;margin:.5rem 0}button{margin-top:1rem;padding:.75rem 1.5rem;background:#2563eb;color:#fff;border:none;border-radius:.5rem;font-size:1rem;cursor:pointer}</style></head><body><div class="card"><div style="font-size:3rem">📡</div><h1>Budgio</h1><p>Vous êtes hors ligne.</p><p>Les données en cache ne sont pas disponibles pour cette page.</p><button onclick="location.reload()">Réessayer</button></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Other assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
    )
  );
});
