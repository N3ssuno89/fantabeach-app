// FantaBeach 2026 — Service Worker
// Versione cache: incrementa per forzare aggiornamento
const CACHE_VERSION = 'fantabeach-v1';
const STATIC_CACHE = [
  '/',
  '/index.html',
];

// Installazione: pre-cacha le risorse base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_CACHE);
    })
  );
  self.skipWaiting();
});

// Attivazione: pulisce cache vecchie
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback cache per navigazione
// Le chiamate API (Supabase, Netlify) vanno sempre in rete
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Lascia passare sempre: API Supabase, Netlify Functions, Google
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('netlify') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('google.com') ||
    url.pathname.startsWith('/.netlify/')
  ) {
    return; // nessun intercept, va diretto in rete
  }

  // Per la navigazione: network first, fallback su index.html (SPA routing)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html')
      )
    );
    return;
  }

  // Per asset statici: network first con fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Salva in cache se è una risposta valida
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
