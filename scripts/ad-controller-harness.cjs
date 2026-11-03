// Minimal DOM/RAF harness; no CSS layout or browser rendering is simulated.
const fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
function adController(dir,level=1,{reduced=true,unlocked=level,width=320,dark=false}={}) {
  let sequence=0,now=1000;const frames=new Map(),saved=new Map([[dir+'.level',level],[dir+'.unlocked',unlocked]]),animations=[];
  class Element {
    constructor(tag='div') {this.tagName=tag;this.children=[];this.parentNode=null;this.dataset={};this.attributes={};this.listeners={};this.style={setProperty(k,v){this[k]=v;}};this._class='';this.textContent='';this.disabled=false;this.hidden=false;this.clientWidth=Math.min(360,width-24);this.clientHeight=444;}
    set className(value){this._class=value;}get className(){return this._class;}
    get classList(){const e=this;return {contains:c=>e._class.split(' ').includes(c),add(...cs){e._class=[...new Set([...e._class.split(' '),...cs])].join(' ').trim();},remove(...cs){e._class=e._class.split(' ').filter(c=>!cs.includes(c)).join(' ');},toggle(c,on){if(on===undefined)on=!this.contains(c);on?this.add(c):this.remove(c);}};}
    appendChild(el){el.remove();el.parentNode=this;this.children.push(el);return el;}
    replaceChildren(...els){this.children.forEach(e=>{e.parentNode=null;});this.children=[];els.forEach(e=>this.appendChild(e));}
    remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(e=>e!==this);this.parentNode=null;}
    before(el){const p=this.parentNode;if(!p)return;el.remove();el.parentNode=p;p.children.splice(p.children.indexOf(this),0,el);}
    after(el){const p=this.parentNode;if(!p)return;el.remove();el.parentNode=p;p.children.splice(p.children.indexOf(this)+1,0,el);}
    setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.className=String(v);}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];}
    addEventListener(type,fn){(this.listeners[type]||= []).push(fn);}
    dispatch(type,extra={}){const event={button:0,pointerId:1,clientX:100,clientY:200,preventDefault(){},...extra};for(const fn of this.listeners[type]||[])fn(event);}
    click(){if(this.disabled)return;this.dispatch('click');if(this.onclick)this.onclick();}
    focus(){document.activeElement=this;}setPointerCapture(){}
    get firstElementChild(){return this.children[0];}
    getBoundingClientRect(){return {left:12,top:200,width:44,height:this.classList.contains('tube')?145:44};}
    cloneNode(deep){const el=new Element(this.tagName);el.className=this.className;el.style={...this.style};el.dataset={...this.dataset};el.attributes={...this.attributes};el.textContent=this.textContent;if(deep)this.children.forEach(c=>el.appendChild(c.cloneNode(true)));return el;}
    animate(keyframes,options){let finish;const finished=new Promise(resolve=>{finish=resolve;});animations.push({keyframes,options,finish});return {finished,cancel(){}};}
    querySelectorAll(selector){
      if(selector.includes(','))return [...new Set(selector.split(',').flatMap(s=>this.querySelectorAll(s.trim())))];
      const match=(el,s)=>{
        if(s==='button:not(:disabled)')return el.tagName==='button'&&!el.disabled;
        const d=s.match(/^\[data-([\w-]+)="([^"]+)"\]$/);if(d)return String(el.dataset[d[1]])===d[2];
        if(s.startsWith('.'))return el.classList.contains(s.slice(1));
        return el.tagName===s;
      };
      const parts=selector.split(' '),out=[];
      const visit=el=>{for(const c of el.children){if(match(c,parts.at(-1))){if(parts.length===1)out.push(c);else {let p=c.parentNode;while(p&&p!==this){if(match(p,parts[0])){out.push(c);break;}p=p.parentNode;}}}visit(c);}};visit(this);return out;
    }
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
    getContext(){const gradient=()=>({addColorStop(){}});return new Proxy({createLinearGradient:gradient,createRadialGradient:gradient},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});}
  }
  const body=new Element('body'),main=new Element('main');body.appendChild(main);
  const ids=new Map();for(const id of ['level','moves','instructions','scene-meter','board','status','extras','restart','next']){const el=new Element(['restart','next'].includes(id)?'button':'div');el.id=id;main.appendChild(el);ids.set(id,el);}
  const document={body,activeElement:null,getElementById:id=>ids.get(id),createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),querySelectorAll:s=>body.querySelectorAll(s)};
  const window={devicePixelRatio:2,innerWidth:width,addEventListener(){}};
  const context={document,window,console,setTimeout:()=>0,matchMedia:q=>({matches:q.includes('reduced-motion')?reduced:dark,addEventListener(){}}),getComputedStyle:()=>({getPropertyValue:k=>({'--surface-2':'#f7f8fb','--text':'#171923','--muted':'#606579'}[k]||'')}),requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),MG:{store:{get:(k,f)=>saved.has(k)?saved.get(k):f,set:(k,v)=>saved.set(k,v)},rng:L=>{let a=L;return ()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};},vibrate(){},beep(){},unlockAudio(){}}};
  for(const file of ['assets/ad-puzzles.js',dir+'/logic.js',dir+'/game.js']){vm.runInNewContext(read(file),context,{filename:file});Object.assign(context,window);}
  return {ids,body,saved,window,animations,finishAnimations(){animations.splice(0).forEach(a=>a.finish());},press:id=>ids.get(id).click(),all:s=>body.querySelectorAll(s),ticks(n){for(let i=0;i<n;i++){const due=[...frames];frames.clear();due.forEach(([,fn])=>fn(now+=1000/60));}}};
}
module.exports={adController};
