(function () {
  'use strict';
  const P=AdPuzzle('water-sort'),L=WaterLogic,symbols=P.symbols,NS='http://www.w3.org/2000/svg';
  const names=['빨강 동그라미','파랑 세모','초록 네모','보라 마름모','갈색 별','회청 십자','분홍 하트','청록 오각형','주황 해','남색 물결'];
  let tubes,initial,history,selected,extra,undoButton,extraButton,busy=false,colors=0,undoLeft=0;
  const UNDO_LIMIT=2;
  const complete=t=>t.length===L.CAP&&t.every(c=>c===t[0]);
  P.$('instructions').textContent='같은 색 물을 한 시험관에 가득 모아요';
  function water(c){
    const el=document.createElement('span');el.className='water color-'+c;el.textContent=symbols[c];el.setAttribute('aria-hidden','true');return el;
  }
  function render(focus){
    const board=P.$('board'),columns=tubes.length<=4?4:tubes.length<=6?3:tubes.length<=8?4:5;
    board.className='puzzle-board water-board';board.replaceChildren();board.style.setProperty('--columns',columns);board.dataset.rows=Math.ceil(tubes.length/columns);
    const count=tubes.filter(complete).length;
    P.$('scene-meter').textContent='색깔 연구실 · 완성 '+count+' / '+colors+'개';
    tubes.forEach((tube,i)=>{
      const done=complete(tube),run=P.epoch;
      const b=P.button('',()=>{if(run===P.epoch)tap(i);},board);b.className='tube'+(selected===i?' selected':'')+(done?' tube-done':'');b.disabled=P.over;b.dataset.index=i;
      b.setAttribute('aria-pressed',String(selected===i));b.setAttribute('aria-label',(i+1)+'번 시험관, 아래부터 '+(tube.map(c=>names[c]).join(', ')||'비어 있어요')+(done?', 완성':''));
      const glass=document.createElement('span');glass.className='tube-glass';const liquid=document.createElement('span');liquid.className='tube-liquid';
      tube.forEach(c=>liquid.appendChild(water(c)));glass.appendChild(liquid);b.appendChild(glass);
      const num=document.createElement('span');num.className='tube-number';num.textContent=(i+1)+(done?' ✓':'');b.appendChild(num);
      if(done){
        const cork=document.createElement('span');cork.className='tube-cork';cork.setAttribute('aria-hidden','true');b.appendChild(cork);
        const stars=document.createElement('span');stars.className='tube-sparkles';stars.textContent='✦  ✧';stars.setAttribute('aria-hidden','true');b.appendChild(stars);
      }
      if(P.level===1&&!P.moves&&i===(selected===null?0:2)){
        const hand=document.createElement('span');hand.className='tutorial-hand';hand.textContent='👆';hand.setAttribute('aria-hidden','true');b.appendChild(hand);
      }
    });undoButton.disabled=busy||!history.length||!undoLeft||P.over;undoButton.textContent='되돌리기 '+undoLeft;extraButton.disabled=busy||extra||P.over;
    if(focus!==undefined&&board.children[focus])board.children[focus].focus();
  }
  async function pour(from,to,next){
    busy=true;const run=P.epoch,board=P.$('board'),source=board.children[from],dest=board.children[to],a=source.getBoundingClientRect(),b=dest.getBoundingClientRect(),color=tubes[from].at(-1);
    undoButton.disabled=true;extraButton.disabled=true;board.querySelectorAll('.tutorial-hand').forEach(h=>h.remove());
    const flight=document.createElement('div');flight.className='water-flight';flight.setAttribute('aria-hidden','true');document.body.appendChild(flight);
    const ghost=source.cloneNode(true);ghost.classList.remove('selected');ghost.classList.add('pouring-tube');ghost.removeAttribute('aria-label');ghost.tabIndex=-1;
    Object.assign(ghost.style,{left:a.left+'px',top:a.top+'px',width:a.width+'px',height:a.height+'px'});flight.appendChild(ghost);source.style.opacity='0';
    const side=b.left+b.width/2>window.innerWidth/2?1:-1,mouth={x:b.left+b.width/2-side*20,y:b.top-26};
    const dx=mouth.x-a.left-a.width/2,dy=mouth.y-a.top,pose='translate('+dx+'px,'+dy+'px) rotate('+(side*64)+'deg)';
    await P.animate(ghost,[{transform:'translate(0,0) rotate(0)'},{transform:'translate(0,-18px) rotate(0)',offset:.25},{transform:pose}],{duration:360,fill:'forwards'});
    if(run!==P.epoch){flight.remove();return;}ghost.style.transform=pose;
    const stream=document.createElementNS(NS,'svg');stream.setAttribute('class','pour-stream color-'+color);flight.appendChild(stream);
    const amount=tubes[from].length-next[from].length,oldWaters=[...ghost.querySelectorAll('.water')].slice(-amount);
    const target=dest.querySelector('.tube-liquid'),liquidRect=target.getBoundingClientRect(),height=liquidRect.height/L.CAP,incoming=[];
    const endX=b.left+b.width/2,endY=liquidRect.top+liquidRect.height-tubes[to].length*height-3;
    const d='M '+mouth.x+' '+mouth.y+' Q '+(endX+side*13)+' '+(mouth.y+8)+' '+endX+' '+endY;
    for(const className of ['','stream-shine']){const path=document.createElementNS(NS,'path');path.setAttribute('d',d);path.setAttribute('class',className);path.setAttribute('pathLength','100');stream.appendChild(path);}
    for(let n=0;n<amount;n++){const el=water(color);el.style.height='0px';target.appendChild(el);incoming.push(el);}
    await Promise.all([
      P.animate(stream,[{opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.88},{opacity:0}],{duration:540}),
      ...oldWaters.map(w=>P.animate(w,[{height:height+'px'},{height:'0px'}],{duration:540,easing:'ease-in-out',fill:'forwards'})),
      ...incoming.map(w=>P.animate(w,[{height:'0px'},{height:height+'px'}],{duration:540,easing:'ease-in-out',fill:'forwards'}))
    ]);
    stream.remove();if(run!==P.epoch){flight.remove();return;}
    oldWaters.forEach(w=>w.remove());incoming.forEach(w=>{w.style.height=height+'px';});
    await P.animate(ghost,[{transform:pose},{transform:'translate(0,0) rotate(0)'},{transform:'translate(0,12px) rotate(0)'}],{duration:300});flight.remove();
    if(run!==P.epoch)return;history.push(tubes);tubes=next;selected=null;busy=false;P.move();render(to);
    P.say(complete(tubes[to])?'마개를 쏙! 한 가지 색을 완성했어요.':'물을 옮겼어요. 같은 기호를 이어서 모아 보세요.');
    if(L.solved(tubes))P.win();
  }
  function tap(i){
    if(P.over||busy)return;
    if(selected===null){if(!tubes[i].length){P.say('물이 든 시험관을 먼저 골라 주세요.');return;}selected=i;P.feedback('move');render(i);P.say(P.level===1&&!P.moves?'👆 빈 3번 시험관을 눌러 물을 부어 보세요.':'같은 색 위나 빈 시험관을 눌러 주세요.');return;}
    if(selected===i){selected=null;render(i);return;}
    const next=L.pour(tubes,selected,i);
    if(!next){P.feedback('error');P.say('같은 색 위나 빈 시험관에 부어요. 빈자리도 확인해 주세요.');selected=null;render(i);return;}
    pour(selected,i,next);
  }
  P.mount(()=>{
    busy=false;document.querySelectorAll('.water-flight').forEach(e=>e.remove());
    const made=L.generate(P.level,MG.rng(P.level*7919));initial=made.tubes;colors=made.colors;
    tubes=initial.map(t=>t.slice());history=[];selected=null;extra=false;undoLeft=UNDO_LIMIT;
    // The generator's route is the par; the move limit adds the tier's slack.
    P.goal({par:made.solution.length,limit:true});
    undoButton=P.button('되돌리기',()=>{if(busy||!history.length||!undoLeft||P.over)return;undoLeft--;tubes=history.pop();if(extra&&tubes.length===initial.length)tubes.push([]);selected=null;P.say('한 번 되돌렸어요. 이동 횟수는 돌아오지 않아요. (남은 되돌리기 '+undoLeft+'번)');render();undoButton.focus();});
    extraButton=P.button('빈 시험관 +1',()=>{if(busy||extra||P.over)return;tubes.push([]);extra=true;P.help();selected=null;P.say('빈 시험관을 하나 추가했어요. 이번 단계는 별이 최대 2개예요.');render();});render();
    P.say(P.level===1?'👆 첫 시험관을 눌러 보세요. 색과 기호가 같은 물끼리 모아요.':'시험관을 고르고 같은 색 위나 빈 시험관에 부어요.');
  });
})();
