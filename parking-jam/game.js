(function () {
  'use strict';
  const P=AdPuzzle('parking-jam',12),L=ParkingLogic;
  let cars,busy=false;
  P.$('instructions').textContent='화살표 방향으로 앞길이 빈 차를 보내요. 차는 직선으로 출구를 지나가요. 막혀 있으면 다른 차부터 보내 주세요. 막힌 차는 이동 횟수에 포함하지 않아요.';
  async function exit(i,b){
    if(P.over||busy)return;const car=cars[i],run=P.epoch,axis=car.axis==='h'?'X':'Y';
    if(!L.canExit(cars,i)){
      P.feedback('error');P.say(car.id+'번 차 앞이 막혀 있어요. 다른 차를 먼저 보내요.');
      await P.animate(b,[{transform:'translate'+axis+'(0)'},{transform:'translate'+axis+'('+car.dir*6+'px)',offset:.3},{transform:'translate'+axis+'(0)',offset:.6},{transform:'translate'+axis+'('+car.dir*3+'px)',offset:.8},{transform:'translate'+axis+'(0)'}],{duration:280});return;
    }
    busy=true;b.classList.add('driving');P.$('board').classList.add('gate-open');P.move();P.say(car.id+'번 차가 출구로 나가요.');
    const port=document.createElement('span');port.className='exit-port';port.setAttribute('aria-hidden','true');
    Object.assign(port.style,car.axis==='h'?{left:car.dir>0?'calc(100% - 8px)':'0',top:car.y/6*100+'%',width:'8px',height:'16.6667%'}:{left:car.x/6*100+'%',top:car.dir>0?'calc(100% - 8px)':'0',width:'16.6667%',height:'8px'});P.$('board').appendChild(port);
    const unit=P.$('board').clientWidth/6,distance=(car.dir>0?6-(car.axis==='h'?car.x:car.y):(car.axis==='h'?car.x:car.y)+car.len)*unit;
    await P.animate(b,[{transform:'translate'+axis+'(0)',opacity:1},{transform:'translate'+axis+'('+car.dir*distance+'px)',opacity:1,offset:.85},{transform:'translate'+axis+'('+car.dir*(distance+20)+'px)',opacity:0}],{duration:Math.min(850,400+distance),easing:'cubic-bezier(.4,0,.75,.6)',fill:'forwards'});
    if(run!==P.epoch)return;cars[i]=null;busy=false;render(i);if(cars.every(c=>!c))P.win();else P.say('남은 차 '+cars.filter(Boolean).length+'대예요.');
  }
  function render(focus){
    const board=P.$('board');board.className='puzzle-board parking-board';board.replaceChildren();
    const gate=document.createElement('div');gate.className='exit-gate';gate.textContent='출구 ↑ ↓ ← →';gate.setAttribute('aria-hidden','true');board.appendChild(gate);
    cars.forEach((car,i)=>{
      if(!car)return;const arrow=car.axis==='h'?(car.dir>0?'→':'←'):(car.dir>0?'↓':'↑');
      const b=P.button('',()=>exit(i,b),board,car.id+'번 차, '+(car.y+1)+'행 '+(car.x+1)+'열, '+arrow+' 방향으로 나가기');b.className='car color-'+car.color+' car-'+car.axis+(car.dir<0?' reverse':'');
      const body=document.createElement('span');body.className='car-body';const glass=document.createElement('span');glass.className='car-glass';body.appendChild(glass);
      const text=document.createElement('span');text.className='car-label';text.textContent=car.id+' '+arrow;body.appendChild(text);b.appendChild(body);
      for(let w=0;w<4;w++){const wheel=document.createElement('i');wheel.className='wheel wheel-'+w;b.appendChild(wheel);}
      Object.assign(b.style,{left:car.x/6*100+'%',top:car.y/6*100+'%',width:(car.axis==='h'?car.len:1)/6*100+'%',height:(car.axis==='v'?car.len:1)/6*100+'%'});b.dataset.index=i;
    });
    if(focus!==undefined){const buttons=Array.from(board.querySelectorAll('button'));const next=buttons.find(b=>+b.dataset.index>focus)||buttons[0];if(next)next.focus();}
  }
  P.mount(()=>{busy=false;cars=L.level(P.level);render();});
})();
