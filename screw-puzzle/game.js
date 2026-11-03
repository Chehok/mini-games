(function () {
  'use strict';
  const L=ScrewLogic,P=AdPuzzle('screw-puzzle',L.designs.length),symbols=P.symbols;
  let data,state,history,undo,busy=false;
  P.$('instructions').textContent='같은 기호 나사 3개씩 모으세요';
  const rack=document.createElement('div');rack.id='boxes';rack.className='screw-rack';rack.setAttribute('aria-label','수집 공구함 두 개와 임시 칸 세 개');P.$('board').before(rack);
  function makeRack(incoming=[]){
    rack.replaceChildren();
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
    for(let i=0;i<3;i++){
      const slot=document.createElement('span');slot.className='buffer-slot'+(state.tray[i]!==undefined?' filled color-'+state.tray[i]:'');slot.dataset.slot=i;
      slot.textContent=state.tray[i]===undefined?'':symbols[state.tray[i]];tray.appendChild(slot);
    }
    const count=document.createElement('span');count.className='tray-count';count.textContent=state.tray.length+' / 3';tray.appendChild(count);rack.appendChild(tray);
  }
  async function shake(button,message){
    P.feedback('error');P.say(message);
    await P.animate(button,[{translate:'0'},{translate:'-5px 0'},{translate:'5px 0'},{translate:'-3px 0'},{translate:'0'}],{duration:240});
  }
  async function act(p,s,button){
    if(P.over||busy)return;
    if(!L.available(data,state,p,s)){shake(button,'위 판에 가려진 나사예요. 드러난 나사부터 풀어 주세요.');return;}
    const next=L.remove(data,state,p,s);
    if(!next){shake(button,'임시 칸이 가득 차요. 공구함과 같은 기호를 찾거나 되돌려 보세요.');return;}
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
    if(next.removed[p]===7){
      const plate=button.parentNode,angle=data.plates[p].angle;
      plate.classList.add('falling');
      fall=P.animate(plate,[
        {transform:'translateY(0) rotate('+angle+'deg)',opacity:1},
        {transform:'translateY(12px) rotate('+(angle+12)+'deg)',opacity:1,offset:.25},
        {transform:'translateY('+(P.$('board').getBoundingClientRect().height+160)+'px) rotate('+(angle+80)+'deg)',opacity:0}
      ],{duration:600,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
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
    history.push(old);state=next;busy=false;P.move();render(p*3+s,outgoing);
    P.say('남은 판 '+state.removed.filter(n=>n!==7).length+'개 · 임시 칸 '+state.tray.length+'/3. 같은 기호끼리 모아 주세요.');
    if(state.removed.every(n=>n===7))P.win();
  }
  function render(focus,incoming=[]){
    const board=P.$('board');board.className='puzzle-board screw-board';board.replaceChildren();makeRack(incoming);
    const scene=document.createElement('span');scene.className='workbench-label';scene.textContent='보석 공방 · '+state.removed.filter(n=>n!==7).length+'개의 판';scene.setAttribute('aria-hidden','true');board.appendChild(scene);
    data.plates.forEach((plate,p)=>{
      if(state.removed[p]===7)return;
      const el=document.createElement('div');el.className='plate '+['wood','acrylic','metal'][p%3]+' color-'+((p+2)%6);el.style.setProperty('--angle',plate.angle+'deg');
      Object.assign(el.style,{left:plate.x+'%',top:plate.y+'%',width:plate.w+'%',height:plate.h+'%',zIndex:p+1});
      const label=document.createElement('span');label.className='plate-label';label.textContent=String(p+1).padStart(2,'0');el.appendChild(label);
      plate.colors.forEach((c,s)=>{
        const pos=L.positions[s],hole=document.createElement('span');hole.className='screw-hole';hole.style.left=pos.x*100+'%';hole.style.top='50%';el.appendChild(hole);
        if(state.removed[p]&(1<<s))return;
        const available=L.available(data,state,p,s);
        const buttonRun=P.epoch,b=P.button('',()=>{if(buttonRun===P.epoch)act(p,s,b);},el,(p+1)+'번 판 '+(s+1)+'번 나사 '+symbols[c]+', '+(available?'풀 수 있어요':'위 판에 가려져 있어요'));
        b.className='screw color-'+c;b.setAttribute('aria-disabled',String(!available));b.dataset.screw=p*3+s;
        const mark=document.createElement('span');mark.textContent=symbols[c];b.appendChild(mark);
        Object.assign(b.style,{left:'calc('+pos.x*100+'% - 25px)',top:'calc(50% - 25px)'});
      });board.appendChild(el);
    });
    if(P.level===1&&!history.length){
      const p=data.plates.length-1,spot=L.worldPoint(data.plates[p],L.positions[0]);
      const hint=document.createElement('span');hint.className='tutorial-hand';hint.textContent='👆';hint.setAttribute('aria-hidden','true');
      hint.style.left=spot.x+'%';hint.style.top=spot.y+'%';board.appendChild(hint);
    }
    undo.disabled=!history.length;
    if(focus!==undefined){const buttons=Array.from(board.querySelectorAll('.screw')).filter(b=>b.getAttribute('aria-disabled')!=='true');const next=buttons.find(b=>+b.dataset.screw>=focus)||buttons[0];if(next)next.focus();}
  }
  P.mount(()=>{
    busy=false;data=L.level(P.level);state=L.initial(data);history=[];
    document.querySelectorAll('.flying-screw').forEach(e=>e.remove());
    undo=P.button('되돌리기',()=>{if(P.over||busy||!history.length)return;state=history.pop();P.say('나사를 다시 끼웠어요. 다른 순서로 풀어 보세요.');render();undo.focus();});render();
    P.say(P.level===1?'👆 손가락이 가리키는 나사를 눌러 보세요. 같은 기호 3개가 한 세트예요.':'드러난 나사부터 풀어요. 공구함에 없는 기호는 임시 칸에서 기다려요.');
  });
})();
