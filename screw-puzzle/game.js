(function () {
  'use strict';
  const L=ScrewLogic,P=AdPuzzle('screw-puzzle',L.designs.length),symbols=P.symbols;
  let data,state,history,undo,undoLeft=0,busy=false;
  P.$('instructions').textContent='같은 기호 나사를 3개씩 모아 주세요.';
  const rack=document.createElement('div');rack.id='boxes';rack.className='screw-rack';rack.setAttribute('aria-label','수집 공구함 두 개와 임시 칸 세 개');P.$('board').before(rack);
  function makeRack(incoming=[]){
    rack.replaceChildren();rack.setAttribute('aria-label','수집 공구함과 임시 칸 '+data.buffer+'곳');
    const boxes=document.createElement('div');boxes.className='boxes';rack.appendChild(boxes);
    state.boxes.forEach((box,i)=>{
      const el=document.createElement('div');el.className='screw-box'+(box?' color-'+box.c:' empty')+(incoming.includes(i)?' arriving':'');el.dataset.box=i;
      const label=document.createElement('span');label.className='box-title';label.textContent=box?symbols[box.c]+' 공구함  '+box.n+'/3':'✓ 정리 완료';el.appendChild(label);
      const sockets=document.createElement('div');sockets.className='box-sockets';
      for(let n=0;n<3;n++){
        const spot=document.createElement('span');spot.className=n<(box?box.n:0)?'filled color-'+box.c:'';
        spot.textContent=box&&n<box.n?symbols[box.c]:'';sockets.appendChild(spot);
      }
      el.appendChild(sockets);boxes.appendChild(el);
    });
    const tray=document.createElement('div');tray.className='screw-tray';const title=document.createElement('span');title.textContent='임시 칸';tray.appendChild(title);
    if(state.tray.length>data.buffer)tray.classList.add('overflow');
    for(let i=0;i<Math.max(data.buffer,state.tray.length);i++){
      const slot=document.createElement('span');slot.className='buffer-slot'+(state.tray[i]!==undefined?' filled color-'+state.tray[i]:'')+(i>=data.buffer?' spill':'');slot.dataset.slot=i;
      slot.textContent=state.tray[i]===undefined?'':symbols[state.tray[i]];tray.appendChild(slot);
    }
    const count=document.createElement('span');count.className='tray-count';count.textContent=state.tray.length+' / '+data.buffer;tray.appendChild(count);rack.appendChild(tray);
    const queue=document.createElement('div');queue.className='box-queue';queue.setAttribute('aria-label','다음 공구함 순서');
    const lead=document.createElement('span');lead.textContent='다음';queue.appendChild(lead);
    data.queue.slice(state.next).forEach(c=>{const chip=document.createElement('span');chip.className='queue-chip color-'+c;chip.textContent=symbols[c];queue.appendChild(chip);});
    if(state.next>=data.queue.length){const note=document.createElement('span');note.textContent='마지막 공구함이에요';queue.appendChild(note);}rack.appendChild(queue);

  }
  async function shake(button,message){
    P.feedback('error');P.say(message);
    await P.animate(button,[{translate:'0'},{translate:'-5px 0'},{translate:'5px 0'},{translate:'-3px 0'},{translate:'0'}],{duration:240});
  }
  async function act(p,s,button){
    if(P.over||busy)return;
    if(!L.available(data,state,p,s)){const lock=data.plates[p].screws[s].lock;shake(button,L.locked(data,state,p,s)?(lock.type==='ice'?'❄ 얼음':'🔗 고리')+'을 열려면 '+(lock.p+1)+'번 판의 '+(lock.s+1)+'번 나사를 풀어 주세요.':'위 판에 가려진 나사예요. 드러난 나사부터 풀어 주세요.');return;}
    const next=L.remove(data,state,p,s);
    if(!next)return;
    if(next.failed){
      history.push(state);state=next;P.move();render();
      P.fail(next.reason==='tray'?'임시 칸이 넘쳤어요! 넣을 곳이 없는 나사를 풀었어요. 다음 공구함 순서를 먼저 살펴요.':'보너스 횟수를 넘겼어요. 순서를 바꿔 도전해 보세요.');return;
    }
    busy=true;undo.disabled=true;const run=P.epoch,c=data.plates[p].colors[s],old=state;
    P.$('board').querySelectorAll('.tutorial-hand').forEach(e=>e.remove());
    const rect=button.getBoundingClientRect(),boxIndex=state.boxes.findIndex(b=>b&&b.c===c);
    const box=boxIndex>=0?rack.querySelector('[data-box="'+boxIndex+'"]'):null;
    const target=box?box.querySelector('.box-sockets').children[state.boxes[boxIndex].n]:rack.querySelector('[data-slot="'+state.tray.length+'"]');
    const end=target.getBoundingClientRect(),dx=end.left+end.width/2-rect.left-rect.width/2,dy=end.top+end.height/2-rect.top-rect.height/2;
    const ghost=button.cloneNode(true);ghost.disabled=false;ghost.removeAttribute('aria-label');ghost.setAttribute('aria-hidden','true');ghost.tabIndex=-1;ghost.classList.add('flying-screw');
    Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});document.body.appendChild(ghost);button.style.visibility='hidden';
    await P.animate(ghost,[{transform:'translateY(0) rotate(0) scale(1)'},{transform:'translateY(-12px) rotate(540deg) scale(1.22)',offset:.75},{transform:'translateY(-20px) rotate(720deg) scale(1.28)'}],{duration:300,easing:'ease-in-out'});
    if(run!==P.epoch){ghost.remove();return;}
    let fall=Promise.resolve();
    if(L.done(data,next,p)){
      const plate=button.parentNode,angle=L.pose(data,state,p).angle;
      plate.classList.add('falling');
      fall=P.animate(plate,[
        {transform:'translateY(0) rotate('+angle+'deg)',opacity:1},
        {transform:'translateY(12px) rotate('+(angle+12)+'deg)',opacity:1,offset:.25},
        {transform:'translateY('+(P.$('board').getBoundingClientRect().height+160)+'px) rotate('+(angle+80)+'deg)',opacity:0}
      ],{duration:600,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
    }
    if(!L.done(data,next,p)&&L.pose(data,next,p).swung&&!L.pose(data,state,p).swung){
      const el=button.parentNode,q=data.plates[p],pivot=q.screws.find((_,s)=>!(next.removed[p]&(1<<s))),fixed=L.worldPoint(q,pivot);
      const frames=[0,.25,.5,.75,1].map(t=>{const pose={...q,angle:q.angle+q.hinge*t},moving=L.worldPoint(pose,pivot);return {left:(q.x+fixed.x-moving.x)+'%',top:(q.y+fixed.y-moving.y)+'%',transform:'rotate('+pose.angle+'deg)'};});
      fall=P.animate(el,frames,{duration:520,easing:'cubic-bezier(.25,.8,.4,1)',fill:'forwards'});
    }
    await Promise.all([fall,P.animate(ghost,[
      {transform:'translate(0,-20px) rotate(0) scale(1.28)'},
      {transform:'translate('+(dx*.45)+'px,'+(dy*.5-65)+'px) rotate(120deg) scale(1.05)',offset:.5},
      {transform:'translate('+dx+'px,'+dy+'px) rotate(240deg) scale(.62)'}
    ],{duration:380,easing:'cubic-bezier(.3,.1,.65,1)',fill:'forwards'})]);
    ghost.remove();if(run!==P.epoch)return;
    // Show the delivered head in its socket before replacing a completed toolbox.
    target.classList.add('filled','color-'+c);target.textContent=symbols[c];
    const outgoing=old.boxes.map((b,i)=>b&&!next.boxes.some(n=>n&&n.id===b.id)?i:-1).filter(i=>i>=0);
    outgoing.forEach(i=>{
      const el=rack.querySelector('[data-box="'+i+'"]');el.classList.add('box-complete');el.querySelector('.box-title').textContent=symbols[old.boxes[i].c]+' 3/3 ✓';
      el.querySelectorAll('.box-sockets span').forEach(s=>{s.classList.add('filled','color-'+old.boxes[i].c);s.textContent=symbols[old.boxes[i].c];});
    });
    await Promise.all(outgoing.map(i=>P.animate(rack.querySelector('[data-box="'+i+'"]'),[
      {transform:'scale(1)',opacity:1},{transform:'scale(1.08)',opacity:1,offset:.35},{transform:'translateX(60px) scale(.94)',opacity:0}
    ],{duration:420,fill:'forwards'})));
    if(run!==P.epoch)return;
    history.push(old);state=next;busy=false;P.move();render(p*4+s,outgoing,old);
    P.say('남은 판 '+data.plates.filter((_,p)=>!L.done(data,state,p)).length+'개 · 임시 칸 '+state.tray.length+'/'+data.buffer+(state.tray.length===data.buffer?' · 임시 칸이 꽉 찼어요! 공구함과 맞는 나사만 풀어요.':'. 다음 공구함도 살펴 주세요.'));
    if(L.solved(data,state))P.win();else if(L.stuck(data,state))P.fail('임시 칸이 차서 더 풀 수 있는 나사가 없어요. 공구함 순서를 살펴 주세요.');
  }
  function render(focus,incoming=[],previous){
    const board=P.$('board');board.className='puzzle-board screw-board';board.replaceChildren();makeRack(incoming);
    const scene=document.createElement('span');scene.className='workbench-label';scene.textContent=data.name+' · 남은 판 '+data.plates.filter((_,p)=>!L.done(data,state,p)).length+'개';scene.setAttribute('aria-hidden','true');board.appendChild(scene);
    data.plates.forEach((plate,p)=>{
      if(L.done(data,state,p))return;
      const pose=L.pose(data,state,p);
      const el=document.createElement('div');el.className='plate shape-'+plate.shape+' color-'+data.palette[p%data.palette.length]+(pose.swung?' swung':'');el.style.setProperty('--angle',pose.angle+'deg');
      Object.assign(el.style,{left:pose.x+'%',top:pose.y+'%',width:plate.w+'%',height:plate.h+'%',zIndex:p+1});
      const face=document.createElement('div');face.className='plate-face '+data.materials[p%data.materials.length];el.appendChild(face);
      if(!['rect','bar','circle'].includes(plate.shape))face.style.clipPath='polygon('+L.polygon(plate).map(([x,y])=>x*100+'% '+y*100+'%').join(',')+')';
      const label=document.createElement('span');label.className='plate-label';label.textContent=String(p+1).padStart(2,'0')+(plate.hinge?' ↪':'');el.appendChild(label);
      plate.colors.forEach((c,s)=>{
        const pos=plate.screws[s],hole=document.createElement('span');hole.className='screw-hole';hole.style.left=pos.x*100+'%';hole.style.top=pos.y*100+'%';el.appendChild(hole);
        if(state.removed[p]&(1<<s))return;
        const available=L.available(data,state,p,s),locked=L.locked(data,state,p,s),lock=pos.lock;
        const buttonRun=P.epoch,b=P.button('',()=>{if(buttonRun===P.epoch)act(p,s,b);},el,(p+1)+'번 판 '+(s+1)+'번 나사 '+symbols[c]+', '+(available?'풀 수 있어요':locked?'잠겨 있어요. '+(lock.p+1)+'번 판 '+(lock.s+1)+'번 나사가 열쇠예요':'위 판에 가려져 있어요'));
        b.className='screw color-'+c+(locked?' locked lock-'+lock.type:previous&&L.locked(data,previous,p,s)?' unlocking':'');b.setAttribute('aria-disabled',String(!available));b.dataset.screw=p*4+s;
        const mark=document.createElement('span');mark.textContent=symbols[c];b.appendChild(mark);
        const number=document.createElement('small');number.className='screw-number';number.textContent=s+1;number.setAttribute('aria-hidden','true');b.appendChild(number);
        if(locked){const badge=document.createElement('small');badge.className='screw-lock';badge.textContent=(lock.type==='ice'?'❄':'🔗')+' '+(lock.p+1)+'.'+(lock.s+1);b.appendChild(badge);}
        Object.assign(b.style,{left:'calc('+pos.x*100+'% - 25px)',top:'calc('+pos.y*100+'% - 25px)'});
      });board.appendChild(el);
    });
    if(P.level===1&&!history.length){
      const p=data.plates.length-1,spot=L.worldPoint(data.plates[p],data.plates[p].screws[0]);
      const hint=document.createElement('span');hint.className='tutorial-hand';hint.textContent='👆';hint.setAttribute('aria-hidden','true');
      hint.style.left=spot.x+'%';hint.style.top=spot.y+'%';board.appendChild(hint);
    }
    undo.disabled=!history.length||!undoLeft||P.over;undo.textContent='되돌리기 '+undoLeft;
    if(focus!==undefined){const buttons=Array.from(board.querySelectorAll('.screw')).filter(b=>b.getAttribute('aria-disabled')!=='true');const next=buttons.find(b=>+b.dataset.screw>=focus)||buttons[0];if(next)next.focus();}
  }
  P.mount(()=>{
    busy=false;data=L.level(P.level);state=L.initial(data);history=[];
    P.introduce(data,L.mechanicHints);
    document.querySelectorAll('.flying-screw').forEach(e=>e.remove());
    // Undo is a limited helper: 쉬움 2, 보통·어려움 1, 보스 0. Using it caps the stars at 2.
    undoLeft={easy:2,normal:1,hard:1,boss:0}[P.tier.key];
    // Bonus boards show their move budget on the goal line; undo counts as a move there.
    P.goal(data.moveLimit?{limit:data.moveLimit,note:'되돌리기도 1번'}:{note:'임시 칸이 넘치면 실패'});
    undo=P.button('되돌리기',()=>{if(P.over||busy||!history.length||!undoLeft)return;undoLeft--;P.help();state=L.undo(data,state,history.pop());P.move();P.say('나사를 다시 끼웠어요. 이번 단계는 별이 최대 2개예요. (남은 되돌리기 '+undoLeft+'번)');render();if(state.failed)P.fail('보너스 횟수를 넘겼어요.');else undo.focus();});render();
    P.say(data.name+' · '+data.hint);
  });
})();
