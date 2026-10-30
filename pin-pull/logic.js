(function (root) {
  'use strict';
  // Hand-authored chamber arrangements: cloud chambers must drain before treasure arrives.
  // A vertical open chute takes priority over the shallower side drain, like gravity on a slope.
  const designs=[
    {clouds:[1,0],sides:[-1,1],stars:3},
    {clouds:[0,1],sides:[1,-1],stars:4},
    {clouds:[1,0],sides:[1,-1],stars:5,extra:true},
    {clouds:[1,1],sides:[-1,1],stars:4},
    {clouds:[2,1],sides:[1,-1],stars:5},
    {clouds:[1,2],sides:[-1,-1],stars:4,extra:true},
    {clouds:[2,2],sides:[1,1],stars:6},
    {clouds:[0,2],sides:[-1,1],stars:5,extra:true,bonus:true},
    {clouds:[2,0],sides:[1,-1],stars:6,extra:true,bonus:true},
    {clouds:[2,3],sides:[-1,1],stars:7,extra:true},
    {clouds:[3,2],sides:[1,-1],stars:6,extra:true},
    {clouds:[3,3],sides:[-1,-1],stars:8,extra:true}
  ];
  function level(n) {
    const d=designs[(n-1)%designs.length];
    const nodes=[{x:50,y:7,kind:'chamber',stars:d.stars,clouds:0},
      {x:50,y:36,kind:'chamber',stars:d.bonus&&!d.clouds[0]?2:0,clouds:d.clouds[0]},
      {x:50,y:67,kind:'chamber',stars:d.bonus&&!d.clouds[1]?2:0,clouds:d.clouds[1]},
      {x:50,y:94,kind:'goal',stars:0,clouds:0}];
    const edges=[{from:0,to:1},{from:1,to:2},{from:2,to:3}];
    d.clouds.forEach((count,i)=>{
      if(!count)return;
      const p=nodes[i+1],to=nodes.length;
      nodes.push({x:50+d.sides[i]*36,y:p.y+18,kind:'bin',stars:0,clouds:0});edges.push({from:i+1,to});
    });
    if(d.extra){const from=nodes.length;nodes.push({x:84,y:7,kind:'chamber',stars:2,clouds:0});edges.push({from,to:1});}
    return {nodes,edges};
  }
  function initial(data){return {nodes:data.nodes.map(n=>({...n})),open:data.edges.map(()=>false),failed:false};}
  function pull(data,state,index){
    if(state.failed||state.open[index])return null;
    const next=JSON.parse(JSON.stringify(state)),events=[];next.open[index]=true;
    // Topological order is geometric: every channel strictly descends.
    const order=next.nodes.map((_,i)=>i).sort((a,b)=>next.nodes[a].y-next.nodes[b].y);
    for(const from of order){
      const node=next.nodes[from];if(node.kind!=='chamber'||(!node.stars&&!node.clouds))continue;
      if(node.stars&&node.clouds){next.failed=true;break;}
      const options=data.edges.map((e,i)=>({...e,i})).filter(e=>e.from===from&&next.open[e.i]);
      options.sort((a,b)=>{
        function slope(e){const to=next.nodes[e.to],dy=to.y-node.y;return dy/Math.hypot((to.x-node.x)*.7,dy);}
        return slope(b)-slope(a);
      });
      if(!options.length)continue;
      const to=options[0].to,dest=next.nodes[to],stars=node.stars,clouds=node.clouds;
      node.stars=0;node.clouds=0;dest.stars+=stars;dest.clouds+=clouds;
      events.push({from,to,stars,clouds});
      if((dest.stars&&dest.clouds)||(dest.kind==='goal'&&dest.clouds)||(dest.kind==='bin'&&dest.stars)){next.failed=true;break;}
    }
    return {state:next,events};
  }
  function solved(state){return !state.failed&&state.nodes.every(n=>n.kind!=='chamber'||(!n.stars&&!n.clouds));}
  root.PinLogic={designs,level,initial,pull,solved};
})(typeof window === 'undefined' ? globalThis : window);
