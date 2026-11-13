(function () {
  'use strict';
  const P=AdPuzzle('untangle'),L=UntangleLogic,NS='http://www.w3.org/2000/svg';
  let data,nodes,buttons,lines,markers,drag=null,origin,frame=0,pending=null;
  P.$('instructions').textContent='점을 끌어 빨간 줄이 겹치지 않게 풀어요';
  function svgEl(tag,attrs,parent){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);parent.appendChild(el);return el;}
  function hideTutorial(){P.$('board').querySelectorAll('.tutorial-hand,.peg-destination').forEach(h=>h.remove());}
  function redraw(announce=true){
    const pairs=L.crossings(nodes,data.edges),bad=new Set(pairs.flat());
    data.edges.forEach(([a,b],i)=>{
      const p=nodes[a],q=nodes[b],mx=(p.x+q.x)/2,my=(p.y+q.y)/2,sag=Math.min(.8,Math.hypot(p.x-q.x,p.y-q.y)*.012);
      const d='M '+p.x+' '+p.y+' Q '+mx+' '+(my+sag)+' '+q.x+' '+q.y;
      const rope=lines[i];rope.classList.toggle('crossing',bad.has(i));
      rope.querySelectorAll('path').forEach(path=>{if(!path.classList.contains('rope-spark'))path.setAttribute('d',d);});
      rope.querySelector('.rope-spark').setAttribute('d','M '+mx+' '+(my-1.4)+' l .5 1.4 1.4 .5 -1.4 .5 -.5 1.4 -.5 -1.4 -1.4 -.5 1.4 -.5 Z');
    });
    markers.replaceChildren();
    for(const [i,j] of pairs){const [a,b]=data.edges[i],[c,d]=data.edges[j],point=L.crossingPoint(nodes[a],nodes[b],nodes[c],nodes[d]);svgEl('circle',{class:'crossing-point',cx:point.x,cy:point.y+.3,r:1.3},markers);}
    buttons.forEach((b,i)=>{b.style.left=nodes[i].x+'%';b.style.top=nodes[i].y+'%';b.setAttribute('aria-label',(i+1)+'번 점, 가로 '+Math.round(nodes[i].x)+', 세로 '+Math.round(nodes[i].y)+'. 방향키로 옮겨요.');});
    P.$('scene-meter').textContent='매듭 정원 · 교차 '+pairs.length+'곳 · 목표 0곳';
    if(announce&&!P.over)P.say('교차 '+pairs.length+'곳'+(!pairs.length&&!L.clear(nodes,data.edges)?' · 겹친 점도 떨어뜨려 주세요.':' · 빨간 줄을 초록색으로 바꿔 보세요.'));
  }
  function check(){if(L.clear(nodes,data.edges)){hideTutorial();P.win();}}
  function set(i,x,y,announce=true){nodes[i]={x:Math.max(8,Math.min(92,x)),y:Math.max(8,Math.min(92,y))};redraw(announce);}
  function flush(){if(pending&&drag)set(drag.i,pending.x,pending.y,false);pending=null;}
  function end(e,cancel){
    if(!drag||e.pointerId!==drag.id)return;flush();const d=drag;drag=null;buttons[d.i].classList.remove('dragging');
    if(cancel){nodes[d.i]=origin;redraw();return;}
    if(Math.hypot(nodes[d.i].x-origin.x,nodes[d.i].y-origin.y)>.1)P.move();redraw();check();
  }
  P.mount(()=>{
    cancelAnimationFrame(frame);frame=0;pending=null;drag=null;data=L.generate(P.level,MG.rng(P.level*7919));nodes=data.nodes.map(p=>({...p}));
    const board=P.$('board'),run=P.epoch;board.className='puzzle-board untangle-board';
    const svg=svgEl('svg',{class:'graph-lines',viewBox:'0 0 100 100','aria-hidden':'true'},board);
    lines=data.edges.map(()=>{const rope=svgEl('g',{class:'rope'},svg);for(const name of ['shadow','base','color','shine','twist','spark'])svgEl('path',{class:'rope-'+name},rope);return rope;});
    markers=svgEl('g',{class:'crossing-points'},svg);
    buttons=nodes.map((_,i)=>{
      const b=P.button(i+1,()=>{},board);b.className='graph-node';
      b.addEventListener('pointerdown',e=>{
        if(run!==P.epoch||P.over||drag||e.button!==0)return;hideTutorial();const r=board.getBoundingClientRect();
        drag={i,id:e.pointerId,rect:r,dx:nodes[i].x-(e.clientX-r.left)/r.width*100,dy:nodes[i].y-(e.clientY-r.top)/r.height*100};origin={...nodes[i]};b.classList.add('dragging');b.setPointerCapture(e.pointerId);b.focus();
      });
      b.addEventListener('pointermove',e=>{
        if(run!==P.epoch||!drag||drag.i!==i||drag.id!==e.pointerId)return;const r=drag.rect;
        pending={x:(e.clientX-r.left)/r.width*100+drag.dx,y:(e.clientY-r.top)/r.height*100+drag.dy};
        if(!frame)frame=requestAnimationFrame(()=>{frame=0;flush();});
      });
      b.addEventListener('pointerup',e=>{if(run===P.epoch)end(e,false);});b.addEventListener('pointercancel',e=>{if(run===P.epoch)end(e,true);});b.addEventListener('lostpointercapture',e=>{if(run===P.epoch)end(e,true);});
      b.addEventListener('keydown',e=>{
        const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=dirs[e.key];if(!d||P.over||drag||run!==P.epoch)return;e.preventDefault();hideTutorial();const step=e.shiftKey?5:1;set(i,nodes[i].x+d[0]*step,nodes[i].y+d[1]*step);P.move();check();
      });return b;
    });
    if(P.level===1){
      const dest=document.createElement('span');dest.className='peg-destination';dest.textContent='◎';dest.setAttribute('aria-hidden','true');dest.style.left=data.solution[0].x+'%';dest.style.top=data.solution[0].y+'%';board.appendChild(dest);
      const hand=document.createElement('span');hand.className='tutorial-hand';hand.textContent='👆';hand.setAttribute('aria-hidden','true');hand.style.left=nodes[0].x+'%';hand.style.top=nodes[0].y+'%';
      hand.style.setProperty('--hint-x',(data.solution[0].x-nodes[0].x)+'%');hand.style.setProperty('--hint-y',(data.solution[0].y-nodes[0].y)+'%');board.appendChild(hand);
    }
    P.button('배치 힌트',()=>{if(P.over||drag)return;hideTutorial();const i=nodes.findIndex((p,i)=>Math.hypot(p.x-data.solution[i].x,p.y-data.solution[i].y)>1);if(i>=0){set(i,data.solution[i].x,data.solution[i].y);P.move();check();}});redraw();
    if(P.level===1)P.say('👆 1번 점을 오른쪽 동그라미까지 끌어 보세요. 줄이 겹치지 않으면 성공이에요.');
  });
})();
