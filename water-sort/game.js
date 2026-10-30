(function () {
  'use strict';
  const P=AdPuzzle('water-sort'),L=WaterLogic,symbols=P.symbols;
  const names=['빨강 동그라미','파랑 세모','초록 네모','보라 마름모','갈색 별','회청 십자','분홍 하트','청록 오각형','주황 해','남색 물결'];
  let tubes,initial,history,selected,extra,undoButton,extraButton,busy=false;
  P.$('instructions').textContent='시험관을 고른 뒤 같은 색 위나 빈 시험관에 부어요. 한 색씩 가득 모으면 완성이에요. 단계가 오르면 최대 10가지 색이 나와요. 기호로도 구분할 수 있어요.';
  function render(focus){
    const board=P.$('board');board.className='puzzle-board water-board';board.replaceChildren();board.style.setProperty('--columns',tubes.length>8?5:4);
    tubes.forEach((tube,i)=>{
      const complete=tube.length===4&&tube.every(c=>c===tube[0]);
      const b=P.button('',()=>tap(i),board);b.className='tube'+(selected===i?' selected':'')+(complete?' tube-done':'');b.disabled=P.over;
      b.setAttribute('aria-pressed',String(selected===i));b.setAttribute('aria-label',(i+1)+'번 시험관, 아래부터 '+(tube.map(c=>names[c]).join(', ')||'비어 있어요')+(complete?', 완성':''));
      const num=document.createElement('span');num.className='tube-number';num.textContent=(i+1)+(complete?' ✓':'');b.appendChild(num);
      tube.forEach(c=>{const w=document.createElement('span');w.className='water color-'+c;w.textContent=symbols[c];w.setAttribute('aria-hidden','true');b.appendChild(w);});
    });undoButton.disabled=!history.length||P.over;extraButton.disabled=extra||P.over;
    if(P.over)P.$('next').focus();else if(focus!==undefined)board.children[focus].focus();
  }
  async function pour(from,to,next){
    busy=true;const run=P.epoch,board=P.$('board'),source=board.children[from],dest=board.children[to],a=source.getBoundingClientRect(),b=dest.getBoundingClientRect(),color=tubes[from].at(-1);
    undoButton.disabled=true;extraButton.disabled=true;
    const ghost=source.cloneNode(true);ghost.classList.remove('selected');ghost.classList.add('pouring-tube');ghost.removeAttribute('aria-label');ghost.setAttribute('aria-hidden','true');ghost.tabIndex=-1;
    Object.assign(ghost.style,{left:a.left+'px',top:a.top+'px',width:a.width+'px',height:a.height+'px'});document.body.appendChild(ghost);source.style.opacity='.2';
    const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top-a.top-42,tilt=b.left+b.width/2<window.innerWidth/2?-65:65,pose='translate('+dx+'px,'+dy+'px) rotate('+tilt+'deg)';
    await P.animate(ghost,[{transform:'translate(0,0) rotate(0)'},{transform:pose}],{duration:300,fill:'forwards'});
    if(run!==P.epoch){ghost.remove();return;}ghost.style.transform=pose;
    const stream=document.createElement('div');stream.className='pour-stream color-'+color;stream.setAttribute('aria-hidden','true');Object.assign(stream.style,{left:b.left+b.width/2-3+'px',top:b.top-42+'px',height:'50px'});document.body.appendChild(stream);
    const amount=tubes[from].length-next[from].length,waters=[...ghost.querySelectorAll('.water')].slice(-amount);
    await Promise.all([P.animate(stream,[{opacity:0,transform:'scaleY(.1)'},{opacity:1,transform:'scaleY(1)',offset:.2},{opacity:1,transform:'scaleY(1)',offset:.85},{opacity:0,transform:'scaleY(.1)'}],{duration:480}),...waters.map(w=>P.animate(w,[{opacity:1},{opacity:0}],{duration:480,fill:'forwards'}))]);
    stream.remove();if(run!==P.epoch){ghost.remove();return;}
    await P.animate(ghost,[{transform:pose},{transform:'translate(0,0) rotate(0)'}],{duration:240});ghost.remove();
    if(run!==P.epoch)return;history.push(tubes);tubes=next;selected=null;busy=false;P.move();P.say('물을 옮겼어요. 완성 '+tubes.filter(t=>t.length===4&&t.every(c=>c===t[0])).length+'개예요.');
    render(to);if(L.solved(tubes))P.win();
  }
  function tap(i){
    if(P.over||busy)return;
    if(selected===null){if(!tubes[i].length){P.say('물이 든 시험관을 먼저 골라 주세요.');return;}selected=i;P.feedback('move');render(i);return;}
    if(selected===i){selected=null;render(i);return;}
    const next=L.pour(tubes,selected,i);
    if(!next){P.feedback('error');P.say('같은 색 위나 빈 시험관에만 부을 수 있어요. 공간도 확인해 주세요.');selected=null;render(i);return;}
    pour(selected,i,next);
  }
  P.mount(()=>{
    busy=false;document.querySelectorAll('.pouring-tube,.pour-stream').forEach(e=>e.remove());
    let seed=Math.imul(P.level,7919)>>>0;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    initial=L.generate(P.level,rnd).tubes;tubes=initial.map(t=>t.slice());history=[];selected=null;extra=false;
    undoButton=P.button('되돌리기',()=>{if(busy||!history.length||P.over)return;tubes=history.pop();if(extra&&tubes.length===initial.length)tubes.push([]);selected=null;P.say('한 번 되돌렸어요.');render();undoButton.focus();});
    extraButton=P.button('힌트: 빈 시험관 추가',()=>{if(busy||extra||P.over)return;tubes.push([]);extra=true;selected=null;P.say('빈 시험관을 하나 추가했어요.');render();});render();
  });
})();
