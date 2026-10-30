(function () {
  'use strict';
  const P = AdPuzzle('parking-jam',12), L = ParkingLogic;
  let cars;
  P.$('instructions').textContent = '화살표 방향으로 앞길이 빈 차를 눌러 주차장 밖으로 보내요. 차는 회전하지 않고 직선으로만 움직여요. 막힌 차를 누르면 이동 횟수에 포함하지 않아요.';
  function render(focus) {
    const board = P.$('board'); board.className = 'puzzle-board parking-board'; board.replaceChildren();
    cars.forEach((car,i) => {
      if (!car) return;
      const arrow = car.axis === 'h' ? (car.dir>0?'→':'←') : (car.dir>0?'↓':'↑');
      const b = P.button(car.id+' '+arrow, () => {
        if(P.over) return;
        if(!L.canExit(cars,i)) { P.say(car.id+'번 차 앞이 막혀 있어요. 다른 차를 먼저 보내요.'); return; }
        cars[i]=null; P.move(); P.say(car.id+'번 차가 나갔어요.'); render(i);
        if(cars.every(c=>!c)) P.win();
      }, board, car.id+'번 차, '+(car.y+1)+'행 '+(car.x+1)+'열, '+arrow+' 방향으로 나가기');
      b.className='car color-'+car.color;
      const style=b.style; style.left=(car.x/6*100)+'%'; style.top=(car.y/6*100)+'%';
      style.width=((car.axis==='h'?car.len:1)/6*100)+'%'; style.height=((car.axis==='v'?car.len:1)/6*100)+'%';
      b.dataset.index=i;
    });
    if(focus!==undefined) { const next=Array.from(board.children).find(b=>+b.dataset.index>focus)||board.firstElementChild; if(next)next.focus(); else P.$('next').focus(); }
  }
  P.mount(() => { cars=L.level(P.level); render(); });
})();
