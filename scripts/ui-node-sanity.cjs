// Node-only UI contracts. This executes the real controllers; it deliberately
// does not claim CSS layout, screenshots, network access or browser rendering.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {adController}=require('./ad-controller-harness.cjs');
const {solveScrew,solvePin}=require('./puzzle-solvers.cjs');
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
      assert.equal(banner.hidden,false);assert.equal(g.all('.mechanic-text')[0].textContent,'💡 '+L.mechanicHints[d.mechanics[0]]);assert.equal(g.saved.get(dir+'.hint.'+d.mechanics[0]),true);assert.equal(g.all('.sound-toggle')[0].getAttribute('aria-pressed'),'false');
      // A skipped-to board introduces every unseen rule individually and stores
      // only displayed rules. A later mount/reload must not show them again.
      for(let i=0;i<d.mechanics.length;i++){
        assert.equal(g.all('.mechanic-text')[0].textContent,'💡 '+L.mechanicHints[d.mechanics[i]]);
        assert.equal(g.saved.get(dir+'.hint.'+d.mechanics[i]),true);
        if(i+1<d.mechanics.length)assert(!g.saved.has(dir+'.hint.'+d.mechanics[i+1]),'pending rule is not marked read');
        g.all('.mechanic-next')[0].click();
      }
      assert(banner.hidden,'last acknowledgment collapses the banner');
      assert.equal(g.all('.puzzle-settings')[0].querySelector('select').children.length,20);
      if(dir==='pin-pull'){
        const canvas=g.all('canvas')[0];assert(canvas.width>=canvas.clientWidth*2,'DPR 2 canvas backing store');
        const handles=g.all('.pin-handle');assert.equal(handles.length,d.pins.length);
        for(const b of handles){assert(b.getAttribute('aria-label'));const x=parseFloat(b.style.left)/100*canvas.clientWidth;assert(x>=22&&x<=canvas.clientWidth-22,'pin target remains inside a 320px board');}
      }else{
        assert.equal(g.all('.screw').length,d.plates.reduce((n,q)=>n+q.screws.length,0));assert.equal(g.all('.buffer-slot').length,d.buffer);assert.equal(g.all('.box-queue').length,1);
        assert.equal(g.all('.queue-chip').length,d.queue.length-2);assert.equal(g.all('.move-budget').length,0);
        assert.equal(g.all('.screw-lock').length,d.plates.flatMap(q=>q.screws).filter(s=>s.lock).length);
        for(const b of g.all('.screw'))assert(b.getAttribute('aria-label'));
      }
      g.press('restart');assert.equal(g.all('.mechanic-hint').length,1,'restart does not duplicate banners');assert(banner.hidden,'restart does not repeat known rules');assert.equal(g.ids.get('moves').textContent,0);
      counts[dir]=(counts[dir]||0)+1;
    }
  }
  // Complete all 40 levels through their actual DOM event handlers. This catches
  // controller assumptions such as three screws, a single cup or seven-bit masks.
  for(const dir of ['pin-pull','screw-puzzle'])for(let n=1;n<=20;n++){
    const g=adController(dir,n),L=g.window[dir==='pin-pull'?'PinLogic':'ScrewLogic'],d=L.level(n);
    if(dir==='pin-pull'){
      g.ticks(120);
      const solution=solvePin(L,d);assert(solution);
      for(const i of solution){g.all('.pin-handle').find(b=>+b.dataset.pin===i).click();g.ticks(365);}
    }else{
      const solution=solveScrew(L,d);assert(solution);
      for(const [p,s] of solution){const b=g.all('.screw').find(b=>+b.dataset.screw===p*4+s);assert(b);b.click();await flush();}
    }
    assert(!g.ids.get('next').disabled,dir+' '+n+': real controller wins');assert.equal(g.all('.puzzle-clear').length,1);assert.equal(g.saved.get(dir+'.unlocked'),Math.min(20,n+1));
    g.press('next');assert.equal(g.saved.get(dir+'.level'),n===20?1:n+1,'last level wraps');
  }
  // Persistence survives new controllers and works across non-sequential visits.
  for(const dir of ['pin-pull','screw-puzzle']){
    const first=adController(dir,1),L=first.window[dir==='pin-pull'?'PinLogic':'ScrewLogic'];
    while(!first.all('.mechanic-hint')[0].hidden)first.all('.mechanic-next')[0].click();
    const reload=adController(dir,1,{saved:first.saved});assert(reload.all('.mechanic-hint')[0].hidden,'seen rules survive reload');
    for(let n=2;n<=20;n++){
      const unseen=L.level(n).mechanics.filter(m=>!reload.saved.has(dir+'.hint.'+m));
      const select=reload.all('select')[0];select.value=n;select.onchange();
      for(const mechanic of unseen){
        assert.equal(reload.all('.mechanic-text')[0].textContent,'💡 '+L.mechanicHints[mechanic]);
        reload.all('.mechanic-next')[0].click();
      }
      assert(reload.all('.mechanic-hint')[0].hidden,'all new rules acknowledged');
    }
    for(const m of new Set(L.designs.flatMap(d=>d.mechanics)))assert(reload.saved.get(dir+'.hint.'+m),'sequential play introduces '+m);
    assert([...reload.saved.keys()].filter(k=>k.includes('.hint.')).every(k=>k.startsWith(dir+'.hint.')),'game-specific storage');
  }
  // Every authored wrong order fails physically or rejects a locked input, then
  // restart clears failure/animation state and the same board can be completed.
  for(let n=1;n<=20;n++){
    const g=adController('pin-pull',n),L=g.window.PinLogic,d=L.level(n);
    for(const wrong of d.wrong){
      g.press('restart');g.ticks(120);
      for(const i of wrong){g.all('.pin-handle').find(b=>+b.dataset.pin===i).click();g.ticks(365);}
      assert(g.ids.get('next').disabled,'wrong order cannot win');
      assert(g.ids.get('board').classList.contains('failed')||+g.ids.get('moves').textContent<wrong.length,'physical failure or locked input');
      g.press('restart');assert(!g.ids.get('board').classList.contains('failed'));g.ticks(120);
      for(const i of d.order){g.all('.pin-handle').find(b=>+b.dataset.pin===i).click();g.ticks(365);}
      assert(!g.ids.get('next').disabled,'restart recovers pin '+n);
    }
  }
  {
    const g=adController('screw-puzzle',8);
    for(const [p,s] of [[2,1],[2,2],[1,0],[0,0]]){g.all('.screw').find(b=>+b.dataset.screw===p*4+s).click();await flush();}
    assert(g.ids.get('board').classList.contains('failed'),'buffer dead end has a failure state');
    assert(g.ids.get('status').textContent.includes(' 임시')||g.ids.get('status').textContent.includes('임시 칸'));
    g.press('restart');assert(!g.ids.get('board').classList.contains('failed'));
    const L=g.window.ScrewLogic;for(const [p,s] of solveScrew(L,L.level(8))){g.all('.screw').find(b=>+b.dataset.screw===p*4+s).click();await flush();}
    assert(!g.ids.get('next').disabled,'restart recovers a buffer dead end');
  }
  // Sleeping boards stop both canvas draws and RAF work. Collecting a physical
  // key must not leave an invisible moving object keeping the loop alive.
  for(let n=1;n<=20;n++){
    const g=adController('pin-pull',n,{reduced:false});g.ticks(900);const before=g.draws;g.ticks(120);assert.equal(g.draws,before,'idle canvas sleeps at pin '+n);assert.equal(g.pendingFrames,0);
  }
  {
    const g=adController('pin-pull',11);g.ticks(120);g.all('.pin-handle')[0].click();g.ticks(900);const before=g.draws;g.ticks(120);assert.equal(g.draws,before,'collected key does not keep RAF alive');
  }
  {
    const g=adController('pin-pull',2);g.ticks(600);const before=g.draws;
    g.resizeBoard(360);assert.equal(g.all('canvas')[0].width,720,'CSS board resizing refreshes DPR backing pixels');g.ticks(120);assert(g.draws>before,'resizing wakes a sleeping board');
    assert.equal(g.pendingFrames,0);g.press('restart');assert.equal(g.observerCount,1,'restart disconnects the old canvas observer');
  }
  // Locked inputs explain their prerequisite, and a limited bonus can actually fail.
  {
    const g=adController('pin-pull',10);g.all('.pin-handle')[0].click();assert.equal(g.ids.get('moves').textContent,0);assert(g.ids.get('status').textContent.includes('열쇠 A'));
    const h=adController('screw-puzzle',6);h.all('.screw').find(b=>b.classList.contains('locked')).click();await flush();assert.equal(h.ids.get('moves').textContent,0);assert(h.ids.get('status').textContent.includes('번 나사'));
    const b=adController('screw-puzzle',13);
    {
      const L0=b.window.ScrewLogic,path=solveScrew(L0,L0.level(13));
      const [p0,s0]=path[0];b.all('.screw').find(screw=>+screw.dataset.screw===p0*4+s0).click();await flush();
      b.ids.get('extras').children[0].click();
      assert(b.ids.get('extras').children[0].disabled,'normal boards allow one undo');
      for(const [p,s] of path){if(b.ids.get('board').classList.contains('failed'))break;b.all('.screw').find(screw=>+screw.dataset.screw===p*4+s).click();await flush();}
    }
    assert(b.ids.get('board').classList.contains('failed'),'undo consumes the bonus budget');assert(/횟수|다 썼어요/.test(b.ids.get('status').textContent));
    b.press('restart');assert(!b.ids.get('board').classList.contains('failed'));
    const L=b.window.ScrewLogic;for(const [p,s] of solveScrew(L,L.level(13))){b.all('.screw').find(screw=>+screw.dataset.screw===p*4+s).click();await flush();}
    assert(!b.ids.get('next').disabled,'restart recovers an exhausted bonus budget');
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
  console.log(`PASS: Node UI contracts: ${counts['pin-pull']} pin + ${counts['screw-puzzle']} screw initial states (320/390/1280 configurations, light/dark); all 40 searched controller solutions; per-mechanic hints persist across restart/reload/level jumps; wrong-order/bonus/buffer failure and restart recovery; 20 idle canvases + collected key stop RAF/draw; queue/lock/quota/buffer DOM; hinge animation/reset; DPR 2; sound OFF; progress cap; local assets`);
  console.log('LIMIT: Node does not render CSS or verify visual overflow, contrast or screenshots. Browser checks remain available with BROWSER_PATH. No Chrome or network was used.');
})().catch(e=>{console.error(e);process.exitCode=1;});
