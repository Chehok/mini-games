(function () {
  'use strict';
  const L=ParkingLogic,P=AdPuzzle('parking-jam');
  let cars,total,busy=false;
  const direction=c=>c.axis==='h'?(c.dir>0?'→':'←'):(c.dir>0?'↓':'↑');
  P.$('instructions').textContent='앞길이 열린 차부터 모두 내보내요';
  function meter(){P.$('scene-meter').textContent='목표 '+total+'대 · 탈출 '+(total-cars.filter(Boolean).length)+' / '+total+'대';}
  async function exit(i,b){
    if(P.over||busy||!cars[i])return;
    const car=cars[i],run=P.epoch,axis=car.axis==='h'?'X':'Y';busy=true;
    if(!L.canExit(cars,i)){
      P.mistake(car.id+'번 차가 앞차에 부딪혔어요!');
      await P.animate(b,[{transform:'translate'+axis+'(0)'},{transform:'translate'+axis+'('+car.dir*5+'px)',offset:.35},{transform:'translate'+axis+'(-2px) rotate(-1deg)',offset:.6},{transform:'translate'+axis+'(1px) rotate(1deg)',offset:.8},{transform:'translate'+axis+'(0) rotate(0)'}],{duration:320});
      if(run===P.epoch)busy=false;return;
    }
    const board=P.$('board');b.classList.add('driving');board.querySelectorAll('.tutorial-hand').forEach(h=>h.remove());P.move();P.say(car.id+'번 차가 '+direction(car)+' 출구로 나가요.');
    const port=board.querySelector('[data-port="'+car.axis+(car.dir>0?'+':'-')+(car.axis==='h'?car.y:car.x)+'"]');if(port)port.classList.add('active');
    const unit=b.parentNode.clientWidth/6,position=car.axis==='h'?car.x:car.y,distance=(car.dir>0?7-position:position+car.len+1)*unit;
    await P.animate(b,[
      {transform:'translate'+axis+'(0)'},
      {transform:'translate'+axis+'('+car.dir*distance*.08+'px)',offset:.3},
      {transform:'translate'+axis+'('+car.dir*distance*.45+'px)',offset:.65},
      {transform:'translate'+axis+'('+car.dir*distance+'px)'}
    ],{duration:Math.min(820,430+distance*.7),easing:'ease-in',fill:'forwards'});
    if(run!==P.epoch)return;cars[i]=null;busy=false;render(i);
    if(cars.every(c=>!c))P.win();else P.say('남은 차 '+cars.filter(Boolean).length+'대예요. 화살표 앞이 열린 차를 찾아요.');
  }
  function render(focus){
    const board=P.$('board');board.className='puzzle-board parking-board';board.replaceChildren();meter();
    const lot=document.createElement('div');lot.className='parking-lanes';board.appendChild(lot);
    const mark=document.createElement('span');mark.className='parking-mark';mark.textContent='P';mark.setAttribute('aria-hidden','true');lot.appendChild(mark);
    // A car's fixed direction defines a real opening in that edge of the curb.
    const all=L.level(P.level),ports=new Set(all.map(c=>c.axis+(c.dir>0?'+':'-')+(c.axis==='h'?c.y:c.x)));
    for(const axis of ['h','v'])for(const sign of ['-','+'])for(let lane=0;lane<6;lane++){
      const key=axis+sign+lane,open=ports.has(key),el=document.createElement('span');el.className=open?'exit-port':'parking-curb'+(axis==='h'?' vertical':'');el.setAttribute('aria-hidden','true');
      const start='calc(12px + (100% - 24px) / 6 * '+lane+')',size='calc((100% - 24px) / 6 - 2px)';
      Object.assign(el.style,axis==='h'?{left:sign==='+'?'calc(100% - 8px)':'0px',top:start,width:'8px',height:size}:{top:sign==='+'?'calc(100% - 8px)':'0px',left:start,height:'8px',width:size});
      if(open){el.dataset.port=key;el.textContent=axis==='h'?(sign==='+'?'›':'‹'):(sign==='+'?'⌄':'⌃');}board.appendChild(el);
    }
    all.forEach(car=>{
      const bay=document.createElement('span');bay.className='parking-bay';bay.setAttribute('aria-hidden','true');
      Object.assign(bay.style,{left:'calc('+car.x/6*100+'% + 2px)',top:'calc('+car.y/6*100+'% + 2px)',width:'calc('+(car.axis==='h'?car.len:1)/6*100+'% - 4px)',height:'calc('+(car.axis==='v'?car.len:1)/6*100+'% - 4px)'});lot.appendChild(bay);
    });
    const gate=document.createElement('span');gate.className='exit-gate';gate.textContent='출구 EXIT';gate.setAttribute('aria-hidden','true');board.appendChild(gate);
    const first=cars.findIndex((c,i)=>c&&L.canExit(cars,i));
    cars.forEach((car,i)=>{
      if(!car)return;const run=P.epoch,arrow=direction(car);
      const b=P.button('',()=>{if(run===P.epoch)exit(i,b);},lot,car.id+'번 차, '+(car.y+1)+'행 '+(car.x+1)+'열, '+arrow+' 방향으로 나가기');b.className='car color-'+car.color+' car-'+car.axis+(car.dir<0?' reverse':'');
      const body=document.createElement('span');body.className='car-body';
      for(const name of ['car-glass','car-roof','car-label']){const part=document.createElement('span');part.className=name;if(name==='car-label')part.textContent=car.id+(car.axis==='v'?'\n':' ')+arrow;body.appendChild(part);}b.appendChild(body);
      for(let w=0;w<4;w++){const wheel=document.createElement('i');wheel.className='wheel wheel-'+w;b.appendChild(wheel);}
      Object.assign(b.style,{left:car.x/6*100+'%',top:car.y/6*100+'%',width:(car.axis==='h'?car.len:1)/6*100+'%',height:(car.axis==='v'?car.len:1)/6*100+'%'});b.dataset.index=i;
      if(P.level===1&&!P.moves&&i===first){const hand=document.createElement('span');hand.className='tutorial-hand';hand.textContent='👆';hand.setAttribute('aria-hidden','true');b.appendChild(hand);}
    });
    if(focus!==undefined){const buttons=Array.from(lot.querySelectorAll('button')),next=buttons.find(b=>+b.dataset.index>focus)||buttons[0];if(next)next.focus();}
  }
  P.mount(()=>{busy=false;cars=L.level(P.level);total=cars.length;P.goal({note:'막힌 차를 누르면 충돌'});render();P.say(P.level===1?'👆 손가락이 가리키는 차를 눌러 보세요. 화살표 방향으로 나가요.':'차는 화살표 방향으로 끝까지 가요. 막힌 차를 누르면 부딪혀서 하트가 줄어요.');});
})();
