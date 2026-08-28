const CACHE_NAME = "kfm-suivi-v3";
const OFFLINE_URL = "/offline.html";
// Les icônes vivent à la racine de /public (cf. manifest.json), pas sous
// /icons/ — un mauvais chemin ici faisait échouer cache.addAll() en entier
// (404 sur les deux icônes), donc l'installation du service worker échouait
// silencieusement à chaque fois et il ne s'activait jamais.
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
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
    (url.pathname === "/manifest.json" || /^\/icon-\d+(-maskable)?\.png$/.test(url.pathname));

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

// Notifications push (Module B) — indépendant du cache/offline ci-dessus,
// n'intercepte aucune requête fetch.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "KFM Suivi", body: event.data.text() };
  }

  const title = payload.title || "KFM Suivi";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
