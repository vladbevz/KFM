const CACHE_NAME = "kfm-suivi-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigations : réseau d'abord, page hors-ligne si indisponible. On ne
  // sert jamais de HTML applicatif en cache (données trop sensibles/datées
  // pour un suivi journalier), seulement le fallback statique.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Uniquement les vrais assets statiques (icônes, manifest) : cache
  // d'abord. Tout le reste (fetch RSC de Next.js, server actions, appels
  // Supabase) doit passer au réseau sans interception — ce sont des
  // requêtes dynamiques par utilisateur/paramètre, jamais des candidats au
  // cache, et les intercepter ici provoquait des rejets de promesse quand
  // Next.js annule une requête en cours (clic sur un autre filtre avant la
  // fin du précédent).
  const url = new URL(request.url);
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname === "/manifest.json" || url.pathname.startsWith("/icons/"));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
