/* 블록 쌓기 — rules only (no DOM). Shared by the page and scripts/audit-sanity.cjs. */
(function (root) {
  'use strict';
  var W = 10, H = 20;
  // Each piece is drawn in an N×N box; rotations are derived by turning the box.
  var BASE = {
    I: ['....', '####', '....', '....'],
    O: ['##', '##'],
    T: ['.#.', '###', '...'],
    S: ['.##', '##.', '...'],
    Z: ['##.', '.##', '...'],
    J: ['#..', '###', '...'],
    L: ['..#', '###', '...']
  };
  var TYPES = Object.keys(BASE), SHAPES = {};
  TYPES.forEach(function (t) {
    var n = BASE[t].length, cells = [], x, y;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (BASE[t][y][x] === '#') cells.push([x, y]);
    var rots = [cells];
    for (var r = 1; r < 4; r++) rots.push(rots[r - 1].map(function (c) { return [n - 1 - c[1], c[0]]; }));
    SHAPES[t] = { size: n, rots: rots };
  });
  // When a turn is blocked, try nudging the piece: sideways first, then up one row.
  var KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [2, 0]];

  function cells(p) { return SHAPES[p.t].rots[p.r].map(function (c) { return [p.x + c[0], p.y + c[1]]; }); }
  function collides(grid, p) {
    return cells(p).some(function (c) {
      return c[0] < 0 || c[0] >= W || c[1] >= H || (c[1] >= 0 && grid[c[1]][c[0]]);
    });
  }
  function emptyRow() { var row = []; for (var x = 0; x < W; x++) row.push(0); return row; }
  function bag(rng) {
    var a = TYPES.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function refill(s) { while (s.queue.length < 7) s.queue = s.queue.concat(bag(s.rng)); }
  function spawn(s, type) {
    var t = type || s.queue.shift(); refill(s);
    var size = SHAPES[t].size;
    s.piece = { t: t, r: 0, x: Math.floor((W - size) / 2), y: t === 'I' ? -1 : 0 };
    if (collides(s.grid, s.piece)) s.over = true;
  }
  function create(rng) {
    var s = { rng: rng || Math.random, grid: [], queue: [], hold: null, canHold: true, piece: null,
      score: 0, lines: 0, level: 1, over: false, clearing: null };
    for (var y = 0; y < H; y++) s.grid.push(emptyRow());
    refill(s); spawn(s);
    return s;
  }
  function busy(s) { return s.over || !!s.clearing || !s.piece; }
  function move(s, dx) {
    if (busy(s)) return false;
    var p = { t: s.piece.t, r: s.piece.r, x: s.piece.x + dx, y: s.piece.y };
    if (collides(s.grid, p)) return false;
    s.piece = p; return true;
  }
  function rotate(s, dir) {
    if (busy(s)) return false;
    if (s.piece.t === 'O') return true;
    var r = (s.piece.r + (dir < 0 ? 3 : 1)) % 4;
    for (var i = 0; i < KICKS.length; i++) {
      var p = { t: s.piece.t, r: r, x: s.piece.x + KICKS[i][0], y: s.piece.y + KICKS[i][1] };
      if (!collides(s.grid, p)) { s.piece = p; return true; }
    }
    return false;
  }
  function grounded(s) {
    if (busy(s)) return false;
    return collides(s.grid, { t: s.piece.t, r: s.piece.r, x: s.piece.x, y: s.piece.y + 1 });
  }
  // One row down. `soft` marks a player-driven drop, which earns 1 point per row.
  function down(s, soft) {
    if (busy(s) || grounded(s)) return false;
    s.piece.y++; if (soft) s.score += 1;
    return true;
  }
  function ghostY(s) {
    var p = { t: s.piece.t, r: s.piece.r, x: s.piece.x, y: s.piece.y };
    while (!collides(s.grid, { t: p.t, r: p.r, x: p.x, y: p.y + 1 })) p.y++;
    return p.y;
  }
  // Fix the piece in place and report full rows. The rows stay visible until settle() runs.
  function lock(s) {
    if (busy(s)) return [];
    var above = false;
    cells(s.piece).forEach(function (c) { if (c[1] < 0) above = true; else s.grid[c[1]][c[0]] = s.piece.t; });
    s.piece = null;
    var rows = [];
    for (var y = 0; y < H; y++) if (s.grid[y].every(Boolean)) rows.push(y);
    s.clearing = rows;
    if (above && !rows.length) { s.over = true; s.clearing = null; }
    return rows;
  }
  var LINE_SCORE = [0, 100, 300, 500, 800];
  // Remove the full rows, score them, and bring in the next piece.
  function settle(s) {
    if (!s.clearing) return 0;
    var rows = s.clearing, n = rows.length;
    s.clearing = null;
    if (n) {
      s.grid = s.grid.filter(function (_, y) { return rows.indexOf(y) < 0; });
      while (s.grid.length < H) s.grid.unshift(emptyRow());
      s.score += LINE_SCORE[n] * s.level;
      s.lines += n;
      s.level = 1 + Math.floor(s.lines / 10);
    }
    s.canHold = true;
    spawn(s);
    return n;
  }
  function hardDrop(s) {
    if (busy(s)) return null;
    var y = ghostY(s), dist = y - s.piece.y;
    s.piece.y = y; s.score += dist * 2;
    return lock(s);
  }
  // Swap the falling piece with the kept one. Allowed once per piece.
  function hold(s) {
    if (busy(s) || !s.canHold) return false;
    var cur = s.piece.t, kept = s.hold;
    s.hold = cur; s.canHold = false;
    spawn(s, kept || undefined);
    return true;
  }
  // Milliseconds per row of gravity: 800 at level 1, about 15% faster each level, never under 70.
  function interval(level) { return Math.max(70, Math.round(800 * Math.pow(0.85, level - 1))); }

  root.BlocksLogic = { W: W, H: H, TYPES: TYPES, SHAPES: SHAPES, create: create, cells: cells, collides: collides, move: move,
    rotate: rotate, grounded: grounded, down: down, ghostY: ghostY, lock: lock, settle: settle, hardDrop: hardDrop, hold: hold,
    interval: interval };
})(typeof window !== 'undefined' ? window : globalThis);
