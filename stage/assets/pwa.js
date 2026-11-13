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
