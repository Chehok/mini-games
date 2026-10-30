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
  function clear(nodes,edges) {
    if(crossings(nodes,edges).length)return false;
    // Nodes may not hide on other nodes or on unrelated edges.
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++)if(Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y)<9)return false;
      for(const [a,b] of edges)if(i!==a&&i!==b&&touches(nodes[a],nodes[b],nodes[i]))return false;
    }
    return true;
  }
  function generate(level,random) {
    random=random||Math.random;
    const n=Math.min(10,5+Math.floor((level-1)/2));
    const solution=Array.from({length:n},(_,i)=>({x:50+38*Math.cos(i/n*2*Math.PI),y:50+38*Math.sin(i/n*2*Math.PI)}));
    const edges=Array.from({length:n},(_,i)=>[i,(i+1)%n]);
    // Convex polygon plus a fan from vertex zero is planar by construction.
    for(let i=2;i<n-1;i++)if(i%2===0||level>5)edges.push([0,i]);
    let nodes;
    for(let tries=0;tries<30;tries++){
      nodes=solution.map(p=>({...p}));
      for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));[nodes[i],nodes[j]]=[nodes[j],nodes[i]];}
      if(crossings(nodes,edges).length)break;
    }
    if(!crossings(nodes,edges).length){nodes=solution.map(p=>({...p}));[nodes[1],nodes[3]]=[nodes[3],nodes[1]];}
    return {nodes,edges,solution};
  }
  root.UntangleLogic={intersects,crossings,clear,generate};
})(typeof window === 'undefined' ? globalThis : window);
