/* Mini Games — team round engine (몸으로 말해요 / 스피드 퀴즈 / 금지어 게임)
   TeamRound.start({ key, emoji, cats:[{name, emoji, group, items:[{w, f?}]}], mode:'act'|'explain'|'taboo', ... }) */
(function () {
  'use strict';
  var COLORS = ['#ef4444', '#3b82f6', '#22a06b', '#f59e0b'];
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function start(cfg) {
    var root = document.getElementById('app');
    var KEY = cfg.key + '.settings';
    var allCats = cfg.cats;
    var def = {
      n: 2, names: ['1팀', '2팀', '3팀', '4팀'], time: cfg.defaultTime || 60, passes: 3, rounds: 2,
      cats: allCats.map(function (c) { return c.name; })
    };
    var S = Object.assign({}, def, MG.store.get(KEY, {}));
    S.cats = (S.cats || []).filter(function (n) { return allCats.some(function (c) { return c.name === n; }); });
    if (!S.cats.length) S.cats = def.cats;
    function save() { MG.store.set(KEY, S); }

    var session = null, turn = null, queue = [], lastItem = null, tickId = null, timers = [];
    function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
    function clearAll() { clearInterval(tickId); tickId = null; timers.forEach(clearTimeout); timers = []; }

    function pool() {
      var a = [];
      allCats.forEach(function (c) {
        if (S.cats.indexOf(c.name) < 0) return;
        c.items.forEach(function (it) { a.push({ w: it.w, f: it.f || null, c: c.name }); });
      });
      return a;
    }
    function nextItem() {
      if (!queue.length) {
        queue = MG.shuffle(pool());
        if (lastItem && queue.length > 1 && queue[queue.length - 1].w === lastItem.w) queue.unshift(queue.pop());
        if (session && session.drawn > 0) MG.toast('단어를 모두 한 번씩 썼어요. 다시 섞을게요!', 2200);
      }
      lastItem = queue.pop(); if (session) session.drawn++;
      return lastItem;
    }
    function teamName(i) { return (S.names[i] || '').trim() || (i + 1) + '팀'; }
    function dot(i) { return '<span class="team-dot" style="background:' + COLORS[i] + '"></span>'; }
    function scoreboardHtml(highlight) {
      var order = session.teams.map(function (t, i) { return { i: i, s: t.score }; });
      var top = Math.max.apply(null, order.map(function (o) { return o.s; }));
      return '<div class="scoreboard">' + order.map(function (o) {
        return '<div class="srow' + (top > 0 && o.s === top ? ' first' : '') + '">' + dot(o.i) + '<span class="name">' + esc(teamName(o.i)) + (o.i === highlight ? ' ◀' : '') + '</span><span class="pts">' + o.s + '</span></div>';
      }).join('') + '</div>';
    }

    /* ---------- 설정 ---------- */
    function renderSetup() {
      clearAll(); MG.wake.off(); session = null;
      var hasBible = allCats.some(function (c) { return c.group === '성경'; });
      var h = '<div class="tr-screen">';
      h += '<div class="panel center"><div class="tr-emoji" style="margin:0">' + cfg.emoji + '</div><p class="tr-note" style="margin:4px 0 0">' + esc(cfg.intro) + '</p></div>';
      h += '<div class="panel"><h2>팀</h2><div class="row center" style="margin-bottom:10px"><div class="seg" id="nSeg" role="group" aria-label="팀 수">' +
        [2, 3, 4].map(function (n) { return '<button data-n="' + n + '" aria-pressed="' + (S.n === n) + '">' + n + '팀</button>'; }).join('') + '</div></div>';
      h += '<div class="team-inputs">';
      for (var i = 0; i < S.n; i++) h += '<div class="row" style="flex-wrap:nowrap;align-items:center">' + dot(i) + '<input class="input tname" data-i="' + i + '" maxlength="10" value="' + esc(S.names[i]) + '" aria-label="' + (i + 1) + '번째 팀 이름"></div>';
      h += '</div></div>';
      h += '<div class="panel"><h2>카테고리 <span class="muted" id="poolCount" style="font-weight:500;font-size:.8rem"></span></h2><div class="chips" id="catChips">' +
        allCats.map(function (c) { return '<button class="chip" type="button" data-c="' + esc(c.name) + '" aria-pressed="' + (S.cats.indexOf(c.name) >= 0) + '">' + c.emoji + ' ' + esc(c.name) + '</button>'; }).join('') + '</div>' +
        '<div class="row" style="margin-top:10px"><button class="btn small" id="qAll" type="button">전체 선택</button>' +
        (hasBible ? '<button class="btn small" id="qBible" type="button">✝️ 성경만</button><button class="btn small" id="qGen" type="button">일반만</button>' : '') + '</div></div>';
      h += '<div class="panel"><div class="field" style="margin-top:0"><span class="label">한 턴 시간</span><div class="seg" id="tSeg">' +
        cfg.timeOptions.map(function (t) { return '<button data-t="' + t + '" aria-pressed="' + (S.time === t) + '">' + t + '초</button>'; }).join('') + '</div></div>' +
        '<div class="field"><span class="label">패스 가능 횟수 (턴당)</span><div class="seg" id="pSeg">' +
        [[1, '1번'], [3, '3번'], [5, '5번'], [0, '무제한']].map(function (o) { return '<button data-p="' + o[0] + '" aria-pressed="' + (S.passes === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><span class="label">팀당 턴 수 (라운드)</span><div class="seg" id="rSeg">' +
        [1, 2, 3].map(function (r) { return '<button data-r="' + r + '" aria-pressed="' + (S.rounds === r) + '">' + r + '번</button>'; }).join('') + '</div></div></div>';
      h += '<button class="btn primary big wide" id="startBtn" type="button">게임 시작 ▶</button></div>';
      root.innerHTML = h;
      updatePoolCount();
      $('#nSeg').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; S.n = +b.dataset.n; save(); renderSetup(); };
      root.querySelectorAll('.tname').forEach(function (el) { el.oninput = function () { S.names[+el.dataset.i] = el.value; save(); }; });
      $('#catChips').onclick = function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        var n = b.dataset.c, ix = S.cats.indexOf(n);
        if (ix >= 0) { if (S.cats.length === 1) { MG.toast('카테고리를 하나 이상 선택해 주세요'); return; } S.cats.splice(ix, 1); } else S.cats.push(n);
        b.setAttribute('aria-pressed', ix < 0 ? 'true' : 'false'); save(); updatePoolCount();
      };
      function setCats(list) { S.cats = list; save(); root.querySelectorAll('#catChips .chip').forEach(function (b) { b.setAttribute('aria-pressed', list.indexOf(b.dataset.c) >= 0 ? 'true' : 'false'); }); updatePoolCount(); }
      $('#qAll').onclick = function () { setCats(allCats.map(function (c) { return c.name; })); };
      if ($('#qBible')) {
        $('#qBible').onclick = function () { setCats(allCats.filter(function (c) { return c.group === '성경'; }).map(function (c) { return c.name; })); };
        $('#qGen').onclick = function () { setCats(allCats.filter(function (c) { return c.group !== '성경'; }).map(function (c) { return c.name; })); };
      }
      function segHandler(id, attr, key) {
        $(id).onclick = function (e) {
          var b = e.target.closest('button'); if (!b) return; S[key] = +b.dataset[attr]; save();
          $(id).querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        };
      }
      segHandler('#tSeg', 't', 'time'); segHandler('#pSeg', 'p', 'passes'); segHandler('#rSeg', 'r', 'rounds');
      $('#startBtn').onclick = function () { MG.unlockAudio(); startSession(); };
    }
    function updatePoolCount() { var el = $('#poolCount'); if (el) el.textContent = '(' + pool().length + '개)'; }

    /* ---------- 진행 ---------- */
    function startSession() {
      session = { teams: [], t: 0, total: S.n * S.rounds, drawn: 0 };
      for (var i = 0; i < S.n; i++) session.teams.push({ score: 0 });
      queue = []; lastItem = null;
      MG.wake.on();
      renderReady();
    }
    function curTeam() { return session.t % S.n; }

    function renderReady() {
      clearAll();
      var ti = curTeam(), round = Math.floor(session.t / S.n) + 1;
      var h = '<div class="tr-screen"><div class="panel center" style="border:3px solid ' + COLORS[ti] + '">' +
        '<div class="muted" style="font-weight:700">' + round + '라운드 / ' + S.rounds + ' · ' + (session.t + 1) + '/' + session.total + '번째 턴</div>' +
        '<div class="tr-emoji">' + cfg.emoji + '</div>' +
        '<div class="tr-turn" style="font-size:1.6rem">' + dot(ti) + esc(teamName(ti)) + ' 차례!</div>' +
        '<p class="tr-note">' + esc(cfg.readyNote) + '</p>' +
        '<button class="btn primary big wide" id="goBtn" type="button">준비됐어요! 시작 ▶</button></div>' +
        '<div class="panel"><h2>점수</h2>' + scoreboardHtml(ti) + '</div>' +
        '<div class="toolbar"><button class="btn small" id="quitBtn" type="button">게임 그만하기</button></div></div>';
      root.innerHTML = h;
      $('#goBtn').onclick = function () { MG.unlockAudio(); countdown(3); };
      $('#quitBtn').onclick = function () {
        MG.dialog({ title: '게임을 그만할까요?', text: '지금까지의 점수로 최종 결과를 보여 드려요.', buttons: [{ label: '결과 보기', primary: true, onClick: renderFinal }, { label: '계속하기' }] });
      };
    }

    function countdown(n) {
      root.innerHTML = '<div class="tr-screen"><div class="tr-note" style="margin-top:30px">' + esc(cfg.countNote) + '</div><div class="tr-count" id="cnt">' + n + '</div></div>';
      MG.beep(n === 0 ? 1040 : 660, 120);
      if (n > 1) later(function () { countdown(n - 1); }, 900);
      else later(startTurn, 900);
    }

    function startTurn() {
      turn = { entries: [], passLeft: S.passes === 0 ? Infinity : S.passes, deadline: Date.now() + S.time * 1000, cur: null, over: false };
      renderPlay(); showNext();
      clearInterval(tickId); tickId = setInterval(tick, 200);
    }
    function renderPlay() {
      var ti = curTeam(), taboo = cfg.mode === 'taboo';
      root.innerHTML = '<div class="tr-screen">' +
        '<div class="row center" style="align-items:center;justify-content:space-between;flex-wrap:nowrap"><div class="tr-turn" style="margin:0">' + dot(ti) + esc(teamName(ti)) + '</div>' +
        '<div class="tr-timer" id="timer">' + MG.fmtTime(S.time) + '</div><div class="tr-turn" style="margin:0" id="turnPts">0점</div></div>' +
        '<div class="bar" id="tbar" style="margin-top:8px"><i></i></div>' +
        '<div class="tr-word" id="word" aria-live="polite"></div>' +
        '<div class="tr-actions' + (taboo ? ' three' : '') + '">' +
        '<button class="btn good" id="okBtn" type="button">⭕ 정답</button>' +
        (taboo ? '<button class="btn bad" id="foulBtn" type="button">🚫 금지어<br><small>-1</small></button>' : '') +
        '<button class="btn" id="passBtn" type="button">⏭ 패스<br><small id="passLeft"></small></button></div>' +
        '<div class="toolbar"><button class="btn small" id="endBtn" type="button">이번 턴 끝내기</button></div></div>';
      $('#okBtn').onclick = function () { mark('ok'); };
      if (taboo) $('#foulBtn').onclick = function () { mark('foul'); };
      $('#passBtn').onclick = function () { mark('pass'); };
      $('#endBtn').onclick = function () { if (!turn.over) endTurn(false); };
    }
    function turnPoints() { return turn.entries.reduce(function (n, e) { return n + (e.kind === 'ok' ? 1 : e.kind === 'foul' ? -1 : 0); }, 0); }
    function showNext() {
      turn.cur = nextItem();
      var it = turn.cur, long = it.w.length > 9;
      var h = '<div class="cat">' + esc(it.c) + '</div><div class="w' + (long ? ' long' : '') + '">' + esc(it.w) + '</div>';
      if (cfg.mode === 'taboo' && it.f) h += '<div class="tr-forbid-title">🚫 이 말은 쓰면 안 돼요</div><div class="tr-forbid">' + it.f.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>';
      $('#word').innerHTML = h;
      $('#passLeft').textContent = turn.passLeft === Infinity ? '무제한' : '남은 ' + turn.passLeft + '번';
      $('#passBtn').disabled = turn.passLeft <= 0;
      $('#turnPts').textContent = turnPoints() + '점';
    }
    function mark(kind) {
      if (turn.over) return;
      if (kind === 'pass') { if (turn.passLeft <= 0) return; if (turn.passLeft !== Infinity) turn.passLeft--; }
      turn.entries.push({ w: turn.cur.w, c: turn.cur.c, kind: kind });
      if (kind === 'ok') MG.vibrate(30);
      if (kind === 'foul') MG.vibrate([40, 40, 40]);
      showNext();
    }
    function tick() {
      if (!turn || turn.over) return;
      var r = Math.max(0, (turn.deadline - Date.now()) / 1000);
      var tm = $('#timer'); if (!tm) return;
      tm.textContent = MG.fmtTime(Math.ceil(r)); tm.classList.toggle('low', r <= 10);
      $('#tbar').firstElementChild.style.width = (r / S.time * 100) + '%'; $('#tbar').classList.toggle('low', r <= 10);
      if (r <= 0) endTurn(true);
    }
    function endTurn(byTime) {
      if (turn.over) return; turn.over = true; clearInterval(tickId);
      if (byTime) {
        MG.beep(880, 200, .2); later(function () { MG.beep(880, 200, .2); }, 280); later(function () { MG.beep(660, 500, .2); }, 560);
        MG.vibrate([200, 100, 200, 100, 400]);
        var w = $('#word'); if (w) w.innerHTML = '<div class="w">⏰ 시간 종료!</div>';
        later(renderSummary, 1300);
      } else renderSummary();
    }

    function renderSummary() {
      clearAll();
      var ti = curTeam();
      var h = '<div class="tr-screen"><div class="panel center" style="border:3px solid ' + COLORS[ti] + '"><div class="tr-turn">' + dot(ti) + esc(teamName(ti)) + ' 턴 결과</div>' +
        '<div class="bigscore" id="sumPts" style="font-size:2.6rem;font-weight:900;color:var(--accent)"></div>' +
        '<p class="muted" id="sumSub" style="margin:0 0 6px"></p><ul class="tr-list" id="sumList"></ul>' +
        '<p class="hint" style="margin:4px 0 10px">실수가 있었다면 단어 옆 버튼으로 정답/패스를 바꿀 수 있어요.</p>' +
        '<button class="btn primary big wide" id="nextBtn" type="button"></button></div>' +
        '<div class="panel"><h2>점수 (이번 턴 반영 전)</h2>' + scoreboardHtml(-1) + '</div></div>';
      root.innerHTML = h;
      var last = session.t + 1 >= session.total;
      $('#nextBtn').textContent = last ? '최종 결과 보기 🏆' : '점수 반영하고 다음 팀 ▶';
      drawSummary();
      $('#nextBtn').onclick = function () {
        session.teams[ti].score += turnPoints(); session.t++;
        if (session.t >= session.total) renderFinal(); else renderReady();
      };
    }
    function drawSummary() {
      var ul = $('#sumList'); ul.innerHTML = '';
      var ok = 0, pass = 0, foul = 0;
      turn.entries.forEach(function (e, ix) {
        if (e.kind === 'ok') ok++; else if (e.kind === 'pass') pass++; else foul++;
        var li = document.createElement('li'); li.className = e.kind === 'ok' ? 'ok' : e.kind === 'foul' ? 'bad' : '';
        li.innerHTML = '<span>' + (e.kind === 'ok' ? '⭕' : e.kind === 'foul' ? '🚫' : '⏭') + '</span><span></span>';
        li.children[1].textContent = e.w;
        if (e.kind !== 'foul') {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = e.kind === 'ok' ? '패스로' : '정답으로';
          b.onclick = function () { e.kind = e.kind === 'ok' ? 'pass' : 'ok'; drawSummary(); };
          li.appendChild(b);
        }
        ul.appendChild(li);
      });
      if (!turn.entries.length) ul.innerHTML = '<li>기록이 없어요</li>';
      $('#sumPts').textContent = (turnPoints() >= 0 ? '+' : '') + turnPoints() + '점';
      $('#sumSub').textContent = '정답 ' + ok + ' · 패스 ' + pass + (cfg.mode === 'taboo' ? ' · 금지어 ' + foul : '');
    }

    function renderFinal() {
      clearAll(); MG.wake.off();
      var order = session.teams.map(function (t, i) { return { i: i, s: t.score }; }).sort(function (a, b) { return b.s - a.s; });
      var medals = ['🥇', '🥈', '🥉', '4️⃣'], rank = 0, prev = null;
      var h = '<div class="tr-screen"><div class="panel center"><div class="tr-emoji">🏆</div><h2 style="margin:0 0 4px;font-size:1.4rem">최종 결과</h2>' +
        '<p class="tr-note" style="margin-bottom:8px">' + esc(teamName(order[0].i)) + (order.length > 1 && order[1].s === order[0].s ? ' 외 공동 1위!' : ' 우승! 🎉') + '</p><div class="scoreboard">' +
        order.map(function (o, ix) {
          if (o.s !== prev) rank = ix; prev = o.s;
          return '<div class="srow' + (rank === 0 ? ' first' : '') + '"><span class="tr-podium">' + medals[rank] + '</span>' + dot(o.i) + '<span class="name">' + esc(teamName(o.i)) + '</span><span class="pts">' + o.s + '</span></div>';
        }).join('') + '</div></div>' +
        '<div class="row center"><button class="btn primary big" id="againBtn" type="button">다시 하기</button><button class="btn big" id="setupBtn" type="button">설정으로</button></div></div>';
      root.innerHTML = h;
      MG.beep(880, 150); later(function () { MG.beep(1175, 300); }, 180);
      $('#againBtn').onclick = startSession; $('#setupBtn').onclick = renderSetup;
    }

    renderSetup();
    window.TeamRoundDebug = { settings: S, pool: pool };
  }

  window.TeamRound = { start: start };
})();
