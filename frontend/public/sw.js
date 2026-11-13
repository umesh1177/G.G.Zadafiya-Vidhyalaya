const CACHE_NAME = 'ggzv-portal-v2';
const BUILT_PRECACHE_ASSETS = /*__PRECACHE_ASSETS__*/[];

const APP_SHELL_URLS = Array.from(
  new Set([
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.webmanifest',
    '/icons/icon.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-512.png',
    '/icons/apple-touch-icon.png',
    ...BUILT_PRECACHE_ASSETS,
  ])
);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        APP_SHELL_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('ggzv-portal-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isBypassedRequest(request, url) {
  if (request.method !== 'GET') return true;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;

  // Never intercept service worker update checks
  if (url.pathname === '/sw.js') return true;

  // Never intercept backend API requests or cross-origin calls
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith('/api/') || url.pathname === '/api') return true;
  if (url.port === '5000') return true;

  // Never interfere with Vite dev / HMR module graphs
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.searchParams.has('t') ||
    url.searchParams.has('v')
  ) {
    return true;
  }

  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (isBypassedRequest(request, url)) {
    return;
  }

  // Navigation requests (SPA HTML shell): network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html', { ignoreSearch: true });
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/', { ignoreSearch: true });
          if (cachedRoot) return cachedRoot;
          const cachedOffline = await caches.match('/offline.html');
          if (cachedOffline) return cachedOffline;
          return new Response('Offline — please reconnect to load G.G. Zadafiya Vidhyalaya Portal.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Built static assets, icons & manifest: stale-while-revalidate
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/manifest.webmanifest' ||
    /\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              cache.put(request, res.clone()).catch(() => {});
            }
            return res;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }
        const fresh = await networkPromise;
        return (
          fresh ||
          new Response('', {
            status: 504,
            statusText: 'Offline',
          })
        );
      })
    );
  }
});
