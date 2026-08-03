/* Service worker volontairement minimal.
   Il ne met en cache que les fichiers immuables produits par la
   compilation et les images du site. Les pages passent toujours par le
   réseau : sur une place de marché, servir une annonce périmée depuis
   un cache serait pire que d'afficher une page d'attente. */
const CACHE = 'mpp-v1';
const HORS_LIGNE = '/hors-ligne.html';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([HORS_LIGNE, '/logo.png', '/icone-192.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers immuables : le cache d'abord, c'est ce qui rend le
  // démarrage instantané.
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then((rep) => rep || fetch(request).then((r) => {
        const copie = r.clone();
        caches.open(CACHE).then((c) => c.put(request, copie));
        return r;
      }))
    );
    return;
  }

  // Pages : le réseau, et une page d'attente si la connexion manque.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match(HORS_LIGNE)));
  }
});
