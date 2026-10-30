(function (root) {
  'use strict';
  // World coordinates are shared by canvas and the dependency-free headless audit.
  const W=360,H=540,R=4,DT=1/120;
  const designs=[
    {name:'첫 보석',side:1,tiers:0,gems:20},
    {name:'진흙은 옆으로',side:1,tiers:1,gems:24},
    {name:'왼쪽 배수로',side:-1,tiers:1,gems:24},
    {name:'조금 더 가파르게',side:1,tiers:1,gems:28,slope:58},
    {name:'두 개의 문',side:-1,tiers:1,gems:28,extra:true},
    {name:'위아래 진흙',side:1,tiers:2,gems:28},
    {name:'엇갈린 배수로',side:-1,tiers:2,gems:30},
    {name:'보석 창고',side:1,tiers:2,gems:32,extra:true,slope:60},
    {name:'먼저 비워 주세요',side:1,tiers:2,gems:32,extra:true},
    {name:'반대쪽도 확인',side:-1,tiers:2,gems:34,extra:true},
    {name:'작은 보석 비',side:1,tiers:2,gems:36,extra:true,slope:48},
    {name:'반짝이는 마지막 컵',side:-1,tiers:2,gems:40,extra:true,slope:55}
  ];
  function level(n){
    const d=designs[(n-1)%designs.length],walls=[],pins=[],particles=[],order=[];
    const seg=(x1,y1,x2,y2)=>({x1,y1,x2,y2});
    const addPin=(a,label,kind)=>{pins.push({...a,label,kind});return pins.length-1;};
    const gem=addPin(seg(95,124,265,124),'보석 창고의 핀','gem');
    let extra;
    if(d.extra)extra=addPin(seg(95,168,265,168),'두 번째 보석 핀','gem');
    const floors=[],drains=[],gaps={left:[],right:[]};
    for(let t=0;t<d.tiers;t++){
      const side=t%2?-d.side:d.side, y=d.tiers===1?310:248+t*140, slope=d.slope||44;
      const high=y-slope,lo=side===1?95:265,hi=side===1?265:95;
      floors.push(addPin(seg(lo,high,hi,y),(t+1)+'층 바닥 핀','floor'));
      drains.push(addPin(seg(hi,y-64,hi,y+18),(t+1)+'층 진흙 배수 핀','drain'));
      gaps[side===1?'right':'left'].push([y-64,y+18]);
      // Small, deterministic piles; no initial interpenetration or random outcomes.
      for(let j=0;j<12+t*3;j++)particles.push({x:150+(j%6)*10,y:high+(side===1?(150+(j%6)*10-95):(265-150-(j%6)*10))/170*slope-25-Math.floor(j/6)*9,kind:'mud'});
    }
    for(const [side,x] of [['left',95],['right',265]]){
      let y=22;for(const [a,b] of gaps[side]){walls.push(seg(x,y,x,a));y=b;}walls.push(seg(x,y,x,424));
    }
    walls.push(seg(95,22,265,22));
    // Rounded cup has real collision walls and a physical floor.
    walls.push(seg(101,458,109,518),seg(259,458,251,518),seg(109,518,251,518));
    for(let j=0;j<d.gems;j++)particles.push({x:120+(j%12)*10,y:100-Math.floor(j/12)*10,kind:'gem'});
    order.push(...drains,...floors.slice().reverse(),...(d.extra?[extra]:[]),gem);
    return {width:W,height:H,name:d.name,walls,pins,particles,order,total:d.gems,target:Math.ceil(d.gems*.85),cup:{x1:104,x2:256,y:478},tiers:d.tiers};
  }
  function initial(data){return {balls:data.particles.map((p,i)=>({...p,vx:0,vy:0,id:i,status:'active'})),open:data.pins.map(()=>false),slide:data.pins.map(()=>0),time:0,collected:0,drained:0,lost:0,failed:false,reason:''};}
  function pull(data,state,i){if(state.failed||solved(data,state)||state.open[i]||!data.pins[i])return false;state.open[i]=true;return true;}
  function collision(b,s){
    if(b.x<Math.min(s.x1,s.x2)-7||b.x>Math.max(s.x1,s.x2)+7||b.y<Math.min(s.y1,s.y2)-7||b.y>Math.max(s.y1,s.y2)+7)return;
    const dx=s.x2-s.x1,dy=s.y2-s.y1,l=dx*dx+dy*dy;
    const t=Math.max(0,Math.min(1,((b.x-s.x1)*dx+(b.y-s.y1)*dy)/l));
    let nx=b.x-(s.x1+dx*t),ny=b.y-(s.y1+dy*t),dist=Math.hypot(nx,ny),radius=R+3;
    if(dist>=radius)return;
    if(dist<.0001){nx=0;ny=-1;dist=1;}
    nx/=dist;ny/=dist;b.x+=nx*(radius-dist);b.y+=ny*(radius-dist);
    const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=1.12*v*nx;b.vy-=1.12*v*ny;}
    // Low rolling friction lets piles drain naturally along inclined bars.
    b.vx*=.997;b.vy*=.997;
  }
  function fail(state,reason){state.failed=true;state.reason=reason;}
  function step(data,state,dt){
    if(state.failed)return;
    dt=dt||DT;state.time+=dt;
    for(let i=0;i<state.open.length;i++)if(state.open[i])state.slide[i]=Math.min(1,state.slide[i]+dt/0.32);
    const solid=data.walls.slice();
    data.pins.forEach((p,i)=>{
      const slide=state.slide[i];if(slide>=1)return;
      const dx=p.x2-p.x1,dy=p.y2-p.y1,len=Math.hypot(dx,dy),shift=slide*(len+34);
      solid.push({x1:p.x1-dx/len*shift,y1:p.y1-dy/len*shift,x2:p.x2-dx/len*shift,y2:p.y2-dy/len*shift});
    });
    for(const b of state.balls){
      if(b.status!=='active')continue;
      b.vy=Math.min(330,b.vy+460*dt);b.vx*=.999;b.x+=b.vx*dt;b.y+=b.vy*dt;
      for(const s of solid)collision(b,s);
    }
    // Pair separation gives granular piles instead of decorative paths or teleportation.
    for(let pass=0;pass<2;pass++)for(let i=0;i<state.balls.length;i++){
      const a=state.balls[i];if(a.status!=='active')continue;
      for(let j=i+1;j<state.balls.length;j++){
        const b=state.balls[j];if(b.status!=='active')continue;
        let dx=b.x-a.x,dy=b.y-a.y;if(dx*dx+dy*dy>=R*R*4)continue;let dist=Math.hypot(dx,dy);
        if(a.kind!==b.kind){fail(state,'보석과 진흙이 섞였어요.');return;}
        if(dist<.001){dx=.01;dy=-.01;dist=Math.hypot(dx,dy);}
        const nx=dx/dist,ny=dy/dist,shift=(R*2-dist)/2;
        a.x-=nx*shift;a.y-=ny*shift;b.x+=nx*shift;b.y+=ny*shift;
        const speed=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(speed<0){a.vx+=speed*nx*.52;a.vy+=speed*ny*.52;b.vx-=speed*nx*.52;b.vy-=speed*ny*.52;}
      }
    }
    for(const b of state.balls){
      if(b.status!=='active')continue;
      // Reproject after pair resolution so a packed pile cannot push through a wall.
      for(const s of solid)collision(b,s);
      if(b.y>data.cup.y&&b.x>data.cup.x1&&b.x<data.cup.x2){
        if(b.kind==='mud'){fail(state,'진흙이 보석 컵에 들어갔어요.');return;}
        b.status='cup';state.collected++;
      }else if(b.y>510||b.x<-20||b.x>W+20){
        b.status='out';if(b.kind==='mud')state.drained++;else state.lost++;
      }
    }
    if(data.total-state.lost<data.target)fail(state,'보석을 너무 많이 놓쳤어요.');
  }
  function solved(data,state){return !state.failed&&state.collected>=data.target;}
  // Same fixed ticks as the browser. Waiting here represents watching each pour settle.
  function simulate(data,order,seconds=6){
    const state=initial(data);for(let k=0;k<180;k++)step(data,state);
    for(const i of order){pull(data,state,i);for(let k=0;k<seconds/DT;k++)step(data,state);if(state.failed)break;}
    return state;
  }
  root.PinLogic={designs,level,initial,pull,step,solved,simulate,DT,R};
})(typeof window==='undefined'?globalThis:window);
