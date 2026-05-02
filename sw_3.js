// Service Worker — シンガポール旅行アプリ オフラインキャッシュ
const CACHE_NAME = 'sg-trip-v1';

// キャッシュするファイル（オフラインでも開けるようにする）
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // PDF（ファイルが存在する場合のみキャッシュ）
  './files/eticketMrASANOAkira.pdf',
  './files/eticketMrsWANGSisi.pdf',
  './files/eticketMissASANORay.pdf',
  './files/Reservation_Confirmation_93479246_for_JW_Marriott_Hotel_Singapore_South_Beach.pdf',
  './files/Your_Marriott_Bonvoy_and_KrisFlyer_Accounts_Are_Linked.pdf',
  './files/TermsConditions.pdf',
];

// 外部CDN（ネット接続時のみ取得）
const EXTERNAL_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

// インストール時にキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // メインファイルをキャッシュ（存在しないPDFはスキップ）
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.log('Cache skip:', url);
        }
      }
      // 外部CDNもキャッシュ
      for (const url of EXTERNAL_URLS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.log('CDN cache skip:', url);
        }
      }
    })
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// リクエスト処理：キャッシュ優先、なければネット取得
self.addEventListener('fetch', event => {
  // Firebase・天気・為替APIはキャッシュしない（常にネット）
  const url = event.request.url;
  if (
    url.includes('firebase') ||
    url.includes('open-meteo') ||
    url.includes('frankfurter') ||
    url.includes('open.er-api') ||
    url.includes('fawazahmed0') ||
    url.includes('tile.openstreetmap') // 地図タイルは動的なので除外
  ) {
    return; // デフォルトのネット取得に任せる
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 成功したレスポンスをキャッシュに追加
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // オフライン時のフォールバック
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
