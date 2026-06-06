const CACHE_NAME = "design-the-baby-v4";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",
  "./assets/mom.jpg",
  "./assets/dad.jpg",
  "./assets/mom_eyes.jpg",
  "./assets/dad_eyes.jpg",
  "./assets/mom_hair.jpg",
  "./assets/dad_hair.jpg",
  "./assets/mom_nose.jpg",
  "./assets/dad_nose.jpg",
  "./assets/mom_smile.jpg",
  "./assets/dad_smile.jpg",
  "./assets/mom_face.jpg",
  "./assets/dad_face.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
