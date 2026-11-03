// Browser-free checks for the actual recreation controllers and shared row editor.
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
function mount(folder, exports = '') {
  const nodes = new Map(), saved = new Map(), notices = [];
  let now = 1000, tick, focused;
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.value = ''; this.textContent = ''; this.attrs = {}; this.listeners = {}; this.classList = {add(){}}; }
    appendChild(el) { this.children.push(el); el.parentNode = this; return el; }
    replaceChildren() { this.children = []; }
    setAttribute(k,v) { this.attrs[k] = v; }
    addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
    dispatchEvent(event) { for (const fn of this.listeners[event.type] || []) fn.call(this,event); if(event.bubbles && this.parentNode) this.parentNode.dispatchEvent(event); }
    focus() { focused = this; }
    after(el) { const list = this.parentNode.children; list.splice(list.indexOf(this)+1,0,el); el.parentNode = this.parentNode; }
    remove() { const list=this.parentNode.children; list.splice(list.indexOf(this),1); }
    get nextElementSibling() { return this.parentNode.children[this.parentNode.children.indexOf(this)+1]; }
    querySelectorAll(tag) { return this.children.flatMap(el => [...(el.tagName === tag.toUpperCase() ? [el] : []), ...el.querySelectorAll(tag)]); }
  }
  const html = fs.readFileSync(folder+'/index.html','utf8');
  for (const m of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const el = new Element(m[1]); el.value = /\bvalue="([^"]*)"/.exec(m[0])?.[1] || ''; nodes.set(m[2],el);
  }
  const document = {getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag),addEventListener(){}};
  const MG = {store:{get:(k,d)=>saved.has(k)?saved.get(k):d,set:(k,v)=>saved.set(k,JSON.parse(JSON.stringify(v)))},toast:s=>notices.push(s),shuffle:a=>a.reverse(),fmtTime:String,Timer:fn=>{tick=fn;return {reset(){},start(){},stop(){}};}};
  const context = {document,MG,Event:class {constructor(type,opts){this.type=type;Object.assign(this,opts);}},Date:class extends Date{static now(){return now;}}};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('assets/name-rows.js','utf8'),context);
  if (folder==='rps-bracket') vm.runInContext(fs.readFileSync(folder+'/logic.js','utf8'),context);
  let script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  const end = script.lastIndexOf('})();'); script=script.slice(0,end)+'window.test={'+exports+'};\n'+script.slice(end);
  vm.runInContext(script,context);
  return {context, el:id=>nodes.get(id), saved, notices, tick:ms=>{now+=ms;tick();}, Element, focused:()=>focused};
}
{
  const g=mount('updown','start,guess,state:()=>({answer,low,high,count,over})');
  const s=g.context.test.state(); assert(s.answer>=1 && s.answer<=100);
  g.el('min').value='1';g.el('max').value='2';g.context.test.start();
  const answer=g.context.test.state().answer;
  g.el('guess').value=String(3-answer);g.context.test.guess();
  assert.equal(g.context.test.state().count,1); assert.match(g.el('display').textContent,/UP|DOWN/);
  g.el('guess').value=String(3-answer);g.context.test.guess();assert.equal(g.context.test.state().count,1);
  g.el('guess').value=String(answer);g.context.test.guess();assert(g.context.test.state().over);
  g.context.test.start(); assert.equal(g.el('history').children.length,0);
  g.el('reveal').onclick();assert(g.context.test.state().over);
  const previous=g.context.test.state().answer;
  g.el('max').value='1';g.context.test.start();assert.equal(g.context.test.state().answer,previous);assert(g.notices.length);
}
{
  const g=mount('hunminjeongeum','next,points:()=>points');
  assert.equal(g.el('pair').textContent.length,2);
  g.el('start').onclick();g.tick(30001);assert.equal(g.el('time').textContent,'0');assert.match(g.el('timerStatus').textContent,/시간이 됐어요/);
  g.el('scores').children[0].children[3].onclick();assert.equal(g.context.test.points()[0],1);
  g.el('scores').children[0].children[2].onclick();assert.equal(g.context.test.points()[0],0);
  g.el('seconds').value='60';g.el('seconds').onchange();g.el('start').onclick();g.tick(30000);assert.equal(g.el('time').textContent,'30');
  g.el('next').onclick();assert.equal(g.el('time').textContent,'60');
  g.el('teamCount').value='4';g.el('teamCount').onchange();assert.equal(g.el('scores').children.length,4);
}
{
  const g=mount('rps-bracket','choose,rounds:()=>rounds');
  const host=g.el('names');assert.equal(host.querySelectorAll('input').length,4);
  let input=host.querySelectorAll('input')[0];input.value='가';input.onkeydown({key:'Enter',preventDefault(){}});
  assert.equal(host.querySelectorAll('input').length,5);assert.equal(g.focused(),host.querySelectorAll('input')[1]);
  host.querySelectorAll('button')[0].onclick();assert.equal(host.querySelectorAll('input').length,4);
  host.children[1].onclick();assert.equal(host.querySelectorAll('input').length,5);
  host.value='가\n\n나';host.dispatchEvent(new g.context.Event('input'));assert.equal(g.saved.get('rps-bracket.names'),'가\n\n나');
  for(let n=2;n<=64;n++) {
    host.value=Array.from({length:n},(_,i)=>i<2?'같은 이름':'참가자'+i).join('\n');g.el('generate').onclick();
    while (true) {
      const rounds=g.context.test.rounds(), r=rounds.length-1, matches=rounds[r];
      const todo=matches.findIndex(m=>m.winner===null);if(todo<0)break;
      g.context.test.choose(r,todo,matches[todo].players[0].id);
    }
    assert.match(g.el('champion').textContent,/우승/);
    assert.equal(g.context.test.rounds().at(-1).length,1);
  }
  g.el('reset').onclick();assert.equal(g.context.test.rounds().length,0);assert.equal(g.el('champion').textContent,'');
  host.value='한 명';g.el('generate').onclick();assert.equal(g.context.test.rounds().length,0);assert(g.notices.length);
}
{
  const html=fs.readFileSync('index.html','utf8');
  const party=/<section[^>]*id="panel-party"[\s\S]*?<\/section>/.exec(html)[0];
  const rec=/<section[^>]*id="panel-tools"[\s\S]*?<\/section>/.exec(html)[0];
  assert.equal((party.match(/<a class="card/g)||[]).length,3);
  for(const folder of ['charades','speed','taboo','ox','telepathy','updown','hunminjeongeum','rps-bracket','tools']) assert(rec.includes('href="'+folder+'/"'));
  assert(html.includes('data-tab="tools"')); // Preserve existing hashes and saved hub.tab values.
}
{
  // Results stay public while the middle is covered; traced paths use the upper canvas.
  const source=fs.readFileSync('tools/index.html','utf8');
  const nodes=new Map();const $=id=>{if(!nodes.has(id)) nodes.set(id,{style:{setProperty(){}},innerHTML:'',classList:{toggle(name,on){this[name]=on;}}});return nodes.get(id);};
  const context={$,COLORS:['#000'],ln:3,traces:{},coverOpen:false,esc:String,ink:()=> '#fff',ladName:i=>'참가자'+i,resultLabel:i=>'결과'+i};
  context.ownerOf=col=>{for(const key of Object.keys(context.traces))if(context.traces[key].end===col)return +key;return -1;};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function renderLadderChrome()'),source.indexOf('  function drawLadderInputs()')),context);
  function publicResults() {
    for(let i=0;i<3;i++) {
      assert($('#ladNames').innerHTML.includes('참가자'+i));
      assert($('#ladPrizes').innerHTML.includes('결과'+i));
    }
    assert(!$('#ladPrizes').innerHTML.includes('?'));
  }
  context.renderLadderChrome();publicResults();assert.equal($('#ladCover').classList.open,false);
  context.traces[0]={end:2};context.renderLadderChrome();publicResults();assert.match($('#ladPrizes').innerHTML,/prize on/);
  assert.equal($('#ladCover').classList.open,false);
  const drawn=[];
  const canvasContext={setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};
  $('#ladder').clientWidth=300;$('#ladder').getContext=()=>canvasContext;
  const overlayContext={setTransform(){}};$('#ladPaths').getContext=()=>overlayContext;
  Object.assign(context,{window:{devicePixelRatio:2},css:()=> '#fff',ladder:{levels:1,rungs:[[true,false]]},activePath:{frac:.5},strokePath:(ctx,path)=>{assert.equal(ctx,overlayContext);drawn.push(path);}});
  vm.runInContext(source.slice(source.indexOf('  function drawLadder()'),source.indexOf('  function finishTrace(')),context);
  context.drawLadder();assert.equal(drawn.length,2);assert.equal(drawn[0].frac,1);assert.equal(drawn[1].frac,.5);
  assert.equal($('#ladPaths').width,$('#ladder').width);
  context.activePath.start=0;drawn.length=0;context.drawLadder();assert.equal(drawn.length,1);assert.equal(drawn[0].frac,.5); // Replay must animate above the cover too.
  let builds=0;
  Object.assign(context,{stopMotion(){},L:{trace:i=>({end:(i+2)%3,pts:[]}),buildLadder:()=>{builds++;return {levels:1,rungs:[[false,true]]};}},addResultRow(){},syncLadderActions(){},currentTab:'ladder',MG:{beep(){}},drawLadder(){}});
  vm.runInContext(source.slice(source.indexOf('  function revealAllNow()'),source.indexOf('  function setLn(')),context);
  context.revealAllNow();publicResults();assert.equal($('#ladCover').classList.open,true);assert.equal(Object.keys(context.traces).length,3);assert.equal(context.activePath,null);
  context.rebuildLadder();publicResults();assert.equal(builds,1);assert.equal($('#ladCover').classList.open,false);assert.equal(Object.keys(context.traces).length,0);assert.equal($('#lRes').hidden,true);
  const spin=source.slice(source.indexOf("  $('#spin').onclick ="),source.indexOf("  $('#spin').onclick =")+500);
  const end=spin.indexOf('    MG.unlockAudio();');
  const alerts=[];const button={},input={value:'하나\n\n'};
  const wheel={$:id=>id==='#spin'?button:input,spinning:false,L:{parseList:s=>s.split('\n').map(s=>s.trim()).filter(Boolean)},MG:{toast:s=>alerts.push(s)}};
  vm.runInNewContext(spin.slice(0,end)+'};',wheel);button.onclick();assert.equal(alerts.length,1);
}
console.log('PASS: recreation controllers — UP/DOWN bounds/reveal/restart, timer deadlines and scores, row add/remove/Enter/save, public ladder results/cover/overlay paths/reveal/reshuffle, brackets with 2–64 players and duplicate names');
