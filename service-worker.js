const CACHE_NAME = "moms-eyes-dads-smile-v10";
const FILES = ["./","./index.html","./manifest.json","./service-worker.js","./assets/mom.jpg","./assets/dad.jpg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))));
self.addEventListener("fetch", event => {
  if (event.request.url.includes("/api/")) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
