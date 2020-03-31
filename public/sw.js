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