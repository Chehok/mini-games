// Render the SVG with local headless Chrome/Edge, without dependencies or fonts.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const icons = path.resolve(__dirname, '../assets/icons');
const browser = process.env.BROWSER_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
assert(browser, 'Set BROWSER_PATH to Chrome or Edge');
const svg = fs.readFileSync(path.join(icons, 'icon.svg'), 'utf8');
assert(!/<(?:text|image|foreignObject)\b/i.test(svg), 'Icon must use self-contained shapes');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-games-icons-'));
let child, ws, seq = 0;
const pending = new Map();
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
(async () => {
  child = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; !fs.existsSync(portFile) && i < 100; i++) await new Promise(r => setTimeout(r, 50));
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (!msg.id) return;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id); clearTimeout(p.timeout);
    msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
  });
  for (const [name, size, maskable] of [
    ['apple-touch-icon-180.png', 180], ['icon-192.png', 192],
    ['icon-512.png', 512], ['icon-maskable-512.png', 512, true], ['favicon-32.png', 32]
  ]) {
    const result = await cdp('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `
      (async () => {
        const img = new Image();
        img.src = ${JSON.stringify('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'))};
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = ${size};
        const ctx = canvas.getContext('2d');
        // Full bleed background; inset the artwork inside the maskable safe circle.
        if (${!!maskable}) { ctx.fillStyle = '#4f46e5'; ctx.fillRect(0, 0, ${size}, ${size}); }
        const inset = ${maskable ? size * 0.1 : 0};
        ctx.drawImage(img, inset, inset, ${size} - inset * 2, ${size} - inset * 2);
        return canvas.toDataURL('image/png').split(',')[1];
      })()` });
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    const png = Buffer.from(result.result.value, 'base64');
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
    fs.writeFileSync(path.join(icons, name), png);
    console.log(name + ': ' + size + '×' + size);
  }
  console.log('Preview:', path.join(icons, 'icon-512.png'));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => {
  if (ws) ws.close();
  if (child) child.kill();
});
