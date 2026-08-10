// Service Worker for rgomassenger Push Notifications and Background Synchronization

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background Push events
self.addEventListener('push', (event) => {
  let data = { title: 'rgomassenger', body: 'নতুন একটি মেসেজ এসেছে' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'নতুন মেসেজ এসেছে',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    tag: 'messenger-msg-' + Date.now(),
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(`💬 ${data.title || 'মেসেঞ্জার'}`, options)
  );
});

// Handle Notification Clicks (Open app window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});
