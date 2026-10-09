/* CAIPSD Portal service worker: lets the portal install as an app and open the last saved copy when offline.
   Only the page itself is cached; everything else (logins, data) always goes to the network. */
const PAGE_CACHE = 'caipsd-portal-page-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {   // save the page on the first visit too
    try {
      const url = self.registration.scope, res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
      if (res.ok) await (await caches.open(PAGE_CACHE)).put(new Request(new URL(url).pathname), res);
    } catch (err) {}
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== PAGE_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.mode !== 'navigate' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(PAGE_CACHE), key = new Request(new URL(req.url).pathname);
    try {
      const res = await fetch(req.url, { cache: 'no-store', credentials: 'same-origin' });   // always the newest version when online
      if (res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(key)) || Response.error();
    }
  })());
});
