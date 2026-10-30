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
  function solve(state){
    if(state.removed.every(n=>n===7))return true;
    const key=JSON.stringify(state);if(visited.has(key))return false;visited.add(key);
    for(let p=data.plates.length-1;p>=0;p--)for(let s=0;s<3;s++){
      const next=Screw.remove(data,state,p,s);if(next&&solve(next))return true;
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
for(let level=1;level<=Pin.designs.length;level++) {
  const data=Pin.level(level);
  assert(data.edges.every(e=>data.nodes[e.from].y<data.nodes[e.to].y),'pin channels descend');
  assert(bfs(Pin.initial(data),s=>JSON.stringify(s),Pin.solved,s=>{
    const out=[];data.edges.forEach((_,i)=>{const n=Pin.pull(data,s,i);if(n&&!n.state.failed)out.push(n.state);});return out;
  }), 'pin '+level+' solvable');
}
console.log('PASS: water small-case BFS + 320 reverse-shuffle solution witnesses; 12 parking BFS, 12 screw searches, 12 pin BFS; 240 planar untangle solutions');
