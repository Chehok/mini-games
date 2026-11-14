(function (root) {
  'use strict';
  const W=360,R=9.5,DT=1/120;
  // These are drawing primitives, not a layout generator. Every chamber, pin and
  // particle below is placed by hand in the same coordinates used by the canvas.
  const w=(x1,y1,x2,y2)=>({x1,y1,x2,y2});
  const p=(x1,y1,x2,y2,label,extra={})=>({...w(x1,y1,x2,y2),label,kind:'gate',...extra});
  const g=(x,y)=>({x,y,kind:'gem'}),a=(x,y)=>({x,y,kind:'gray'}),m=(x,y)=>({x,y,kind:'mud'}),s=(x,y)=>({x,y,kind:'stone'}),k=(x,y,key)=>({x,y,kind:'key',key});
  const c=(x1,x2,y,quota)=>({x1,x2,y,quota});
  const mechanicHints={
    horizontal:'황금 핀을 누르거나 밀어서 뽑아요. 보석을 컵에 모아 주세요.',
    funnel:'좁아지는 방에서는 보석이 가운데로 모여요.',
    cascade:'방을 차례로 열어요. 보석이 멈춘 뒤 다음 핀을 골라요.',
    vertical:'세로 핀도 열려요. 경사를 따라 옆문으로 굴려 봐요.',
    diagonal:'비스듬한 핀은 바닥이 되기도 해요. 뽑을 순서를 살펴요.',
    mud:'진흙을 옆으로 먼저 비워요. 보석과 닿으면 실패해요.',
    zigzag:'엇갈린 선반의 끝문을 열면 다음 길로 내려가요.',
    paint:'회색 보석은 색 보석에 닿아야 컵에 담을 수 있어요.',
    L:'ㄴ자 방의 옆문과 아래 출구를 나눠서 열어요.',
    stone:'무거운 돌은 컵을 막아요. 옆으로 먼저 굴려 주세요.',
    pocket:'옆 주머니로 필요 없는 공을 빼고 보석 길을 만들어요.',
    lock:'🔒 핀은 같은 글자의 열쇠 핀을 뽑으면 열려요.',
    key:'굴러가는 열쇠를 황금 받침에 보내면 잠금이 풀려요.',
    cups:'컵마다 필요한 수가 달라요. 모든 컵의 숫자를 채워요.',
    trick:'모든 핀을 뽑지 않아도 돼요. 받침 다리는 남겨 주세요.',
    station:'회색 보석은 정거장에서 색 보석과 만나요. 정거장 바닥은 마지막에 뽑아요.',
    switch:'아래 선로는 밖으로 빠지는 길이에요. 무엇을 먼저 보낼지 정해요.'
  };
  const designs=[
    {theme:'lagoon',name:'첫 반짝임',mechanics:['horizontal','funnel'],hint:'황금 핀을 누르면 보석이 컵으로 내려와요.',
      walls:[w(80,28,80,185),w(280,28,280,185),w(80,185,120,270),w(280,185,240,270)],
      pins:[p(80,130,280,130,'첫 보석 핀')],particles:[g(145,80),g(170,80),g(195,80),g(220,80),g(160,55),g(205,55),g(132,35),g(160,30),g(188,30),g(216,30)],cups:[c(90,270,310,10)],order:[0]},
    {theme:'sunrise',name:'두 번의 인사',mechanics:['cascade','horizontal'],hint:'중간 방에 보석을 모은 뒤 다음 핀을 열어 봐요.',
      walls:[w(90,25,90,260),w(270,25,270,260)],pins:[p(90,105,270,105,'위 방 핀'),p(270,225,90,225,'중간 방 핀')],
      particles:[g(135,65),g(165,65),g(195,65),g(225,65)],cups:[c(95,265,310,4)],order:[0,1]},
    {theme:'glacier',name:'옆문을 톡',mechanics:['vertical'],hint:'세로 핀도 뽑을 수 있어요. 경사를 따라 옆문으로 굴려 봐요.',
      walls:[w(60,145,250,215),w(45,35,45,140)],pins:[p(250,140,250,248,'세로 옆문')],
      particles:[g(95,85),g(125,85),g(155,85)],cups:[c(100,330,310,3)],order:[0]},
    {theme:'clay',name:'진흙 우체통',mechanics:['mud','horizontal','vertical','diagonal'],hint:'경사 바닥의 진흙을 옆 통으로 먼저 비워요. 보석과 닿으면 섞여요.',
      walls:[w(70,20,70,105),w(290,20,290,200)],pins:[p(290,105,70,105,'보석 방'),p(62,250,290,195,'경사 바닥'),p(62,160,62,278,'진흙 옆문',{kind:'drain'})],
      particles:[g(145,55),g(175,55),g(205,55),m(145,198),m(175,190),m(205,182)],cups:[c(90,300,320,3)],order:[2,1,0],wrong:[[0,2,1],[1,0,2]]},
    {theme:'twilight',name:'지그재그 산책',mechanics:['zigzag','cascade','vertical'],hint:'엇갈린 선반에서는 보석이 도착한 뒤 다음 길을 열어요.',
      walls:[w(60,32,60,230),w(300,30,300,270),w(60,125,210,166),w(300,235,145,270)],
      pins:[p(210,125,210,193,'첫 모퉁이'),p(145,215,145,295,'두 번째 모퉁이')],particles:[g(100,72),g(128,72),g(156,72)],cups:[c(65,275,330,3)],order:[0,1]},
    {theme:'orchid',name:'색을 나눠요',mechanics:['paint','cascade','horizontal'],hint:'회색 보석은 색 보석에 닿으면 물들어요. 모두 물든 뒤 컵에 담아요.',
      walls:[w(75,25,95,155),w(285,25,265,155),w(95,155,125,280),w(265,155,235,280)],pins:[p(95,108,265,108,'회색 방'),p(265,242,95,242,'색칠 방')],
      particles:[a(155,65),a(180,65),a(205,65),g(178,198)],cups:[c(90,270,320,4)],order:[0,1],wrong:[[1,0]]},
    {theme:'sunrise',name:'ㄴ자 물감 공방',mechanics:['paint','L','horizontal','vertical'],hint:'ㄴ자 방의 옆문을 열어 아래 색 보석과 만나게 해 주세요.',
      walls:[w(60,130,205,180),w(60,30,60,130),w(295,100,295,278),w(165,230,165,275)],pins:[p(205,100,205,212,'ㄴ자 옆문'),p(165,275,295,275,'공방 출구')],
      particles:[a(100,80),a(130,80),g(235,225)],cups:[c(130,325,330,3)],order:[0,1],wrong:[[1,0]]},
    {theme:'slate',name:'둥근 돌의 주차장',mechanics:['stone','pocket','horizontal','vertical','diagonal'],hint:'무거운 돌은 통로를 막아요. 옆 주차장으로 먼저 굴려 주세요.',
      walls:[w(100,25,100,105),w(290,25,290,180)],pins:[p(100,105,290,105,'보석 방'),p(130,250,290,180,'돌 경사로'),p(130,140,130,280,'돌 옆문',{kind:'drain'})],
      particles:[g(225,58),g(252,58),s(190,145)],cups:[c(100,305,320,2)],order:[2,1,0],wrong:[[1,0,2]]},
    {theme:'orchid',name:'물감 정거장',mechanics:['station','paint','horizontal','vertical','diagonal'],hint:'회색 보석과 색 보석을 정거장에서 만나게 한 뒤 출발해요.',
      walls:[w(60,25,60,205),w(170,25,170,110),w(222,25,222,90),w(320,25,320,150),w(320,150,226,168)],
      pins:[p(60,110,170,110,'회색 방'),p(222,92,222,172,'색 주머니 문'),p(60,200,232,172,'정거장 바닥')],
      particles:[a(95,70),a(130,70),g(275,125)],cups:[c(40,215,320,3)],order:[0,1,2],wrong:[[2,0,1],[0,2,1]]},
    {theme:'lemon',name:'열쇠 핀',mechanics:['lock','horizontal','vertical'],hint:'🔒 핀은 열쇠 핀을 뽑아야 열려요. 같은 열쇠 표시를 찾아요.',
      walls:[w(60,25,100,145),w(310,25,270,145),w(100,145,120,260),w(270,145,250,260)],pins:[p(90,145,280,145,'잠긴 보석 문',{lock:'A'}),p(42,80,42,145,'열쇠 A',{grants:'A'})],
      particles:[g(140,90),g(170,90),g(200,90),g(230,90)],cups:[c(85,285,315,4)],order:[1,0],wrong:[[0,1]]},
    {theme:'glacier',name:'굴러오는 열쇠',mechanics:['cascade','lock','horizontal','key'],hint:'작은 열쇠도 굴러가요. 아래 받침에 닿으면 잠금이 풀려요.',
      walls:[w(65,25,65,250),w(285,25,285,250),w(65,180,145,180),w(145,25,145,180)],pins:[p(65,100,145,100,'열쇠 방'),p(145,170,285,170,'잠긴 보석 방',{lock:'B'})],
      particles:[k(105,60,'B'),g(190,105),g(218,105),g(246,105)],keyZones:[{x1:70,x2:140,y1:145,y2:185}],cups:[c(140,300,315,3)],order:[0,1],wrong:[[1,0]]},
    {theme:'sunrise',name:'나란한 두 컵',mechanics:['cups','horizontal'],hint:'컵마다 필요한 수가 있어요. 두 컵의 숫자를 모두 채워 주세요.',
      walls:[w(35,25,35,255),w(165,25,165,270),w(195,25,195,270),w(325,25,325,255)],
      pins:[p(35,135,165,135,'왼쪽 방'),p(325,195,195,195,'오른쪽 방')],particles:[g(75,80),g(105,80),g(245,130),g(275,130),g(300,130)],cups:[c(25,170,315,2),c(190,335,315,3)],order:[1,0]},
    {theme:'orchid',name:'쌍둥이 색칠 정원',hint:'양쪽 회색 보석을 각각 물들여 주세요.',mechanics:['cups','paint','cascade','horizontal'],
      walls:[w(40,25,40,275),w(160,25,160,275),w(200,25,200,275),w(320,25,320,275)],
      pins:[p(40,105,160,105,'왼쪽 회색 방'),p(200,140,320,140,'오른쪽 회색 방'),p(40,255,160,255,'왼쪽 색칠 출구'),p(320,270,200,270,'오른쪽 색칠 출구')],
      particles:[a(83,60),a(111,60),g(95,210),a(245,90),a(273,90),g(260,220)],cups:[c(30,170,325,3),c(190,330,325,3)],order:[0,1,2,3],wrong:[[2,3,0,1]]},
    {theme:'twilight',name:'뽑지 않는 다리',mechanics:['trick','cascade','horizontal','vertical','diagonal'],hint:'모든 핀을 뽑을 필요는 없어요. 보석을 받쳐 주는 다리는 남겨 주세요.',
      walls:[w(50,25,50,150)],pins:[p(50,110,175,110,'보석 문'),p(50,180,270,250,'받침 다리'),p(270,205,270,283,'다리 끝문')],
      particles:[g(90,65),g(120,65),g(150,65)],cups:[c(205,340,325,3)],order:[0,2],wrong:[[1,0,2]]},
    {theme:'clay',name:'잠긴 진흙 온실',hint:'오른쪽 배수문이 보석 방의 열쇠예요.',mechanics:['mud','lock','trick','horizontal','vertical','diagonal'],
      walls:[w(75,25,75,110),w(75,25,185,8),w(185,8,295,25),w(295,25,295,210)],pins:[p(75,110,295,110,'잠긴 보석 방',{lock:'C'}),p(295,245,62,185,'왼쪽 높은 바닥'),p(295,155,295,275,'진흙 오른문',{kind:'drain',grants:'C'})],
      particles:[g(130,65),g(160,65),g(190,65),m(155,186),m(185,193),m(215,200)],cups:[c(55,270,325,3)],order:[2,1,0],wrong:[[0,2,1],[1,2,0]]},
    {theme:'clay',name:'진흙 기차의 선로',mechanics:['switch','mud','horizontal','diagonal'],hint:'아래 선로는 밖으로 빠지는 길이에요. 진흙과 보석 중 무엇을 먼저 보낼까요?',
      walls:[w(110,25,110,195),w(250,25,250,195)],
      pins:[p(110,95,250,95,'보석 바닥'),p(110,190,250,190,'진흙 바닥'),p(268,262,95,222,'바깥 선로')],
      particles:[g(150,60),g(180,60),g(210,60),m(150,160),m(180,160),m(210,160)],cups:[c(85,245,320,3)],order:[1,2,0],wrong:[[0,1,2],[2,1,0]]},
    {theme:'lemon',name:'계단 아래 청소',hint:'진흙을 비우고 계단 끝문까지 열어 주세요.',mechanics:['mud','zigzag','cascade','horizontal','vertical','diagonal'],
      walls:[w(80,25,80,110),w(290,25,290,260),w(80,135,180,165)],pins:[p(290,105,80,105,'보석 위문'),p(62,270,290,210,'아래 경사'),p(62,180,62,295,'진흙 옆문',{kind:'drain'}),p(180,130,180,192,'계단 끝문')],
      particles:[g(120,60),g(150,60),g(180,60),m(155,220),m(185,212),m(215,204)],cups:[c(110,310,330,3)],order:[2,1,0,3],wrong:[[0,3,2,1],[1,0,2,3]]},
    {theme:'glacier',name:'세 컵의 열쇠',hint:'왼쪽 문부터 열쇠가 차례로 이어져요.',mechanics:['cups','lock','horizontal'],
      walls:[w(25,25,25,275),w(120,25,120,275),w(132,25,132,275),w(228,25,228,275),w(240,25,240,275),w(335,25,335,275)],
      pins:[p(25,125,120,125,'첫 컵 열쇠 문',{grants:'D'}),p(132,180,228,180,'가운데 잠금',{lock:'D',grants:'E'}),p(240,235,335,235,'마지막 잠금',{lock:'E'})],
      particles:[g(62,70),g(87,70),g(168,125),g(194,125),g(275,180),g(301,180)],cups:[c(18,123,325,2),c(127,232,325,2),c(237,342,325,2)],order:[0,1,2],wrong:[[2,1,0],[1,0,2]]},
    {theme:'orchid',name:'먼저 씻고 물들여요',hint:'진흙을 먼저 비운 뒤 회색 보석을 물들여요.',mechanics:['mud','paint','trick','cascade','horizontal','vertical','diagonal'],
      walls:[w(275,25,275,100),w(275,230,275,330),w(70,25,70,325)],pins:[p(70,100,275,100,'회색 방'),p(298,205,70,150,'진흙 선반'),p(298,115,298,230,'진흙 옆문',{kind:'drain'}),p(275,280,70,280,'물감 출구')],
      particles:[a(215,55),a(185,55),a(155,55),m(220,168),m(190,160),g(180,242)],cups:[c(55,280,335,4)],order:[2,1,0,3],wrong:[[0,2,1,3],[3,2,1,0]]},
    {theme:'lemon',name:'보석 공방 졸업식',hint:'돌 열쇠로 두 방을 열고 각 컵에 세 개씩 모아요.',mechanics:['cups','paint','stone','lock','trick','horizontal','vertical','diagonal'],
      walls:[w(35,25,35,100),w(35,220,35,335),w(165,25,165,335),w(195,25,195,285),w(325,25,325,285)],
      pins:[p(165,100,35,100,'왼쪽 회색 방',{lock:'F'}),p(10,190,165,145,'돌 경사로'),p(10,105,10,218,'돌 열쇠 옆문',{kind:'drain',grants:'F'}),p(35,285,165,285,'왼쪽 물감 출구'),p(325,140,195,140,'오른쪽 회색 방',{lock:'F'}),p(325,260,195,260,'오른쪽 물감 출구')],
      particles:[a(80,55),a(110,55),s(85,120),g(100,247),a(245,85),a(275,85),g(260,220)],cups:[c(25,175,340,3),c(185,335,340,3)],order:[2,1,0,4,3,5],wrong:[[0,2,1,4,3,5],[3,5,2,1,0,4]]}
  ];
  // Mirrored boards keep the same physics but put the side doors on the other wall.
  function mirror(d){
    const fx=x=>W-x,seg=o=>({...o,x1:fx(o.x1),x2:fx(o.x2)});
    return {...d,walls:d.walls.map(seg),pins:d.pins.map(seg),particles:d.particles.map(b=>({...b,x:fx(b.x)})),
      cups:d.cups.map(c=>({...c,x1:fx(c.x2),x2:fx(c.x1)})).reverse(),keyZones:(d.keyZones||[]).map(z=>({...z,x1:fx(z.x2),x2:fx(z.x1)}))};
  }
  for(const i of [14,18])designs[i]=mirror(designs[i]);
  function level(n){
    const d=JSON.parse(JSON.stringify(designs[Math.max(0,Math.min(designs.length-1,Math.floor(n)-1))]));
    d.width=W;d.height=420;d.total=d.particles.filter(b=>b.kind==='gem'||b.kind==='gray').length;d.target=d.total;
    d.cup=d.cups[0];d.wrong=d.wrong||[];
    for(const cup of d.cups)d.walls.push(w(cup.x1,cup.y,cup.x1+8,cup.y+62),w(cup.x2,cup.y,cup.x2-8,cup.y+62),w(cup.x1+8,cup.y+62,cup.x2-8,cup.y+62));
    return d;
  }
  const radius=b=>b.kind==='stone'?20:b.kind==='key'?8:R;
  function initial(data){return {balls:data.particles.map((b,i)=>({...b,vx:0,vy:0,id:i,status:'active'})),open:data.pins.map(()=>false),slide:data.pins.map(()=>0),keys:[],cups:data.cups.map(()=>0),time:0,collected:0,drained:0,lost:0,failed:false,reason:''};}
  function locked(data,state,i){return !!data.pins[i]?.lock&&!state.keys.includes(data.pins[i].lock);}
  function pull(data,state,i){if(state.failed||solved(data,state)||state.open[i]||!data.pins[i]||locked(data,state,i))return false;state.open[i]=true;if(data.pins[i].grants)state.keys.push(data.pins[i].grants);return true;}
  const ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;
  function collision(b,s){
    const r=radius(b)+5,dx=s.x2-s.x1,dy=s.y2-s.y1,l=dx*dx+dy*dy;
    const t=Math.max(0,Math.min(1,((b.x-s.x1)*dx+(b.y-s.y1)*dy)/l));
    let nx=b.x-s.x1-dx*t,ny=b.y-s.y1-dy*t,dist=Math.hypot(nx,ny);if(dist>=r)return;
    if(dist<.0001){nx=0;ny=-1;dist=1;}nx/=dist;ny/=dist;b.x+=nx*(r-dist);b.y+=ny*(r-dist);
    const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=1.12*v*nx;b.vy-=1.12*v*ny;}b.vx*=.996;b.vy*=.996;
  }
  function fail(state,reason){state.failed=true;state.reason=reason;}
  function step(data,state,dt=DT){
    if(state.failed)return;state.time+=dt;
    state.open.forEach((v,i)=>{if(v)state.slide[i]=Math.min(1,state.slide[i]+dt/.3);});
    const solid=data.walls.concat(data.pins.filter((p,i)=>state.slide[i]<1));
    const active=b=>b.status==='active'||b.status==='cup';
    for(const b of state.balls){if(!active(b))continue;b.vy=Math.min(360,b.vy+540*dt);b.vx*=.998;b.x+=b.vx*dt;b.y+=b.vy*dt;for(const seg of solid)collision(b,seg);}
    for(let pass=0;pass<3;pass++)for(let i=0;i<state.balls.length;i++){
      const a=state.balls[i];if(!active(a))continue;
      for(let j=i+1;j<state.balls.length;j++){
        const b=state.balls[j];if(!active(b))continue;
        let dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),r=radius(a)+radius(b);if(dist>r+.5)continue;
        const jewel=x=>x.kind==='gem'||x.kind==='gray';
        if((a.kind==='mud'&&jewel(b))||(b.kind==='mud'&&jewel(a))){fail(state,'보석과 진흙이 섞였어요. 진흙을 먼저 비워 주세요.');return;}
        if(jewel(a)&&jewel(b)&&(a.kind==='gem'||b.kind==='gem')){if(a.kind==='gray')a.paintedAt=state.time;if(b.kind==='gray')b.paintedAt=state.time;a.kind='gem';b.kind='gem';}
        if(dist>=r)continue;if(dist<.001){dx=.01;dy=-.01;dist=Math.hypot(dx,dy);}
        const nx=dx/dist,ny=dy/dist,ma=a.kind==='stone'?5:1,mb=b.kind==='stone'?5:1,shift=r-dist;
        a.x-=nx*shift*mb/(ma+mb);a.y-=ny*shift*mb/(ma+mb);b.x+=nx*shift*ma/(ma+mb);b.y+=ny*shift*ma/(ma+mb);
        const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){a.vx+=v*nx*mb/(ma+mb);a.vy+=v*ny*mb/(ma+mb);b.vx-=v*nx*ma/(ma+mb);b.vy-=v*ny*ma/(ma+mb);}
      }
    }
    for(const b of state.balls){
      if(!active(b))continue;for(const seg of solid)collision(b,seg);
      if(b.kind==='key'&&(data.keyZones||[]).some(z=>b.x>z.x1&&b.x<z.x2&&b.y>z.y1&&b.y<z.y2)){state.keys.push(b.key);b.status='key';continue;}
      const ci=data.cups.findIndex(c=>b.y>c.y&&b.x>c.x1&&b.x<c.x2);
      if(b.status==='active'&&ci>=0){
        if(b.kind!=='gem'){fail(state,b.kind==='gray'?'회색 보석이 아직 물들지 않았어요. 색 보석과 먼저 만나게 해 주세요.':b.kind==='stone'?'돌이 컵을 막았어요. 옆으로 먼저 굴려 주세요.':'진흙이 컵에 들어갔어요. 옆문부터 열어 주세요.');return;}
        b.status='cup';b.caughtAt=state.time;b.cup=ci;state.collected++;state.cups[ci]++;
      }else if(b.y>data.height+20||b.x<-25||b.x>W+25){b.status='out';if(b.kind==='mud')state.drained++;else if(b.kind==='gem'||b.kind==='gray')state.lost++;}
    }
    if(state.lost)fail(state,'보석을 놓쳤어요. 받침과 컵의 위치를 살펴 주세요.');
  }
  function solved(data,state){return !state.failed&&data.cups.every((c,i)=>state.cups[i]>=c.quota);}
  function simulate(data,order,seconds=6){const state=initial(data);for(let t=0;t<180;t++)step(data,state);for(const i of order){pull(data,state,i);for(let t=0;t<seconds/DT;t++)step(data,state);if(state.failed)break;}return state;}
  root.PinLogic={designs,mechanicHints,level,initial,pull,locked,step,solved,simulate,ease,DT,R,radius};
})(typeof window==='undefined'?globalThis:window);
