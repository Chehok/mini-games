/* Shared registration: resolve from this script, including on nested game pages. */
(function () {
  'use strict';
  var root = new URL('../', document.currentScript.src);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.href })
      .catch(function () { /* Offline first visit or unavailable browser storage: games still work. */ });
  }

  var button = document.getElementById('install-button');
  if (!button) return;
  var deferredPrompt = null;
  var installed = false;
  var displayMode = window.matchMedia('(display-mode: standalone)');
  var ua = navigator.userAgent;
  var iosSafari = (/iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) &&
    /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  function standalone() { return displayMode.matches || navigator.standalone === true; }
  function updateButton() {
    button.hidden = installed || standalone() || (!deferredPrompt && !iosSafari);
  }
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    updateButton();
  });
  window.addEventListener('appinstalled', function () {
    installed = true;
    deferredPrompt = null;
    updateButton();
  });
  displayMode.addEventListener('change', updateButton);
  button.addEventListener('click', async function () {
    if (standalone() || installed) { updateButton(); return; }
    if (deferredPrompt) {
      var prompt = deferredPrompt;
      button.disabled = true;
      try {
        await prompt.prompt();
        await prompt.userChoice;
      } catch (error) { /* A dismissed or unavailable prompt can be ignored. */ }
      finally {
        deferredPrompt = null;
        button.disabled = false;
        button.hidden = true;
      }
    } else if (iosSafari) {
      MG.dialog({
        title: '홈 화면에 추가',
        text: 'Safari에서 공유 → 홈 화면에 추가를 선택해 주세요.',
        buttons: [{ label: '닫기', primary: true }]
      });
    }
  });
  updateButton();
})();

/* GitHub Pages 전용: Cloudflare Pages로 주소 이전 안내 (세션당 한 번). github-pages 브랜치에만 있어요. */
(function () {
  'use strict';
  var NEW_ORIGIN = 'https://mini-games-69o.pages.dev';
  var KEY = 'miniGamesMigrationNoticeShown';
  var shown = false;
  try { shown = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* 저장소를 못 쓰면 매번 보여요. */ }
  if (shown || typeof HTMLDialogElement === 'undefined') return;

  // 지금 보고 있는 게임과 같은 경로로 보내요. (/mini-games/sudoku/ → /sudoku/)
  var base = new URL('../', document.currentScript.src).pathname;
  var rest = location.pathname.indexOf(base) === 0 ? location.pathname.slice(base.length) : '';
  var target = NEW_ORIGIN + '/' + rest + location.search + location.hash;

  var css = '' +
    '#migration-notice{width:min(440px,calc(100% - 32px));max-width:none;padding:clamp(24px,6vw,34px);' +
    'border:1px solid var(--border,#e4e6ee);border-radius:var(--radius,22px);background:var(--surface,#fff);' +
    'color:var(--text,#171923);font-family:var(--font,system-ui,sans-serif);box-shadow:0 24px 80px rgba(16,24,40,.28)}' +
    '#migration-notice::backdrop{background:rgba(16,24,40,.6);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}' +
    '#migration-notice h2{margin:0 0 14px;font-size:clamp(24px,7vw,30px);line-height:1.3;letter-spacing:-.03em;word-break:keep-all}' +
    '#migration-notice p{margin:0;line-height:1.65;color:var(--text-2,#3f4354);word-break:keep-all}' +
    '#migration-notice .mn-note{margin-top:10px;font-size:14px;color:var(--muted,#606579)}' +
    '#migration-notice .mn-actions{display:grid;gap:10px;margin-top:24px}' +
    '#migration-notice .mn-go,#migration-notice .mn-stay{display:flex;align-items:center;justify-content:center;min-height:48px;' +
    'padding:10px 16px;border-radius:12px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}' +
    '#migration-notice .mn-go{background:var(--accent,#4f46e5);color:var(--accent-text,#fff);border:1px solid var(--accent,#4f46e5)}' +
    '#migration-notice .mn-stay{background:transparent;color:var(--text,#171923);border:1px solid var(--line-strong,#d3d6e2)}' +
    '#migration-notice .mn-go:focus-visible,#migration-notice .mn-stay:focus-visible{outline:3px solid var(--focus,#4338ca);outline-offset:3px}';

  function open() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var dialog = document.createElement('dialog');
    dialog.id = 'migration-notice';
    dialog.setAttribute('aria-labelledby', 'migration-title');
    dialog.setAttribute('aria-describedby', 'migration-copy');
    dialog.innerHTML =
      '<h2 id="migration-title">미니게임 주소가<br>변경되었어요</h2>' +
      '<p id="migration-copy">보안 이슈 대응을 위해 기존 페이지는 종료하고, 새 주소로 이전해요! 함께 해주세요~~</p>' +
      '<p class="mn-note">(잠시 사용할 수 있지만, 업데이트 미적용 및 추후 폐쇄 예정이에요 ㅠㅠ)</p>' +
      '<div class="mn-actions">' +
        '<a class="mn-go"></a>' +
        '<button class="mn-stay" type="button">현재 페이지 그대로 사용</button>' +
      '</div>';
    var go = dialog.querySelector('.mn-go');
    go.href = target;
    go.textContent = '새 미니게임으로 이동';
    dialog.querySelector('.mn-stay').addEventListener('click', function () { dialog.close(); });
    document.body.appendChild(dialog);
    try { dialog.showModal(); } catch (e) { return; }
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* 무시 */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', open);
  else open();
})();
