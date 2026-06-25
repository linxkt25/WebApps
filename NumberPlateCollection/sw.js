// この Service Worker はアプリのリソースをキャッシュし、
// オフライン時や再読み込み時の応答を安定させるために使われます。
//
// ここでは、キャッシュ名をファイル内容のハッシュに基づいて自動生成し、
// コンテンツが変わるごとに新しいキャッシュを作成する仕組みにしています。

// キャッシュ名に付ける接頭辞。
// 実際のキャッシュ名はこの prefix にハッシュを付けたものになります。
const CACHE_PREFIX = "plate-app-";

// インストール時にキャッシュしておきたいファイルの一覧。
// これらは基本的にアプリの主要リソースで、オフラインでも必要になるものです。
const urlsToCache = [
  "./",            // ルートURL。GitHub Pages では index.html に対応します。
  "./index.html", // アプリの最初に表示するHTML。
  "./style.css",  // 画面表示用のスタイル。
  "./script.js",  // 画面の振る舞いを制御するスクリプト。
  "./manifest.json" // PWA 用のメタデータ定義。
];

// キャッシュ名を一度だけ計算して使い回すためのPromise。
// 同じ Service Worker の内部で何度もハッシュ計算しないようにするためです。
let cacheNamePromise = null;

// キャッシュ名を生成する関数。
// urlsToCache に含まれる全リソースを fetch し、内容をまとめて SHA-256 ハッシュ化する。
// ハッシュ結果を先頭に付けた文字列をキャッシュ名として返す。
async function getCacheName() {
  if (cacheNamePromise) {
    return cacheNamePromise;
  }

  cacheNamePromise = (async () => {
    const encoder = new TextEncoder();

    // 各URLの内容を取得し、URLと内容を連結して1つの文字列にする。
    // 画像のようなバイナリはここでは扱わず、テキストベースのリソース想定です。
    const contents = await Promise.all(
      urlsToCache.map(async url => {
        const response = await fetch(url, { cache: "reload" });
        const text = await response.text();
        return `${url}:${text}`;
      })
    );

    // 取得した全リソースの内容を1つにまとめ、SHA-256 ハッシュを計算する。
    // このハッシュはファイル内容が変われば確実に変わるため、キャッシュのバージョン管理に使える。
    const digest = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(contents.join("|"))
    );
    const hashArray = Array.from(new Uint8Array(digest));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // ハッシュは長いので、先頭16文字だけ使ってキャッシュ名を生成する。
    return `${CACHE_PREFIX}${hashHex.slice(0, 16)}`;
  })();

  return cacheNamePromise;
}

self.addEventListener("install", event => {
  // Service Worker がインストールされるときに呼ばれる。
  // skipWaiting() を呼んで、インストール後すぐに新しい SW を使えるようにする。
  self.skipWaiting();

  event.waitUntil((async () => {
    const cacheName = await getCacheName();
    const cache = await caches.open(cacheName);

    // urlsToCache に記載したすべてのファイルをキャッシュに保存する。
    // ここで失敗すると install イベント全体が失敗し、SW は活性化されない。
    await cache.addAll(urlsToCache);
  })());
});

self.addEventListener("activate", event => {
  // Service Worker が有効化されるときに呼ばれる。
  // clients.claim() を使うと、ページをリロードしなくても新しい SW が
  // すぐに現在のページを制御できるようになる。
  self.clients.claim();

  event.waitUntil((async () => {
    const currentCacheName = await getCacheName();
    const keys = await caches.keys();

    // 以前のキャッシュ名と異なるキャッシュをすべて削除する。
    // これにより、古いバージョンのキャッシュが残らず、ストレージを無駄に使わない。
    await Promise.all(
      keys
        .filter(key => key !== currentCacheName)
        .map(key => caches.delete(key))
    );
  })());
});

self.addEventListener("fetch", event => {
  // ブラウザがリソースを要求するたびに呼ばれる。
  // event.request には要求されたURLやモードなどの情報が入る。

  // ページ全体の読み込み（ナビゲーション）は、まずネットワークから最新を取得しにいく。
  // 取得できない場合だけキャッシュを使う network-first 戦略を採用している。
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const responseClone = networkResponse.clone();
        const currentCacheName = await getCacheName();
        const cache = await caches.open(currentCacheName);

        // index.html の内容を最新に更新しておく。
        await cache.put("./index.html", responseClone);
        return networkResponse;
      } catch (error) {
        // ネットワークに失敗した場合はキャッシュ済みの index.html を返す。
        return caches.match("./index.html");
      }
    })());
    return;
  }

  // CSS/JS/画像などの他の静的リソースは、まずキャッシュを探して返す。
  // キャッシュがない場合はネットワークから取得し、成功したらキャッシュを更新する。
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

    // キャッシュがあればそれを先に返し、なければネットワーク結果を返す。
    return cachedResponse || networkFetch;
  })());
});
