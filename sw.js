// 離線快取：只快取 App 本身的檔案，不會碰到你的資料
const CACHE = 'pass-memo-v8';
const ASSETS = [
  './', 'index.html', 'boot.js', 'style.css', 'app.js', 'vault.js', 'manifest.webmanifest',
  'icons/app-icon-v2-192.png', 'icons/app-icon-v2-512.png', 'icons/app-icon-v2-maskable-512.png',
  'icons/app-icon-v2-apple-touch.png', 'icons/portrait-v2.png',
  'fonts/yomogi-title.woff2', 'fonts/quicksand-300.woff2', 'fonts/quicksand-400.woff2', 'fonts/quicksand-500.woff2',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' 直接向伺服器抓最新檔案，不使用瀏覽器暫存，避免新版本存進舊檔案
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

// 安裝資訊（manifest 與圖示）先問伺服器，離線時才用快取，讓 Android 安裝時一定拿到最新圖示
const networkFirst = (req) =>
  fetch(req, { cache: 'no-cache' })
    .then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })
    .catch(() => caches.match(req, { ignoreSearch: true }));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('.webmanifest') || url.pathname.includes('/icons/')) {
    e.respondWith(networkFirst(req));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) =>
      hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
