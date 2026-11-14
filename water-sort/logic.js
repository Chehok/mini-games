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
  // Weighted best-first search over maximal pours. Tube order does not matter, so states are
  // keyed with sorted tubes. Returns a move list (not always the shortest) or null.
  function solve(start, maxNodes = 40000) {
    const key = tubes => tubes.map(t => t.join('')).sort().join('|');
    const breaks = tubes => {
      let h = 0; const seenBottom = new Map();
      for (const t of tubes) { for (let i = 1; i < t.length; i++) if (t[i] !== t[i-1]) h++; if (t.length) seenBottom.set(t[0], (seenBottom.get(t[0]) || 0) + 1); }
      for (const n of seenBottom.values()) h += n - 1;
      return h;
    };
    const open = [{tubes:start, path:[], f:breaks(start)}], seen = new Set([key(start)]);
    let nodes = 0;
    while (open.length && nodes < maxNodes) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open[bi]; open[bi] = open[open.length-1]; open.pop(); nodes++;
      if (solved(cur.tubes)) return cur.path;
      for (let a = 0; a < cur.tubes.length; a++) for (let b = 0; b < cur.tubes.length; b++) {
        const next = pour(cur.tubes, a, b); if (!next) continue;
        // Moving a finished tube or a single-color tube into an empty one never helps.
        const src = cur.tubes[a]; if (!cur.tubes[b].length && src.every(c => c === src[0])) continue;
        const k = key(next); if (seen.has(k)) continue; seen.add(k);
        const path = cur.path.concat([[a, b]]);
        open.push({tubes:next, path, f:path.length * .5 + breaks(next) * 2});
      }
    }
    return null;
  }
  function shuffled(colors, empties, random) {
    for (let tries = 0; tries < 60; tries++) {
      const units = []; for (let c = 0; c < colors; c++) for (let i = 0; i < CAP; i++) units.push(c);
      for (let i = units.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [units[i], units[j]] = [units[j], units[i]]; }
      const tubes = Array.from({length:colors}, (_, t) => units.slice(t * CAP, t * CAP + CAP)).concat(Array.from({length:empties}, () => []));
      // No tube may start finished or nearly finished.
      if (tubes.some(t => t.length === CAP && t.filter(c => c === t[0]).length >= CAP - 1)) continue;
      const solution = solve(tubes);
      if (solution) return {tubes, solution};
    }
    return null;
  }
  function generate(level, random) {
    random = random || Math.random;
    // Three easy pours teach selecting a source, using an empty tube, then matching.
    if (level === 1) return {tubes:[[0,0,0,1],[1,1,1,0],[],[]],solution:[[0,2],[1,0],[2,1]],colors:2,empties:2};
    const colors = Math.min(10, 2 + Math.floor((level - 1) / 3));
    // One spare tube on mid-size boards from level 16 and on boss levels: every pour has to count.
    // Ten-color boards keep two spares (with one, most shuffles have no solution) and get tight move limits instead.
    const empties = colors <= 7 && (level >= 16 || level % 10 === 0) ? 1 : 2;
    // From level 6 the tubes are fully shuffled and kept only when the solver finds a way through.
    if (level >= 6) { const made = shuffled(colors, empties, random); if (made) return {...made, colors, empties}; }
    let state = Array.from({length:colors}, (_,c) => Array(CAP).fill(c)).concat(Array.from({length:empties}, () => []));
    const solution = []; const seen = new Set([JSON.stringify(state)]);
    // A reverse step is accepted only when the real, maximal forward pour restores its parent.
    const steps = level <= 3 ? 4 + level * 3 : 14 + Math.min(level, 40) * 3;
    for (let step = 0; step < steps; step++) {
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
    return {tubes:state, solution, colors, empties};
  }
  root.WaterLogic = {CAP, solved, pour, solve, generate};
})(typeof window === 'undefined' ? globalThis : window);
