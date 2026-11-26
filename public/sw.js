// Chirp's service worker. For now it only handles clicks on notification
// pop-ups: it focuses an open Chirp tab and takes it to the right page, or
// opens Chirp if no tab is open. It does not cache anything.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin)
    .href;
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const tab = tabs.find(
        (c) => new URL(c.url).origin === self.location.origin,
      );
      if (tab) {
        await tab.focus();
        // The page navigates itself (keeps the app state); see Pinger.
        tab.postMessage({ type: "open", url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
