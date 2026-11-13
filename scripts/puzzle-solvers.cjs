// A search over the public game API, including coverage, hinge poses, locks,
// toolbox arrivals, buffer capacity and the bonus move budget.
function solveScrew(L,data,inspect=()=>{}) {
  const visited=new Set();
  function search(state){
    inspect(state);
    if(L.solved(data,state))return [];
    if(state.failed)return null;
    const key=JSON.stringify(state);if(visited.has(key))return null;visited.add(key);
    if(visited.size>250000)throw Error('Screw search exceeded 250,000 states');
    for(let p=data.plates.length-1;p>=0;p--)for(let s=0;s<data.plates[p].screws.length;s++){
      const next=L.remove(data,state,p,s);if(!next)continue;
      const tail=search(next);if(tail)return [[p,s],...tail];
    }return null;
  }
  return search(L.initial(data));
}
// Search the physical board, without consulting the authored solution order.
// Every branch settles for the same six seconds used by the audit replay.
function solvePin(L,data) {
  const initial=L.initial(data);
  for(let t=0;t<180;t++)L.step(data,initial);
  function search(state){
    if(L.solved(data,state))return [];
    if(state.failed)return null;
    for(let i=0;i<data.pins.length;i++){
      const next=JSON.parse(JSON.stringify(state));
      if(!L.pull(data,next,i))continue;
      for(let t=0;t<6/L.DT&&!next.failed;t++)L.step(data,next);
      const tail=search(next);if(tail)return [i,...tail];
    }
    return null;
  }
  return search(initial);
}
module.exports={solveScrew,solvePin};
