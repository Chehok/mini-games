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
  // In a browser tab the button installs the app; inside the installed app it copies the page link instead.
  function updateButton() {
    if (standalone()) {
      button.textContent = '링크 공유';
      button.setAttribute('aria-label', '이 페이지 링크 복사');
      button.hidden = false;
      return;
    }
    button.textContent = '앱 설치';
    button.removeAttribute('aria-label');
    button.hidden = installed || (!deferredPrompt && !iosSafari);
  }
  function shareLink() {
    var link = location.origin + location.pathname;
    var done = function (ok) {
      if (ok) { if (MG.toast) MG.toast('링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요.'); return; }
      MG.dialog({ title: '링크 공유', text: '아래 링크를 길게 눌러 복사해 주세요.\n' + link, buttons: [{ label: '닫기', primary: true }] });
    };
    return MG.copy(link).then(done, function () { done(false); });
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
    if (standalone()) { return shareLink(); }
    if (installed) { updateButton(); return; }
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
        updateButton();
      }
    } else if (iosSafari) {
      MG.dialog({
        title: '앱 설치',
        text: 'Safari에서 공유 → 홈 화면에 추가를 선택해 주세요.',
        buttons: [{ label: '닫기', primary: true }]
      });
    }
  });
  updateButton();
})();
