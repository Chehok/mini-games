(function () {
  'use strict';
  const P=AdPuzzle('screw-puzzle',12), L=ScrewLogic, symbols=['●','▲','■','◆','★','✚'];
  let data,state,history,undo;
  P.$('instructions').textContent='드러난 나사를 누르면 같은 기호의 상자에 들어가요. 3개를 채우면 새 상자가 나와요. 다른 색은 임시 칸 3곳에 보관해요. 나사를 모두 빼면 판이 내려가요.';
  function render(focus) {
    const board=P.$('board');board.className='puzzle-board screw-board';board.replaceChildren();
    data.plates.forEach((plate,p) => {
      const el=document.createElement('div');el.className='plate'+(state.removed[p]===7?' fallen':'');
      el.hidden=state.removed[p]===7 && history.length>0 && history[history.length-1].removed[p]===7;
      Object.assign(el.style,{left:plate.x+'%',top:plate.y+'%',width:plate.w+'%',height:plate.h+'%',zIndex:p+1});
      const label=document.createElement('span');label.className='plate-label';label.textContent=(p+1)+'번 판';el.appendChild(label);
      plate.colors.forEach((c,s) => {
        if(state.removed[p]&(1<<s))return;
        const b=P.button(symbols[c]+' ⊕',() => {
          if(P.over)return;
          const next=L.remove(data,state,p,s);
          if(!next) { P.say('임시 칸이 가득 차요. 상자와 같은 기호의 나사를 찾거나 되돌려 보세요.');return; }
          history.push(state);state=next;P.move();P.say((p+1)+'번 판의 나사를 정리했어요.');
          render(p*3+s);
          if(state.removed.every(mask=>mask===7))P.win();
        },el,(p+1)+'번 판 '+(s+1)+'번 나사, '+symbols[c]+', '+(L.available(data,state,p,s)?'풀 수 있어요':'위 판에 가려져 있어요'));
        b.className='screw color-'+c;b.disabled=!L.available(data,state,p,s);
        Object.assign(b.style,{left:'calc('+L.positions[s].x*100+'% - 22px)',top:'calc(50% - 22px)'});b.dataset.screw=p*3+s;
      });board.appendChild(el);
    });
    const boxes=P.$('boxes');boxes.replaceChildren();
    state.boxes.forEach(box => {const el=document.createElement('span');el.className='screw-box'+(box?' color-'+box.c:'');el.textContent=box?symbols[box.c]+' '+box.n+'/3':'완료';boxes.appendChild(el);});
    const tray=document.createElement('span');tray.className='hint';tray.textContent='임시 칸: '+(state.tray.map(c=>symbols[c]).join(' ')||'비어 있어요')+' ('+state.tray.length+'/3)';boxes.appendChild(tray);
    undo.disabled=!history.length;
    if(focus!==undefined){const buttons=Array.from(board.querySelectorAll('button:not(:disabled)'));const next=buttons.find(b=>+b.dataset.screw>=focus)||buttons[0];if(next)next.focus();else P.$('next').focus();}
  }
  const boxes=document.createElement('div');boxes.id='boxes';boxes.className='boxes';P.$('board').before(boxes);
  P.mount(() => {
    data=L.level(P.level);state=L.initial(data);history=[];
    undo=P.button('되돌리기',()=>{if(P.over||!history.length)return;state=history.pop();P.say('나사를 다시 끼웠어요.');render();undo.focus();});render();
  });
})();
