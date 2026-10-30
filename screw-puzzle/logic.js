(function (root) {
  'use strict';
  // Each pair of plates supplies exactly two complete, three-screw boxes.
  // Offsets expose lower screws, so choosing what to park in the tray matters.
  const designs = [
    [[18,12],[8,42]], [[8,10],[25,38]], [[25,8],[6,40]],
    [[8,8],[25,28],[6,48],[24,65]], [[24,8],[6,27],[25,46],[8,65]],
    [[15,5],[5,25],[26,45],[12,65]], [[6,5],[25,24],[8,44],[24,65]],
    [[24,4],[5,23],[26,45],[8,65]],
    [[8,2],[25,16],[5,32],[24,48],[8,64],[24,78]],
    [[25,2],[6,17],[24,32],[7,48],[25,64],[6,78]],
    [[15,2],[5,17],[26,32],[7,48],[25,64],[12,78]],
    [[6,2],[25,17],[7,32],[24,48],[6,64],[25,78]]
  ];
  function level(n) {
    const positions=designs[(n-1)%designs.length], count=positions.length;
    const plates=positions.map(([x,y],i) => {
      const fromTop=count-1-i, pair=Math.floor(fromTop/2), a=(pair*2+n-1)%6, b=(a+1)%6;
      return {x,y,w:68,h:20,colors:fromTop%2===0?[a,b,a]:[b,a,b]};
    });
    const queue=[];
    for(let i=count-1;i>=0;i-=2) queue.push(plates[i].colors[0],plates[i].colors[1]);
    return {plates,queue};
  }
  const positions=[{x:.17,y:.5},{x:.5,y:.5},{x:.83,y:.5}];
  function initial(data) { return {removed:data.plates.map(()=>0), boxes:data.queue.slice(0,2).map(c=>({c,n:0})), next:2, tray:[]}; }
  function available(data,state,p,s) {
    if(state.removed[p]&(1<<s)) return false;
    const plate=data.plates[p], spot=positions[s], x=plate.x+plate.w*spot.x, y=plate.y+plate.h*spot.y;
    for(let j=p+1;j<data.plates.length;j++) {
      if(state.removed[j]===7) continue;
      const q=data.plates[j];
      // Include the screw's entire 44px target in the cover test (percentage conservatively at 328px).
      if(x+7>q.x && x-7<q.x+q.w && y+5>q.y && y-5<q.y+q.h) return false;
    }
    return true;
  }
  function settle(data,state) {
    let changed=true;
    while(changed) {
      changed=false;
      for(let i=0;i<state.tray.length;i++) {
        const box=state.boxes.find(b=>b && b.c===state.tray[i]);
        if(box) { box.n++; state.tray.splice(i,1); changed=true; break; }
      }
      state.boxes=state.boxes.map(b => {
        if(b && b.n===3) { changed=true; return state.next<data.queue.length?{c:data.queue[state.next++],n:0}:null; }
        return b;
      });
    }
  }
  function remove(data,state,p,s) {
    if(!available(data,state,p,s))return null;
    const next=JSON.parse(JSON.stringify(state)); next.removed[p]|=1<<s; next.tray.push(data.plates[p].colors[s]); settle(data,next);
    if(next.tray.length>3)return null;
    return next;
  }
  root.ScrewLogic={designs,positions,level,initial,available,remove};
})(typeof window === 'undefined' ? globalThis : window);
