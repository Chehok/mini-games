(function (root) {
  'use strict';
  // Logical pixels and fixed ticks are shared with the canvas and headless audit.
  const W=360,R=9.5,DT=1/120;
  const designs=[
    {name:'반짝이는 첫 선물',tiers:0,gems:18},
    {name:'진흙은 오른쪽으로',side:1,tiers:1,gems:18},
    {name:'이번에는 왼쪽으로',side:-1,tiers:1,gems:18},
    {name:'보석 창고의 두 문',side:1,tiers:1,gems:20,extra:true},
    {name:'왼쪽 길부터',side:-1,tiers:1,gems:20,extra:true},
    {name:'위아래 배수로',side:1,tiers:2,gems:18},
    {name:'엇갈린 길',side:-1,tiers:2,gems:18},
    {name:'쌍둥이 보석 방',side:1,tiers:1,gems:24,branch:true},
    {name:'두 방의 왼쪽 길',side:-1,tiers:1,gems:24,branch:true},
    {name:'차근차근 두 층',side:1,tiers:2,gems:20,extra:true},
    {name:'반대편도 살펴요',side:-1,tiers:2,gems:20,extra:true},
    {name:'두 갈래 보석 비',side:1,tiers:2,gems:24,branch:true},
    {name:'왼쪽 오른쪽 차례로',side:-1,tiers:2,gems:24,branch:true},
    {name:'가파른 배수로',side:1,tiers:2,gems:22,slope:42},
    {name:'보석 정원',side:-1,tiers:2,gems:24,extra:true},
    {name:'두 방과 두 층',side:1,tiers:2,gems:24,branch:true,slope:42},
    {name:'반짝이는 갈림길',side:-1,tiers:2,gems:24,branch:true,slope:42},
    {name:'마지막 보물 상자',side:1,tiers:2,gems:24,branch:true,slope:46}
  ];
  function level(n){
    const d=designs[Math.max(0,Math.min(designs.length-1,n-1))],height=d.tiers?400:330;
    const walls=[],pins=[],particles=[],order=[],left=68,right=292,gemY=d.tiers?112:134;
    const seg=(x1,y1,x2,y2)=>({x1,y1,x2,y2});
    const addPin=(a,label,kind)=>{pins.push({...a,label,kind});return pins.length-1;};
    const gems=d.branch?[
      addPin(seg(left,gemY,180,gemY),'왼쪽 보석 방 핀','gem'),
      addPin(seg(right,gemY,180,gemY),'오른쪽 보석 방 핀','gem')
    ]:[addPin(seg(left,gemY,right,gemY),'보석 방 핀','gem')];
    if(d.branch)walls.push(seg(180,16,180,gemY));
    let extra;
    if(d.extra)extra=addPin(seg(right,gemY+26,left,gemY+26),'아래쪽 보석 핀','gem');
    const floors=[],drains=[],gaps={left:[],right:[]};
    for(let t=0;t<d.tiers;t++){
      const side=t%2?-d.side:d.side,y=d.tiers===1?242:206+t*78,slope=d.slope||36;
      const high=y-slope,lo=side===1?left:right,hi=side===1?right:left;
      floors.push(addPin(seg(lo,high,hi,y),(t+1)+'층 바닥 핀','floor'));
      drains.push(addPin(seg(hi,y-56,hi,y+19),(t+1)+'층 옆 배수 핀','drain'));
      gaps[side===1?'right':'left'].push([y-56,y+19]);
      for(let j=0;j<6;j++){
        const x=108+j*25;
        particles.push({x,y:high+(side===1?x-left:right-x)/(right-left)*slope-22,kind:'mud'});
      }
    }
    const bottom=height-94;
    for(const [side,x] of [['left',left],['right',right]]){
      let y=16;for(const [a,b] of gaps[side]){walls.push(seg(x,y,x,a));y=b;}walls.push(seg(x,y,x,bottom));
    }
    walls.push(seg(left,16,right,16));
    // The lower tube funnels into a broad cup; side shafts lead to the compost bins.
    walls.push(seg(left,bottom,93,height-63),seg(right,bottom,267,height-63));
    walls.push(seg(93,height-63,101,height-16),seg(267,height-63,259,height-16),seg(101,height-16,259,height-16));
    walls.push(seg(12,120,12,height-18),seg(348,120,348,height-18));
    for(let j=0;j<d.gems;j++){
      const col=d.branch?j%8:j%9;
      const x=d.branch?(col<4?91+col*22:203+(col-4)*22):92+col*22;
      particles.push({x,y:gemY-23-Math.floor(j/(d.branch?8:9))*22,kind:'gem'});
    }
    order.push(...drains,...floors.slice().reverse(),...(d.extra?[extra]:[]),...gems);
    return {width:W,height,name:d.name,walls,pins,particles,order,total:d.gems,target:d.gems,
      cup:{x1:91,x2:269,y:height-86},tiers:d.tiers,branch:!!d.branch};
  }
  function initial(data){return {balls:data.particles.map((p,i)=>({...p,vx:0,vy:0,id:i,status:'active'})),open:data.pins.map(()=>false),slide:data.pins.map(()=>0),time:0,collected:0,drained:0,lost:0,failed:false,reason:''};}
  function pull(data,state,i){if(state.failed||solved(data,state)||state.open[i]||!data.pins[i])return false;state.open[i]=true;return true;}
  const ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;
  function collision(b,s){
    const radius=R+5;
    if(b.x<Math.min(s.x1,s.x2)-radius||b.x>Math.max(s.x1,s.x2)+radius||b.y<Math.min(s.y1,s.y2)-radius||b.y>Math.max(s.y1,s.y2)+radius)return;
    const dx=s.x2-s.x1,dy=s.y2-s.y1,l=dx*dx+dy*dy;
    const t=Math.max(0,Math.min(1,((b.x-s.x1)*dx+(b.y-s.y1)*dy)/l));
    let nx=b.x-(s.x1+dx*t),ny=b.y-(s.y1+dy*t),dist=Math.hypot(nx,ny);
    if(dist>=radius)return;
    if(dist<.0001){nx=0;ny=-1;dist=1;}
    nx/=dist;ny/=dist;b.x+=nx*(radius-dist);b.y+=ny*(radius-dist);
    const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=1.18*v*nx;b.vy-=1.18*v*ny;}
    b.vx*=.996;b.vy*=.996;
  }
  function fail(state,reason){state.failed=true;state.reason=reason;}
  function step(data,state,dt){
    if(state.failed)return;
    dt=dt||DT;state.time+=dt;
    for(let i=0;i<state.open.length;i++)if(state.open[i])state.slide[i]=Math.min(1,state.slide[i]+dt/.3);
    const solid=data.walls.slice();
    data.pins.forEach((p,i)=>{
      const slide=ease(state.slide[i]);if(slide>=1)return;
      const dx=p.x2-p.x1,dy=p.y2-p.y1,len=Math.hypot(dx,dy),shift=slide*(len+42);
      solid.push({x1:p.x1-dx/len*shift,y1:p.y1-dy/len*shift,x2:p.x2-dx/len*shift,y2:p.y2-dy/len*shift});
    });
    const active=b=>b.status==='active'||b.status==='cup';
    for(const b of state.balls){
      if(!active(b))continue;
      b.vy=Math.min(360,b.vy+540*dt);b.vx*=.998;b.x+=b.vx*dt;b.y+=b.vy*dt;
      for(const s of solid)collision(b,s);
    }
    // Pair separation keeps a real granular pile, including the gems inside the cup.
    for(let pass=0;pass<3;pass++)for(let i=0;i<state.balls.length;i++){
      const a=state.balls[i];if(!active(a))continue;
      for(let j=i+1;j<state.balls.length;j++){
        const b=state.balls[j];if(!active(b))continue;
        let dx=b.x-a.x,dy=b.y-a.y;if(dx*dx+dy*dy>=R*R*4)continue;let dist=Math.hypot(dx,dy);
        if(a.kind!==b.kind){fail(state,'보석과 진흙이 섞였어요. 진흙을 먼저 옆으로 비워 주세요.');return;}
        if(dist<.001){dx=.01;dy=-.01;dist=Math.hypot(dx,dy);}
        const nx=dx/dist,ny=dy/dist,shift=(R*2-dist)/2;
        a.x-=nx*shift;a.y-=ny*shift;b.x+=nx*shift;b.y+=ny*shift;
        const speed=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(speed<0){a.vx+=speed*nx*.54;a.vy+=speed*ny*.54;b.vx-=speed*nx*.54;b.vy-=speed*ny*.54;}
      }
    }
    for(const b of state.balls){
      if(!active(b))continue;
      for(const s of solid)collision(b,s);
      if(b.status==='active'&&b.y>data.cup.y&&b.x>data.cup.x1&&b.x<data.cup.x2){
        if(b.kind==='mud'){fail(state,'진흙이 컵에 들어갔어요. 옆 배수 핀부터 열어 주세요.');return;}
        b.status='cup';b.caughtAt=state.time;state.collected++;
      }else if(b.y>data.height-47&&(b.x<68||b.x>292)||b.y>data.height+20||b.x<-20||b.x>W+20){
        b.status='out';if(b.kind==='mud')state.drained++;else state.lost++;
      }
    }
    if(data.total-state.lost<data.target)fail(state,'보석을 놓쳤어요. 진흙을 비운 뒤 보석 핀을 열어 주세요.');
  }
  function solved(data,state){return !state.failed&&state.collected>=data.target;}
  function simulate(data,order,seconds=6){
    const state=initial(data);for(let k=0;k<180;k++)step(data,state);
    for(const i of order){pull(data,state,i);for(let k=0;k<seconds/DT;k++)step(data,state);if(state.failed)break;}
    return state;
  }
  root.PinLogic={designs,level,initial,pull,step,solved,simulate,ease,DT,R};
})(typeof window==='undefined'?globalThis:window);
