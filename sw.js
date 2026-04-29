const CACHE_NAME = "vocab-app-v2";
const STATIC_ASSETS = [
  "./index.html",
  "./manifest.json"
];

// インストール時：静的ファイルをキャッシュ
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 古いキャッシュを削除
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// フェッチ戦略：
//   Google Sheets CSV → ネットワーク優先（失敗時はスキップ）
//   静的ファイル      → キャッシュ優先
self.addEventListener("fetch", event => {
  const url = event.request.url;

  if (url.includes("docs.google.com/spreadsheets")) {
    // CSVは常にネットワークから取得（最新データ）
    event.respondWith(
      fetch(event.request).catch(() => new Response("", { status: 503 }))
    );
    return;
  }

  // 静的ファイル：キャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
