/* 진행 도구 — DOM 없는 계산 (사다리 순열, 룰렛 각도, 팀 배정). */
(function (root) {
  'use strict';

  var L = {};

  L.parseList = function (txt) {
    return String(txt || '').split(/[\n,、，]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  };

  L.plain = function (s) {
    return String(s == null ? '' : s).split('/')[0].trim();
  };

  L.isDevResults = function (list) {
    if (!list || !list.length) return false;
    for (var i = 0; i < list.length; i++) {
      var s = list[i] == null ? '' : String(list[i]).trim();
      if (s !== 'R' + i) return false;
    }
    return true;
  };

  function shuffle(arr, rnd) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // 이름/태그: 태그 안에서는 섞고, 팀에는 한 명씩 돌아가며 넣어 인원·태그가 고르다.
  L.splitTeams = function (list, n, rnd) {
    rnd = rnd || Math.random;
    var groups = {}, order = [], i;
    for (i = 0; i < list.length; i++) {
      var parts = String(list[i]).split('/');
      var name = parts[0].trim();
      var tag = (parts[1] || '').trim();
      if (!name) continue;
      if (!groups[tag]) { groups[tag] = []; order.push(tag); }
      groups[tag].push(name);
    }
    var teams = [];
    for (i = 0; i < n; i++) teams.push([]);
    var ptr = n ? Math.floor(rnd() * n) : 0;
    shuffle(order, rnd).forEach(function (tag) {
      shuffle(groups[tag], rnd).forEach(function (person) {
        teams[ptr % n].push(person);
        ptr++;
      });
    });
    return teams.map(function (t) { return shuffle(t.slice(), rnd); });
  };

  L.trace = function (start, rungs, levels) {
    var pos = start;
    var pts = [[pos, 0]];
    for (var l = 0; l < levels; l++) {
      pts.push([pos, l + 1]);
      if (pos < rungs[l].length && rungs[l][pos]) {
        pos++;
        pts.push([pos, l + 1]);
      } else if (pos > 0 && rungs[l][pos - 1]) {
        pos--;
        pts.push([pos, l + 1]);
      }
    }
    pts.push([pos, levels + 1]);
    return { pts: pts, end: pos };
  };

  L.traceAll = function (rungs, n, levels) {
    var ends = [];
    for (var s = 0; s < n; s++) ends.push(L.trace(s, rungs, levels).end);
    return ends;
  };

  function rungsValid(rungs, n) {
    for (var l = 0; l < rungs.length; l++) {
      if (rungs[l].length !== n - 1) return false;
      for (var c = 0; c < n - 2; c++) {
        if (rungs[l][c] && rungs[l][c + 1]) return false;
      }
    }
    return true;
  }

  function isPerm(ends) {
    var seen = {};
    for (var i = 0; i < ends.length; i++) {
      if (ends[i] < 0 || ends[i] >= ends.length || seen[ends[i]]) return false;
      seen[ends[i]] = 1;
    }
    return true;
  }

  function isIdentity(ends) {
    for (var i = 0; i < ends.length; i++) if (ends[i] !== i) return false;
    return true;
  }

  function randomRungs(n, levels, rnd) {
    var rungs = [], l, c, row;
    for (l = 0; l < levels; l++) {
      row = [];
      for (c = 0; c < n - 1; c++) {
        var blocked = c > 0 && row[c - 1];
        row.push(!blocked && rnd() < 0.5);
      }
      rungs.push(row);
    }
    for (var pass = 0; pass < 6; pass++) {
      var all = true;
      for (c = 0; c < n - 1; c++) {
        var has = false;
        for (l = 0; l < levels; l++) if (rungs[l][c]) has = true;
        if (has) continue;
        all = false;
        var opts = [];
        for (l = 0; l < levels; l++) {
          var left = c > 0 && rungs[l][c - 1];
          var right = c + 1 < n - 1 && rungs[l][c + 1];
          if (!left && !right) opts.push(l);
        }
        if (opts.length) {
          rungs[opts[Math.floor(rnd() * opts.length)]][c] = true;
        } else {
          l = Math.floor(rnd() * levels);
          if (c > 0) rungs[l][c - 1] = false;
          if (c + 1 < n - 1) rungs[l][c + 1] = false;
          rungs[l][c] = true;
        }
      }
      if (all) break;
    }
    return rungs;
  }

  function fallbackRungs(n, levels) {
    var rungs = [], l, c;
    for (l = 0; l < levels; l++) {
      var row = [];
      for (c = 0; c < n - 1; c++) row.push(false);
      rungs.push(row);
    }
    for (c = 0; c < n - 1; c++) {
      l = (c % 2 === 0) ? 0 : Math.min(1, levels - 1);
      rungs[l][c] = true;
    }
    return rungs;
  }

  L.buildLadder = function (n, rnd) {
    rnd = rnd || Math.random;
    n = Math.max(2, n | 0);
    var levels = n <= 4 ? 11 : n <= 7 ? 12 : 10;
    var rungs = null, ends = null;
    for (var attempt = 0; attempt < 24; attempt++) {
      var candidate = randomRungs(n, levels, rnd);
      if (!rungsValid(candidate, n)) continue;
      var e = L.traceAll(candidate, n, levels);
      if (!isPerm(e)) continue;
      rungs = candidate;
      ends = e;
      if (!isIdentity(e)) break;
    }
    if (!rungs || !isPerm(ends) || isIdentity(ends)) {
      rungs = fallbackRungs(n, levels);
      ends = L.traceAll(rungs, n, levels);
    }
    return { levels: levels, rungs: rungs, ends: ends };
  };

  function mod(a, m) {
    return ((a % m) + m) % m;
  }

  // 포인터(맨 위, 캔버스 각도 -π/2)가 가리키는 조각.
  L.winnerIndex = function (angle, n) {
    if (!n || n < 1) return 0;
    var seg = Math.PI * 2 / n;
    var a = mod(-angle, Math.PI * 2);
    var i = Math.floor((a + 1e-9) / seg);
    if (i >= n) i = 0;
    if (i < 0) i = 0;
    return i;
  };

  // 조각 0의 가운데가 포인터에 오도록. 경계선 위에 멈추지 않음.
  L.restAngle = function (n) {
    return n ? -Math.PI / n : 0;
  };

  // 현재 각도에서 win 조각 안쪽으로, 시계 반대(각도 감소)로 turns 바퀴 이상.
  L.spinTarget = function (current, win, n, rnd, turns) {
    rnd = rnd || Math.random;
    turns = turns || 6;
    var seg = Math.PI * 2 / n;
    var f = 0.36 + rnd() * 0.28;
    var norm = -((win + f) * seg);
    var maxEnd = current - turns * Math.PI * 2;
    var end = norm;
    var guard = 0;
    while (end > maxEnd && guard++ < 48) end -= Math.PI * 2;
    guard = 0;
    while (end <= maxEnd - Math.PI * 2 && guard++ < 48) end += Math.PI * 2;
    return end;
  };

  // mid: 조각이 바깥을 향하는 캔버스 각도(0=오른쪽, 시계 방향).
  // 왼쪽 절반은 180° 뒤집어 글자가 거꾸로 읽히지 않게 한다.
  L.labelPose = function (mid) {
    var n = Math.atan2(Math.sin(mid), Math.cos(mid));
    var flip = Math.abs(n) > (Math.PI / 2 + 1e-8);
    return { flip: flip, rot: flip ? mid + Math.PI : mid, x: flip ? -1 : 1 };
  };

  L.labelUpright = function (rot) {
    var n = Math.atan2(Math.sin(rot), Math.cos(rot));
    return Math.cos(n) > -0.02;
  };

  root.ToolsLogic = L;
})(typeof window !== 'undefined' ? window : globalThis);
