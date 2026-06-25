// Service Worker のキャッシュ名。更新時にここを上げると古いキャッシュが破棄される。
const CACHE_NAME = "plate-app-v4";

// install イベントで事前キャッシュするファイル。
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  // 新しい Service Worker をすぐ有効化する。
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", event => {
  // この Service Worker をすぐに制御させる。
  self.clients.claim();

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", event => {
  // ページのナビゲーション要求はネットワーク優先で最新の index.html を取得し、
  // 失敗した場合のみキャッシュを返す。
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", responseClone));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // その他リソースはキャッシュを先行表示しつつ、バックグラウンドで最新を取りに行って更新する。
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const networkFetch = fetch(event.request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || networkFetch;
    })
  );
});
