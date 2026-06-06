const CACHE_NAME = "design-the-baby-v2";
const FILES = ["./", "./index.html", "./manifest.json", "./service-worker.js"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});