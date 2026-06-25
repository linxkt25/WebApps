// キャッシュを識別するための接頭辞。自動生成したハッシュをこの先頭に付ける。
const CACHE_PREFIX = "plate-app-";

// install 時にキャッシュしておくリソース一覧。
const urlsToCache = [
  "./",            // ルートパス（index.html の省略形）
  "./index.html", // アプリの最初のページ
  "./style.css",  // スタイルシート
  "./script.js",  // メインのアプリスクリプト
  "./manifest.json" // PWA のメタデータ
];

let cacheNamePromise = null;

// URL一覧の内容をまとめてSHA-256ハッシュを生成し、キャッシュ名として使う。
async function getCacheName() {
  if (cacheNamePromise) {
    return cacheNamePromise;
  }

  cacheNamePromise = (async () => {
    const encoder = new TextEncoder();
    const contents = await Promise.all(
      urlsToCache.map(async url => {
        const response = await fetch(url, { cache: "reload" });
        const text = await response.text();
        return `${url}:${text}`;
      })
    );

    const digest = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(contents.join("|"))
    );
    const hashArray = Array.from(new Uint8Array(digest));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return `${CACHE_PREFIX}${hashHex.slice(0, 16)}`;
  })();

  return cacheNamePromise;
}

self.addEventListener("install", event => {
  // 新しい Service Worker をすぐに有効化し、インストール完了後に使えるようにする。
  self.skipWaiting();

  event.waitUntil((async () => {
    const cacheName = await getCacheName();
    const cache = await caches.open(cacheName);
    await cache.addAll(urlsToCache);
  })());
});

self.addEventListener("activate", event => {
  // 新しい Service Worker をすぐにページで使わせる。
  self.clients.claim();

  event.waitUntil((async () => {
    const currentCacheName = await getCacheName();
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== currentCacheName)
        .map(key => caches.delete(key))
    );
  })());
});

self.addEventListener("fetch", event => {
  // ブラウザのナビゲーション要求（URL直接入力やリンク遷移など）には
  // network-first を適用して最新の index.html を取得しにいく。
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const responseClone = networkResponse.clone();
        const currentCacheName = await getCacheName();
        const cache = await caches.open(currentCacheName);
        await cache.put("./index.html", responseClone);
        return networkResponse;
      } catch (error) {
        return caches.match("./index.html");
      }
    })());
    return;
  }

  // その他のリソースはキャッシュ優先で返しつつ、バックグラウンドで最新を取得して更新する。
  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    const currentCacheName = await getCacheName();
    const cache = await caches.open(currentCacheName);

    const networkFetch = fetch(event.request)
      .then(async networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        await cache.put(event.request, responseClone);
        return networkResponse;
      })
      .catch(() => null);

    return cachedResponse || networkFetch;
  })());
});
