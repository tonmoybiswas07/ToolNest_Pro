const CACHE_NAME = "toolnest-pro-v3";
const OFFLINE_PAGE = "/offline.html";
const MAX_STATIC_ENTRIES = 128;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(OFFLINE_PAGE);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("toolnest-pro-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function cachedAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    try {
      await cache.put(request, response.clone());
      const keys = (await cache.keys()).filter((key) => new URL(key.url).pathname !== OFFLINE_PAGE);
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES))
        .map((key) => cache.delete(key)));
    } catch {
      // Serve the network response if browser storage is full or unavailable.
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Turbopack uses URL fragments to select a worker entry point. Cache Storage
  // ignores fragments, so separate worker entry points can share a cache key.
  if (request.destination === "worker" || request.destination === "sharedworker") return;

  if (url.pathname.startsWith("/_next/static/") && !url.search) {
    event.respondWith(cachedAsset(request));
  } else if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(OFFLINE_PAGE)) ?? Response.error();
    }));
  }
});
