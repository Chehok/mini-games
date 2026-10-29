// Browser smoke checks without dependencies. Run with a locally installed Chrome/Edge.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const browser = process.env.BROWSER_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
assert(browser, 'Set BROWSER_PATH to Chrome or Edge');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-games-ui-'));
const server = http.createServer((req, res) => {
  const target = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403).end(); return; }
  const file = target.endsWith('.html') || path.extname(target) ? target : path.join(target, 'index.html');
  fs.readFile(file, (e, data) => {
    if (e) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8');
    res.end(data);
  });
});
let child, ws, seq = 0;
const pending = new Map(), errors = [];
function cdp(method, params = {}) { return new Promise((resolve, reject) => { const id = ++seq; const timeout = setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},10000); pending.set(id, {resolve:r=>{clearTimeout(timeout);resolve(r);}, reject:e=>{clearTimeout(timeout);reject(e);}}); ws.send(JSON.stringify({id, method, params})); }); }
async function evaluate(expression) {
  const r = await cdp('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value;
}
async function loaded(url) {
  await cdp('Page.navigate', {url});
  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 30));
    if (await evaluate('location.href.split(/[?#]/)[0] === ' + JSON.stringify(url) + ' && document.readyState === "complete"')) return;
  }
  throw new Error('Navigation timeout: ' + url + ' ' + JSON.stringify(await evaluate('({url:location.href,ready:document.readyState,text:document.body && document.body.innerText.slice(0,300)})')));
}
function contrast(fg, bg) {
  const lum = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>{c/=255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}).reduce((s,c,i)=>s+c*[0.2126,0.7152,0.0722][i],0);
  const a=lum(fg),b=lum(bg); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  child = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {windowsHide:true, stdio:'ignore'});
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i=0; !fs.existsSync(portFile) && i<100; i++) await new Promise(r=>setTimeout(r,50));
  const port = fs.readFileSync(portFile,'utf8').split('\n')[0];
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  ws = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  ws.addEventListener('message', event=>{
    const msg = JSON.parse(event.data);
    if (msg.id) { const p=pending.get(msg.id); pending.delete(msg.id); msg.error?p.reject(msg.error):p.resolve(msg.result); }
    else if (msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
    else if (msg.method==='Log.entryAdded' && msg.params.entry.level==='error') errors.push(msg.params.entry);
  });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Log.enable');
  const base='http://127.0.0.1:' + server.address().port + '/';
  const pages=['', ...fs.readdirSync(root).filter(d=>fs.existsSync(path.join(root,d,'index.html')))];
  for (const width of [360,1280]) for (const theme of ['light','dark']) {
    await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]});
    for (const page of pages) {
      await loaded(base+(page?page+'/':''));
      assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${page}: overflow at ${width} ${theme}`);
      assert(await evaluate('!!document.querySelector("main")'), page+': main landmark');
      const colors = await evaluate(`(() => {
        const el = document.createElement('span'); document.body.appendChild(el);
        const pair = (fg,bg) => { el.style.cssText='color:var('+fg+');background:var('+bg+')'; const c=getComputedStyle(el); return [c.color,c.backgroundColor]; };
        const result=[pair('--accent-text','--accent'),pair('--accent-ink','--surface'),pair('--muted','--surface-2')]; el.remove(); return result;
      })()`);
      for(const pair of colors) assert(contrast(...pair)>=4.5, `${page} ${theme}: contrast ${pair} = ${contrast(...pair)}`);
      assert(await evaluate(`Array.from(document.querySelectorAll('button:not(.cell):not(.tile)')).filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect();return r.height>=44 && r.width>=44;})`), page+': control size');
      if(page==='minesweeper') for(const level of ['intermediate','expert']) {
        await evaluate(`document.querySelector('[data-level="${level}"]').click()`);
        assert(await evaluate('document.querySelector(".m").getBoundingClientRect().width >= 32'), 'mines cell size');
        assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mines overflow');
      }
      if(!page) for(const tab of ['party','tools']) {
        await evaluate(`document.querySelector('#tab-${tab}').click()`);
        assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'hub tab overflow');
        const pair=await evaluate(`(()=>{const e=document.querySelector('[aria-selected="true"]');const s=getComputedStyle(e);return [s.color,s.backgroundColor];})()`);
        assert(contrast(...pair)>=4.5, 'hub '+tab+' contrast');
      }
      if(page==='tools') for(const tab of ['ladder','wheel','draw']) {
        await evaluate(`document.querySelector('#btn-${tab}').click()`);
        assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'tool '+tab+' overflow');
      }
      if(width===360 && theme==='light' && ['sudoku','wordle','minesweeper'].includes(page)) {
        const png=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
        fs.writeFileSync(path.join(profile,page+'.png'),Buffer.from(png.data,'base64'));
      }
    }
  }
  await loaded(base+'wordle/');
  await evaluate('document.querySelector("#statsBtn").focus(); document.querySelector("#statsBtn").click()');
  assert(await evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)'), 'dialog initial focus');
  assert(await evaluate('!!document.getElementById(document.querySelector("[role=dialog]").getAttribute("aria-labelledby"))'), 'dialog title');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert(await evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)'), 'Tab trap');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  assert(await evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)'), 'Shift Tab trap');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert(await evaluate('!document.querySelector("[role=dialog]") && document.activeElement.id === "statsBtn"'), 'Escape and focus restore');
  await evaluate('MG.dialog({title:"테스트",buttons:[{label:"첫째"},{label:"둘째"}]})');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  assert.equal(await evaluate('document.activeElement.textContent'),'둘째');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await evaluate('document.activeElement.textContent'),'첫째');
  await loaded(base+'sudoku/');
  await evaluate(`document.querySelector('.cell:not(.given)').click(); document.querySelector('#notesBtn').click(); document.querySelector('#pad button').click()`);
  assert(await evaluate(`document.querySelector('.cell.sel').getAttribute('aria-label').includes('메모 1')`), 'sudoku memo label');
  await evaluate(`document.querySelector('#notesBtn').click(); document.querySelector('#pad button').click()`);
  assert(await evaluate(`document.querySelector('.cell.sel').getAttribute('aria-label').includes('숫자 1')`), 'sudoku value label');
  await loaded(base+'memory/');
  await evaluate(`document.querySelector('.grid button').click()`);
  assert(await evaluate(`document.querySelector('.grid button').getAttribute('aria-label').includes(__memory.deck()[0])`), 'memory flipped label');
  await loaded(base+'slide-puzzle/');
  assert(await evaluate(`Array.from(document.querySelectorAll('.tile')).every(e=>/행.*열/.test(e.getAttribute('aria-label')))`), 'slide tile position');
  await loaded(base+'wordle/');
  await evaluate(`__wordle.answer().split('').forEach(ch=>document.querySelector('[data-k="'+ch+'"]').click()); document.querySelector('[data-k="Enter"]').click()`);
  await new Promise(r=>setTimeout(r,1600));
  assert(await evaluate(`Array.from(document.querySelectorAll('.brow:first-child .tile')).every(e=>e.getAttribute('aria-label').includes('정확한 위치'))`), 'wordle result labels');
  await loaded(base+'liar/');
  await evaluate(`MG.store.set('liar.settings', {n:3,names:['긴이름가나다라마바사아자차카타파하','가','나']})`);
  await loaded(base+'liar/');
  await evaluate(`document.querySelector('#startBtn').click(); for(let i=0;i<3;i++){document.querySelector('#reveal').click();document.querySelector('#hide').click();} document.querySelector('#toVote').click()`);
  await cdp('Emulation.setDeviceMetricsOverride',{width:360,height:900,deviceScaleFactor:1,mobile:false});
  assert(await evaluate(`getComputedStyle(document.querySelector('.votegrid')).gridTemplateColumns.split(' ').length===1 && document.documentElement.scrollWidth<=innerWidth`), 'liar long names and one column');
  const votePng=await cdp('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(profile,'liar.png'),Buffer.from(votePng.data,'base64'));
  await loaded(base+'tools/');
  await evaluate(`document.querySelector('#btn-wheel').click()`);
  const counts=await evaluate(`new Promise(resolve=>{
    let parses=0, measures=0, sizes=0;
    const parse=ToolsLogic.parseList, measure=CanvasRenderingContext2D.prototype.measureText;
    ToolsLogic.parseList=function(...args){parses++;return parse.apply(this,args);};
    CanvasRenderingContext2D.prototype.measureText=function(...args){measures++;return measure.apply(this,args);};
    const descriptor=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width');
    Object.defineProperty(HTMLCanvasElement.prototype,'width',{...descriptor,set(v){sizes++;descriptor.set.call(this,v);}});
    document.querySelector('#spin').click();
    setTimeout(()=>resolve({parses,measures,sizes}),400);
  })`);
  assert(counts.parses<=1 && counts.measures===0 && counts.sizes===0, 'roulette frame cache: '+JSON.stringify(counts));
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log(`PASS: ${pages.length} pages × 360/1280px × light/dark, contrast, controls, mines zoom, tabs, dialog focus/Tab/Escape, game labels, long names, roulette cache`);
  console.log('Screenshots:',profile);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{if(ws)ws.close();if(child)child.kill();server.close();});
