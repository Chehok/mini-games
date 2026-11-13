// Run with node scripts/audit-sanity.cjs; no dependencies or browser needed.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
function read(p) { return fs.readFileSync(p, 'utf8'); }
function inline(p) { return [...read(p).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n'); }
for (const dir of ['sudoku','minesweeper','2048','memory','slide-puzzle','wordle','chosung','puzzles','pin-pull','water-sort','screw-puzzle','parking-jam','untangle']) {
  new vm.Script(inline(dir+'/index.html'), {filename: dir+'/index.html'});
}
for (const p of ['assets/common.js','chosung/words.js','wordle/words.js']) new vm.Script(read(p), {filename:p});
const ctx = {window:{}};
let seed = 12345;
function rnd() { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
vm.runInNewContext(read('wordle/words.js'),ctx);
const answers=ctx.window.WORDLE_ANSWERS, valid=ctx.window.WORDLE_VALID;
assert(answers.length>450); assert(answers.every(w=>/^[a-z]{5}$/.test(w)));
assert.equal(new Set(answers).size,answers.length);
assert(answers.every(w=>valid.includes(w)));
for(const w of 'drunk smoke booze beers vodka ciggy ghost devil blood knife bitch fucks sluts'.split(' ')) assert(!valid.includes(w),w);
for(const [p,name,field,sep] of [
  ['chosung/words.js','CHOSUNG_DATA','items',null]
]) {
  vm.runInNewContext(read(p),ctx);
  for(const c of ctx.window[name]) {
    const items=sep?c[field].split(sep):c[field]; assert(items.length>=15,c.cat);
    assert(items.every(s=>!/(담배|맥주|막걸리|포도주|좀비|유령|드라큘라|장도리)/.test(s)),c.cat);
  }
}
console.log('PASS: syntax, tags, content');
console.log('Wordle words:',answers.length);

// Isolated DOM/timer harness: execute the real page scripts and advance old callbacks after reset.
function game(file, exports, initial={}) {
  let now=1000, seq=0; const tasks=new Map(), saved=new Map(Object.entries(initial)), dialogs=[];
  class El {
    constructor(){this.children=[];this.dataset={};this.style={setProperty(){}};this.textContent='';this.disabled=false;this.classes=new Set();this.classList={add:(...s)=>s.forEach(x=>this.classes.add(x)),remove:(...s)=>s.forEach(x=>this.classes.delete(x)),contains:s=>this.classes.has(s),toggle:(s,on)=>on?this.classes.add(s):this.classes.delete(s)};}
    set className(s){this.classes=new Set(s.split(' '));} get className(){return [...this.classes].join(' ');}
    set innerHTML(s){this.html=s;this.children=s.startsWith('<span>')?[new El(),new El()]:[];this.nodes=new Map();this.firstChild=new El();} get innerHTML(){return this.html||'';}
    appendChild(e){this.children.push(e);return e;} remove(){} focus(){} blur(){} setAttribute(){} addEventListener(){} querySelector(s){this.nodes=this.nodes||new Map();if(!this.nodes.has(s))this.nodes.set(s,new El());return this.nodes.get(s);} querySelectorAll(){return [];}
  }
  const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,new El());return elements.get(id);};
  const set=(fn,ms,repeat=false)=>{const id=++seq;tasks.set(id,{fn,at:now+ms,ms,repeat});return id;};
  const document={getElementById:element,createElement:()=>new El(),querySelector:sel=>sel.includes('overlay')?null:element(sel),querySelectorAll:()=>[],addEventListener(){},body:new El(),hidden:false};
  const MG={store:{get:(k,d)=>saved.has(k)?saved.get(k):d,set:(k,v)=>saved.set(k,JSON.parse(JSON.stringify(v)))},shuffle:a=>a.reverse(),rng:()=>()=>0.5,fmtTime:String,toast(){},beep(){},vibrate(){},wake:{on(){},off(){}},unlockAudio(){},Timer:()=>({seconds:0,reset(){},start(){},stop(){}})};
  const FakeDate=class extends Date{static now(){return now;}};
  const context={window:{innerWidth:390,addEventListener(){}},document,MG,Date:FakeDate,setTimeout:(fn,ms)=>set(fn,ms),clearTimeout:id=>tasks.delete(id),setInterval:(fn,ms)=>set(fn,ms,true),clearInterval:id=>tasks.delete(id),console,Intl,URLSearchParams,location:{search:''},history:{replaceState(){}}};
  if(file==='wordle') vm.runInNewContext(read('wordle/words.js'),context);
  if(file==='chosung') vm.runInNewContext(read('chosung/words.js'),context);
  let src=file.endsWith('.js')?read(file):inline(file+'/index.html');
  const end=file.endsWith('.js')?src.indexOf('    renderSetup();\n    window.TeamRoundDebug'):src.lastIndexOf('})();');
  src=src.slice(0,end)+'window.test = {'+exports+'};\n'+src.slice(end);vm.runInNewContext(src,context);
  function advance(ms){const end=now+ms;let count=0;while(true){const due=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;assert(++count<10000);const [id,t]=due;now=t.at;tasks.delete(id);t.fn();if(t.repeat&& !tasks.has(id))tasks.set(id,{...t,at:now+t.ms});}now=end;}
  MG.dialog=opts=>{dialogs.push(opts);return {close(){}};};
  return {get t(){return context.window.test;},window:context.window,element,saved,dialogs,advance};
}
{
 const g=game('memory','newGame, flip, deck: function(){return deck;}, state:function(){return {moves: moves, matched: matched, busy: busy};}');
 const pairs=new Map();g.t.deck().forEach((w,i)=>{if(!pairs.has(w))pairs.set(w,[]);pairs.get(w).push(i);});
 for(const pair of pairs.values()) pair.forEach(g.t.flip);
 g.t.newGame();g.advance(1000);assert.equal(g.dialogs.length,0);assert(!g.saved.has('memory.best.4x4'));assert.equal(g.t.state().moves,0);
 g.t.flip(0);g.t.flip(1);g.t.newGame();g.t.flip(0);g.advance(1000);assert.equal(g.t.state().matched,0);
}
{
 const g=game('2048','newGame,move,values');
 g.window.Game2048.setValues([[2,2,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);g.t.move('left');g.t.newGame();g.advance(300);assert.equal(g.t.values().flat().filter(Boolean).length,2);
 g.window.Game2048.setValues([[1024,1024,4,8],[4,8,16,32],[8,16,32,64],[16,32,64,128]]);g.t.move('left');g.advance(300);
 assert.equal(g.dialogs.at(-1).title,'🎉 2048 달성!');g.dialogs.at(-1).buttons[0].onClick();assert.equal(g.dialogs.at(-1).title,'게임 오버');
}
{
 const g=game('slide-puzzle','newGame,tapAt,solveSoon:function(){board=[1,2,3,4,5,6,7,0,8];n=3;build();tapAt(8);}');
 g.t.solveSoon();g.t.newGame();g.advance(500);assert.equal(g.dialogs.length,0);
}
{
 const g=game('wordle','startGame,setMode,addLetter,submit,answer:function(){return answer;}');
 g.t.setMode('endless');g.t.answer().split('').forEach(g.t.addLetter);g.t.submit();assert.equal(g.saved.get('wordle.stats.endless').wins,1);
 g.t.startGame();g.advance(4000);assert.equal(g.window.__wordle.state().guesses.length,0);assert.equal(g.saved.get('wordle.stats.endless').played,1);
 g.t.setMode('daily');g.t.answer().split('').forEach(g.t.addLetter);g.t.submit();assert.equal(g.saved.get('wordle.stats.daily').wins,1);
 g.t.startGame();g.advance(4000);assert(g.window.__wordle.state().won);assert.equal(g.saved.get('wordle.stats.daily').played,1);
}
console.log('PASS: memory reset/records, 2048 reset/continue, slide reset, Wordle immediate daily/endless stats and callback cancellation');

// Ad puzzles: exercise the exact pure logic files loaded by the browser controllers.
for (const dir of ['pin-pull','water-sort','screw-puzzle','parking-jam','untangle']) {
  for (const file of ['logic.js','game.js']) new vm.Script(read(dir+'/'+file),{filename:dir+'/'+file});
  vm.runInNewContext(read(dir+'/logic.js'),ctx);
}
for (const file of ['assets/ad-puzzles.js']) new vm.Script(read(file),{filename:file});
const W=ctx.window.WaterLogic, Park=ctx.window.ParkingLogic, Screw=ctx.window.ScrewLogic, U=ctx.window.UntangleLogic, Pin=ctx.window.PinLogic;
assert(!/광고에서 본 그 게임|광고 게임/.test(read('index.html')+read('README.md')),'hub category uses its new name');
assert(read('index.html').includes('><span class="tab-icon" aria-hidden="true">👀 </span>어? 그 게임'),'hub shares the icon and label structure');
for(const dir of ['pin-pull','water-sort','screw-puzzle','parking-jam','untangle'])assert(read(dir+'/index.html').includes('href="../puzzles/">← 어? 그 게임'),'back link opens the puzzle category');
function bfs(start, key, goal, neighbors, limit=200000) {
  const queue=[start],seen=new Set([key(start)]);
  for(let head=0;head<queue.length;head++) {
    const s=queue[head];if(goal(s))return true;
    for(const next of neighbors(s)) {
      const k=key(next);if(seen.has(k))continue;seen.add(k);queue.push(next);
      assert(queue.length<=limit,'BFS exceeded state limit');
    }
  }
  return false;
}
const waterKey=t=>t.map(a=>a.join('')).sort().join('|');
for(let sample=0;sample<24;sample++) {
  const {tubes}=W.generate(1+sample%3,rnd);
  assert(!W.solved(tubes),'water starts unsolved');
  assert(bfs(tubes,waterKey,W.solved,s=>{
    const next=[];for(let a=0;a<s.length;a++)for(let b=0;b<s.length;b++){const t=W.pour(s,a,b);if(t)next.push(t);}return next;
  }), 'water small level BFS solvable');
}
let waterWitnesses=0;
for(const level of [...Array.from({length:40},(_,i)=>i+1),80,250,9999])for(let sample=0;sample<8;sample++) {
  waterWitnesses++;
  const generated=W.generate(level,rnd);let state=generated.tubes;
  assert(!W.solved(state),'water generated puzzle must be mixed');
  assert.equal(state.flat().length,generated.colors*4);
  for(let c=0;c<generated.colors;c++)assert.equal(state.flat().filter(v=>v===c).length,4);
  for(const [a,b] of generated.solution){state=W.pour(state,a,b);assert(state,'reverse-shuffle witness must be a legal maximal pour');}
  assert(W.solved(state),'reverse-shuffle witness solves generated level');
}
assert.equal(W.pour([[0],[1],[],[]],0,1),null);
assert.equal(W.pour([[0],[0,0,0,0]],0,1),null);
assert(Park.designs.length>=15&&Park.designs.length<=20,'15–20 parking levels');
for(let level=1;level<=Park.designs.length;level++) {
  const cars=Park.level(level),occupied=new Set();
  assert(cars.some((car,i)=>!Park.canExit(cars,i)),'parking starts with at least one blocked car');
  for(const c of cars){assert(c.len>=2&&c.len<=3);for(const [x,y] of Park.cells(c)){assert(x>=0&&x<6&&y>=0&&y<6);const k=x+','+y;assert(!occupied.has(k),'parking overlap');occupied.add(k);}}
  assert(bfs(cars,s=>s.map(c=>c?c.id:'.').join(''),s=>s.every(c=>!c),s=>{
    const out=[];s.forEach((c,i)=>{if(c&&Park.canExit(s,i)){const n=s.slice();n[i]=null;out.push(n);}});return out;
  }), 'parking '+level+' BFS solvable');
}
// Compare actual geometry, ignoring names, hints, colors, materials and mechanics.
// Pairwise tolerances also catch tiny shifts that evade an exact hash/grid boundary.
const {createHash}=require('node:crypto');
const {solveScrew,solvePin}=require('./puzzle-solvers.cjs');
function signature(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function introductions(L){for(let n=1;n<=L.designs.length;n++){const d=L.level(n);assert(d.mechanics.length);assert(d.hint&&/[가-힣]/.test(d.hint),`${n}: Korean level strategy`);assert.equal(new Set(d.mechanics).size,d.mechanics.length);for(const m of d.mechanics)assert(L.mechanicHints[m]&&/[가-힣]/.test(L.mechanicHints[m]),`${n}: ${m} needs a per-mechanic Korean introduction`);}}
const close=(a,b,tolerance)=>a.length===b.length&&a.every((n,i)=>Math.abs(n-b[i])<=tolerance);
const sameSet=(a,b,near)=>a.length===b.length&&a.every(x=>b.some(y=>near(x,y)))&&b.every(y=>a.some(x=>near(x,y)));
function nearPin(a,b){
  const nearSeg=(a,b)=>close([a.x1,a.y1,a.x2,a.y2],[b.x1,b.y1,b.x2,b.y2],22)||close([a.x1,a.y1,a.x2,a.y2],[b.x2,b.y2,b.x1,b.y1],22);
  return sameSet(a.walls,b.walls,nearSeg)&&sameSet(a.pins,b.pins,nearSeg)&&sameSet(a.cups,b.cups,(a,b)=>close([a.x1,a.x2,a.y],[b.x1,b.x2,b.y],22));
}
function nearScrew(a,b){return a.plates.length===b.plates.length&&a.plates.every((q,p)=>{
  const r=b.plates[p];return q.shape===r.shape&&close([q.x,q.y,q.w,q.h],[r.x,r.y,r.w,r.h],6)&&Math.abs(q.angle-r.angle)<=12&&sameSet(q.screws,r.screws,(a,b)=>close([a.x,a.y],[b.x,b.y],.12));
});}
for(const [L,near] of [[Pin,nearPin],[Screw,nearScrew]]){
  for(let n=1;n<=L.designs.length;n++)for(let m=1;m<n;m++)assert(!near(L.level(n),L.level(m)),`${n} and ${m}: nearly identical geometry`);
  const original=L.level(1),renamed=JSON.parse(JSON.stringify(original));renamed.name='다른 이름';renamed.mechanics=[];
  if(renamed.plates)renamed.plates.forEach(q=>{q.x+=1;q.angle+=1;q.colors=q.colors.map(c=>(c+1)%6);q.screws.forEach(s=>{s.x+=.01;});});
  else {for(const s of [...renamed.walls,...renamed.pins]){s.x1+=2;s.x2+=2;}renamed.particles=[];}
  assert(near(original,renamed),'renaming, recoloring or tiny shifts cannot disguise a repeated layout');
}
introductions(Screw);introductions(Pin);
assert.equal(Screw.designs.length,20,'20 explicit screw boards');
const screwSignatures=new Set();let crossedLayerSolutions=0,hingeCoverageChanges=0;
for(let level=1;level<=Screw.designs.length;level++) {
  const data=Screw.level(level),initial=Screw.initial(data),before=JSON.stringify(initial);
  assert(data.palette.length&&data.palette.every(c=>Number.isInteger(c)&&c>=0&&c<6),'authored plate colors');
  assert(data.materials.length&&data.materials.every(m=>['wood','metal','acrylic'].includes(m)),'authored plate materials');
  const geometry=data.plates.map(q=>({shape:q.shape,x:q.x,y:q.y,w:q.w,h:q.h,angle:q.angle,screws:q.screws.map(s=>[s.x,s.y])}));
  const sig=signature(geometry);assert(!screwSignatures.has(sig),'unique screw layout '+level);screwSignatures.add(sig);
  const colors=data.plates.flatMap(q=>q.colors),counts=new Map();colors.forEach(c=>counts.set(c,(counts.get(c)||0)+1));
  for(const [c,count] of counts)assert.equal(count,data.queue.filter(n=>n===c).length*3,'queue exactly fits all screws');
  assert(data.buffer>=1&&data.buffer<=3);
  let covered=0;
  data.plates.forEach((q,p)=>{assert(q.screws.length>=1&&q.screws.length<=4);q.screws.forEach((spot,s)=>{
    assert(Screw.covers(q,...Object.values(Screw.worldPoint(q,spot)),0),'screw belongs to the plate silhouette');
    if(!Screw.available(data,initial,p,s)){covered++;assert.equal(Screw.remove(data,initial,p,s),null,'covered/locked screws reject input');}
    if(spot.lock){assert(data.plates[spot.lock.p]?.screws[spot.lock.s],'lock reference exists');assert(Screw.locked(data,initial,p,s));}
    if(spot.lock)assert(data.mechanics.includes(spot.lock.type),'actual lock has a matching introduction');
  });});
  if(data.plates.some(q=>q.hinge))assert(data.mechanics.includes('hinge'));
  if(data.plates.filter(q=>q.hinge).length>1)assert(data.mechanics.includes('doubleHinge'));
  if(data.plates.some(q=>q.screws.length===4))assert(data.mechanics.includes('four'));
  if(data.plates.some(q=>q.shape==='cross'))assert(data.mechanics.includes('cross'));
  assert(covered,'each board contains actual overlap/locks');assert.equal(JSON.stringify(initial),before,'rejected taps preserve state');
  const solution=solveScrew(Screw,data,state=>{
    if(state.failed)return;
    const removed=state.removed.reduce((n,mask)=>n+mask.toString(2).replace(/0/g,'').length,0);
    const stored=state.tray.length+state.boxes.reduce((n,b)=>n+(b?b.n:0),0)+(state.next-state.boxes.filter(Boolean).length)*3;
    assert.equal(removed,stored,'every screw remains in a box, buffer or completed box');
    assert(state.tray.length<=data.buffer&&state.boxes.every(b=>!b||(b.n>=0&&b.n<3)));
    assert(!data.moveLimit||state.moves<=data.moveLimit);
  });
  assert(solution,'screw '+level+' search finds a solution');
  let state=initial,lastPlate=data.plates.length-1;
  for(const [p,s] of solution){if(p>lastPlate)crossedLayerSolutions++;lastPlate=p;const old=state;state=Screw.remove(data,state,p,s);assert(state);
    const pose=Screw.pose(data,state,p);if(pose.swung){const anchor=data.plates[p].screws.find((_,s)=>!(state.removed[p]&(1<<s)));const a=Screw.worldPoint(data.plates[p],anchor),b=Screw.worldPoint(pose,anchor);assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-7,'hinge preserves its remaining anchor');const flat=JSON.parse(JSON.stringify(data));flat.plates[p].hinge=0;for(let j=0;j<p;j++)for(let t=0;t<data.plates[j].screws.length;t++)if(Screw.available(data,state,j,t)!==Screw.available(flat,state,j,t))hingeCoverageChanges++;}
    if(data.moveLimit){const exceeded={...old,moves:data.moveLimit};assert(Screw.remove(data,exceeded,p,s).failed,'bonus fails if a legal move exceeds the limit');const undo=Screw.undo(data,exceeded,initial);assert(undo.failed&&undo.moves===data.moveLimit+1,'undo also consumes bonus budget');}
  }
  assert(Screw.solved(data,state)&&state.tray.length===0,'all plates and boxes finish together');
}
assert(hingeCoverageChanges>=7,'hinges really change lower screw coverage');
assert(crossedLayerSolutions>=3,'several solutions must revisit upper plates after removing exposed lower screws');
// This board cannot be solved by simply stripping every plate from the top down.
{
 const d=Screw.level(8);let state=Screw.initial(d);for(const [p,s] of [[2,0],[2,1],[2,2]])state=Screw.remove(d,state,p,s);
 assert.equal(state.tray.length,1);assert(Screw.available(d,state,1,0));assert.equal(Screw.remove(d,state,1,0),null,'one-slot buffer prevents the obvious next screw');
 assert(Screw.remove(d,state,0,0),'exposed lower screw unlocks progress');
}
let untangleWitnesses=0;
for(const level of [...Array.from({length:60},(_,i)=>i+1),250,9999])for(let sample=0;sample<4;sample++) {
  untangleWitnesses++;
  const data=U.generate(level,rnd);
  assert(U.clear(data.solution,data.edges),'untangle solution is planar and separated');
  assert(U.crossings(data.nodes,data.edges).length>0,'untangle starts crossed');
  assert.equal(data.nodes.length,data.solution.length);
  assert(data.edges.every(([a,b])=>a!==b&&a>=0&&b<data.nodes.length));
}
assert(U.intersects({x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}));
assert(U.intersects({x:0,y:0},{x:10,y:0},{x:5,y:0},{x:15,y:0}),'collinear overlap counts');
assert.deepEqual(JSON.parse(JSON.stringify(U.crossingPoint({x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}))),{x:5,y:5},'crossing glows sit at the intersection');
// Replay the same fixed-step physical simulation as the canvas, including paint,
// heavy balls, key collection, mud contacts and each individual cup quota.
let wrongOrders=0;
assert.equal(Pin.designs.length,20,'20 explicit pin chambers');
assert(Pin.R>=9&&Pin.R<=11,'phone-readable gems');
const pinSignatures=new Set();
for(let level=1;level<=Pin.designs.length;level++){
  const data=Pin.level(level);
  const segments=items=>items.map(({x1,y1,x2,y2})=>[[x1,y1],[x2,y2]].sort()).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const sig=signature({walls:segments(data.walls),pins:segments(data.pins),particles:data.particles.map(p=>[p.x,p.y,p.kind]).sort()});
  assert(!pinSignatures.has(sig),'unique pin layout '+level);pinSignatures.add(sig);
  assert.equal(new Set(data.order).size,data.order.length,'solution never pulls a pin twice');
  assert(data.order.every(i=>data.pins[i]),'solution references real pins');
  assert(data.particles.every(p=>p.x>0&&p.x<360&&p.y>0&&p.y<data.height),'particles start on the board');
  const handles=data.pins.map(p=>{const dx=p.x2-p.x1,dy=p.y2-p.y1,len=Math.hypot(dx,dy);return {x:Math.max(28,Math.min(332,p.x1-dx/len*24)),y:Math.max(28,Math.min(data.height-28,p.y1-dy/len*24))};});
  handles.forEach((a,i)=>handles.slice(0,i).forEach(b=>assert(Math.hypot(a.x-b.x,a.y-b.y)*296/360>=44,'44px pin targets do not overlap on a 320px phone')));
  for(const pin of data.pins)assert(data.mechanics.includes(pin.x1===pin.x2?'vertical':pin.y1===pin.y2?'horizontal':'diagonal'),'actual pin direction has an introduction');
  const found=solvePin(Pin,data);assert(found,`pin ${level}: search independently finds a physical solution`);
  assert(Pin.solved(data,Pin.simulate(data,found)),'searched pin solution replays');
  const state=Pin.simulate(data,data.order);
  assert(Pin.solved(data,state),`pin ${level} physical simulation wins (${state.collected}/${data.target}): ${state.reason}`);
  assert.equal(state.collected,data.total);assert.equal(state.lost,0);
  assert.equal(state.drained,data.particles.filter(p=>p.kind==='mud').length,'all mud reaches the side outlet');
  assert(state.balls.every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)),'finite physical state');
  assert(state.balls.filter(b=>b.status==='cup').every(b=>b.kind==='gem'),'all gray gems converted before collection');
  assert(data.cups.every((c,i)=>state.cups[i]===c.quota),'each cup receives its own quota');
  assert.equal(JSON.stringify(Pin.simulate(data,data.order)),JSON.stringify(state),'deterministic fixed-step replay');
  if(data.mechanics.some(m=>['mud','stone','lock','trick','paint'].includes(m)))assert(data.wrong.length,'hazards/paint/lock/trick have an authored wrong order');
  for(const order of data.wrong){const bad=Pin.simulate(data,order);assert(!Pin.solved(data,bad),`pin ${level}: designed wrong order ${order} cannot win`);wrongOrders++;assert(bad.failed||data.pins.some((p,i)=>p.lock&&!bad.open[i]),'wrong order causes physical failure or leaves a locked pin closed');}
  for(const [i,pin] of data.pins.entries())if(pin.lock){const locked=Pin.initial(data);assert(Pin.locked(data,locked,i));assert.equal(Pin.pull(data,locked,i),false,'locked pin rejects early tap');assert(!locked.open[i]);}
}
{
 const d=Pin.level(1),s=Pin.initial(d);for(let tick=0;tick<240;tick++)Pin.step(d,s);
 assert(s.balls.every(b=>b.y<d.pins[0].y1-Pin.R),'closed pin physically supports gems');assert.equal(s.collected,0);assert(Pin.pull(d,s,0));assert.equal(Pin.pull(d,s,0),false);
 const spill=Pin.initial(d);spill.balls.forEach(b=>{b.x=-30;b.y=520;});Pin.step(d,spill);assert(spill.failed&&/놓쳤/.test(spill.reason));
 const cup=Pin.simulate(d,d.order).balls.filter(b=>b.status==='cup');assert(Math.max(...cup.map(b=>b.y))-Math.min(...cup.map(b=>b.y))>Pin.R,'gems physically stack in the cup');
 const muddy=Pin.level(4),fast=Pin.initial(muddy);for(const i of muddy.order.slice().reverse())Pin.pull(muddy,fast,i);for(let t=0;t<1200;t++)Pin.step(muddy,fast);assert(fast.failed,'rapid wrong pulls cannot bypass mixing');
}
for(const value of [0,.5,.999999]) {
  const d=W.generate(1,()=>value);let t=d.tubes;assert(!W.solved(t));
  for(const [a,b] of d.solution){t=W.pour(t,a,b);assert(t);}assert(W.solved(t));
}
assert.equal(W.generate(1,rnd).solution.length,3,'water tutorial takes three pours');
assert.equal(U.generate(1,rnd).nodes.length,4,'untangle tutorial starts with four pegs');
assert(U.clear([U.generate(1,rnd).solution[0],...U.generate(1,rnd).nodes.slice(1)],U.generate(1,rnd).edges),'one peg solves the untangle tutorial');
assert.equal(W.generate(25,rnd).colors,10,'water grows to ten colors');
assert.equal(W.generate(9999,rnd).colors,10,'water remains bounded');
console.log(`PASS: water small-case BFS + ${waterWitnesses} reverse-shuffle solution witnesses (2–10 colors); ${Park.designs.length} parking BFS; ${Screw.designs.length} screw + ${Pin.designs.length} independent physical pin searches; exact/near layout comparisons + per-mechanic hints + separated pin targets; screw locks/conservation/hinges/budgets; pin deterministic replay/cup piles/side bins + ${wrongOrders} wrong-order failures + locks/paint/cup quotas/rapid-pull/lost-gem checks; ${untangleWitnesses} planar untangle solutions (through level 9,999)`);

// Run real controllers with a small DOM/RAF harness. This checks resets during async
// pours/flights/driving and progress persistence without pretending to be a browser.
const {adController}=require('./ad-controller-harness.cjs');

(async()=>{
  const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
  for(const dir of ['pin-pull','water-sort','screw-puzzle','parking-jam','untangle']){
    const g=adController(dir);assert.equal(g.saved.get(dir+'.level'),1);assert.equal(g.all('.sound-toggle')[0].getAttribute('aria-pressed'),'false');
    if(dir==='pin-pull'){
      g.all('.pin-handle')[0].click();g.press('restart');g.ticks(360);assert(g.ids.get('next').disabled,'reset cancels old pin pour');
      g.all('.pin-handle')[0].click();g.ticks(360);assert(!g.ids.get('next').disabled,'real pin controller celebrates after simulated collection');assert.equal(g.saved.get('pin-pull.unlocked'),2);g.press('next');assert.equal(g.saved.get('pin-pull.level'),2);
    }else if(dir==='water-sort'){
      const pair=()=>{const board=g.ids.get('board'),L=g.window.WaterLogic,tubes=board.children.map(t=>t.querySelectorAll('.water').map(c=>Number(c.className.split('color-')[1])));for(let a=0;a<tubes.length;a++)for(let b=0;b<tubes.length;b++)if(L.pour(tubes,a,b))return [a,b];throw Error('no water move');};
      let [a,b]=pair();g.ids.get('board').children[a].click();g.ids.get('board').children[b].click();g.press('restart');await settle();assert.equal(g.ids.get('moves').textContent,0);assert.equal(g.all('.pouring-tube').length,0);
      [a,b]=pair();g.ids.get('board').children[a].click();g.ids.get('board').children[b].click();await settle();assert.equal(g.ids.get('moves').textContent,1);assert.equal(g.all('.pour-stream').length,0);
    }else if(dir==='screw-puzzle'){
      const available=()=>g.all('.screw').find(b=>b.getAttribute('aria-disabled')!=='true');
      g.all('.screw').find(b=>b.getAttribute('aria-disabled')==='true').click();await settle();assert.equal(g.ids.get('moves').textContent,0,'blocked screw shakes without consuming a move');
      available().click();g.press('restart');await settle();assert.equal(g.ids.get('moves').textContent,0);assert.equal(g.all('.flying-screw').length,0);
      available().click();await settle();assert.equal(g.ids.get('moves').textContent,1);
      g.ids.get('extras').children[0].click();assert.equal(g.all('.screw').length,6,'undo restores the removed head');
      for(let i=0;i<6;i++){g.all('.screw').reverse().find(b=>b.getAttribute('aria-disabled')!=='true').click();await settle();}
      assert(!g.ids.get('next').disabled,'screw controller clears both plates and toolboxes');assert.equal(g.all('.puzzle-clear').length,1,'stars and clear banner remain visible with reduced motion');
    }else if(dir==='parking-jam'){
      const cars=g.window.ParkingLogic.level(1),index=cars.findIndex((_,i)=>g.window.ParkingLogic.canExit(cars,i));
      g.all('.car')[index].click();g.press('restart');await settle();assert.equal(g.ids.get('moves').textContent,0);assert.equal(g.all('.car').length,cars.length);
      g.all('.car')[index].click();await settle();assert.equal(g.all('.car').length,cars.length-1);
      assert.equal(g.ids.get('scene-meter').textContent,'목표 '+cars.length+'대 · 탈출 1 / '+cars.length+'대');
    }else{
      g.all('.graph-node')[0].dispatch('keydown',{key:'ArrowLeft'});assert.equal(g.ids.get('moves').textContent,1);g.press('restart');
      for(let i=0;i<10&&g.ids.get('next').disabled;i++)g.ids.get('extras').children[0].click();assert(!g.ids.get('next').disabled,'untangle hint solution wins');
      assert.equal(g.all('.puzzle-clear').length,1);assert.equal(g.all('.crossing-point').length,0,'solved ropes have no crossing glow');
    }
    g.press('restart');await settle();assert.equal(g.ids.get('moves').textContent,0);assert(g.ids.get('next').disabled);
    g.all('.sound-toggle')[0].click();g.press('restart');assert.equal(g.all('.sound-toggle')[0].getAttribute('aria-pressed'),'true');
  }
  const legacy=adController('water-sort',25);assert.equal(legacy.ids.get('board').children.length,12);assert.equal(legacy.saved.get('water-sort.level'),25,'legacy progress key stays compatible');
  for(const dir of ['pin-pull','screw-puzzle','parking-jam']){
    const old=adController(dir,999,{unlocked:999});assert.equal(old.saved.get(dir+'.level'),dir==='parking-jam'?18:20,'legacy level clamps to the new maximum');assert.equal(old.saved.get(dir+'.unlocked'),dir==='parking-jam'?18:20,'legacy unlock clamps too');
  }
  {
    const g=adController('water-sort');
    assert.equal(g.all('.tutorial-hand').length,1,'first pour has a pointing hand');
    for(const [a,b] of g.window.WaterLogic.generate(1).solution){g.all('.tube')[a].click();g.all('.tube')[b].click();await settle();}
    assert.equal(g.all('.tube-cork').length,2,'both completed colors get corks');assert.equal(g.all('.puzzle-clear').length,1);assert(!g.ids.get('next').disabled);assert.equal(g.ids.get('moves').textContent,3);
  }
  {
    const g=adController('water-sort',1,{reduced:false});
    g.all('.tube')[0].click();g.all('.tube')[2].click();assert(g.animations[0].keyframes.at(-1).transform.includes('rotate('),'tube moves and tilts before pouring');
    g.finishAnimations();await settle();assert.equal(g.all('.pour-stream').length,1,'an SVG arc joins the pouring mouth to the target');
    assert(g.animations.some(a=>a.keyframes[0].height==='0px'),'target liquid rises continuously');
    assert(g.animations.some(a=>a.keyframes.at(-1).height==='0px'),'source liquid falls continuously');
    g.press('restart');g.finishAnimations();await settle();assert.equal(g.all('.water-flight').length,0,'reset during actual pouring removes the stream and ghost');assert.equal(g.ids.get('moves').textContent,0);
  }
  {
    const g=adController('parking-jam',1,{reduced:false}),cars=g.window.ParkingLogic.level(1),blocked=cars.findIndex((_,i)=>!g.window.ParkingLogic.canExit(cars,i));
    g.all('.car')[blocked].click();assert.equal(g.ids.get('moves').textContent,0,'blocked car never counts as an exit');assert(g.animations[0].keyframes.some(k=>k.transform.includes('rotate')),'blocked car gently bounces and shakes');
    g.finishAnimations();await settle();const open=cars.findIndex((_,i)=>g.window.ParkingLogic.canExit(cars,i));g.all('.car')[open].click();
    assert.equal(g.animations[0].keyframes.length,4,'exit accelerates through its lane');assert.equal(g.all('.active').length,1,'matching curb gap lights up');
    g.press('restart');g.finishAnimations();await settle();assert.equal(g.all('.car').length,cars.length);assert.equal(g.ids.get('moves').textContent,0,'restart cancels actual driving');
  }
  {
    const g=adController('parking-jam'),cars=g.window.ParkingLogic.level(1);
    while(cars.some(Boolean)){const i=cars.findIndex((c,i)=>c&&g.window.ParkingLogic.canExit(cars,i));g.all('.car').find(b=>+b.dataset.index===i).click();await settle();cars[i]=null;}
    assert.equal(g.all('.puzzle-clear').length,1);assert(!g.ids.get('next').disabled,'parking celebrates after every car exits');
  }
  {
    const g=adController('untangle'),node=g.all('.graph-node')[0],label=node.getAttribute('aria-label');
    assert.equal(g.all('.crossing-point').length,1);assert.equal(g.all('.tutorial-hand').length,1);
    node.dispatch('pointerdown');assert(node.classList.contains('dragging'));node.dispatch('pointermove',{clientX:120,clientY:210});g.ticks(1);node.dispatch('pointercancel');
    assert.equal(node.getAttribute('aria-label'),label,'pointer cancellation restores the peg');assert.equal(g.ids.get('moves').textContent,0);
    node.dispatch('pointerdown');node.dispatch('pointermove',{clientX:134.32,clientY:209.68});node.dispatch('pointerup');
    assert(!g.ids.get('next').disabled,'dragging the tutorial peg to its ring solves the actual controller');assert.equal(g.ids.get('moves').textContent,1);assert.equal(g.all('.puzzle-clear').length,1);
  }
  {
    const g=adController('screw-puzzle',1,{reduced:false});
    g.all('.screw').find(b=>b.getAttribute('aria-disabled')!=='true').click();
    assert(g.animations[0].keyframes.at(-1).transform.includes('720deg'),'screw lifts with two full turns');
    g.finishAnimations();await settle();assert.equal(g.animations.length,1,'flight follows the lift');
    assert.equal(g.animations[0].keyframes.length,3,'flight includes a raised arc midpoint');
    g.press('restart');g.finishAnimations();await settle();assert.equal(g.ids.get('moves').textContent,0,'reset during actual animation discards the old flight');assert.equal(g.all('.flying-screw').length,0);
  }
  console.log('PASS: all five real controllers; animated pour/level changes and driving reset cancellation, corks/clear banners, blocked-car bounce, exit meter, peg drag/cancel/glows, keyboard/hint win, sound OFF and legacy progress');
})().catch(e=>{console.error(e);process.exitCode=1;});


