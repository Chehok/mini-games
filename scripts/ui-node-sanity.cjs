// Node-only UI contracts. This executes the real controllers; it deliberately
// does not claim CSS layout, screenshots, network access or browser rendering.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {adController}=require('./ad-controller-harness.cjs');
const {solveScrew}=require('./puzzle-solvers.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
(async()=>{
  const css=read('assets/ad-games.css');
  assert(/\.mechanic-hint\[hidden\]\s*\{\s*display:\s*none/.test(css),'unused hint banners collapse');
  assert(css.includes('.shape-circle .plate-face')&&css.includes('.shape-L .plate-face')&&css.includes('.shape-triangle .plate-face'),'silhouette styles exist');
  assert(/\.pin-handle[^}]*width:\s*44px[^}]*height:\s*44px/s.test(css),'44px pin targets');
  assert(/\.screw\s*\{[^}]*width:\s*50px[^}]*height:\s*50px/s.test(css),'50px screw targets');
  assert(css.includes('@media (prefers-color-scheme: dark)')&&css.includes('@media (prefers-reduced-motion: reduce)'),'dark/reduced-motion styles');
  const counts={};
  // Every initial state, not only the tutorial and final board. Canvas backing
  // sizes and DOM controls are real controller output, independent of a browser.
  for(const dir of ['pin-pull','screw-puzzle']){
    const html=read(dir+'/index.html');assert(html.includes('name="viewport"'));assert(html.includes('aria-live="polite"'));assert(!/<script[^>]+src="https?:\/\//.test(html.replace(/<script[^>]+gc\.zgo\.at[^>]*><\/script>/g,'')),'no new external dependencies');
    for(const width of [320,390,1280])for(const dark of [false,true])for(let n=1;n<=20;n++){
      const g=adController(dir,n,{width,dark});g.ticks(2);
      const L=g.window[dir==='pin-pull'?'PinLogic':'ScrewLogic'],d=L.level(n),banner=g.all('.mechanic-hint')[0];
      assert.equal(banner.hidden,!d.hint);assert.equal(banner.textContent,d.hint?'💡 '+d.hint:'');assert.equal(g.all('.sound-toggle')[0].getAttribute('aria-pressed'),'false');
      assert.equal(g.all('.puzzle-settings')[0].querySelector('select').children.length,20);
      if(dir==='pin-pull'){
        const canvas=g.all('canvas')[0];assert(canvas.width>=canvas.clientWidth*2,'DPR 2 canvas backing store');
        const handles=g.all('.pin-handle');assert.equal(handles.length,d.pins.length);
        for(const b of handles){assert(b.getAttribute('aria-label'));const x=parseFloat(b.style.left)/100*canvas.clientWidth;assert(x>=22&&x<=canvas.clientWidth-22,'pin target remains inside a 320px board');}
      }else{
        assert.equal(g.all('.screw').length,d.plates.reduce((n,q)=>n+q.screws.length,0));assert.equal(g.all('.buffer-slot').length,d.buffer);assert.equal(g.all('.box-queue').length,1);
        assert.equal(g.all('.queue-chip').length,d.queue.length-2);assert.equal(g.all('.move-budget').length,d.moveLimit?1:0);
        assert.equal(g.all('.screw-lock').length,d.plates.flatMap(q=>q.screws).filter(s=>s.lock).length);
        for(const b of g.all('.screw'))assert(b.getAttribute('aria-label'));
      }
      g.press('restart');assert.equal(g.all('.mechanic-hint').length,1,'restart does not duplicate banners');assert.equal(g.ids.get('moves').textContent,0);
      counts[dir]=(counts[dir]||0)+1;
    }
  }
  // Complete all 40 levels through their actual DOM event handlers. This catches
  // controller assumptions such as three screws, a single cup or seven-bit masks.
  for(const dir of ['pin-pull','screw-puzzle'])for(let n=1;n<=20;n++){
    const g=adController(dir,n),L=g.window[dir==='pin-pull'?'PinLogic':'ScrewLogic'],d=L.level(n);
    if(dir==='pin-pull'){
      g.ticks(120);
      for(const i of d.order){g.all('.pin-handle').find(b=>+b.dataset.pin===i).click();g.ticks(365);}
    }else{
      const solution=solveScrew(L,d);assert(solution);
      for(const [p,s] of solution){const b=g.all('.screw').find(b=>+b.dataset.screw===p*4+s);assert(b);b.click();await flush();}
    }
    assert(!g.ids.get('next').disabled,dir+' '+n+': real controller wins');assert.equal(g.all('.puzzle-clear').length,1);assert.equal(g.saved.get(dir+'.unlocked'),Math.min(20,n+1));
    g.press('next');assert.equal(g.saved.get(dir+'.level'),n===20?1:n+1,'last level wraps');
  }
  // Locked inputs explain their prerequisite, and a limited bonus can actually fail.
  {
    const g=adController('pin-pull',10);g.all('.pin-handle')[0].click();assert.equal(g.ids.get('moves').textContent,0);assert(g.ids.get('status').textContent.includes('열쇠 A'));
    const h=adController('screw-puzzle',6);h.all('.screw').find(b=>b.classList.contains('locked')).click();await flush();assert.equal(h.ids.get('moves').textContent,0);assert(h.ids.get('status').textContent.includes('번 나사'));
    const b=adController('screw-puzzle',13);
    for(let i=0;i<5;i++){b.all('.screw').find(s=>s.getAttribute('aria-disabled')==='false').click();await flush();b.ids.get('extras').children[0].click();}
    assert(b.ids.get('board').classList.contains('failed'),'undo consumes the bonus budget');assert(b.ids.get('status').textContent.includes('횟수'));
  }
  // Hinge motion is animated around the surviving anchor and reset cancels it.
  {
    const g=adController('screw-puzzle',10,{reduced:false});
    const finish=async()=>{for(let i=0;i<8;i++){g.finishAnimations();await flush();}};
    for(const s of [0,1]){g.all('.screw').find(b=>+b.dataset.screw===8+s).click();await finish();}
    assert.equal(g.all('.swung').length,1,'hinge pose reaches the DOM');
    g.press('restart');assert.equal(g.all('.swung').length,0);assert.equal(g.all('.flying-screw').length,0);
  }
  for(const dir of ['pin-pull','screw-puzzle']){const g=adController(dir,999,{unlocked:999});assert.equal(g.saved.get(dir+'.level'),20);assert.equal(g.saved.get(dir+'.unlocked'),20);}
  // Parse all local JS/HTML and resolve static assets while offline.
  for(const dir of ['pin-pull','screw-puzzle']){
    for(const file of ['logic.js','game.js'])new vm.Script(read(dir+'/'+file));
    for(const match of read(dir+'/index.html').matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)){
      const url=match[1];if(/^(https?:|#|\/\/)/.test(url)||url.endsWith('/'))continue;assert(fs.existsSync(path.resolve(__dirname,'..',dir,url)),dir+': missing asset '+url);
    }
  }
  console.log(`PASS: Node UI contracts: ${counts['pin-pull']} pin + ${counts['screw-puzzle']} screw initial states (320/390/1280 configurations, light/dark); all 40 controller solutions; hint/queue/lock/quota/buffer/bonus DOM; hinge animation/reset; DPR 2; sound OFF; progress cap; local assets`);
  console.log('LIMIT: Node does not render CSS or verify visual overflow, contrast or screenshots. Browser checks remain available with BROWSER_PATH. No Chrome or network was used.');
})().catch(e=>{console.error(e);process.exitCode=1;});
