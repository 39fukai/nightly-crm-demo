const CACHE = "nightly-crm-v4-" + self.registration.scope;
const CORE = ["./", "index.html", "manifest.json", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png"]
  .map(file => new URL(file, self.registration.scope).href);

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("nightly-crm-") && key !== CACHE && (!key.includes("http") || key.endsWith(self.registration.scope))).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.href === new URL("api/data", self.registration.scope).href) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && CORE.includes(url.href)) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") return caches.match(new URL("index.html", self.registration.scope).href);
      return Response.error();
    })
  );
});
