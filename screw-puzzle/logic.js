(function (root) {
  'use strict';
  const positions=[{x:.17,y:.5},{x:.5,y:.5},{x:.83,y:.5}];
  const s=(x,y,c,lock)=>({x,y,c,...(lock?{lock}:{} )});
  const ice=(p,s)=>({p,s,type:'ice'}),chain=(p,s)=>({p,s,type:'chain'});
  const q=(shape,x,y,w,h,angle,screws,extra={})=>({shape,x,y,w,h,angle,screws,colors:screws.map(s=>s.c),...extra});
  const mechanicHints={
    shapes:'같은 기호 나사 3개를 모으면 공구함이 완성돼요.',
    overlap:'판의 나사를 모두 풀면 판이 아래로 떨어져요.',
    hidden:'위 판에 가려진 나사는 판을 치운 뒤 풀 수 있어요.',
    queue:'공구함은 두 개씩 열려요. 아래의 다음 기호도 살펴요.',
    L:'ㄴ자 판의 빈 부분으로 아래 나사가 보일 수 있어요.',
    ice:'❄ 얼음은 표시된 판·나사 번호의 나사를 풀면 녹아요.',
    chain:'🔗 사슬은 표시된 판·나사 번호를 풀어야 열려요.',
    buffer:'기호가 맞지 않으면 임시 칸에 둬요. 빈칸 수를 살펴요.',
    tightBuffer:'이번에는 임시 칸이 한 곳이에요. 다음 공구함을 먼저 준비해요.',
    colors:'새 기호가 늘었어요. 다음 공구함과 기호를 맞춰요.',
    hinge:'↪ 판은 나사가 하나 남으면 그 나사를 축으로 돌아요.',
    bonus:'보너스는 횟수 안에 끝내요. 되돌리기도 1회로 세어요.',
    facets:'다각형 판의 빈 모서리를 살펴요. 아래 나사가 보일 수 있어요.',
    cross:'십자 판의 빈 네 모서리로 아래 나사를 찾아봐요.',
    four:'나사가 네 개인 판도 있어요. 구멍을 모두 비워 주세요.',
    six:'기호가 여섯 가지예요. 공구함 대기열을 끝까지 살펴요.',
    doubleHinge:'회전 판이 두 개예요. 한 판이 돌면 다른 길이 열려요.'
  };
  const silhouettes={
    triangle:[[.5,0],[1,1],[0,1]],
    L:[[0,0],[.43,0],[.43,.57],[1,.57],[1,1],[0,1]],
    diamond:[[.5,0],[1,.5],[.5,1],[0,.5]],
    hex:[[.18,0],[.82,0],[1,.5],[.82,1],[.18,1],[0,.5]],
    trapezoid:[[.16,0],[.84,0],[1,1],[0,1]],
    pentagon:[[.5,0],[1,.38],[.82,1],[.18,1],[0,.38]],
    crown:[[0,.2],[.25,.45],[.5,0],[.75,.45],[1,.2],[.9,1],[.1,1]],
    cross:[[.35,0],[.65,0],[.65,.35],[1,.35],[1,.65],[.65,.65],[.65,1],[.35,1],[.35,.65],[0,.65],[0,.35],[.35,.35]]
  };
  // Plate order is back to front. No per-level offsets or generated color pairs:
  // each board has its own silhouettes, attachment points and toolbox schedule.
  const designs=[
    {palette:[1,3],materials:['wood','acrylic'],name:'첫 공구함',mechanics:['shapes','overlap','hidden'],hint:'같은 기호 나사 3개를 모아요. 위 판을 떼면 아래 나사가 보여요.',queue:[0,1],buffer:3,
      plates:[q('rect',12,38,76,44,-4,[s(.18,.55,0),s(.5,.55,1),s(.82,.55,0)]),q('bar',8,28,78,30,5,[s(.18,.5,1),s(.5,.5,0),s(.82,.5,1)])]},
    {palette:[2,0,1],materials:['acrylic','metal','wood'],name:'동그라미와 세모',hint:'모양이 달라도 규칙은 같아요. 나사가 하나인 작은 판도 찾아보세요.',mechanics:['shapes','overlap','hidden'],queue:[0,1],buffer:3,
      plates:[q('circle',10,35,48,48,0,[s(.35,.5,0),s(.68,.5,1)]),q('triangle',48,34,43,50,0,[s(.5,.62,0)]),q('bar',12,28,78,30,-7,[s(.18,.5,1),s(.5,.5,0),s(.82,.5,1)])]},
    {palette:[4,2,0],materials:['wood','acrylic','acrylic'],name:'다음 색을 기다려요',mechanics:['buffer','shapes','overlap','hidden','queue','L'],hint:'ㄴ자 판도 나사를 모두 풀면 떨어져요. 아래의 다음 공구함도 살펴요.',queue:[0,1,2],buffer:3,
      plates:[q('L',10,12,65,74,0,[s(.23,.2,2),s(.23,.76,0),s(.76,.79,2)]),q('triangle',35,22,59,64,0,[s(.5,.25,1),s(.25,.75,2),s(.75,.75,0)]),q('circle',18,8,56,56,-8,[s(.28,.45,0),s(.7,.45,1),s(.5,.75,1)])]},
    {palette:[5,1,3],materials:['metal','acrylic','acrylic'],name:'작은 창 아래',mechanics:['buffer','facets','four','shapes','overlap','hidden','queue'],hint:'판 아래의 나사는 아직 누를 수 없어요. 가리는 판부터 정리해요.',queue:[1,0,2],buffer:3,
      plates:[q('hex',9,42,82,28,0,[s(.22,.5,2),s(.76,.5,2)]),q('rect',20,14,60,72,3,[s(.23,.2,0),s(.77,.2,1),s(.23,.78,2),s(.77,.78,0)]),q('triangle',13,10,72,65,-3,[s(.5,.25,1),s(.25,.75,0),s(.75,.75,1)])]},
    {palette:[2,4,3,0],materials:['acrylic'],name:'네 방향의 꽃',hint:'꽃잎 사이로 보이는 아래 나사부터 찾아요.',mechanics:['buffer','facets','shapes','overlap','hidden','queue','L'],queue:[0,2,1],buffer:3,
      plates:[q('diamond',25,24,50,50,0,[s(.5,.5,1)]),q('bar',8,35,84,30,35,[s(.2,.5,2),s(.8,.5,1)]),q('L',14,10,70,76,0,[s(.2,.22,0),s(.22,.78,2),s(.78,.8,1)]),q('triangle',27,14,60,65,0,[s(.5,.25,0),s(.25,.75,2),s(.75,.75,0)])]},
    {palette:[1,3,5],materials:['acrylic','metal','acrylic'],name:'얼음 고리',mechanics:['buffer','facets','ice','shapes','overlap','hidden','queue'],hint:'❄ 표시 나사는 연결된 번호의 나사를 풀면 녹아요.',queue:[0,1,2],buffer:3,
      plates:[q('hex',12,41,76,42,-5,[s(.2,.5,2),s(.5,.5,1),s(.8,.5,2)]),q('circle',34,9,56,56,8,[s(.28,.4,0),s(.7,.4,2),s(.5,.75,1)]),q('trapezoid',8,17,78,30,0,[s(.18,.5,0,ice(0,0)),s(.5,.5,1),s(.82,.5,0)])]},
    {palette:[4,0,2],materials:['wood','acrylic','acrylic'],name:'고리를 풀어 주세요',mechanics:['buffer','facets','chain','ice','shapes','overlap','hidden','queue','L'],hint:'🔗 고리는 적힌 나사를 풀면 열려요. 번호를 따라 순서를 찾아요.',queue:[1,2,0],buffer:3,
      plates:[q('L',8,12,76,73,0,[s(.2,.2,0,chain(1,1)),s(.2,.78,2),s(.78,.8,0)]),q('triangle',30,18,62,65,-8,[s(.5,.25,2),s(.25,.75,1,ice(2,2)),s(.75,.75,0)]),q('pentagon',10,8,57,57,0,[s(.28,.42,1),s(.72,.42,2),s(.5,.75,1,chain(1,2))])]},
    {palette:[3,5,1],materials:['metal','acrylic','acrylic'],name:'한 칸의 여유',mechanics:['tightBuffer','shapes','overlap','hidden','queue','buffer'],hint:'이번에는 임시 칸이 한 곳이에요. 다음 공구함까지 생각해 봐요.',queue:[0,1,2],buffer:1,
      plates:[q('triangle',8,20,78,68,0,[s(.2,.9,0),s(.5,.45,1),s(.8,.9,2)]),q('bar',13,40,76,30,-8,[s(.18,.5,2),s(.5,.5,1),s(.82,.5,0)]),q('circle',32,8,55,55,0,[s(.28,.42,2),s(.72,.42,0),s(.5,.75,1)])]},
    {palette:[4,1,3,0],materials:['acrylic'],name:'네 색의 바람개비',hint:'기호가 네 가지로 늘었어요. 두 임시 칸과 다음 공구함을 함께 살펴요.',mechanics:['facets','shapes','overlap','hidden','queue','L','buffer','colors'],queue:[2,0,3,1],buffer:2,
      plates:[q('diamond',6,36,88,28,-38,[s(.18,.5,1),s(.5,.5,3),s(.82,.5,1)]),q('bar',8,38,84,28,38,[s(.18,.5,3),s(.5,.5,1),s(.82,.5,0)]),q('L',12,12,72,74,0,[s(.2,.2,0),s(.2,.78,3),s(.78,.8,2)]),q('pentagon',25,8,62,68,0,[s(.5,.25,2),s(.25,.75,0),s(.75,.75,2)])]},
    {palette:[2,0,4],materials:['wood','acrylic','metal'],name:'흔들리는 다리',mechanics:['buffer','hinge','shapes','overlap','hidden','queue'],hint:'↪ 판은 나사가 하나 남으면 그 나사를 축으로 돌아요. 새로 열린 곳을 살펴요.',queue:[0,1,2],buffer:3,
      plates:[q('rect',12,39,76,44,0,[s(.2,.5,2),s(.5,.5,0),s(.8,.5,2)]),q('circle',32,10,56,56,0,[s(.3,.4,1),s(.7,.4,2),s(.5,.75,1)]),q('bar',10,24,78,28,-5,[s(.18,.5,0),s(.5,.5,1),s(.82,.5,0)],{hinge:62})]},
    {palette:[3,5,1],materials:['acrylic','metal','acrylic'],name:'돌아가는 ㄴ자',hint:'ㄴ자 판이 돌아가면 아래 길이 달라져요.',mechanics:['facets','hinge','shapes','overlap','hidden','queue','L','buffer'],queue:[1,0,2],buffer:2,
      plates:[q('diamond',13,24,76,64,0,[s(.5,.25,2),s(.25,.75,0),s(.75,.75,2)]),q('bar',9,22,80,28,8,[s(.18,.5,0),s(.5,.5,2),s(.82,.5,1)]),q('L',15,12,68,72,0,[s(.22,.22,1),s(.22,.78,0),s(.78,.8,1)],{hinge:-56})]},
    {palette:[0,2,4,3],materials:['metal','acrylic','wood','acrylic'],name:'공방 보너스',mechanics:['four','facets','bonus','hinge','shapes','overlap','hidden','queue','buffer'],hint:'보너스는 횟수 안에 끝내요. 되돌리기도 1회이니 신중하게 골라요.',queue:[0,2,1],buffer:2,moveLimit:11,
      plates:[q('circle',8,35,48,48,0,[s(.35,.5,1),s(.68,.5,1)]),q('trapezoid',48,31,44,53,0,[s(.5,.6,2)]),q('rect',16,14,66,58,5,[s(.22,.23,2),s(.78,.23,0),s(.22,.77,1),s(.78,.77,2)]),q('bar',12,22,76,27,-5,[s(.25,.5,0),s(.75,.5,0)],{hinge:58})]},
    {palette:[1,5,2],materials:['wood','acrylic','metal'],name:'아홉 번의 약속',hint:'아홉 번 안에 끝내요. 잠금 번호와 임시 한 칸을 살펴요.',mechanics:['tightBuffer','facets','bonus','ice','chain','shapes','overlap','hidden','queue','L','buffer'],queue:[1,0,2],buffer:1,moveLimit:9,
      plates:[q('L',12,10,70,76,0,[s(.2,.2,2,chain(1,2)),s(.2,.8,0),s(.8,.8,2)]),q('triangle',20,16,72,68,4,[s(.5,.25,0),s(.25,.75,2),s(.75,.75,1,ice(2,0))]),q('hex',7,22,80,28,-3,[s(.18,.5,1),s(.5,.5,0,ice(1,2)),s(.82,.5,1)])]},
    {palette:[4,3,2,1,5,0],materials:['acrylic'],name:'여섯 기호 전시회',mechanics:['buffer','cross','six','shapes','overlap','hidden','queue','L','colors'],hint:'기호가 여섯 가지로 늘었어요. 색과 기호를 함께 보고 다음 공구함을 준비해요.',queue:[0,1,2,3,4,5],buffer:3,
      plates:[q('cross',24,30,52,52,0,[s(.28,.42,5),s(.72,.42,1),s(.5,.75,5)]),q('bar',10,52,80,28,0,[s(.18,.5,4),s(.5,.5,5),s(.82,.5,4)]),q('L',10,10,74,76,0,[s(.2,.2,3),s(.2,.8,2),s(.8,.8,3)]),q('triangle',22,20,66,65,0,[s(.5,.25,2),s(.25,.75,3),s(.75,.75,2)]),q('rect',15,12,70,46,6,[s(.2,.5,1),s(.5,.5,0),s(.8,.5,1)]),q('bar',10,17,78,28,-4,[s(.18,.5,0),s(.5,.5,4),s(.82,.5,0)])]},
    {palette:[0,4,1,3],materials:['acrylic','wood','metal','acrylic'],name:'사슬 속 네 기호',hint:'사슬을 연 뒤 ◆ 공구함을 채워 주세요.',mechanics:['four','facets','chain','shapes','overlap','hidden','queue','buffer','colors'],queue:[3,1,0,2],buffer:2,
      plates:[q('pentagon',20,22,60,60,0,[s(.25,.35,2),s(.75,.35,0),s(.25,.7,2),s(.75,.7,0)]),q('triangle',8,16,68,70,-6,[s(.5,.3,1),s(.28,.72,2)]),q('bar',8,39,84,28,25,[s(.2,.5,0,chain(3,1)),s(.8,.5,3)]),q('circle',35,8,52,52,0,[s(.3,.4,3),s(.7,.4,1),s(.3,.7,3),s(.7,.7,1)])]},
    {palette:[5,2,4,1],materials:['metal','acrylic','acrylic','wood'],name:'얼음 위 시소',hint:'시소를 돌려 얼음 열쇠까지 길을 만들어요.',mechanics:['tightBuffer','cross','hinge','ice','shapes','overlap','hidden','queue','L','buffer','colors'],queue:[0,2,1,3],buffer:1,
      plates:[q('cross',10,34,80,48,0,[s(.2,.5,3),s(.5,.5,1),s(.8,.5,3)]),q('L',13,12,70,72,0,[s(.2,.2,1,ice(3,0)),s(.2,.78,3),s(.78,.8,2)]),q('circle',30,11,56,56,0,[s(.28,.42,2),s(.72,.42,1),s(.5,.75,0)]),q('bar',7,26,82,28,-6,[s(.18,.5,0),s(.5,.5,2),s(.82,.5,0)],{hinge:70})]},
    {palette:[3,0,5,2,4],materials:['wood','acrylic','metal','acrylic','acrylic'],name:'다섯 색 나선',hint:'나사 네 개가 달린 긴 판이에요. 다섯 기호의 도착 순서를 생각해 봐요.',mechanics:['facets','four','shapes','overlap','hidden','queue','L','buffer','colors'],queue:[2,0,4,1,3],buffer:2,
      plates:[q('bar',8,50,84,28,0,[s(.2,.5,3),s(.8,.5,3)]),q('triangle',12,14,76,72,0,[s(.5,.22,1),s(.25,.75,3),s(.75,.75,1)]),q('L',10,10,75,76,0,[s(.2,.2,4),s(.2,.78,1),s(.78,.8,4)]),q('hex',34,17,54,54,0,[s(.3,.42,0),s(.7,.42,4),s(.5,.75,2)]),q('rect',9,15,78,38,4,[s(.16,.5,2),s(.39,.5,0),s(.62,.5,2),s(.85,.5,0)])]},
    {palette:[1,3,0,4],materials:['acrylic','metal','acrylic','wood'],name:'두 개의 회전문',hint:'두 회전문을 번갈아 열어 사슬까지 풀어요.',mechanics:['facets','doubleHinge','hinge','chain','shapes','overlap','hidden','queue','L','buffer','colors'],queue:[1,0,3,2],buffer:2,
      plates:[q('pentagon',22,30,56,56,0,[s(.28,.42,2,chain(2,2)),s(.72,.42,3),s(.5,.75,2)]),q('bar',12,42,76,28,10,[s(.18,.5,3),s(.5,.5,2),s(.82,.5,0)],{hinge:-48}),q('L',13,10,73,75,0,[s(.2,.2,0),s(.2,.78,3),s(.78,.8,1)]),q('bar',8,20,82,28,-8,[s(.18,.5,1),s(.5,.5,0),s(.82,.5,1)],{hinge:62})]},
    {palette:[4,1,3,5],materials:['acrylic','wood','acrylic','metal'],name:'열두 번의 집중',hint:'되돌리기 없이 열두 나사를 차례로 모아요.',mechanics:['tightBuffer','facets','bonus','hinge','ice','shapes','overlap','hidden','queue','buffer','colors'],queue:[0,1,2,3],buffer:1,moveLimit:12,
      plates:[q('triangle',12,20,76,70,0,[s(.5,.25,3,ice(2,1)),s(.25,.75,2),s(.75,.75,3)]),q('rect',12,30,76,42,-7,[s(.2,.5,2),s(.5,.5,3),s(.8,.5,1)]),q('circle',32,10,56,56,0,[s(.28,.42,1),s(.72,.42,2),s(.5,.75,0)]),q('diamond',7,20,80,28,6,[s(.18,.5,0),s(.5,.5,1),s(.82,.5,0)],{hinge:-64})]},
    {palette:[5,3,1,2,0,4],materials:['acrylic','metal','wood','acrylic','acrylic','acrylic'],name:'공구함 축제',hint:'여섯 기호와 두 회전문을 스무 번 안에 정리해요.',mechanics:['six','facets','doubleHinge','hinge','chain','ice','bonus','shapes','overlap','hidden','queue','L','buffer','colors'],queue:[0,2,1,4,3,5],buffer:2,moveLimit:20,
      plates:[q('hex',25,29,54,54,0,[s(.28,.42,5,chain(2,1)),s(.72,.42,3),s(.5,.75,5)]),q('triangle',10,17,78,72,0,[s(.5,.25,3),s(.25,.75,5),s(.75,.75,3)]),q('L',10,10,76,76,0,[s(.2,.2,4),s(.2,.8,1,ice(4,0)),s(.8,.8,4)]),q('bar',10,43,78,28,-12,[s(.18,.5,1),s(.5,.5,4),s(.82,.5,2)],{hinge:52}),q('trapezoid',14,14,72,42,5,[s(.2,.5,2),s(.5,.5,0),s(.8,.5,1)]),q('crown',7,18,82,36,-4,[s(.18,.5,0),s(.5,.5,2),s(.82,.5,0)],{hinge:-60})]}
  ];

  // Difficulty pass (2026-11-14): toolbox order, spare slots and a few color swaps were searched per board so a
  // random tapper clears early boards often and late boards rarely, while a solution always exists.
  const tuning={3:{queue:[0,2,1],buffer:2},4:{queue:[2,0,1],buffer:2,colors:[[2,2],[1,0,0,1],[1,0,2]]},5:{queue:[0,2,1],buffer:2,colors:[[2],[1,0],[0,2,1],[1,0,2]]},
    6:{queue:[0,1,2],buffer:1},7:{queue:[1,0,2],buffer:1},8:{queue:[2,1,0],buffer:1},9:{queue:[2,0,1,3],buffer:1},10:{queue:[2,1,0],buffer:1},
    11:{queue:[2,1,0],buffer:1},12:{queue:[0,2,1],buffer:1,colors:[[0,0],[0],[1,1,2,2],[2,1]]},13:{queue:[2,1,0],buffer:2,colors:[[0,2,1],[2,0,1],[0,2,1]]},
    14:{queue:[0,1,2,4,5,3],buffer:3},15:{queue:[3,2,1,0],buffer:1},16:{queue:[0,2,3,1],buffer:1},17:{queue:[2,0,3,4,1],buffer:1},18:{queue:[1,2,0,3],buffer:1},
    19:{queue:[1,0,3,2],buffer:1},20:{queue:[0,2,3,4,1,5],buffer:2}};
  for(const [n,t] of Object.entries(tuning)){
    const d=designs[n-1];d.queue=t.queue;d.buffer=t.buffer;
    if(t.colors)d.plates.forEach((q,p)=>{q.screws.forEach((sc,i)=>{sc.c=t.colors[p][i];});q.colors=q.screws.map(sc=>sc.c);});
    d.mechanics=d.mechanics.filter(m=>m!=='tightBuffer');if(d.buffer===1)d.mechanics.unshift('tightBuffer');
  }
  designs[12].hint='아홉 번 안에 끝내요. 잠금 번호와 다음 공구함을 함께 살펴요.';
  function level(n){const d=JSON.parse(JSON.stringify(designs[Math.max(0,Math.min(designs.length-1,Math.floor(n)-1))]));d.queue=d.queue||[0,1];return d;}
  const fullMask=q=>(1<<q.screws.length)-1;
  const done=(d,st,p)=>st.removed[p]===fullMask(d.plates[p]);
  const solved=(d,st)=>!st.failed&&d.plates.every((_,p)=>done(d,st,p))&&st.tray.length===0&&st.boxes.every(b=>!b);
  function worldPoint(q,p){const a=q.angle*Math.PI/180,dx=q.w*(p.x-.5),dy=q.h*(p.y-.5);return {x:q.x+q.w/2+dx*Math.cos(a)-dy*Math.sin(a),y:q.y+q.h/2+dx*Math.sin(a)+dy*Math.cos(a)};}
  function pose(data,state,p){const q=data.plates[p],left=q.screws.filter((_,s)=>!(state.removed[p]&(1<<s)));if(!q.hinge||left.length!==1)return q;
    const pivot=left[0],fixed=worldPoint(q,pivot),rotated={...q,angle:q.angle+q.hinge},moved=worldPoint(rotated,pivot);return {...rotated,x:q.x+fixed.x-moved.x,y:q.y+fixed.y-moved.y,swung:true};}
  const polygon=q=>silhouettes[q.shape]||[[0,0],[1,0],[1,1],[0,1]];
  function covers(q,x,y,pad=5){
    const a=-q.angle*Math.PI/180,dx=x-q.x-q.w/2,dy=y-q.y-q.h/2,lx=dx*Math.cos(a)-dy*Math.sin(a)+q.w/2,ly=dx*Math.sin(a)+dy*Math.cos(a)+q.h/2;
    if(q.shape==='circle')return ((lx-q.w/2)/(q.w/2+pad))**2+((ly-q.h/2)/(q.h/2+pad))**2<=1;
    const pts=polygon(q).map(([x,y])=>[x*q.w,y*q.h]);let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const [ax,ay]=pts[i],[bx,by]=pts[j];if((ay>ly)!==(by>ly)&&lx<(bx-ax)*(ly-ay)/(by-ay)+ax)inside=!inside;
      const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((lx-ax)*dx+(ly-ay)*dy)/(dx*dx+dy*dy)));if(Math.hypot(lx-ax-dx*t,ly-ay-dy*t)<=pad)return true;
    }return inside;
  }
  function initial(data){return {removed:data.plates.map(()=>0),boxes:data.queue.slice(0,2).map((c,id)=>({c,n:0,id})),next:Math.min(2,data.queue.length),tray:[],moves:0,failed:false};}
  function locked(data,state,p,s){const lock=data.plates[p]?.screws[s]?.lock;return !!lock&&!(state.removed[lock.p]&(1<<lock.s));}
  function available(data,state,p,s){if(state.failed||!data.plates[p]?.screws[s]||state.removed[p]&(1<<s)||locked(data,state,p,s))return false;const pos=worldPoint(pose(data,state,p),data.plates[p].screws[s]);
    for(let j=p+1;j<data.plates.length;j++)if(!done(data,state,j)&&covers(pose(data,state,j),pos.x,pos.y))return false;return true;}
  function settle(data,state){let changed=true;while(changed){changed=false;
    state.boxes=state.boxes.map(b=>{if(b&&b.n===3){changed=true;return state.next<data.queue.length?{c:data.queue[state.next],n:0,id:state.next++}:null;}return b;});
    for(let i=0;i<state.tray.length;i++){const box=state.boxes.find(b=>b&&b.c===state.tray[i]&&b.n<3);if(box){box.n++;state.tray.splice(i,1);changed=true;break;}}
  }}
  function remove(data,state,p,s){if(!available(data,state,p,s))return null;const next=JSON.parse(JSON.stringify(state));next.moves++;
    if(data.moveLimit&&next.moves>data.moveLimit){next.failed=true;next.reason='limit';return next;}
    // A screw that fits neither an open box nor a free spare slot overflows the tray: the attempt fails.
    next.removed[p]|=1<<s;next.tray.push(data.plates[p].screws[s].c);settle(data,next);if(next.tray.length>data.buffer){next.failed=true;next.reason='tray';}return next;
  }
  function undo(data,state,previous){const next=JSON.parse(JSON.stringify(previous));next.moves=state.moves+1;next.failed=!!data.moveLimit&&next.moves>data.moveLimit;if(next.failed)next.reason='limit';return next;}
  function stuck(data,state){return !state.failed&&!solved(data,state)&&!data.plates.some((q,p)=>q.screws.some((_,s)=>remove(data,state,p,s)));}
  root.ScrewLogic={designs,mechanicHints,positions,level,initial,available,locked,remove,undo,stuck,worldPoint,pose,covers,polygon,fullMask,done,solved};
})(typeof window==='undefined'?globalThis:window);
