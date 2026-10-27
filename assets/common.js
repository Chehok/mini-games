/* Mini Games — shared helpers (plain JS, no dependencies) */
(function () {
  'use strict';
  var MG = {};

  // localStorage that never throws (private mode etc.)
  MG.store = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }
  };

  MG.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };

  // Simple stopwatch. onTick(seconds) is called every 250ms while running.
  MG.Timer = function (onTick) {
    var start = 0, acc = 0, id = null;
    var t = {
      get seconds() { return (acc + (id ? Date.now() - start : 0)) / 1000; },
      start: function () {
        if (id) return;
        start = Date.now();
        id = setInterval(function () { onTick && onTick(t.seconds); }, 250);
      },
      stop: function () {
        if (!id) return;
        acc += Date.now() - start; clearInterval(id); id = null;
        onTick && onTick(t.seconds);
      },
      reset: function () {
        if (id) clearInterval(id);
        id = null; acc = 0; onTick && onTick(0);
      },
      get running() { return !!id; }
    };
    return t;
  };

  var toastTimer = null;
  MG.toast = function (msg, ms) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 1600);
  };

  // Result dialog. opts: {title, text, buttons:[{label, primary, onClick}]}
  MG.dialog = function (opts) {
    var ov = document.createElement('div');
    ov.className = 'overlay show';
    var d = document.createElement('div');
    d.className = 'dialog'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    var h = document.createElement('h2'); h.textContent = opts.title;
    var p = document.createElement('p'); p.textContent = opts.text || '';
    var row = document.createElement('div'); row.className = 'row';
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown', onKey, true); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    (opts.buttons || [{ label: '확인', primary: true }]).forEach(function (b, i) {
      var btn = document.createElement('button');
      btn.className = 'btn' + (b.primary ? ' primary' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', function () { close(); b.onClick && b.onClick(); });
      row.appendChild(btn);
      if (i === 0 || b.primary) setTimeout(function () { btn.focus(); }, 0);
    });
    d.appendChild(h); d.appendChild(p); d.appendChild(row); ov.appendChild(d);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(ov);
    return { close: close };
  };

  // Seeded PRNG (mulberry32)
  MG.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  MG.shuffle = function (arr, rnd) {
    rnd = rnd || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  // Short beep (WebAudio) + vibration, both best-effort.
  var audioCtx = null;
  MG.unlockAudio = function () {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* ignore */ }
  };
  MG.beep = function (freq, ms, vol) {
    try {
      MG.unlockAudio();
      if (!audioCtx) return;
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq || 880;
      g.gain.value = vol || 0.15;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + (ms || 150) / 1000);
    } catch (e) { /* ignore */ }
  };
  MG.vibrate = function (pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  };

  // Screen Wake Lock (keeps the phone awake during a round). Safe to call anywhere.
  var wakeSentinel = null, wakeWanted = false;
  function acquireWake() {
    if (!wakeWanted || wakeSentinel || !navigator.wakeLock) return;
    navigator.wakeLock.request('screen').then(function (s) {
      wakeSentinel = s;
      s.addEventListener('release', function () { wakeSentinel = null; });
    }).catch(function () { /* ignore */ });
  }
  MG.wake = {
    on: function () { wakeWanted = true; acquireWake(); },
    off: function () { wakeWanted = false; if (wakeSentinel) { try { wakeSentinel.release(); } catch (e) { /* ignore */ } wakeSentinel = null; } }
  };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') acquireWake(); });

  // Copy text to the clipboard (with a textarea fallback). Returns a Promise<boolean>.
  MG.copy = function (text) {
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  };
  // Share via the native sheet when available, otherwise copy.
  MG.share = function (text, title) {
    if (navigator.share) {
      return navigator.share({ title: title || document.title, text: text }).then(function () { return 'shared'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancel';
        return MG.copy(text).then(function (ok) { return ok ? 'copied' : 'fail'; });
      });
    }
    return MG.copy(text).then(function (ok) { return ok ? 'copied' : 'fail'; });
  };

  window.MG = MG;
})();
