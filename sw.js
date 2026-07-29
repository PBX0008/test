const CACHE_NAME = 'nclex-rn-practice-v128';
const META_CACHE_NAME = 'nclex-rn-practice-meta-v128';
const OFFLINE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const APP_SHELL = [
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
  './.nojekyll',
  './admin.html',
  './404.html',
  './index.html',
  './main.html',
  './repo-config.js',
  './site.webmanifest',
  './assets/access.js',
  './assets/admin.css',
  './assets/admin.js',
  './assets/app.js',
  './assets/haptics.js',
  './assets/styles.css',
  './data/tests.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './questions/cardiology.json',
  './questions/endocrinology.json',
  './questions/final1.json',
  './questions/final10.json',
  './questions/final2.json',
  './questions/final3.json',
  './questions/final4.json',
  './questions/final5.json',
  './questions/final6.json',
  './questions/final7.json',
  './questions/final8.json',
  './questions/final9.json',
  './questions/gastroinstestinal.json',
  './questions/gynaecology.json',
  './questions/mental-health.json',
  './questions/musculoskeletal.json',
  './questions/neurology.json',
  './questions/pediatrics.json',
  './questions/renal-reproductive.json',
  './questions/respiratory.json',
  './assets/css/main.css',
  './assets/css/noscript.css',
  './assets/sass/main.scss',
  './assets/sass/noscript.scss',
  './assets/css/images/bg.jpg',
  './assets/css/images/overlay-pattern.png',
  './assets/css/images/overlay.svg',
  './assets/sass/libs/_breakpoints.scss',
  './assets/sass/libs/_functions.scss',
  './assets/sass/libs/_mixins.scss',
  './assets/sass/libs/_vars.scss',
  './assets/sass/libs/_vendor.scss',
  './assets/css/images/ie/footer.png',
  './assets/css/images/ie/footer.svg'
];

function isHttpLikeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function timestampRequest(urlPath) {
  // Safari Cache API only accepts http/https Request URLs. Do not use custom schemes such as meta:.
  const key = encodeURIComponent(String(urlPath || '/'));
  return new Request(new URL(`__nclex_sw_meta__/${key}`, self.registration.scope).href);
}

async function putTimestamp(url) {
  try {
    const meta = await caches.open(META_CACHE_NAME);
    await meta.put(timestampRequest(url), new Response(JSON.stringify({ timestamp: Date.now() }), { headers: { 'Content-Type': 'application/json' } }));
  } catch {
    // Timestamp metadata is optional. Never allow metadata writes to break page loading.
  }
}

async function getTimestamp(url) {
  try {
    const meta = await caches.open(META_CACHE_NAME);
    const response = await meta.match(timestampRequest(url));
    if (!response) return 0;
    const data = await response.json();
    return Number(data.timestamp || 0);
  } catch {
    return 0;
  }
}

async function matchCached(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(request, { ignoreSearch: true }) || cache.match(request);
}

async function isFreshEnough(request) {
  const timestamp = await getTimestamp(new URL(request.url).pathname);
  if (!timestamp) return true;
  return Date.now() - timestamp <= OFFLINE_TTL_MS;
}

async function cacheResponse(request, response) {
  if (!response || !response.ok || !isHttpLikeUrl(request.url)) return response;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    await putTimestamp(new URL(request.url).pathname);
  } catch {
    // Cache writes are best-effort; the network response should still be returned.
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return cacheResponse(request, response);
  } catch (error) {
    const cached = await matchCached(request);
    if (cached && await isFreshEnough(request)) return cached;
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await matchCached(request);
  if (cached && await isFreshEnough(request)) return cached;
  try {
    const response = await fetch(request);
    return cacheResponse(request, response);
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async (path) => {
      try {
        const request = new Request(new URL(path, self.location.href).href, { cache: 'reload' });
        const response = await fetch(request);
        if (response && response.ok) {
          await cache.put(request, response.clone());
          await putTimestamp(new URL(path, self.location.href).pathname);
        }
      } catch {
        // Keep installing even if one optional asset cannot be cached.
      }
    }));
    await self.skipWaiting();
  })().catch(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== META_CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!isHttpLikeUrl(request.url)) return;
  const url = new URL(request.url);
  const isGoogleIconAsset = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';
  if (isGoogleIconAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/__nclex_sw_meta__/')) return;

  const isDataOrQuestion = url.pathname.includes('/data/') || url.pathname.includes('/questions/');
  const isAppShell = /\.(?:html|css|js|json|webmanifest|png|jpg|jpeg|svg|ico)$/i.test(url.pathname) || url.pathname.endsWith('/');

  if (isDataOrQuestion || isAppShell) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
