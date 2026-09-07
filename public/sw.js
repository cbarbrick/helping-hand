// Helping Hand service worker: makes the site installable as an app.
// It passes every request straight to the network (no caching), so nothing ever goes stale.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
