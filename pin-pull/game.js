(function () {
  'use strict';
  const P=AdPuzzle('pin-pull',12),L=PinLogic;
  let data,state,canvas,ctx,buttons,meter,frame=0,last=0,acc=0,run,dirty=true,calm=0,lastCount=-1,colors,drainAnnounced=false;
  P.$('instructions').textContent='진흙 ≋은 옆 통으로, 보석 ◆은 컵으로! 핀을 누르거나 밀어 뽑아요. 진흙을 먼저 비우고 바닥을 열어 주세요.';
  function palette(){const css=getComputedStyle(P.$('board'));return {bg:css.getPropertyValue('--surface-2').trim(),ink:css.getPropertyValue('--text').trim()||'#242438',muted:css.getPropertyValue('--muted').trim(),dark:matchMedia('(prefers-color-scheme: dark)').matches};}
  function line(x1,y1,x2,y2,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function text(s,x,y,size,color){ctx.fillStyle=color;ctx.font='700 '+size+'px system-ui';ctx.textAlign='center';ctx.fillText(s,x,y);}
  function draw(){
    const p=colors;ctx.clearRect(0,0,360,540);
    const sky=ctx.createLinearGradient(0,0,0,540);sky.addColorStop(0,p.dark?'#252a46':'#e6edff');sky.addColorStop(1,p.dark?'#192c34':'#def5ee');rounded(0,0,360,540,20,sky);
    // Inset chamber, stone edges and drains are scenery AND the collision geometry.
    rounded(95,22,170,402,12,p.dark?'#161d2c':'#f9fbff');
    for(let i=0;i<9;i++){ctx.globalAlpha=.25;rounded(103+i%3*52,32+Math.floor(i/3)*128,38,7,3,p.dark?'#7182b1':'#c7d3ed');}ctx.globalAlpha=1;
    [18,278].forEach(x=>{rounded(x,463,64,58,10,p.dark?'#485365':'#8f9cac');rounded(x+5,458,54,9,4,'#b1bdc9');text('≋',x+32,480,18,'#fff');text('진흙 통',x+32,532,10,p.ink);});
    let leftMud=0,rightMud=0;
    state.balls.forEach(b=>{if(b.kind!=='mud'||b.status!=='out')return;const left=b.x<180,n=left?leftMud++:rightMud++,x=(left?32:292)+n%5*9,y=510-Math.floor(n/5)*8;ctx.fillStyle=p.dark?'#9eacbd':'#596b80';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();});
    for(const w of data.walls){line(w.x1,w.y1+3,w.x2,w.y2+3,p.dark?'#0c1120':'#aab7d0',12);line(w.x1,w.y1,w.x2,w.y2,p.dark?'#65718d':'#94a5c1',10);line(w.x1-1,w.y1-2,w.x2-1,w.y2-2,p.dark?'#8290ac':'#c1cfe2',3);}
    data.pins.forEach((pin,i)=>{
      const slide=state.slide[i];if(slide>=1)return;
      const dx=pin.x2-pin.x1,dy=pin.y2-pin.y1,len=Math.hypot(dx,dy),shift=slide*(len+34);
      ctx.save();ctx.translate(-dx/len*shift,-dy/len*shift);ctx.globalAlpha=1-slide*.7;
      line(pin.x1,pin.y1+3,pin.x2,pin.y2+3,'#8e551e',10);line(pin.x1,pin.y1,pin.x2,pin.y2,'#f5b943',8);line(pin.x1,pin.y1-2,pin.x2,pin.y2-2,'#fff1ae',2);ctx.restore();
    });
    for(const b of state.balls){if(b.status!=='active')continue;
      if(b.kind==='gem'){
        ctx.fillStyle=['#12acaa','#5287ef','#aa65dc'][b.id%3];ctx.beginPath();ctx.moveTo(b.x,b.y-5);ctx.lineTo(b.x+4.8,b.y);ctx.lineTo(b.x,b.y+5);ctx.lineTo(b.x-4.8,b.y);ctx.closePath();ctx.fill();line(b.x-1,b.y-2,b.x+1,b.y-3,'#ddfff9',1.3);
      }else{ctx.fillStyle='#7a8492';ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();line(b.x-2,b.y,b.x+1,b.y-1,'#bbc3cf',1);}
    }
    // A glass cup, filled visibly as gems are collected.
    ctx.save();ctx.globalAlpha=.4;rounded(107,466,146,50,8,p.dark?'#5b98ad':'#b5e5ef');ctx.restore();
    for(let i=0;i<state.collected;i++){const x=117+i%14*9,y=508-Math.floor(i/14)*9;rounded(x,y,7,7,2,['#25bcba','#6989ef','#ac70e1'][i%3]);}
    line(101,458,109,518,'#6dacc2',4);line(259,458,251,518,'#6dacc2',4);line(109,518,251,518,'#6dacc2',4);line(106,460,111,505,'#e7fbff',2);
    // Tiny patient garden friend, drawn entirely with shapes.
    rounded(163,427,34,27,12,'#71cbae');ctx.fillStyle='#193b3f';[174,186].forEach(x=>{ctx.beginPath();ctx.arc(x,438,2,0,Math.PI*2);ctx.fill();});line(177,446,183,446,'#193b3f',1.5);
    text(state.collected+' / '+data.target+' ◆',180,534,12,p.ink);
    buttons.forEach((b,i)=>{
      const pin=data.pins[i],dx=pin.x2-pin.x1,dy=pin.y2-pin.y1,len=Math.hypot(dx,dy),shift=state.slide[i]*(len+34),scale=canvas.clientWidth/360;
      b.style.opacity=1-state.slide[i];b.style.transform='translate(-50%,-50%) translate('+(-dx/len*shift*scale)+'px,'+(-dy/len*shift*scale)+'px)';b.hidden=state.slide[i]>=1;
    });
  }
  function resize(){if(!canvas)return;colors=palette();const dpr=Math.min(window.devicePixelRatio||1,3),w=P.$('board').clientWidth;canvas.width=Math.round(w*dpr);canvas.height=Math.round(w*1.5*dpr);ctx.setTransform(canvas.width/360,0,0,canvas.height/540,0,0);dirty=true;wake();}
  function wake(){if(!frame)frame=requestAnimationFrame(tick);}
  function tick(now){
    frame=0;if(run!==P.epoch)return;
    const delta=last?Math.min(.06,(now-last)/1000):L.DT;last=now;acc+=delta;
    let moving=false;
    while(acc>=L.DT){L.step(data,state);acc-=L.DT;}
    moving=state.balls.some(b=>b.status==='active'&&(Math.abs(b.vx)>2||Math.abs(b.vy)>3))||state.open.some((v,i)=>v&&state.slide[i]<1);
    calm=moving?0:calm+delta;
    if(dirty||moving||calm<.2){draw();dirty=false;}
    if(state.collected!==lastCount){lastCount=state.collected;meter.textContent=data.name+' · 보석 '+state.collected+' / '+data.target;}
    if(!P.over&&!drainAnnounced&&data.tiers&&state.drained===data.particles.filter(b=>b.kind==='mud').length){drainAnnounced=true;P.say('진흙을 모두 비웠어요! 바닥 핀을 열고 보석을 내려 주세요.');P.feedback('move');}
    if(state.failed)P.fail(state.reason);else if(L.solved(data,state))P.win();
    if(!state.failed&&(moving||calm<1))wake();else last=0;
  }
  function act(i){
    if(P.over||!L.pull(data,state,i))return;
    P.move();buttons[i].disabled=true;buttons[i].style.pointerEvents='none';dirty=true;calm=0;last=0;wake();
    P.say((i+1)+'번 핀을 뽑았어요. 조각이 멈출 때까지 길을 살펴보세요.');
    const next=buttons.find(b=>!b.disabled);if(next)next.focus();else P.$('restart').focus();
  }
  window.addEventListener('resize',resize);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{colors=palette();dirty=true;wake();});
  P.mount(()=>{
    cancelAnimationFrame(frame);frame=0;last=0;acc=0;calm=0;lastCount=-1;drainAnnounced=false;run=P.epoch;data=L.level(P.level);state=L.initial(data);
    const board=P.$('board');board.className='puzzle-board pin-board';
    canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');board.appendChild(canvas);ctx=canvas.getContext('2d');
    const canvasRun=P.epoch;let touched=null;
    canvas.addEventListener('pointerdown',e=>{
      if(P.over||e.button!==0)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*360,y=(e.clientY-rect.top)/rect.height*540;
      const index=data.pins.findIndex((pin,i)=>{
        if(state.open[i])return false;const dx=pin.x2-pin.x1,dy=pin.y2-pin.y1,t=Math.max(0,Math.min(1,((x-pin.x1)*dx+(y-pin.y1)*dy)/(dx*dx+dy*dy)));
        return Math.hypot(x-pin.x1-dx*t,y-pin.y1-dy*t)<14;
      });
      if(index>=0){touched={index,id:e.pointerId};canvas.setPointerCapture(e.pointerId);}
    });
    canvas.addEventListener('pointerup',e=>{if(touched&&touched.id===e.pointerId&&canvasRun===P.epoch)act(touched.index);touched=null;});
    canvas.addEventListener('pointercancel',()=>{touched=null;});

    meter=document.createElement('p');meter.className='scene-caption';board.before(meter);
    // Remove a previous level's caption on reset, while preserving the current HUD.
    const captions=board.parentNode.querySelectorAll('.scene-caption');captions.forEach(c=>{if(c!==meter)c.remove();});
    buttons=data.pins.map((pin,i)=>{
      const b=P.button(String(i+1),()=>act(i),board,(i+1)+'번 '+pin.label+' 뽑기');b.className='pin-handle';b.dataset.pin=i;
      const vertical=pin.x1===pin.x2,x=vertical?pin.x1+(pin.x1>180?19:-19):(i===1&&data.pins[i].kind==='gem'?283:pin.x1+(pin.x1>180?18:-18)),y=vertical?(pin.y1+pin.y2)/2:pin.y1;
      b.style.left=x/360*100+'%';b.style.top=y/540*100+'%';
      let point=null;b.addEventListener('pointerdown',e=>{point={x:e.clientX,y:e.clientY};b.setPointerCapture(e.pointerId);});
      b.addEventListener('pointerup',e=>{if(point&&Math.hypot(e.clientX-point.x,e.clientY-point.y)>18)act(i);point=null;});b.addEventListener('pointercancel',()=>{point=null;});return b;
    });resize();
  });
})();
