const CACHE = 'vascflow-v22';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.json', './favicon.ico', './icon.svg', './logo.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './supine.gif', './arm.gif', './arm_left.gif', './ankle.gif'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match('./index.html'))));
});
