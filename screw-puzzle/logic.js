(function (root) {
  'use strict';
  // Each pair of plates supplies exactly two complete, three-screw boxes.
  // Offsets expose lower screws, so choosing what to park in the tray matters.
  const designs = [
    [[7,12],[12,40]], [[13,11],[6,40]], [[7,10],[13,39]],
    [[6,5],[18,25],[5,45],[16,64]], [[17,5],[5,25],[18,44],[6,64]],
    [[9,5],[18,24],[4,44],[14,64]], [[5,5],[18,24],[6,44],[16,64]],
    [[17,4],[4,24],[18,44],[6,64]],
    [[6,3],[19,17],[4,32],[18,47],[5,62],[17,75]],
    [[19,3],[5,17],[18,32],[4,47],[19,62],[6,75]],
    [[10,3],[4,17],[19,32],[5,47],[18,62],[10,75]],
    [[5,3],[19,17],[6,32],[18,47],[4,62],[19,75]],
    [[18,3],[5,18],[17,33],[6,47],[18,61],[5,75]],
    [[5,3],[17,17],[4,32],[19,46],[6,61],[17,75]],
    [[12,3],[4,17],[19,31],[6,46],[18,61],[8,75]],
    [[4,3],[18,17],[7,32],[19,47],[5,61],[17,75]],
    [[18,3],[6,17],[19,32],[4,47],[17,61],[6,75]],
    [[8,3],[18,17],[4,31],[19,46],[5,61],[15,75]]
  ];
  function level(n) {
    n=Math.max(1,Math.min(designs.length,n));
    const layout=designs[n-1], count=layout.length;
    const plates=layout.map(([x,y],i) => {
      const fromTop=count-1-i, pair=Math.floor(fromTop/2), a=(pair*2+n-1)%6, b=(a+1)%6;
      return {x,y,w:count===2?80:count===4?76:74,h:count===2?44:count===4?29:22,
        angle:((i+n)%2?1:-1)*(4+(i%3)*2),colors:fromTop%2===0?[a,b,a]:[b,a,b]};
    });
    const queue=[];
    for(let i=count-1;i>=0;i-=2) queue.push(plates[i].colors[0],plates[i].colors[1]);
    return {plates,queue};
  }
  const positions=[{x:.17,y:.5},{x:.5,y:.5},{x:.83,y:.5}];
  function worldPoint(q,p){const a=q.angle*Math.PI/180,dx=q.w*(p.x-.5),dy=q.h*(p.y-.5);return {x:q.x+q.w/2+dx*Math.cos(a)-dy*Math.sin(a),y:q.y+q.h/2+dx*Math.sin(a)+dy*Math.cos(a)};}
  function initial(data) { return {removed:data.plates.map(()=>0), boxes:data.queue.slice(0,2).map((c,id)=>({c,n:0,id})), next:2, tray:[]}; }
  function available(data,state,p,s) {
    if(state.removed[p]&(1<<s)) return false;
    const plate=data.plates[p], spot=positions[s], pos=worldPoint(plate,spot), x=pos.x, y=pos.y;
    for(let j=p+1;j<data.plates.length;j++) {
      if(state.removed[j]===7) continue;
      const q=data.plates[j];
      // Plates rotate in a 100 × 100 board; use the same inverse transform as CSS.
      const rad=-q.angle*Math.PI/180,dx=x-q.x-q.w/2,dy=y-q.y-q.h/2;
      const lx=dx*Math.cos(rad)-dy*Math.sin(rad)+q.w/2,ly=dx*Math.sin(rad)+dy*Math.cos(rad)+q.h/2;
      if(lx+8>0&&lx-8<q.w&&ly+8>0&&ly-8<q.h)return false;
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
        if(b && b.n===3) { changed=true; return state.next<data.queue.length?{c:data.queue[state.next],n:0,id:state.next++}:null; }
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
  root.ScrewLogic={designs,positions,level,initial,available,remove,worldPoint};
})(typeof window === 'undefined' ? globalThis : window);
