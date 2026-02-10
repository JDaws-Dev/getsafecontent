// SafeTunes Service Worker for Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'You have a new notification',
      icon: '/safetunes-icon-192.png',
      badge: '/safetunes-badge-72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        requestId: data.requestId,
        type: data.type,
      },
      actions: data.actions || [
        { action: 'view', title: 'View Request' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      tag: data.tag || 'safetunes-notification',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'SafeTunes', options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Navigate to the app when notification is clicked
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
