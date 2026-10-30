// Run with node scripts/audit-sanity.cjs; no dependencies or browser needed.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
function read(p) { return fs.readFileSync(p, 'utf8'); }
function inline(p) { return [...read(p).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n'); }
for (const dir of ['sudoku','minesweeper','2048','memory','slide-puzzle','wordle','chosung','liar','tools','ox','telepathy','charades','speed','taboo','pin-pull','water-sort','screw-puzzle','parking-jam','untangle']) {
  new vm.Script(inline(dir+'/index.html'), {filename: dir+'/index.html'});
}
for (const p of ['assets/common.js','assets/teamround.js','tools/logic.js','charades/words.js','speed/words.js','chosung/words.js','ox/questions.js','taboo/words.js','wordle/words.js']) new vm.Script(read(p), {filename:p});
const ctx = {window:{}}; vm.runInNewContext(read('tools/logic.js'),ctx);
const L = ctx.window.ToolsLogic;
assert.equal(L.splitTeams(['가/toString','나/constructor','다/__proto__','라/hasOwnProperty'],2).flat().length,4);
let seed = 12345;
function rnd() { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
for (let n=2;n<=20;n++) for (let k=0;k<500;k++) {
  const a=L.buildLadder(n,rnd);
  assert.equal(new Set(a.ends).size,n);
  assert.deepEqual(a.ends, L.traceAll(a.rungs, n, a.levels));
  for(let c=0;c<n-1;c++) assert(a.rungs.filter(row=>row[c]).length>=2,`gap ${c} has fewer than 2 rungs (n=${n})`);
  for(const row of a.rungs) for(let c=1;c<row.length;c++) assert(!(row[c]&&row[c-1]));
}
// Enumerate all Fisher–Yates choices: every possible result must occur exactly once.
for(let n=2;n<=5;n++) {
  const counts=new Map();
  function visit(choices, size) {
    if(size>1) { for(let j=0;j<size;j++) visit([...choices,(j+0.5)/size],size-1); return; }
    let i=0; const a=L.buildLadder(n,()=>choices[i++]);
    const result=a.ends.join(','); counts.set(result,(counts.get(result)||0)+1);
  }
  visit([],n);
  assert([...counts.values()].every(v=>v===1));
  assert.equal(counts.size,Array.from({length:n},(_,i)=>i+1).reduce((a,b)=>a*b,1));
}
const counts=[0,0]; for(let i=0;i<20000;i++) counts[L.buildLadder(2,rnd).ends[0]]++;
assert(Math.abs(counts[0]-10000)<400);
vm.runInNewContext(read('wordle/words.js'),ctx);
const answers=ctx.window.WORDLE_ANSWERS, valid=ctx.window.WORDLE_VALID;
assert(answers.length>450); assert(answers.every(w=>/^[a-z]{5}$/.test(w)));
assert.equal(new Set(answers).size,answers.length);
assert(answers.every(w=>valid.includes(w)));
for(const w of 'drunk smoke booze beers vodka ciggy ghost devil blood knife bitch fucks sluts'.split(' ')) assert(!valid.includes(w),w);
for(const [p,name,field,sep] of [
  ['charades/words.js','CHARADES_DATA','words',','],['speed/words.js','SPEED_DATA','words',','],
  ['chosung/words.js','CHOSUNG_DATA','items',null],['ox/questions.js','OX_DATA','items',null],['taboo/words.js','TABOO_DATA','cards','|']
]) {
  vm.runInNewContext(read(p),ctx);
  for(const c of ctx.window[name]) {
    const items=sep?c[field].split(sep):c[field]; assert(items.length>=15,c.cat);
    assert(items.every(s=>!/(담배|맥주|막걸리|포도주|좀비|유령|드라큘라|장도리)/.test(s)),c.cat);
  }
}
console.log('PASS: syntax, tags, ladder permutations (2–20 players), exact uniformity (2–5 players), content');
console.log('2-player distribution (20,000):',counts,'Wordle words:',answers.length);

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
  if(file==='liar') context.window.LIAR_DATA=[{cat:'테스트',words:'사과,바나나'}];
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
{
 const g=game('liar',"renderVerdict,renderReveal,renderEnd,init:function(){S.n=3;G={cat:'과일',word:'바나나',alt:'사과',liar:0,votes:[1,1,0]};}");
 g.t.init();g.t.renderVerdict();assert(!g.element('#app').innerHTML.includes('바나나'));
 const choices=g.element('#app').querySelector('.panel').children;assert.equal(choices.length,2);
 choices[0].onclick();assert(!g.element('#app').innerHTML.includes('바나나'));
 g.t.renderEnd('citizen','완료');assert(g.element('#app').innerHTML.includes('바나나'));
}
for(const mode of ['act','explain','taboo']) {
 const g=game('assets/teamround.js',"startSession,startTurn,mark,renderSummary,turnState:function(){return turn;},setDeadline:function(d){turn.deadline=d;}");
 g.window.TeamRound.start({key:mode,mode,emoji:'',cats:[{name:'과일',items:[{w:'사과'},{w:'바나나'}]}],timeOptions:[60],intro:'',readyNote:'',countNote:''});
 g.t.startSession();g.t.startTurn();g.t.setDeadline(1001);g.t.mark('ok');assert.equal(g.t.turnState().entries.length,1);
 g.t.setDeadline(1000);g.t.mark('pass');assert.equal(g.t.turnState().entries.length,1);assert(g.t.turnState().over);
 if(mode==='taboo') {
  g.t.startTurn();g.t.mark('foul');g.t.renderSummary();assert.equal(g.element('#sumPts').textContent,'-1점');
  const buttons=g.element('#sumList').children[0].children.slice(2);assert.equal(buttons.length,2);
  buttons.find(b=>b.textContent==='패스로').onclick();assert.equal(g.element('#sumPts').textContent,'+0점');
 }
}
console.log('PASS: liar tie selection and secret until final guess; all three team games reject deadline inputs; taboo penalty correction');
{
 const els=new Map(), spins=[], tasks=[];let job=0;
 const $=s=>{if(!els.has(s))els.set(s,{checked:true,insertAdjacentHTML(){}});return els.get(s);};
 const ctx={$,kn:3,picked:[],lastPick:[],MG:{shuffle:a=>a,unlockAudio(){},toast(){}},plainList:()=>['가','나','다','라'],stopMotion:()=>++job,alive:id=>id===job,prefersReduce:()=>false,updatePickInfo(){},intoView(){},spinSlot:(el,pool,winner,dur,id,done)=>spins.push({pool,winner,done}),later:fn=>tasks.push(fn),esc:String};
 const src=inline('tools/index.html');const a=src.indexOf("  $('#pick').onclick ="),b=src.indexOf("  $('#copyPick').onclick",a);
 vm.runInNewContext(src.slice(a,b),ctx);$('#pick').onclick();assert.equal(ctx.picked.length,0);assert.equal(ctx.lastPick.length,0);
 spins.shift().done();assert.equal(ctx.picked.join(','),'가');assert.equal(ctx.lastPick.join(','),'가');
 ++job;tasks.shift()();assert.equal(spins.length,0);
 $('#pick').onclick();assert.equal(spins[0].pool.join(','),'나,다,라');
}
console.log('PASS: interrupted exclusion draw excludes and copies only revealed winners');


// Ad puzzles: exercise the exact pure logic files loaded by the browser controllers.
for (const dir of ['pin-pull','water-sort','screw-puzzle','parking-jam','untangle']) {
  for (const file of ['logic.js','game.js']) new vm.Script(read(dir+'/'+file),{filename:dir+'/'+file});
  vm.runInNewContext(read(dir+'/logic.js'),ctx);
}
for (const file of ['assets/ad-puzzles.js']) new vm.Script(read(file),{filename:file});
const W=ctx.window.WaterLogic, Park=ctx.window.ParkingLogic, Screw=ctx.window.ScrewLogic, U=ctx.window.UntangleLogic, Pin=ctx.window.PinLogic;
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
  const {tubes}=W.generate(1,rnd);
  assert(!W.solved(tubes),'water starts unsolved');
  assert(bfs(tubes,waterKey,W.solved,s=>{
    const next=[];for(let a=0;a<s.length;a++)for(let b=0;b<s.length;b++){const t=W.pour(s,a,b);if(t)next.push(t);}return next;
  }), 'water small level BFS solvable');
}
for(let level=1;level<=40;level++)for(let sample=0;sample<8;sample++) {
  const generated=W.generate(level,rnd);let state=generated.tubes;
  assert(!W.solved(state),'water generated puzzle must be mixed');
  assert.equal(state.flat().length,generated.colors*4);
  for(let c=0;c<generated.colors;c++)assert.equal(state.flat().filter(v=>v===c).length,4);
  for(const [a,b] of generated.solution){state=W.pour(state,a,b);assert(state,'reverse-shuffle witness must be a legal maximal pour');}
  assert(W.solved(state),'reverse-shuffle witness solves generated level');
}
assert.equal(W.pour([[0],[1],[],[]],0,1),null);
assert.equal(W.pour([[0],[0,0,0,0]],0,1),null);
for(let level=1;level<=Park.designs.length;level++) {
  const cars=Park.level(level),occupied=new Set();
  assert(cars.some((car,i)=>!Park.canExit(cars,i)),'parking starts with at least one blocked car');
  for(const c of cars){assert(c.len>=2&&c.len<=3);for(const [x,y] of Park.cells(c)){assert(x>=0&&x<6&&y>=0&&y<6);const k=x+','+y;assert(!occupied.has(k),'parking overlap');occupied.add(k);}}
  assert(bfs(cars,s=>s.map(c=>c?c.id:'.').join(''),s=>s.every(c=>!c),s=>{
    const out=[];s.forEach((c,i)=>{if(c&&Park.canExit(s,i)){const n=s.slice();n[i]=null;out.push(n);}});return out;
  }), 'parking '+level+' BFS solvable');
}
// Search all legal screw choices until a solution is found, with memoization.
for(let level=1;level<=Screw.designs.length;level++) {
  const data=Screw.level(level),visited=new Set();
  assert(data.plates.some((_,p)=>[0,1,2].some(s=>!Screw.available(data,Screw.initial(data),p,s))),'layered plates actually cover screws');
  function solve(state){
    if(state.removed.every(n=>n===7))return true;
    const key=JSON.stringify(state);if(visited.has(key))return false;visited.add(key);
    for(let p=data.plates.length-1;p>=0;p--)for(let s=0;s<3;s++){
      const next=Screw.remove(data,state,p,s);
      if(next){
        const removed=next.removed.reduce((n,mask)=>n+mask.toString(2).replace(/0/g,'').length,0);
        const stored=next.tray.length+next.boxes.reduce((n,b)=>n+(b?b.n:0),0)+(next.next-next.boxes.filter(Boolean).length)*3;
        assert.equal(removed,stored,'every screw remains in a box, buffer or completed box');
        assert(next.tray.length<=3&&next.boxes.every(b=>!b||(b.n>=0&&b.n<3)));
        if(solve(next))return true;
      }
    }return false;
  }
  assert(solve(Screw.initial(data)),'screw '+level+' solvable');
}
for(let level=1;level<=60;level++)for(let sample=0;sample<4;sample++) {
  const data=U.generate(level,rnd);
  assert(U.clear(data.solution,data.edges),'untangle solution is planar and separated');
  assert(U.crossings(data.nodes,data.edges).length>0,'untangle starts crossed');
  assert.equal(data.nodes.length,data.solution.length);
  assert(data.edges.every(([a,b])=>a!==b&&a>=0&&b<data.nodes.length));
}
assert(U.intersects({x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}));
assert(U.intersects({x:0,y:0},{x:10,y:0},{x:5,y:0},{x:15,y:0}),'collinear overlap counts');
// Replay the exact fixed-step particle engine used on canvas, not an abstract graph.
let wrongOrders=0;
assert(Pin.designs.length>=12);
for(let level=1;level<=Pin.designs.length;level++) {
  const data=Pin.level(level);
  assert.equal(new Set(data.order).size,data.pins.length,'intended order visits every pin once');
  assert(data.particles.every(p=>p.x>95&&p.x<265&&p.y>22),'particles start inside the chambers');
  const state=Pin.simulate(data,data.order);
  assert(Pin.solved(data,state),`pin ${level} physical simulation wins (${state.collected}/${data.target}): ${state.reason}`);
  assert(state.collected>=data.target);
  assert.equal(state.lost,0,'intended solution loses no gems');
  assert.equal(state.drained,data.particles.filter(p=>p.kind==='mud').length,'all mud drains into side bins');
  assert(state.balls.every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)),'physics stays finite');
  const wrong=[...data.pins.map((p,i)=>p.kind==='gem'?i:-1).filter(i=>i>=0),...data.order];
  const bad=Pin.simulate(data,wrong);
  if(bad.failed){wrongOrders++;assert(!Pin.solved(data,bad));assert(/섞|진흙/.test(bad.reason));}
  if(data.tiers){
    const floorsFirst=data.pins.map((p,i)=>p.kind==='floor'?i:-1).filter(i=>i>=0);
    assert(Pin.simulate(data,[...floorsFirst,...data.order]).failed,`pin ${level}: opening a muddy floor first must fail`);
  }
}
assert(wrongOrders>=6,'at least six puzzles punish releasing gems before mud drains');
// Closed pins support a real pile; a duplicate tap cannot pull twice.
{
  const data=Pin.level(1),s=Pin.initial(data);
  for(let tick=0;tick<240;tick++)Pin.step(data,s);
  assert(s.balls.every(b=>b.y<124-Pin.R),'closed pin catches falling gems');
  assert.equal(s.collected,0);assert(Pin.pull(data,s,0));assert.equal(Pin.pull(data,s,0),false);
}
// A fast tap sequence cannot bypass gravity/mixing, and loss is a genuine failure.
{
  const data=Pin.level(6),s=Pin.initial(data);
  for(const i of data.order.slice().reverse())Pin.pull(data,s,i);
  for(let tick=0;tick<1200;tick++)Pin.step(data,s);
  assert(s.failed,'pulling every pin immediately fails');
  const spill=Pin.initial(Pin.level(1));spill.balls.forEach(b=>{b.x=-30;b.y=520;});
  Pin.step(Pin.level(1),spill);assert(spill.failed);assert(/놓쳤/.test(spill.reason));
}
for(const value of [0,.5,.999999]) {
  const d=W.generate(1,()=>value);let t=d.tubes;assert(!W.solved(t));
  for(const [a,b] of d.solution){t=W.pour(t,a,b);assert(t);}assert(W.solved(t));
}
assert.equal(W.generate(25,rnd).colors,10,'water grows to ten colors');
assert.equal(W.generate(9999,rnd).colors,10,'water remains bounded');
console.log(`PASS: water small-case BFS + 320 reverse-shuffle solution witnesses (2–10 colors); 12 parking BFS, 12 screw searches; ${Pin.designs.length} physical pin solutions, ${wrongOrders} gem-first failures + muddy floor/rapid-pull/lost-gem failures; 240 planar untangle solutions`);

// Run real controllers with a small DOM/RAF harness. This checks resets during async
// pours/flights/driving and progress persistence without pretending to be a browser.
function adController(dir,level=1) {
  let sequence=0;const frames=new Map(),saved=new Map([[dir+'.level',level]]);
  class Element {
    constructor(tag='div') {this.tagName=tag;this.children=[];this.parentNode=null;this.dataset={};this.attributes={};this.listeners={};this.style={setProperty(k,v){this[k]=v;}};this._class='';this.textContent='';this.disabled=false;this.hidden=false;this.clientWidth=296;this.clientHeight=444;}
    set className(value){this._class=value;}get className(){return this._class;}
    get classList(){const e=this;return {contains:c=>e._class.split(' ').includes(c),add(...cs){e._class=[...new Set([...e._class.split(' '),...cs])].join(' ').trim();},remove(...cs){e._class=e._class.split(' ').filter(c=>!cs.includes(c)).join(' ');},toggle(c,on){if(on===undefined)on=!this.contains(c);on?this.add(c):this.remove(c);}};}
    appendChild(el){el.remove();el.parentNode=this;this.children.push(el);return el;}
    replaceChildren(...els){this.children.forEach(e=>{e.parentNode=null;});this.children=[];els.forEach(e=>this.appendChild(e));}
    remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(e=>e!==this);this.parentNode=null;}
    before(el){const p=this.parentNode;if(!p)return;el.remove();el.parentNode=p;p.children.splice(p.children.indexOf(this),0,el);}
    after(el){const p=this.parentNode;if(!p)return;el.remove();el.parentNode=p;p.children.splice(p.children.indexOf(this)+1,0,el);}
    setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
    addEventListener(type,fn){(this.listeners[type]||= []).push(fn);}
    dispatch(type,extra={}){const event={button:0,pointerId:1,clientX:100,clientY:200,preventDefault(){},...extra};for(const fn of this.listeners[type]||[])fn(event);}
    click(){if(this.disabled)return;this.dispatch('click');if(this.onclick)this.onclick();}
    focus(){document.activeElement=this;}setPointerCapture(){}
    get firstElementChild(){return this.children[0];}
    getBoundingClientRect(){return {left:12,top:200,width:44,height:this.classList.contains('tube')?145:44};}
    cloneNode(deep){const el=new Element(this.tagName);el.className=this.className;el.style={...this.style};el.dataset={...this.dataset};el.attributes={...this.attributes};el.textContent=this.textContent;if(deep)this.children.forEach(c=>el.appendChild(c.cloneNode(true)));return el;}
    querySelectorAll(selector){
      if(selector.includes(','))return [...new Set(selector.split(',').flatMap(s=>this.querySelectorAll(s.trim())))];
      const match=(el,s)=>{
        if(s==='button:not(:disabled)')return el.tagName==='button'&&!el.disabled;
        const d=s.match(/^\[data-(\w+)="(\d+)"\]$/);if(d)return String(el.dataset[d[1]])===d[2];
        if(s.startsWith('.'))return el.classList.contains(s.slice(1));
        return el.tagName===s;
      };
      const parts=selector.split(' '),out=[];
      const visit=el=>{for(const c of el.children){if(match(c,parts.at(-1))){if(parts.length===1)out.push(c);else {let p=c.parentNode;while(p&&p!==this){if(match(p,parts[0])){out.push(c);break;}p=p.parentNode;}}}visit(c);}};visit(this);return out;
    }
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
    getContext(){return new Proxy({createLinearGradient(){return {addColorStop(){}};}},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});}
  }
  const body=new Element('body'),main=new Element('main');body.appendChild(main);
  const ids=new Map();for(const id of ['level','moves','instructions','board','status','extras','restart','next']){const el=new Element(['restart','next'].includes(id)?'button':'div');el.id=id;main.appendChild(el);ids.set(id,el);}
  const document={body,activeElement:null,getElementById:id=>ids.get(id),createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),querySelectorAll:s=>body.querySelectorAll(s)};
  const window={devicePixelRatio:2,innerWidth:320,addEventListener(){}};
  const context={document,window,console,setTimeout:()=>0,matchMedia:()=>({matches:true,addEventListener(){}}),getComputedStyle:()=>({getPropertyValue:k=>({'--surface-2':'#f7f8fb','--text':'#171923','--muted':'#606579'}[k]||'')}),requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),MG:{store:{get:(k,f)=>saved.has(k)?saved.get(k):f,set:(k,v)=>saved.set(k,v)},rng:L=>{let a=L;return ()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};},vibrate(){},beep(){},unlockAudio(){}}};
  for(const file of ['assets/ad-puzzles.js',dir+'/logic.js',dir+'/game.js']){vm.runInNewContext(read(file),context,{filename:file});Object.assign(context,window);}
  return {ids,body,saved,window,press:id=>ids.get(id).click(),all:s=>body.querySelectorAll(s),ticks(n){for(let i=0;i<n;i++){const due=[...frames];frames.clear();due.forEach(([,fn])=>fn(i*1000/60+1000));}}};
}
(async()=>{
  const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
  for(const dir of ['pin-pull','water-sort','screw-puzzle','parking-jam','untangle']){
    const g=adController(dir);assert.equal(g.saved.get(dir+'.level'),1);assert.equal(g.all('.sound-toggle')[0].getAttribute('aria-pressed'),'false');
    if(dir==='pin-pull'){
      g.all('.pin-handle')[0].click();g.press('restart');g.ticks(360);assert(g.ids.get('next').disabled,'reset cancels old pin pour');
      g.all('.pin-handle')[0].click();g.ticks(360);assert(!g.ids.get('next').disabled,'real pin controller celebrates after simulated collection');assert.equal(g.saved.get('pin-pull.unlocked'),2);g.press('next');assert.equal(g.saved.get('pin-pull.level'),2);
    }else if(dir==='water-sort'){
      const pair=()=>{const board=g.ids.get('board'),L=g.window.WaterLogic,tubes=board.children.map(t=>t.children.filter(c=>c.className.includes('water color-')).map(c=>Number(c.className.split('color-')[1])));for(let a=0;a<tubes.length;a++)for(let b=0;b<tubes.length;b++)if(L.pour(tubes,a,b))return [a,b];throw Error('no water move');};
      let [a,b]=pair();g.ids.get('board').children[a].click();g.ids.get('board').children[b].click();g.press('restart');await settle();assert.equal(g.ids.get('moves').textContent,0);assert.equal(g.all('.pouring-tube').length,0);
      [a,b]=pair();g.ids.get('board').children[a].click();g.ids.get('board').children[b].click();await settle();assert.equal(g.ids.get('moves').textContent,1);assert.equal(g.all('.pour-stream').length,0);
    }else if(dir==='screw-puzzle'){
      g.ids.get('board').querySelector('button:not(:disabled)').click();g.press('restart');await settle();assert.equal(g.ids.get('moves').textContent,0);assert.equal(g.all('.flying-screw').length,0);
      g.ids.get('board').querySelector('button:not(:disabled)').click();await settle();assert.equal(g.ids.get('moves').textContent,1);
    }else if(dir==='parking-jam'){
      const cars=g.window.ParkingLogic.level(1),index=cars.findIndex((_,i)=>g.window.ParkingLogic.canExit(cars,i));
      g.all('.car')[index].click();g.press('restart');await settle();assert.equal(g.ids.get('moves').textContent,0);assert.equal(g.all('.car').length,cars.length);
      g.all('.car')[index].click();await settle();assert.equal(g.all('.car').length,cars.length-1);
    }else{
      g.all('.graph-node')[0].dispatch('keydown',{key:'ArrowLeft'});assert.equal(g.ids.get('moves').textContent,1);g.press('restart');
      for(let i=0;i<10&&g.ids.get('next').disabled;i++)g.ids.get('extras').children[0].click();assert(!g.ids.get('next').disabled,'untangle hint solution wins');
    }
    g.press('restart');await settle();assert.equal(g.ids.get('moves').textContent,0);assert(g.ids.get('next').disabled);
    g.all('.sound-toggle')[0].click();g.press('restart');assert.equal(g.all('.sound-toggle')[0].getAttribute('aria-pressed'),'true');
  }
  const legacy=adController('water-sort',25);assert.equal(legacy.ids.get('board').children.length,12);assert.equal(legacy.saved.get('water-sort.level'),25,'legacy progress key stays compatible');
  console.log('PASS: all five real controllers mount; async reset cancellation, pin collection, water pour, screw flight, parking exit, keyboard/hint win, sound default and legacy level progress');
})().catch(e=>{console.error(e);process.exitCode=1;});
