(function (root) {
  'use strict';
  // 6×6 lots. Each car moves only along its arrow and leaves through that edge.
  // Levels are generated from a seed and scored so later levels need longer chains of
  // "this car first, then that one", with fewer cars free at the start.
  const SIZE = 6;
  const tutorial = [
    {id:'A',x:0,y:1,len:2,axis:'h',dir:1,color:0},
    {id:'B',x:4,y:0,len:3,axis:'v',dir:1,color:1},
    {id:'C',x:2,y:4,len:2,axis:'h',dir:-1,color:2}
  ];
  function cells(car) { return Array.from({length:car.len},(_,i) => [car.x+(car.axis==='h'?i:0),car.y+(car.axis==='v'?i:0)]); }
  function canExit(cars, index) {
    const car = cars[index]; if (!car) return false;
    const occupied = new Set(cars.flatMap((c,i) => i === index || !c ? [] : cells(c).map(([x,y])=>x+','+y)));
    let x=car.x, y=car.y;
    if (car.dir>0) { if(car.axis==='h') x+=car.len-1; else y+=car.len-1; }
    while (true) {
      if(car.axis==='h') x+=car.dir; else y+=car.dir;
      if(x<0||x>=SIZE||y<0||y>=SIZE) return true;
      if(occupied.has(x+','+y)) return false;
    }
  }
  /* depth: rounds of "every free car leaves at once". free: cars free at the start.
     odds: chance that tapping a random remaining car each time never hits a blocked one. */
  function measure(cars, withOdds=true) {
    let left=cars.slice(),depth=0;const free=cars.filter((_,i)=>canExit(cars,i)).length;
    while(left.some(Boolean)){
      const out=left.map((c,i)=>c&&canExit(left,i)?i:-1).filter(i=>i>=0);
      if(!out.length)return {solvable:false,depth,free,odds:0};
      out.forEach(i=>{left[i]=null;});depth++;
    }
    const n=cars.length,memo=new Map();
    function odds(mask){
      if(!mask)return 1;if(memo.has(mask))return memo.get(mask);
      const state=cars.map((c,i)=>mask&(1<<i)?c:null),idx=[];for(let i=0;i<n;i++)if(mask&(1<<i))idx.push(i);
      let p=0;for(const i of idx)if(canExit(state,i))p+=odds(mask&~(1<<i))/idx.length;
      memo.set(mask,p);return p;
    }
    return {solvable:true,depth,free,odds:withOdds&&n<=16?odds((1<<n)-1):null};
  }
  function target(n) {
    const t=n%10===0?2:0; // Boss levels jump ahead.
    return {
      cars:Math.min(14,5+Math.floor((n+t*3)/3)),
      depth:Math.min(7,2+Math.floor((n+t*3)/5)),
      free:n+t<8?3:n+t<20?2:1
    };
  }
  function randomLot(count, random) {
    const grid=Array.from({length:SIZE},()=>Array(SIZE).fill(false)),cars=[];
    for(let k=0;k<count;k++){
      let placed=false;
      for(let tries=0;tries<60&&!placed;tries++){
        const axis=random()<.5?'h':'v',len=random()<.72?2:3;
        const x=Math.floor(random()*(axis==='h'?SIZE-len+1:SIZE)),y=Math.floor(random()*(axis==='v'?SIZE-len+1:SIZE));
        const car={id:String.fromCharCode(65+cars.length),x,y,len,axis,dir:random()<.5?1:-1,color:cars.length%6};
        if(cells(car).some(([cx,cy])=>grid[cy][cx]))continue;
        cells(car).forEach(([cx,cy])=>{grid[cy][cx]=true;});cars.push(car);placed=true;
      }
      if(!placed)return null;
    }
    return cars;
  }
  function generate(n, random) {
    if(n===1)return tutorial.map(c=>({...c}));
    random=random||Math.random;
    // Keep the lot closest to the wanted chain length and number of free cars.
    // Early levels should be gentle (short chains, several free cars), later ones the opposite.
    const want=target(n),distance=m=>Math.abs(m.depth-want.depth)*3+Math.abs(m.free-want.free)*4;
    let best=null,bestDistance=Infinity,found=0;
    for(let tries=0;tries<600&&found<6;tries++){
      const cars=randomLot(want.cars,random);if(!cars)continue;
      const m=measure(cars,false);if(!m.solvable)continue;
      const d=distance(m);if(d<=4)found++;
      if(d<bestDistance){bestDistance=d;best=cars;}
    }
    return best||tutorial.map(c=>({...c}));
  }
  const cache=new Map();
  function level(n, random) {
    // The game passes the seeded random; tests and tools may omit it and get the same seed.
    if(!random&&cache.has(n))return cache.get(n).map(c=>({...c}));
    let seed=(n*7919)>>>0;const seeded=random||(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});
    const cars=generate(n,seeded);if(!random)cache.set(n,cars.map(c=>({...c})));
    return cars;
  }
  root.ParkingLogic = {SIZE,level,generate,target,measure,cells,canExit};
})(typeof window === 'undefined' ? globalThis : window);
