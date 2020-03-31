const version = "0.6.25";
const cacheName = `airhorner-${version}`;
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll([
        `/`,
        `/index.html`,
        `/build/bundle.css`,
        `/build/bundle.js`
      ])
          .then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(cacheName)
      .then(cache => cache.match(event.request, {ignoreSearch: true}))
      .then(response => {
      return response || fetch(event.request);
    })
  );
});


self.addEventListener('push', function(event) {
  event.waitUntil(self.registration.showNotification(event.data.text()));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  console.log(event.notification.tag)
  event.waitUntil(
    clients.openWindow(event.notification.tag)
  );
});