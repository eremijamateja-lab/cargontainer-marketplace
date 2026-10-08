// Cargontainer Marketplace service worker: only Web Push ("Novi upit") — no caching,
// so a deploy is never hidden behind a stale cached app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Cargontainer', body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Cargontainer Marketplace', {
      body: data.body || '',
      tag: data.tag,
      renotify: !!data.tag,
      icon: '/icon-512.png',
      badge: '/icon-512.png',
      data: { url: data.url || '/marketplace' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/marketplace', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
        await w.focus();
        if ('navigate' in w) return w.navigate(url);
        return;
      }
    }
    return self.clients.openWindow(url);
  })());
});
