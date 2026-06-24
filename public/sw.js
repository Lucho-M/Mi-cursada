const CACHE_NAME = 'mi-cursada-shell-v1';
const SHELL_ASSETS = ['/', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Solo cachea la navegacion (shell) para que la app pueda abrir offline.
// El resto de los pedidos (Firebase, fonts, API) van directo a la red:
// esta app depende de datos en tiempo real, cachearlos rompería la
// consistencia de notas/inscripciones/oferta.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match('/'))
  );
});
