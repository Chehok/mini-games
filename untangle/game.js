(function () {
  'use strict';
  const P=AdPuzzle('untangle'),L=UntangleLogic,NS='http://www.w3.org/2000/svg';
  let data,nodes,buttons,lines,drag=null,origin,frame=0,pending=null;
  P.$('instructions').textContent='점을 끌어 빨간 교차 점선을 모두 풀어요. Tab으로 점을 고르고 방향키로 옮길 수도 있어요. Shift+방향키는 크게 옮겨요.';
  function redraw(announce=true){
    const pairs=L.crossings(nodes,data.edges),bad=new Set(pairs.flat());
    data.edges.forEach(([a,b],i)=>{const line=lines[i];line.setAttribute('x1',nodes[a].x+'%');line.setAttribute('y1',nodes[a].y+'%');line.setAttribute('x2',nodes[b].x+'%');line.setAttribute('y2',nodes[b].y+'%');line.classList.toggle('crossing',bad.has(i));});
    buttons.forEach((b,i)=>{b.style.left=nodes[i].x+'%';b.style.top=nodes[i].y+'%';b.setAttribute('aria-label',(i+1)+'번 점, 가로 '+Math.round(nodes[i].x)+', 세로 '+Math.round(nodes[i].y));});
    if(announce&&!P.over)P.say('교차 '+pairs.length+'곳'+(!pairs.length&&!L.clear(nodes,data.edges)?' · 겹친 점도 떨어뜨려 주세요.':''));
  }
  function check(){if(L.clear(nodes,data.edges))P.win();}
  function set(i,x,y,announce=true){nodes[i]={x:Math.max(8,Math.min(92,x)),y:Math.max(8,Math.min(92,y))};redraw(announce);}
  function flush(){if(pending&&drag){set(drag.i,pending.x,pending.y,false);}pending=null;}
  function end(e,cancel){
    if(!drag||e.pointerId!==drag.id)return;flush();const d=drag;drag=null;buttons[d.i].classList.remove('dragging');
    if(cancel){nodes[d.i]=origin;redraw();return;}
    if(Math.hypot(nodes[d.i].x-origin.x,nodes[d.i].y-origin.y)>.1)P.move();redraw();check();
  }
  P.mount(()=>{
    cancelAnimationFrame(frame);frame=0;pending=null;drag=null;data=L.generate(P.level,MG.rng(P.level*7919));nodes=data.nodes.map(p=>({...p}));
    const board=P.$('board');board.className='puzzle-board untangle-board';
    const svg=document.createElementNS(NS,'svg');svg.classList.add('graph-lines');svg.setAttribute('aria-hidden','true');board.appendChild(svg);
    lines=data.edges.map(()=>{const line=document.createElementNS(NS,'line');svg.appendChild(line);return line;});
    buttons=nodes.map((_,i)=>{
      const b=P.button(i+1,()=>{},board);b.className='graph-node';
      b.addEventListener('pointerdown',e=>{
        if(P.over||drag||e.button!==0)return;const r=board.getBoundingClientRect();
        drag={i,id:e.pointerId,rect:r,dx:nodes[i].x-(e.clientX-r.left)/r.width*100,dy:nodes[i].y-(e.clientY-r.top)/r.height*100};origin={...nodes[i]};b.classList.add('dragging');b.setPointerCapture(e.pointerId);b.focus();
      });
      b.addEventListener('pointermove',e=>{
        if(!drag||drag.i!==i||drag.id!==e.pointerId)return;const r=drag.rect;
        pending={x:(e.clientX-r.left)/r.width*100+drag.dx,y:(e.clientY-r.top)/r.height*100+drag.dy};
        if(!frame)frame=requestAnimationFrame(()=>{frame=0;flush();});
      });
      b.addEventListener('pointerup',e=>end(e,false));b.addEventListener('pointercancel',e=>end(e,true));b.addEventListener('lostpointercapture',e=>end(e,true));
      b.addEventListener('keydown',e=>{
        const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=dirs[e.key];if(!d||P.over)return;e.preventDefault();const step=e.shiftKey?5:1;set(i,nodes[i].x+d[0]*step,nodes[i].y+d[1]*step);P.move();check();
      });return b;
    });
    P.button('배치 힌트',()=>{if(P.over||drag)return;const i=nodes.findIndex((p,i)=>Math.hypot(p.x-data.solution[i].x,p.y-data.solution[i].y)>1);if(i>=0){set(i,data.solution[i].x,data.solution[i].y);P.move();check();}});redraw();
  });
})();
