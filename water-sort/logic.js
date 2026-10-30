(function (root) {
  'use strict';
  const CAP = 4;
  function solved(tubes) { return tubes.every(t => !t.length || (t.length === CAP && t.every(c => c === t[0]))); }
  function pour(tubes, from, to) {
    if (from === to || !tubes[from].length || tubes[to].length === CAP) return null;
    const a = tubes[from], b = tubes[to], color = a[a.length - 1];
    if (b.length && b[b.length - 1] !== color) return null;
    let run = 1;
    while (run < a.length && a[a.length - 1 - run] === color) run++;
    const amount = Math.min(run, CAP - b.length), next = tubes.map(t => t.slice());
    next[to].push(...next[from].splice(a.length - amount, amount)); return next;
  }
  function generate(level, random) {
    random = random || Math.random;
    const colors = Math.min(10, 2 + Math.floor((level - 1) / 3));
    let state = Array.from({length:colors}, (_,c) => Array(CAP).fill(c)).concat([[], []]);
    const solution = []; const seen = new Set([JSON.stringify(state)]);
    // A reverse step is accepted only when the real, maximal forward pour restores its parent.
    for (let step = 0; step < 14 + Math.min(level, 40) * 5; step++) {
      const candidates = [];
      for (let a = 0; a < state.length; a++) for (let b = 0; b < state.length; b++) {
        if (a === b || !state[a].length) continue;
        const color = state[a].at(-1);
        for (let n = 1; n <= Math.min(state[a].length, CAP - state[b].length); n++) {
          if (!state[a].slice(-n).every(c => c === color)) break;
          const next = state.map(t => t.slice()); next[b].push(...next[a].splice(-n));
          const restored = pour(next, b, a);
          const key = JSON.stringify(next);
          if (restored && JSON.stringify(restored) === JSON.stringify(state) && !seen.has(key)) candidates.push({next, a, b, key});
        }
      }
      if (!candidates.length) break;
      const pick = candidates[Math.floor(random() * candidates.length)];
      state = pick.next; seen.add(pick.key); solution.unshift([pick.b, pick.a]);
    }
    // A rare shuffle may only permute whole tubes. Keep even that seed playable.
    if(solved(state)) {
      const a=state.findIndex(t=>t.length===CAP),b=state.findIndex(t=>!t.length);
      state=state.map(t=>t.slice());state[b].push(state[a].pop());solution.unshift([b,a]);
    }
    return {tubes:state, solution, colors};
  }
  root.WaterLogic = {CAP, solved, pour, generate};
})(typeof window === 'undefined' ? globalThis : window);
