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
    var groups = Object.create(null), order = [], i;
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

  // Fisher–Yates chooses every result permutation equally; adjacent swaps draw that result.
  L.buildLadder = function (n, rnd) {
    rnd = rnd || Math.random;
    n = Math.max(2, n | 0);
    var target = [], positions = [], rungs = [], levels = Math.max(11, n);
    for (var i = 0; i < n; i++) { target.push(i); positions.push(i); }
    shuffle(target, rnd);
    for (var l = 0; l < levels; l++) {
      var row = new Array(n - 1).fill(false);
      for (var c = l % 2; c < n - 1; c += 2) {
        if (target[positions[c]] > target[positions[c + 1]]) {
          row[c] = true;
          var t = positions[c]; positions[c] = positions[c + 1]; positions[c + 1] = t;
        }
      }
      rungs.push(row);
    }
    // Add cancelling rung pairs below the permutation. With no neighboring
    // column rung between a pair, every path in that column returns unchanged.
    var counts = new Array(n - 1).fill(0);
    rungs.forEach(function (row) {
      row.forEach(function (present, c) { if (present) counts[c]++; });
    });
    var extra = [];
    for (var c = 0; c < n - 1; c++) {
      while (counts[c] < 2) {
        var pair = new Array(n - 1).fill(false);
        pair[c] = true;
        extra.push(pair, pair.slice());
        counts[c] += 2;
      }
    }
    rungs = rungs.concat(extra);
    levels = rungs.length;
    return { levels: levels, rungs: rungs, ends: L.traceAll(rungs, n, levels) };
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
