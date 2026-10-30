/* Shared level flow; game state stays inside each game's controller. */
(function () {
  'use strict';
  window.AdPuzzle = function (key, maxLevel) {
    const $ = id => document.getElementById(id);
    const saved = Number(MG.store.get(key + '.level', 1));
    let level = Number.isFinite(saved) ? Math.max(1, Math.min(maxLevel || 9999, Math.floor(saved))) : 1;
    let moves = 0, over = false, start;
    const api = {
      $,
      get level() { return level; },
      get over() { return over; },
      get moves() { return moves; },
      say(text) { $('status').textContent = text; },
      move() { $('moves').textContent = ++moves; },
      win() {
        if (over) return;
        over = true;
        $('next').disabled = false;
        $('next').textContent = maxLevel && level === maxLevel ? '처음 단계로' : '다음 단계';
        $('extras').querySelectorAll('button').forEach(b => { b.disabled = true; });
        $('next').focus();
        api.say('🎉 성공했어요! ' + (maxLevel && level === maxLevel ? '모든 단계를 완성했어요.' : '다음 단계에 도전해 보세요.'));
      },
      fail(text) { over = true; api.say(text + ' 다시 하기로 도전해 보세요.'); },
      button(text, fn, parent, label) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn';
        b.textContent = text; if (label) b.setAttribute('aria-label', label);
        b.addEventListener('click', fn); (parent || $('extras')).appendChild(b); return b;
      },
      mount(fn) { start = fn; reset(); }
    };
    function reset() {
      moves = 0; over = false; $('moves').textContent = 0;
      $('level').textContent = level + (maxLevel ? ' / ' + maxLevel : '');
      $('next').disabled = true; $('status').textContent = '';
      $('board').replaceChildren(); $('extras').replaceChildren();
      MG.store.set(key + '.level', level); start();
    }
    $('restart').onclick = reset;
    $('next').onclick = function () {
      if (!over || $('next').disabled) return;
      level = maxLevel && level === maxLevel ? 1 : Math.min(9999, level + 1); reset();
      $('restart').focus();
    };
    return api;
  };
})();
