(function () {
  'use strict';
  const P = AdPuzzle('water-sort'), L = WaterLogic;
  const symbols = ['●','▲','■','◆','★','✚'], names = ['빨강 동그라미','파랑 세모','초록 네모','보라 마름모','갈색 별','회청 십자'];
  let tubes, initial, history, selected, extra, undoButton, extraButton;
  P.$('instructions').textContent = '시험관을 고른 뒤 옮길 시험관을 눌러요. 맨 위가 같은 색이거나 빈 곳에만 부을 수 있어요. 색마다 기호도 있어요.';
  function render(focus) {
    const board = P.$('board'); board.className = 'puzzle-board water-board'; board.replaceChildren();
    tubes.forEach((tube, i) => {
      const b = P.button('', () => tap(i), board); b.className = 'tube' + (selected === i ? ' selected' : ''); b.disabled = P.over;
      b.setAttribute('aria-pressed', String(selected === i));
      b.setAttribute('aria-label', (i+1) + '번 시험관, 아래부터 ' + (tube.map(c => names[c]).join(', ') || '비어 있어요'));
      const num = document.createElement('span'); num.className = 'tube-number'; num.textContent = i+1; b.appendChild(num);
      tube.forEach(c => { const w = document.createElement('span'); w.className = 'water color-' + c; w.textContent = symbols[c]; w.setAttribute('aria-hidden','true'); b.appendChild(w); });
    });
    undoButton.disabled = !history.length || P.over; extraButton.disabled = extra || P.over;
    if (P.over) P.$('next').focus();
    else if (focus !== undefined) board.children[focus].focus();
  }
  function tap(i) {
    if (P.over) return;
    if (selected === null) { if (!tubes[i].length) { P.say('물이 든 시험관을 먼저 골라 주세요.'); return; } selected = i; render(i); return; }
    if (selected === i) { selected = null; render(i); return; }
    const next = L.pour(tubes, selected, i);
    if (!next) { P.say('같은 색 위나 빈 시험관에만 부을 수 있어요. 공간도 확인해 주세요.'); selected = null; render(i); return; }
    history.push(tubes); tubes = next; selected = null; P.move(); P.say('물을 옮겼어요.');
    if (L.solved(tubes)) P.win(); render(i);
  }
  P.mount(() => {
    // Restart restores the identical puzzle, including its original reverse-shuffle seed.
    let seed = Math.imul(P.level, 7919) >>> 0;
    const rnd = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    initial = L.generate(P.level, rnd).tubes; tubes = initial.map(t => t.slice()); history = []; selected = null; extra = false;
    undoButton = P.button('되돌리기', () => { if (!history.length || P.over) return; tubes = history.pop(); if (extra && tubes.length === initial.length) tubes.push([]); selected = null; P.say('한 번 되돌렸어요.'); render(); undoButton.focus(); });
    extraButton = P.button('힌트: 빈 시험관 추가', () => { if (extra || P.over) return; tubes.push([]); extra = true; selected = null; P.say('빈 시험관을 하나 추가했어요.'); render(); });
    render();
  });
})();
