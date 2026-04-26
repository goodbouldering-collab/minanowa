/* Minimal Service Worker — offline-tolerant cache for static assets only.
 * - HTML / API は network-first（常に最新）
 * - 画像 / アイコン / フォント / svg は cache-first（オフライン時の見栄え担保）
 */
const CACHE = 'wa-v3';
const STATIC = [
    '/favicon.svg',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon.png',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    // 同一オリジンのみキャッシュ対象（外部 API は素通し）
    if (url.origin !== location.origin) return;
    // API / admin / SSE 等はネットワーク優先（キャッシュしない）
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin') || url.pathname === '/feed') return;

    // 画像/フォント/SVG/アイコンは cache-first
    if (/\.(png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/i.test(url.pathname)) {
        e.respondWith(
            caches.match(req).then(hit => hit || fetch(req).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
                }
                return res;
            }).catch(() => caches.match('/icon-192.png')))
        );
        return;
    }

    // HTML は network-first（フォールバックでキャッシュ）
    if (req.headers.get('accept')?.includes('text/html')) {
        e.respondWith(
            fetch(req).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
                }
                return res;
            }).catch(() => caches.match(req).then(hit => hit || caches.match('/')))
        );
        return;
    }
});
