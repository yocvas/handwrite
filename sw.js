// Offline support: cache the app shell, and fonts on first use.
const CACHE = 'kotvim-v5';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/data.js', 'js/store.js', 'js/pad.js', 'js/strokes.js', 'js/minigame.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' bypasses the HTTP cache so a fresh deploy isn't precached stale
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const put = (req, res) => caches.open(CACHE).then(c => c.put(req, res)).catch(() => {});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Fonts never change: cache first. Google's CSS comes back opaque (no CORS), which is fine to keep.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === 'opaque') put(e.request, res.clone());
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;

  // App files: network first so updates show up, but fall back to the cache after 3s
  // (weak Wi-Fi shouldn't leave a white screen) or when offline.
  const net = fetch(e.request).then(res => {
    if (res.ok && res.status === 200) put(e.request, res.clone());
    return res;
  });
  const cached = () => caches.match(e.request, { ignoreSearch: true });
  const timeout = new Promise(r => setTimeout(r, 3000)).then(cached);
  e.respondWith(Promise.race([net.catch(() => undefined), timeout])
    .then(r => r || net)
    .catch(cached));
});
