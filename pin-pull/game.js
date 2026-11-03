(function () {
  'use strict';
  const L=PinLogic,P=AdPuzzle('pin-pull',L.designs.length),W=360;
  const banner=document.createElement('p');banner.className='mechanic-hint';banner.setAttribute('role','note');P.$('instructions').after(banner);
  const gems=[['#bbfff4','#19d8c3','#078c9b'],['#d4efff','#52a3ff','#3958cb'],['#ffe0f7','#f46ac5','#b6379a'],['#fff3b3','#ffc94e','#e98724']];
  let data,state,canvas,ctx,buttons,meter,frame=0,last=0,acc=0,run,dirty=true,calm=0,lastCount=-1,dark=false,drainAnnounced=false,endedAt=null;
  function line(x1,y1,x2,y2,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function gradient(x1,y1,x2,y2,stops){const g=ctx.createLinearGradient(x1,y1,x2,y2);stops.forEach(([t,c])=>g.addColorStop(t,c));return g;}
  function radial(x,y,r,stops){const g=ctx.createRadialGradient(x-r*.3,y-r*.35,1,x,y,r);stops.forEach(([t,c])=>g.addColorStop(t,c));return g;}
  function circle(x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function text(s,x,y,size,color){ctx.fillStyle=color;ctx.font='800 '+size+'px system-ui';ctx.textAlign='center';ctx.fillText(s,x,y);}
  function polygon(points,fill){ctx.fillStyle=fill;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function handle(pin){const dx=pin.x2-pin.x1,dy=pin.y2-pin.y1,len=Math.hypot(dx,dy);return {x:Math.max(28,Math.min(332,pin.x1-dx/len*24)),y:Math.max(28,Math.min(data.height-28,pin.y1-dy/len*24))};}
  function gem(x,y,id,r=L.R,gray=false){
    const c=gray?['#f1f5fa','#a8b4c5','#65758c']:gems[id%4];ctx.save();ctx.translate(x,y);ctx.scale(r/10,r/10);
    ctx.shadowColor=c[2]+'66';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    polygon([[-5,-9],[5,-9],[10,-2],[0,11],[-10,-2]],c[2]);ctx.shadowColor='transparent';
    polygon([[-5,-9],[5,-9],[4,-2],[-4,-2]],c[0]);
    polygon([[-5,-9],[-4,-2],[-10,-2]],c[1]);polygon([[5,-9],[10,-2],[4,-2]],c[1]);
    polygon([[-10,-2],[-4,-2],[0,11]],c[1]);polygon([[-4,-2],[4,-2],[0,11]],c[0]);
    polygon([[4,-2],[10,-2],[0,11]],c[2]);
    line(-4,-7,-1,-7,'#fff',1.7);line(-3,-8,-3,-5,'#fff',1.2);ctx.restore();
  }
  function mud(x,y,id,r=L.R){
    ctx.save();ctx.translate(x,y);ctx.rotate(id*.73);
    ctx.shadowColor='#16262b55';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    polygon(Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2,v=r*(.86+(i+id)%3*.07);return [Math.cos(a)*v,Math.sin(a)*v];}),radial(0,0,r,[[0,'#a28e74'],[.45,'#655946'],[1,'#3d3b33']]));
    ctx.shadowColor='transparent';for(let k=0;k<4;k++)circle((k%2?1:-1)*(2+k),k-3,1.2,k%2?'#c5af8b77':'#292e2977');
    line(-4,-3,0,-5,'#cfbd9988',1.5);ctx.restore();
  }
  function sparkle(x,y,r,alpha){ctx.save();ctx.globalAlpha=alpha;polygon([[x,y-r],[x+r*.25,y-r*.25],[x+r,y],[x+r*.25,y+r*.25],[x,y+r],[x-r*.25,y+r*.25],[x-r,y],[x-r*.25,y-r*.25]],'#fff9c9');ctx.restore();}
  function bin(x){
    const y=data.height-66;
    rounded(x,y,48,50,9,gradient(x,y,x+48,y+45,[[0,'#86b6a1'],[.4,'#477f71'],[1,'#285a53']]));
    rounded(x+4,y-2,40,10,5,'#264d48');
    state.balls.filter(b=>b.kind==='mud'&&b.status==='out'&&(x<180?b.x<180:b.x>=180)).forEach((b,i)=>mud(x+10+i%3*13,y+35-Math.floor(i/3)*11,b.id,7));
    rounded(x-3,y-3,54,7,3,'#a4dac0');line(x+6,y+10,x+6,y+36,'#b6e4cc66',2);text('≋',x+24,y+45,17,'#e0ffe9');
  }
  function draw(){
    const H=data.height,reduced=P.motion();ctx.clearRect(0,0,W,H);
    rounded(0,0,W,H,20,gradient(0,0,W,H,[[0,dark?'#202b49':'#e3e9ff'],[.5,dark?'#214054':'#daf4f7'],[1,dark?'#1d3e3a':'#c0e8d6']]));
    ctx.save();ctx.globalAlpha=dark?.08:.2;
    for(let y=12;y<H;y+=30)for(let x=14;x<W;x+=30)polygon([[x,y-3],[x+3,y],[x,y+3],[x-3,y]],'#8f9fc6');ctx.restore();
    circle(180,130,130,radial(180,130,130,[[0,dark?'#74b6de22':'#ffffffcc'],[1,'#ffffff00']]));
    if(data.mechanics.includes('mud')&&data.cups.length===1){bin(8);bin(304);}
    // Every chamber is outlined by its own physical walls, including side pockets.
    for(const wall of data.walls){
      line(wall.x1,wall.y1+3,wall.x2,wall.y2+3,'#244d6d44',16);
      line(wall.x1,wall.y1,wall.x2,wall.y2,gradient(wall.x1-6,wall.y1-6,wall.x2+6,wall.y2+6,[[0,'#f5ffff'],[.3,'#bce3f2'],[.65,'#77aec8'],[1,'#e1f8ff']]),10);
      line(wall.x1-1,wall.y1-2,wall.x2-1,wall.y2-2,'#ffffffbb',2);
    }
    data.cups.forEach(c=>{
      rounded(c.x1-3,c.y,c.x2-c.x1+6,65,12,gradient(c.x1,c.y,c.x2,c.y+65,[[0,'#6ef1ef'],[.45,'#29b5ce'],[1,'#19759e']]));
      rounded(c.x1+6,c.y+5,c.x2-c.x1-12,49,8,gradient(0,c.y,0,c.y+58,[[0,'#123e71'],[1,'#387b9b']]));
    });
    data.pins.forEach((pin,i)=>{
      const slide=L.ease(state.slide[i]);if(slide>=1||reduced&&state.open[i])return;
      const dx=pin.x2-pin.x1,dy=pin.y2-pin.y1,len=Math.hypot(dx,dy),shift=slide*(len+42),h=handle(pin),lock=L.locked(data,state,i);
      ctx.save();ctx.translate(-dx/len*shift,-dy/len*shift);ctx.globalAlpha=1-slide;
      ctx.shadowColor='#80591d66';ctx.shadowBlur=7;ctx.shadowOffsetY=4;
      line(pin.x1,pin.y1,pin.x2,pin.y2,lock?'#6a7590':'#a36513',13);ctx.shadowColor='transparent';
      line(pin.x1,pin.y1-1,pin.x2,pin.y2-1,gradient(pin.x1,pin.y1-6,pin.x1+3,pin.y1+7,[[0,'#fff5b2'],[.3,lock?'#bbc7df':'#ffe078'],[.55,lock?'#8c9dbc':'#efaf29'],[1,'#b16c16']]),9);
      line(pin.x1,pin.y1-3,pin.x2,pin.y2-3,'#fff9d2',2);line(pin.x1,pin.y1,h.x,h.y,'#d39424',8);
      circle(h.x,h.y+3,18,'#9a611e');circle(h.x,h.y,18,radial(h.x,h.y,18,[[0,'#fffbe3'],[.35,'#ffe987'],[.73,'#f5bd3c'],[1,'#b2761d']]));
      circle(h.x,h.y,12,'#ba7d2477');text(lock?'🔒':pin.grants?'🗝':String(i+1),h.x,h.y+4,12,'#795016');
      if(pin.lock||pin.grants)text((i+1)+' '+(pin.lock&&pin.grants?pin.lock+'→'+pin.grants:pin.lock||pin.grants),h.x,h.y+30,10,dark?'#ecfbff':'#304d69');ctx.restore();
    });
    (data.keyZones||[]).forEach(z=>{rounded(z.x1,z.y2-7,z.x2-z.x1,8,4,'#f6ce63');text('🗝', (z.x1+z.x2)/2,z.y2-10,15,'#fff');});
    for(const b of state.balls){
      if(b.status==='out'||b.status==='key')continue;
      if(b.kind==='gem'||b.kind==='gray'){
        const age=b.caughtAt===undefined?10:state.time-b.caughtAt,pop=!reduced&&age<.3?1+Math.sin(age/.3*Math.PI)*.24:1;gem(b.x,b.y,b.id,L.R*pop,b.kind==='gray');
      }else if(b.kind==='stone'){
        circle(b.x,b.y+2,20,'#34475c');circle(b.x,b.y,20,radial(b.x,b.y,20,[[0,'#dce6ef'],[.4,'#99aabd'],[1,'#53677e']]));line(b.x-9,b.y-9,b.x-2,b.y-12,'#eff8ff',3);text('●',b.x,b.y+6,14,'#52657a');
      }else if(b.kind==='key'){circle(b.x,b.y,10,'#ffdf75');text('🗝',b.x,b.y+5,17,'#795016');}
      else mud(b.x,b.y,b.id);
    }
    data.cups.forEach((c,i)=>{
      const mid=(c.x1+c.x2)/2;
      rounded(c.x1+1,c.y+16,c.x2-c.x1-2,45,9,gradient(c.x1,0,c.x2,0,[[0,'#88f6ff77'],[.25,'#80ecf51c'],[.75,'#ffffff09'],[1,'#1979b877']]));
      line(c.x1+3,c.y+3,c.x1+8,c.y+60,'#b8ffff',4);line(c.x2-3,c.y+3,c.x2-8,c.y+60,'#51c6e5',4);
      rounded(c.x1-4,c.y-3,c.x2-c.x1+8,9,4,gradient(0,c.y-3,0,c.y+6,[[0,'#ffffd4'],[.45,'#ffe58c'],[1,'#de9b30']]));
      rounded(mid-31,c.y+38,62,22,11,'#143d6ae8');text(state.cups[i]+' / '+c.quota+' ◆',mid,c.y+53,11,'#fff6bf');
    });
    if(!reduced)for(const b of state.balls){
      if(b.caughtAt===undefined)continue;const age=state.time-b.caughtAt;if(age<0||age>.6)continue;
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5+b.id,s=12+age*55;sparkle(b.x+Math.cos(a)*s,b.y+Math.sin(a)*s-age*25,4*(1-age/.6),1-age/.6);}
    }
    const mudCount=data.particles.filter(b=>b.kind==='mud').length;
    if(mudCount)text('≋ 진흙 '+state.drained+' / '+mudCount+' 비움',180,H-10,10,dark?'#d6ecf3':'#37596a');
    if(P.level===1&&P.moves===0){const h=handle(data.pins[0]),pulse=reduced?0:Math.sin(state.time*4)*4;text('👆',h.x+3,h.y+49+pulse,27,'#fff');}
    buttons.forEach((b,i)=>{
      const pin=data.pins[i],dx=pin.x2-pin.x1,dy=pin.y2-pin.y1,len=Math.hypot(dx,dy),slide=L.ease(state.slide[i]),shift=slide*(len+42),scale=canvas.clientWidth/W;
      b.style.opacity=1-slide;b.style.transform='translate(-50%,-50%) translate('+(-dx/len*shift*scale)+'px,'+(-dy/len*shift*scale)+'px)';b.hidden=slide>=1||reduced&&state.open[i];b.setAttribute('aria-disabled',String(L.locked(data,state,i)));
      b.setAttribute('aria-label',(i+1)+'번 '+pin.label+(L.locked(data,state,i)?', 열쇠 '+pin.lock+'가 필요해요':' 뽑기'));
    });
  }
  function resize(){
    if(!canvas)return;dark=matchMedia('(prefers-color-scheme: dark)').matches;
    const dpr=window.devicePixelRatio||1,w=canvas.clientWidth||P.$('board').clientWidth;
    canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(w*data.height/W*dpr);
    ctx.setTransform(canvas.width/W,0,0,canvas.height/data.height,0,0);dirty=true;wake();
  }
  function wake(){if(!frame)frame=requestAnimationFrame(tick);}
  function tick(now){
    frame=0;if(run!==P.epoch)return;
    const delta=last?Math.min(.06,(now-last)/1000):L.DT;last=now;acc+=delta;
    while(acc>=L.DT){L.step(data,state);acc-=L.DT;}
    const moving=state.balls.some(b=>b.status!=='out'&&(Math.abs(b.vx)>6||Math.abs(b.vy)>12||b.caughtAt!==undefined&&state.time-b.caughtAt<1))||state.open.some((v,i)=>v&&state.slide[i]<1);
    const hint=P.level===1&&P.moves===0&&!P.motion();calm=moving?0:calm+delta;
    if(dirty||moving||hint||calm<.3){draw();dirty=false;}
    if(state.collected!==lastCount){lastCount=state.collected;meter.textContent=data.name+' · ◆ '+state.collected+' / '+data.target;}
    if(!P.over&&!drainAnnounced&&data.mechanics.includes('mud')&&state.drained===data.particles.filter(b=>b.kind==='mud').length){drainAnnounced=true;P.say('진흙을 모두 비웠어요! 보석이 지나갈 길을 준비해 주세요.');P.feedback('move');}
    if(state.failed)P.fail(state.reason);else if(L.solved(data,state))P.win();
    if(P.over&&endedAt===null)endedAt=state.time;
    if(!state.failed&&(endedAt===null?(moving||hint||calm<1):state.time-endedAt<1))wake();else last=0;
  }
  function act(i){
    if(P.over)return;if(L.locked(data,state,i)){P.feedback('error');P.say('🔒 열쇠 '+data.pins[i].lock+'를 먼저 찾아 주세요.');return;}if(!L.pull(data,state,i))return;
    P.move();buttons[i].disabled=true;buttons[i].style.pointerEvents='none';dirty=true;calm=0;last=0;wake();
    P.say(data.pins[i].kind==='drain'?'진흙이 옆 통으로 흐르고 있어요. 잠깐 기다려 주세요.':'보석이 굴러가요! 길을 살펴보고 다음 핀을 골라 주세요.');
    const next=buttons.find(b=>!b.disabled);if(next)next.focus();else P.$('restart').focus();
  }
  window.addEventListener('resize',resize);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',resize);
  P.mount(()=>{
    cancelAnimationFrame(frame);frame=0;last=0;acc=0;calm=0;lastCount=-1;drainAnnounced=false;endedAt=null;run=P.epoch;data=L.level(P.level);state=L.initial(data);
    P.$('instructions').textContent=data.cups.length>1?'모든 컵의 보석 수를 채워 주세요':'색 보석 '+data.target+'개를 컵에 모으세요';
    banner.textContent=data.hint?'💡 '+data.hint:'';banner.hidden=!data.hint;
    P.say(data.name+' · 길을 살펴보고 핀을 골라 주세요.');
    const board=P.$('board');board.className='puzzle-board pin-board';board.style.aspectRatio=W+' / '+data.height;
    canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');board.appendChild(canvas);ctx=canvas.getContext('2d');
    const canvasRun=P.epoch;let touched=null;
    canvas.addEventListener('pointerdown',e=>{
      if(P.over||e.button!==0)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*W,y=(e.clientY-rect.top)/rect.height*data.height;
      const index=data.pins.findIndex((pin,i)=>{
        if(state.open[i])return false;const dx=pin.x2-pin.x1,dy=pin.y2-pin.y1,t=Math.max(0,Math.min(1,((x-pin.x1)*dx+(y-pin.y1)*dy)/(dx*dx+dy*dy)));
        return Math.hypot(x-pin.x1-dx*t,y-pin.y1-dy*t)<22*W/rect.width;
      });
      if(index>=0){touched={index,id:e.pointerId};canvas.setPointerCapture(e.pointerId);}
    });
    canvas.addEventListener('pointerup',e=>{if(touched&&touched.id===e.pointerId&&canvasRun===P.epoch)act(touched.index);touched=null;});
    canvas.addEventListener('pointercancel',()=>{touched=null;});
    meter=document.createElement('p');meter.className='scene-caption';board.before(meter);
    board.parentNode.querySelectorAll('.scene-caption').forEach(c=>{if(c!==meter)c.remove();});
    buttons=data.pins.map((pin,i)=>{
      const buttonRun=P.epoch,b=P.button('',()=>{if(buttonRun===P.epoch)act(i);},board,(i+1)+'번 '+pin.label+' 뽑기');b.className='pin-handle';b.dataset.pin=i;
      const h=handle(pin);b.style.left=h.x/W*100+'%';b.style.top=h.y/data.height*100+'%';
      let point=null;b.addEventListener('pointerdown',e=>{point={x:e.clientX,y:e.clientY};b.setPointerCapture(e.pointerId);});
      b.addEventListener('pointerup',e=>{if(buttonRun===P.epoch&&point&&Math.hypot(e.clientX-point.x,e.clientY-point.y)>18)act(i);point=null;});b.addEventListener('pointercancel',()=>{point=null;});return b;
    });resize();
  });
})();
