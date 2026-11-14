(function (root) {
  'use strict';
  function orientation(a,b,c) {return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
  function touches(a,b,p) {return Math.abs(orientation(a,b,p))<0.001 && p.x>=Math.min(a.x,b.x)-.001 && p.x<=Math.max(a.x,b.x)+.001 && p.y>=Math.min(a.y,b.y)-.001 && p.y<=Math.max(a.y,b.y)+.001;}
  function intersects(a,b,c,d) {
    const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);
    return (o1*o2<0 && o3*o4<0)||touches(a,b,c)||touches(a,b,d)||touches(c,d,a)||touches(c,d,b);
  }
  function crossings(nodes,edges) {
    const pairs=[];
    for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
      const [a,b]=edges[i],[c,d]=edges[j];
      if(a===c||a===d||b===c||b===d)continue;
      if(intersects(nodes[a],nodes[b],nodes[c],nodes[d]))pairs.push([i,j]);
    }
    return pairs;
  }
  function crossingPoint(a,b,c,d) {
    const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,den=dx*ey-dy*ex;
    if(Math.abs(den)<.000001)return [a,b,c,d].find(p=>touches(a,b,p)&&touches(c,d,p))||a;
    const t=((c.x-a.x)*ey-(c.y-a.y)*ex)/den;
    return {x:a.x+t*dx,y:a.y+t*dy};
  }
  function clear(nodes,edges) {
    if(crossings(nodes,edges).length)return false;
    // Nodes may not hide on other nodes or on unrelated edges.
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++)if(Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y)<9)return false;
      for(const [a,b] of edges)if(i!==a&&i!==b&&touches(nodes[a],nodes[b],nodes[i]))return false;
    }
    return true;
  }
  // Fewest pegs that must move: compare with every rotation and mirror of the circle layout.
  function par(nodes,solution) {
    const n=solution.length;let best=n;
    for(const mirror of [false,true])for(let r=0;r<n;r++){
      let miss=0;
      for(let i=0;i<n;i++){const j=mirror?(r-i+n)%n:(i+r)%n;if(Math.hypot(nodes[i].x-solution[j].x,nodes[i].y-solution[j].y)>1)miss++;}
      best=Math.min(best,miss);
    }
    return best;
  }
  function generate(level,random) {
    random=random||Math.random;
    const boss=level%10===0;
    const n=Math.min(12,4+Math.floor((level-1+(boss?4:0))/3));
    const solution=Array.from({length:n},(_,i)=>({x:50+38*Math.cos(i/n*2*Math.PI),y:50+38*Math.sin(i/n*2*Math.PI)}));
    const edges=Array.from({length:n},(_,i)=>[i,(i+1)%n]);
    if(level===1){
      const nodes=solution.map(p=>({...p}));
      // One peg is across the opposite edge; dragging it home unties both crossings.
      nodes[0]={x:10,y:28};
      return {nodes,edges,solution,par:1};
    }
    // Chords of a convex polygon stay planar when they do not interleave. Denser later.
    const density=Math.min(1,.35+level*.03+(boss?.2:0)),want=Math.round((n-3)*density),chords=[];
    const interleave=([a,b],[c,d])=>{const inside=x=>x>Math.min(a,b)&&x<Math.max(a,b);return new Set([a,b,c,d]).size===4&&inside(c)!==inside(d);};
    for(let tries=0;tries<400&&chords.length<want;tries++){
      const a=Math.floor(random()*n),b=Math.floor(random()*n),gap=Math.abs(a-b);
      if(gap<2||gap>n-2)continue;const chord=[Math.min(a,b),Math.max(a,b)];
      if(chords.some(c=>c[0]===chord[0]&&c[1]===chord[1]||interleave(c,chord)))continue;chords.push(chord);
    }
    edges.push(...chords);
    // Scramble the pegs over the circle slots; keep the most tangled of a few tries.
    let nodes=null,most=-1;
    for(let tries=0;tries<(level<6?4:16);tries++){
      const order=solution.map(p=>({...p}));
      for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      const count=crossings(order,edges).length;if(count>most){most=count;nodes=order;}
    }
    if(!most){nodes=solution.map(p=>({...p}));[nodes[1],nodes[3]]=[nodes[3],nodes[1]];}
    return {nodes,edges,solution,par:Math.max(1,par(nodes,solution))};
  }
  root.UntangleLogic={intersects,crossings,crossingPoint,clear,par,generate};
})(typeof window === 'undefined' ? globalThis : window);
