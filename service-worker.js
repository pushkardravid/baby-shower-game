const CACHE_NAME = "design-the-baby-v6";
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
  "./assets/dad_face.jpg",
  "./assets/portrait_mmmm.jpg",
  "./assets/portrait_mmmd.jpg",
  "./assets/portrait_mmdm.jpg",
  "./assets/portrait_mdmm.jpg",
  "./assets/portrait_dmmm.jpg",
  "./assets/portrait_ddmm.jpg",
  "./assets/portrait_dmdd.jpg",
  "./assets/portrait_dddd.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});

self.addEventListener("fetch", event => {
  if (event.request.url.includes("/api/")) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
