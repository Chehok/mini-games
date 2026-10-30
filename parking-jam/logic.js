(function (root) {
  'use strict';
  // Hand-authored, non-overlapping 6×6 lots. Each letter is one car; arrows are fixed.
  const designs = [
    ['AA....','..B...','..B.CC','......','DD.E..','...E..'],
    ['..A...','BBA...','...CC.','.D....','.D.EE.','FF....'],
    ['A.BB..','A...C.','.DD.C.','E.....','E.FF..','...GG.'],
    ['AA.B..','..CB..','..C.DD','.EE...','F..GG.','F.....'],
    ['.A.BB.','.A...C','DD...C','..EE..','F...GG','F.HH..'],
    ['AA.B.C','..DB.C','..DEE.','.FF.G.','H...G.','H.II..'],
    ['A.BB.C','A.DD.C','.EE.F.','G...F.','G.HH..','II.JJ.'],
    ['AA.B.C','D..B.C','D.EE.F','.GG..F','H..II.','H.JJ..'],
    ['A.BB.C','A.DD.C','EE.F..','G..FHH','G.II.J','.KK..J'],
    ['AA.B.C','D..B.C','D.EE.F','GG.H.F','I..HJJ','I.KK..'],
    ['A.BB.C','A.DD.C','EE.FGG','H..F.I','H.JJ.I','KK.LL.'],
    ['AA.B.C','D..B.C','D.EE.F','GG.H.F','II.HJJ','KK.LL.']
  ];
  const directions=['---+-','-+----','--++---','+-+----','+-++--+-','+--+-----','+---+++---','++--+-++--','----+-----+','++++-++++--','+---++++-+++','++++-+++----'];
  function level(n) {
    const rows = designs[(n-1)%designs.length], letters = [...new Set(rows.join('').replace(/\./g,''))];
    return letters.map((letter,i) => {
      const cells = []; rows.forEach((row,y) => [...row].forEach((c,x) => { if(c === letter) cells.push({x,y}); }));
      const axis = cells[0].y === cells[1].y ? 'h' : 'v';
      // Authored exit directions create dependencies between the parked cars.
      return {id:letter,x:cells[0].x,y:cells[0].y,len:cells.length,axis,dir:directions[(n-1)%designs.length][i]==='+'?1:-1,color:i%6};
    });
  }
  function cells(car) { return Array.from({length:car.len},(_,i) => [car.x+(car.axis==='h'?i:0),car.y+(car.axis==='v'?i:0)]); }
  function canExit(cars, index) {
    const car = cars[index]; if (!car) return false;
    const occupied = new Set(cars.flatMap((c,i) => i === index || !c ? [] : cells(c).map(([x,y])=>x+','+y)));
    let x=car.x, y=car.y;
    if (car.dir>0) { if(car.axis==='h') x+=car.len-1; else y+=car.len-1; }
    while (true) {
      if(car.axis==='h') x+=car.dir; else y+=car.dir;
      if(x<0||x>=6||y<0||y>=6) return true;
      if(occupied.has(x+','+y)) return false;
    }
  }
  root.ParkingLogic = {designs,level,cells,canExit};
})(typeof window === 'undefined' ? globalThis : window);
