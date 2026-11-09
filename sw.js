// Bump this version whenever pages or local assets change to refresh offline copies.
const CACHE_NAME = 'mini-games-v3';
const PRECACHE = [
  "2048/index.html",
  "assets/ad-games.css",
  "assets/ad-puzzles.js",
  "assets/common.js",
  "assets/icons/apple-touch-icon-180.png",
  "assets/icons/favicon-32.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/icon.svg",
  "assets/name-rows.js",
  "assets/pwa.js",
  "assets/recreation.css",
  "assets/style.css",
  "assets/teamround.js",
  "charades/index.html",
  "charades/words.js",
  "chosung/index.html",
  "chosung/words.js",
  "hunminjeongeum/index.html",
  "index.html",
  "party/index.html",
  "puzzles/index.html",
  "recreation/index.html",
  "liar/index.html",
  "liar/words.js",
  "manifest.webmanifest",
  "memory/index.html",
  "minesweeper/index.html",
  "ox/index.html",
  "ox/questions.js",
  "parking-jam/game.js",
  "parking-jam/index.html",
  "parking-jam/logic.js",
  "pin-pull/game.js",
  "pin-pull/index.html",
  "pin-pull/logic.js",
  "rps-bracket/index.html",
  "rps-bracket/logic.js",
  "screw-puzzle/game.js",
  "screw-puzzle/index.html",
  "screw-puzzle/logic.js",
  "slide-puzzle/index.html",
  "speed/index.html",
  "speed/words.js",
  "sudoku/index.html",
  "taboo/index.html",
  "taboo/words.js",
  "telepathy/index.html",
  "telepathy/words.js",
  "tools/index.html",
  "tools/logic.js",
  "untangle/game.js",
  "untangle/index.html",
  "untangle/logic.js",
  "updown/index.html",
  "water-sort/game.js",
  "water-sort/index.html",
  "water-sort/logic.js",
  "wordle/index.html",
  "wordle/words.js"
];
const scopedURL = path => new URL(path, self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE.map(path => new Request(scopedURL(path), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys())
      .filter(name => name.startsWith('mini-games-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Analytics and non-GET requests always go directly to the network.
  if (request.method !== 'GET' || url.hostname === 'gc.zgo.at' ||
      url.hostname === 'goatcounter.com' || url.hostname.endsWith('.goatcounter.com')) return;
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  // Directory and explicit index URLs share a cache entry; ?v= never duplicates assets.
  const key = new URL(url);
  key.search = '';
  if (key.pathname.endsWith('/')) key.pathname += 'index.html';
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(key.href, response.clone());
          return response;
        }
        return (await cache.match(key.href, { ignoreSearch: true })) || response;
      } catch (error) {
        return (await cache.match(key.href, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }
  if (!/\.(?:css|js|png|svg|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/sw.js')) return;

  // Serve cached assets immediately and keep them fresh for the next visit.
  const update = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(request);
    if (response.ok) await cache.put(key.href, response.clone());
    return response;
  })();
  event.waitUntil(update.catch(() => {}));
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(key.href, { ignoreSearch: true })) ||
      (await update.catch(() => Response.error()));
  })());
});
