(function () {
  'use strict';
  const P=AdPuzzle('screw-puzzle',12),L=ScrewLogic,symbols=P.symbols;
  let data,state,history,undo,busy=false;
  P.$('instructions').textContent='드러난 나사를 풀어 같은 기호 상자에 3개씩 모아요. 다른 색은 임시 칸 3곳에서 기다려요. 위 판을 먼저 떼면 아래 나사가 드러나요.';
  const rack=document.createElement('div');rack.id='boxes';rack.className='screw-rack';rack.setAttribute('aria-label','수집 상자와 임시 칸');P.$('board').before(rack);
  function makeRack(){
    rack.replaceChildren();
    const boxes=document.createElement('div');boxes.className='boxes';rack.appendChild(boxes);
    state.boxes.forEach((box,i)=>{
      const el=document.createElement('div');el.className='screw-box'+(box?' color-'+box.c:' empty');el.dataset.box=i;
      const label=document.createElement('span');label.textContent=box?symbols[box.c]+' 상자  '+box.n+'/3':'✓ 정리 완료';el.appendChild(label);
      const sockets=document.createElement('div');sockets.className='box-sockets';
      for(let n=0;n<3;n++){const spot=document.createElement('span');spot.className=n<(box?box.n:0)?'filled':'';spot.textContent=box&&n<box.n?symbols[box.c]:'';sockets.appendChild(spot);}el.appendChild(sockets);boxes.appendChild(el);
    });
    const tray=document.createElement('div');tray.className='screw-tray';const title=document.createElement('span');title.textContent='임시 칸';tray.appendChild(title);
    for(let i=0;i<3;i++){const slot=document.createElement('span');slot.className='buffer-slot'+(state.tray[i]!==undefined?' filled color-'+state.tray[i]:'');slot.dataset.slot=i;slot.textContent=state.tray[i]===undefined?'·':symbols[state.tray[i]];tray.appendChild(slot);}rack.appendChild(tray);
  }
  async function act(p,s,button){
    if(P.over||busy)return;const next=L.remove(data,state,p,s);
    if(!next){P.feedback('error');P.say('임시 칸이 가득 차요. 상자와 같은 기호를 찾거나 되돌려 보세요.');return;}
    busy=true;undo.disabled=true;const run=P.epoch,c=data.plates[p].colors[s],old=state;
    const rect=button.getBoundingClientRect(),boxIndex=state.boxes.findIndex(b=>b&&b.c===c);
    const target=rack.querySelector(boxIndex>=0?'[data-box="'+boxIndex+'"]':'[data-slot="'+Math.min(2,state.tray.length)+'"]'),end=target.getBoundingClientRect();
    const ghost=button.cloneNode(true);ghost.disabled=false;ghost.removeAttribute('aria-label');ghost.setAttribute('aria-hidden','true');ghost.tabIndex=-1;ghost.classList.add('flying-screw');
    Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});document.body.appendChild(ghost);button.style.visibility='hidden';
    await P.animate(ghost,[{transform:'rotate(0) scale(1)'},{transform:'rotate(540deg) scale(1.3)',offset:.8},{transform:'rotate(720deg) scale(1.2)'}],{duration:280});
    if(run!==P.epoch){ghost.remove();return;}
    await P.animate(ghost,[{transform:'translate(0,0) rotate(0) scale(1.2)'},{transform:'translate('+(end.left+end.width/2-rect.left-rect.width/2)+'px,'+(end.top+end.height/2-rect.top-rect.height/2)+'px) rotate(540deg) scale(.55)'}],{duration:380,easing:'cubic-bezier(.45,0,.7,1)',fill:'forwards'});
    ghost.remove();if(run!==P.epoch)return;
    // Complete boxes visibly fill before sliding away. Tray auto-transfers use the same logic state.
    const outgoing=old.boxes.map((b,i)=>b&&!next.boxes.some(n=>n&&n.id===b.id)?i:-1).filter(i=>i>=0);
    for(const i of outgoing){const el=rack.querySelector('[data-box="'+i+'"]');el.classList.add('box-complete');el.querySelector('span').textContent=symbols[old.boxes[i].c]+' 3/3 ✓';el.querySelectorAll('.box-sockets span').forEach(s=>{s.classList.add('filled');s.textContent=symbols[old.boxes[i].c];});}
    await Promise.all(outgoing.map(i=>P.animate(rack.querySelector('[data-box="'+i+'"]'),[{transform:'translateX(0)',opacity:1},{transform:'translateX(80px)',opacity:0}],{duration:300,fill:'forwards'})));
    if(run!==P.epoch)return;
    history.push(old);state=next;busy=false;P.move();render(p*3+s);P.say('나사를 정리했어요. 남은 판 '+state.removed.filter(n=>n!==7).length+'개예요.');
    if(state.removed.every(n=>n===7))P.win();
  }
  function render(focus){
    const board=P.$('board');board.className='puzzle-board screw-board';board.replaceChildren();makeRack();
    data.plates.forEach((plate,p)=>{
      const fallen=state.removed[p]===7;if(fallen&&(!history.length||history.at(-1).removed[p]===7))return;
      const el=document.createElement('div');el.className='plate color-'+((p+2)%6)+(fallen?' fallen':'');el.style.setProperty('--angle',plate.angle+'deg');
      Object.assign(el.style,{left:plate.x+'%',top:plate.y+'%',width:plate.w+'%',height:plate.h+'%',zIndex:p+1});
      const label=document.createElement('span');label.className='plate-label';label.textContent=String(p+1).padStart(2,'0');el.appendChild(label);
      plate.colors.forEach((c,s)=>{
        const pos=L.positions[s],hole=document.createElement('span');hole.className='screw-hole';hole.style.left=pos.x*100+'%';hole.style.top='50%';el.appendChild(hole);
        if(state.removed[p]&(1<<s))return;
        const b=P.button('',()=>act(p,s,b),el,(p+1)+'번 판 '+(s+1)+'번 나사 '+symbols[c]+', '+(L.available(data,state,p,s)?'풀 수 있어요':'위 판에 가려져 있어요'));
        b.className='screw color-'+c;b.disabled=!L.available(data,state,p,s);b.dataset.screw=p*3+s;
        const mark=document.createElement('span');mark.textContent=symbols[c];b.appendChild(mark);
        Object.assign(b.style,{left:'calc('+pos.x*100+'% - 22px)',top:'calc(50% - 22px)'});
      });board.appendChild(el);
    });undo.disabled=!history.length;
    if(focus!==undefined){const buttons=Array.from(board.querySelectorAll('button:not(:disabled)'));const next=buttons.find(b=>+b.dataset.screw>=focus)||buttons[0];if(next)next.focus();}
  }
  P.mount(()=>{
    busy=false;data=L.level(P.level);state=L.initial(data);history=[];
    document.querySelectorAll('.flying-screw').forEach(e=>e.remove());
    undo=P.button('되돌리기',()=>{if(P.over||busy||!history.length)return;state=history.pop();P.say('나사를 다시 끼웠어요.');render();undo.focus();});render();
  });
})();
