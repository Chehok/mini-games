/* 줄 단위 입력: fieldset.value는 기존 도구의 줄바꿈 저장 형식을 유지해요. */
(function () {
  'use strict';
  window.NameRows = function (host, label, initial) {
    var rows = document.createElement('div');
    var add = document.createElement('button');
    host.classList.add('name-editor');
    host.setAttribute('aria-label', label + ' 목록');
    add.type = 'button'; add.className = 'btn wide'; add.textContent = '＋ ' + label + ' 추가';
    host.appendChild(rows); host.appendChild(add);
    function inputs() { return Array.from(rows.querySelectorAll('input')); }
    function changed() { host.dispatchEvent(new Event('input', { bubbles: true })); }
    function renumber() {
      inputs().forEach(function (input, i) {
        input.placeholder = label + (i + 1);
        input.setAttribute('aria-label', label + ' ' + (i + 1));
        input.nextElementSibling.setAttribute('aria-label', label + ' ' + (i + 1) + ' 삭제');
      });
    }
    function insert(after, value, focus) {
      var row = document.createElement('div'), input = document.createElement('input'), minus = document.createElement('button');
      row.className = 'name-row'; input.className = 'input'; input.type = 'text'; input.maxLength = 40; input.value = value || '';
      minus.className = 'btn'; minus.type = 'button'; minus.textContent = '−';
      row.appendChild(input); row.appendChild(minus);
      if (after) after.after(row); else rows.appendChild(row);
      minus.onclick = function () {
        var index = inputs().indexOf(input); row.remove();
        if (!rows.children.length) insert(null, '', false);
        renumber(); inputs()[Math.min(index, inputs().length - 1)].focus(); changed();
      };
      input.onkeydown = function (event) {
        if (event.key !== 'Enter' || event.isComposing) return;
        event.preventDefault(); insert(row, '', true); changed();
      };
      renumber(); if (focus) input.focus();
    }
    Object.defineProperty(host, 'value', {
      get: function () { return inputs().map(function (el) { return el.value; }).join('\n'); },
      set: function (value) {
        rows.replaceChildren();
        var list = String(value || '').split('\n');
        if (list.length === 1 && !list[0]) list = ['', '', '', ''];
        list.forEach(function (v) { insert(null, v, false); });
      }
    });
    add.onclick = function () { insert(null, '', true); changed(); };
    host.value = initial || '';
    return host;
  };
})();
