const CACHE_NAME = 'mi-cursada-shell-v2';
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

// La navegacion (carga de index.html) va a la red primero, y si falla
// (offline) usa el shell cacheado para que la app pueda abrir.
//
// Los assets propios del build (JS/CSS/imagenes, con nombre hasheado por
// Vite y distinto en cada deploy) tambien van a la red primero, pero la
// respuesta se guarda en cache a medida que se piden. Asi, la proxima vez
// que se abra offline, el bundle de React ya esta disponible y la app
// puede arrancar (sin esto, el HTML cacheado quedaba sin su JS y la
// pantalla se veia en blanco).
//
// Todo lo demas (Firebase, Firestore, fonts externas) va directo a la red
// sin cachear: esta app depende de datos en tiempo real, cachearlos
// rompería la consistencia de notas/inscripciones/oferta.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  if (['script', 'style', 'image', 'font', 'manifest'].includes(req.destination)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
