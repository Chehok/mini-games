// Dependency-free checks for offline routing, cache boundaries and install UI.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const files = fs.readdirSync(root, { recursive: true }).map(file => file.split(path.sep).join('/')).filter(file =>
  !/^(?:\.git|scripts|node_modules)\//.test(file) && /\.(?:html|css|js|png|svg|webmanifest)$/.test(file) && file !== 'sw.js');
(async () => {
  const handlers = {}, entries = new Map(), deleted = [];
  const scope = 'https://example.test/mini-games/';
  const currentCache = read('sw.js').match(/const CACHE_NAME = '([^']+)'/)[1];
  const cache = {
    addAll: async requests => { for (const r of requests) entries.set(r.url, new Response('precache')); },
    match: async (url, options) => { assert(options.ignoreSearch); return entries.get(url)?.clone(); },
    put: async (url, response) => entries.set(url, response)
  };
  let offline = false, fetches = 0;
  const context = vm.createContext({ URL, Request, Response,
    self: { registration: { scope }, location: new URL(scope),
      addEventListener: (name, fn) => handlers[name] = fn,
      skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => ['mini-games-v0', currentCache, 'other-site'],
      delete: async name => deleted.push(name) },
    fetch: async () => { fetches++; if (offline) throw Error('offline'); return new Response('fresh'); }
  });
  vm.runInContext(read('sw.js'), context);
  let pending;
  handlers.install({ waitUntil: p => pending = p }); await pending;
  for (const file of files) assert(entries.has(new URL(file, scope).href), 'precache missing: ' + file);
  handlers.activate({ waitUntil: p => pending = p }); await pending;
  assert.deepEqual(deleted, ['mini-games-v0']);
  async function request(url, mode = 'navigate', method = 'GET') {
    let response; const work = [];
    handlers.fetch({ request: { url, mode, method }, respondWith: p => response = p, waitUntil: p => work.push(p) });
    const result = await response; await Promise.all(work); return result;
  }
  offline = true;
  for (const file of files.filter(f => f.endsWith('index.html'))) {
    for (const suffix of ['index.html', '']) {
      const url = new URL(file.replace(/index\.html$/, suffix) + '?mode=party', scope).href;
      assert.equal(await (await request(url)).text(), 'precache', url);
    }
  }
  assert.equal(await (await request(scope + 'assets/style.css?v=new', 'cors')).text(), 'precache');
  offline = false;
  assert.equal(await (await request(scope + 'index.html')).text(), 'fresh');
  assert.equal(await (await request(scope + 'assets/style.css?v=next', 'cors')).text(), 'precache');
  assert.equal(await entries.get(scope + 'assets/style.css').clone().text(), 'fresh', 'background refresh');
  offline = true;
  assert.equal(await (await request(scope + 'assets/style.css?v=offline', 'cors')).text(), 'fresh');
  offline = false;
  const manifest = JSON.parse(read('manifest.webmanifest'));
  for (const icon of manifest.icons) assert(entries.has(new URL(icon.src, scope).href));
  const apple = fs.readFileSync(path.join(root, 'assets/icons/apple-touch-icon-180.png'));
  assert.equal(apple.readUInt32BE(16), 180); assert.equal(apple.readUInt32BE(20), 180);
  const count = fetches;
  for (const url of ['https://gc.zgo.at/count.js', 'https://mini-games.goatcounter.com/count', 'https://a.b.goatcounter.com/count', 'https://elsewhere.test/a.js']) {
    assert.equal(await request(url, 'cors'), undefined);
  }
  assert.equal(await request(scope + 'index.html', 'cors', 'POST'), undefined);
  assert.equal(fetches, count, 'passthroughs must not enter cache handling');
  assert(!entries.has('https://gc.zgo.at/count.js'));

  function ui(ua = 'Chrome Safari', standalone = false, touch = 0, legacy = false) {
    const events = {}, button = { hidden: true, textContent: '', attrs: {}, addEventListener: (name, fn) => events[name] = fn,
      setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
    let copied = null, toast = null;
    const media = { matches: standalone, addEventListener: (name, fn) => events.media = fn };
    let registration, dialog;
    const navigator = { userAgent: ua, maxTouchPoints: touch, standalone: legacy,
      serviceWorker: { register: async (url, options) => { registration = { url, options }; } } };
    vm.runInNewContext(read('assets/pwa.js'), { URL, navigator, location: { origin: 'https://example.test', pathname: '/puzzles/' },
      document: { currentScript: { src: scope + 'assets/pwa.js?v=123' }, getElementById: () => button },
      window: { matchMedia: () => media, addEventListener: (name, fn) => events[name] = fn },
      MG: { dialog: options => dialog = options, toast: t => toast = t, copy: async text => { copied = text; return true; } } });
    assert.equal(registration.url, scope + 'sw.js'); assert.equal(registration.options.scope, scope);
    return { events, button, media, dialog: () => dialog, copied: () => copied, toast: () => toast };
  }
  for (const outcome of ['accepted', 'dismissed']) {
    const u = ui(); assert(u.button.hidden);
    let prevented = false, prompted = false;
    u.events.beforeinstallprompt({ preventDefault: () => prevented = true,
      prompt: async () => prompted = true, userChoice: Promise.resolve({ outcome }) });
    assert(prevented); assert(!u.button.hidden); assert.equal(u.button.textContent, '앱 설치');
    await u.events.click(); assert(prompted); assert(u.button.hidden);
    u.events.appinstalled(); u.events.media(); assert(u.button.hidden);
  }
  for (const ua of ['iPhone Safari', 'iPad Safari', 'iPod Safari', 'Macintosh Safari']) {
    const u = ui(ua, false, 2); assert(!u.button.hidden); await u.events.click();
    assert.equal(u.dialog().text, 'Safari에서 공유 → 홈 화면에 추가를 선택해 주세요.');
    assert.equal(u.dialog().buttons[0].label, '닫기');
    assert.equal(u.dialog().title, '앱 설치');
    // Opened as an installed app, the same button shares the page link.
    u.media.matches = true; u.events.media(); assert(!u.button.hidden); assert.equal(u.button.textContent, '링크 공유');
    for (const app of [ui(ua, true, 2), ui(ua, false, 2, true)]) {
      assert(!app.button.hidden); assert.equal(app.button.textContent, '링크 공유');
      await app.events.click(); assert.equal(app.copied(), 'https://example.test/puzzles/'); assert(app.toast().includes('복사'));
    }
  }
  for (const browser of ['CriOS', 'FxiOS', 'EdgiOS', 'OPiOS']) assert(ui('iPhone Safari ' + browser).button.hidden);
  for (const page of files.filter(f => f.endsWith('.html'))) {
    // 404.html is served for any missing path, so it uses root-absolute asset URLs without stamps.
    if (page === '404.html') assert(read(page).includes('src="/assets/pwa.js"'), '404: shared registration');
    else assert(/<script defer src="(?:\.\.\/)?assets\/pwa\.js\?v=/.test(read(page)), page + ': shared registration');
    assert(read(page).includes('rel="apple-touch-icon"'), page + ': Apple icon');
  }
  console.log('PASS: complete precache, subpath/offline routes and queries, cache cleanup, analytics/POST passthrough, Chrome/iOS install UI and in-app link sharing');
})().catch(error => { console.error(error); process.exitCode = 1; });
