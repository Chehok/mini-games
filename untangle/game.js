(function () {
  'use strict';
  const P=AdPuzzle('untangle'),L=UntangleLogic,NS='http://www.w3.org/2000/svg';
  let data,nodes,buttons,svg,drag=null,origin;
  P.$('instructions').textContent='점을 끌어 줄이 교차하지 않게 놓아요. 빨간 점선은 교차하는 줄이에요. 키보드는 Tab으로 점 선택 후 방향키로 이동해요. Shift+방향키는 크게 옮겨요.';
  function redraw() {
    const pairs=L.crossings(nodes,data.edges),bad=new Set(pairs.flat());svg.replaceChildren();
    data.edges.forEach(([a,b],i)=>{const line=document.createElementNS(NS,'line');line.setAttribute('x1',nodes[a].x+'%');line.setAttribute('y1',nodes[a].y+'%');line.setAttribute('x2',nodes[b].x+'%');line.setAttribute('y2',nodes[b].y+'%');if(bad.has(i))line.classList.add('crossing');svg.appendChild(line);});
    buttons.forEach((b,i)=>{b.style.left=nodes[i].x+'%';b.style.top=nodes[i].y+'%';b.setAttribute('aria-label',(i+1)+'번 점, 가로 '+Math.round(nodes[i].x)+', 세로 '+Math.round(nodes[i].y));});
    if(!P.over)P.say('교차 '+pairs.length+'곳'+(!pairs.length&&!L.clear(nodes,data.edges)?' · 겹친 점도 떨어뜨려 주세요.':''));
  }
  function check(){if(L.clear(nodes,data.edges))P.win();}
  function set(i,x,y){nodes[i]={x:Math.max(8,Math.min(92,x)),y:Math.max(8,Math.min(92,y))};redraw();}
  function end(e,cancel){
    if(!drag||e.pointerId!==drag.id)return;
    const d=drag;drag=null;
    if(cancel){nodes[d.i]=origin;redraw();return;}
    if(Math.hypot(nodes[d.i].x-origin.x,nodes[d.i].y-origin.y)>.1)P.move();check();
  }
  P.mount(()=>{
    drag=null;data=L.generate(P.level,MG.rng(P.level * 7919));nodes=data.nodes.map(p=>({...p}));
    const board=P.$('board');board.className='puzzle-board untangle-board';
    svg=document.createElementNS(NS,'svg');svg.classList.add('graph-lines');svg.setAttribute('aria-hidden','true');board.appendChild(svg);
    buttons=nodes.map((_,i)=>{
      const b=P.button(i+1,()=>{},board);b.className='graph-node';
      b.addEventListener('pointerdown',e=>{if(P.over||drag||e.button!==0)return;drag={i,id:e.pointerId};origin={...nodes[i]};b.setPointerCapture(e.pointerId);b.focus();});
      b.addEventListener('pointermove',e=>{if(!drag||drag.i!==i||drag.id!==e.pointerId)return;const r=board.getBoundingClientRect();set(i,(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100);});
      b.addEventListener('pointerup',e=>end(e,false));b.addEventListener('pointercancel',e=>end(e,true));b.addEventListener('lostpointercapture',e=>end(e,true));
      b.addEventListener('keydown',e=>{
        const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=dirs[e.key];if(!d||P.over)return;e.preventDefault();const step=e.shiftKey?5:1;set(i,nodes[i].x+d[0]*step,nodes[i].y+d[1]*step);P.move();check();
      });return b;
    });
    P.button('배치 힌트',()=>{if(P.over)return;const i=nodes.findIndex((p,i)=>Math.hypot(p.x-data.solution[i].x,p.y-data.solution[i].y)>1);if(i>=0){set(i,data.solution[i].x,data.solution[i].y);P.move();check();}});
    redraw();
  });
})();
