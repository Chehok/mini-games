(function () {
  'use strict';
  const P=AdPuzzle('pin-pull',12),L=PinLogic,NS='http://www.w3.org/2000/svg';
  let data,state,busy=false,epoch=0;
  P.$('instructions').textContent='구름 ☁은 옆 정리 통으로, 별 ★은 아래 바구니로 보내요. 구름과 별이 섞이면 다시 도전해요. 옆 핀으로 구름을 먼저 비운 뒤 아래 길을 열어요. 둘 다 열리면 더 가파른 아래 길로 흘러요.';
  function render(focus){
    const board=P.$('board');board.className='puzzle-board pin-board';board.setAttribute('aria-busy','false');board.replaceChildren();
    const svg=document.createElementNS(NS,'svg');svg.classList.add('pin-lines');svg.setAttribute('aria-hidden','true');
    data.edges.forEach((e,i)=>{const a=data.nodes[e.from],b=data.nodes[e.to],line=document.createElementNS(NS,'line');line.setAttribute('x1',a.x+'%');line.setAttribute('y1',a.y+'%');line.setAttribute('x2',b.x+'%');line.setAttribute('y2',b.y+'%');if(state.open[i])line.classList.add('open');svg.appendChild(line);});board.appendChild(svg);
    state.nodes.forEach((n,i)=>{const el=document.createElement('div');el.className='chamber';el.style.left=n.x+'%';el.style.top=n.y+'%';
      el.textContent=(n.kind==='goal'?'🧺':n.kind==='bin'?'☁ 통':(i+1)+'번 방')+(n.stars?' ★'+n.stars:'')+(n.clouds?' ☁'+n.clouds:'');board.appendChild(el);});
    data.edges.forEach((e,i)=>{
      const a=data.nodes[e.from],b=data.nodes[e.to];
      const pin=P.button((i+1)+' 📍',()=>act(i),board,(i+1)+'번 핀, '+(e.from+1)+'번 방에서 '+(b.kind==='goal'?'바구니':b.kind==='bin'?'구름 정리 통':(e.to+1)+'번 방')+'으로 길 열기');
      pin.className='pin';pin.style.left=(a.x+b.x)/2+'%';pin.style.top=(a.y+b.y)/2+'%';pin.disabled=state.open[i];pin.dataset.pin=i;
    });
    if(focus!==undefined){const pins=Array.from(board.querySelectorAll('button:not(:disabled)'));const next=pins.find(b=>+b.dataset.pin>focus)||pins[0];if(next)next.focus();else P.$('restart').focus();}
  }
  async function animate(events,run){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const board=P.$('board'),width=board.clientWidth,height=board.clientHeight;
    for(const event of events){
      if(run!==epoch)return;
      const a=data.nodes[event.from],b=data.nodes[event.to],count=Math.min(4,event.stars+event.clouds);
      const balls=Array.from({length:count},(_,i)=>{const el=document.createElement('span');el.className='falling-star';el.textContent=event.stars?'★':'☁';el.style.color=event.stars?'var(--accent-ink)':'var(--muted)';el.setAttribute('aria-hidden','true');board.appendChild(el);return el;});
      // Balls accelerate down the open straight channel under constant gravity.
      const dx=(b.x-a.x)/100*width,dy=(b.y-a.y)/100*height,length=Math.hypot(dx,dy),gravity=1800*dy/length;
      await new Promise(resolve=>{
        let start;
        function frame(now){
          if(run!==epoch){balls.forEach(el=>el.remove());resolve();return;}
          if(start===undefined)start=now;
          const seconds=(now-start)/1000,progress=Math.min(1,.5*gravity*seconds*seconds/length);
          balls.forEach((el,i)=>{el.style.left=(a.x/100*width+dx*progress+(i-(count-1)/2)*5)+'px';el.style.top=(a.y/100*height+dy*progress)+'px';});
          if(progress<1)requestAnimationFrame(frame);else{balls.forEach(el=>el.remove());resolve();}
        }requestAnimationFrame(frame);
      });
    }
  }
  async function act(i){
    if(P.over||busy)return;
    const result=L.pull(data,state,i);if(!result)return;
    const run=epoch;busy=true;P.$('board').setAttribute('aria-busy','true');state=result.state;P.move();P.say('핀을 뽑았어요. 조각이 아래로 흘러가요.');
    try { await animate(result.events,run); } finally { if(run===epoch)busy=false; }
    if(run!==epoch)return;
    render(i);
    if(state.failed)P.fail('별과 구름의 길이 섞였어요.');else if(L.solved(state))P.win();else P.say('다음 핀을 골라 주세요.');
  }
  P.mount(()=>{epoch++;busy=false;data=L.level(P.level);state=L.initial(data);render();});
})();
