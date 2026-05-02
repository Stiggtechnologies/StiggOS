/* Stigg Field — service worker.
 *
 * Two responsibilities:
 *   1. Shell cache: offline-first for the app shell + JS/CSS hashed assets.
 *   2. Background sync hook: lets the page fire SyncManager.register('replay-queue')
 *      so queued mutations replay even after the page is closed.
 *
 * Bumping CACHE_VERSION invalidates old caches on next service-worker install.
 */

const CACHE_VERSION = 'stigg-field-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      try { await cache.addAll(SHELL); } catch (_) { /* offline first install — best effort */ }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache Supabase API or edge function calls — those need fresh data
  // and the in-app offline queue handles writes.
  if (url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/functions/v1/')) {
    return; // default network handling
  }

  // Stale-while-revalidate for hashed assets; network-first for navigations.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put('/index.html', fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match('/index.html')) ?? new Response('offline', { status: 503 });
      }
    })());
    return;
  }

  // Same-origin assets → cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const hit = await cache.match(req);
      const network = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit ?? (await network) ?? new Response('offline', { status: 503 });
    })());
  }
});

// Allow the page to ask the SW to replay the queue when it becomes online.
// The actual replay logic lives in src/lib/queue.ts so it can call
// authenticated Supabase APIs from the page context.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'replay-queue' && event.source) {
    // The page handles replay itself; we just acknowledge.
    event.source.postMessage({ type: 'replay-ack' });
  }
});

self.addEventListener('sync', (event) => {
  // Triggered by navigator.serviceWorker.ready.then(r => r.sync.register('replay-queue'))
  // when the device reconnects. We notify all clients so they replay.
  if (event.tag === 'replay-queue') {
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) c.postMessage({ type: 'replay-queue' });
    })());
  }
});
