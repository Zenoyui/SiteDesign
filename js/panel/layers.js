// Панель свойств: слои, проверка макета, горячие клавиши и публичный SD.panel.

SD.panel = (function (P) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

  // ---------- Слои ----------
  function layers() {
    const f = document.createDocumentFragment();
    f.append(h('div', { class: 'cap' }, `Слои страницы «${A.page().name}» (сверху — передний план, перетаскивайте для порядка)`));
    const wrap = h('div', { class: 'layers' });
    const t = h('table', { class: 'doc compact' });
    t.append(h('tr', null, h('th', null, '👁'), h('th', null, '🔒'), h('th', null, 'Тип'), h('th', null, 'Название')));
    const els = A.page().elements;
    let dragId = null;
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      const tr = h('tr', { class: S.sel.includes(el.id) ? 'on' : '', draggable: 'true' },
        h('td', { class: 'ic', title: 'Показать/скрыть', onclick: e => { e.stopPropagation(); el.visible = el.visible === false; A.commit(); } }, el.visible === false ? '–' : '●'),
        h('td', { class: 'ic', title: 'Закрепить', onclick: e => { e.stopPropagation(); el.locked = !el.locked; A.commit(); } }, el.locked ? '■' : '□'),
        h('td', { class: 'ic' }, P.TYPE_ICON[el.type] || '?'),
        h('td', { class: 'nm', title: el.name }, (el.pin ? '↳ ' : '') + (el.name || P.TYPE_NAMES[el.type]) + (el.type === 'text' ? ' — ' + String(el.text).slice(0, 24) : '')));
      tr.addEventListener('click', e => {
        if (e.shiftKey) A.setSel(S.sel.includes(el.id) ? S.sel.filter(x => x !== el.id) : S.sel.concat(el.id));
        else A.setSel([el.id]);
        SD.editor.render();
      });
      tr.addEventListener('dblclick', () => {
        const n = prompt('Название слоя', el.name || '');
        if (n != null) { el.name = n; A.commit(); }
      });
      tr.addEventListener('dragstart', e => { dragId = el.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', el.id); } catch (x) { /* старые браузеры */ } });
      tr.addEventListener('dragover', e => { e.preventDefault(); tr.classList.add('dragover'); });
      tr.addEventListener('dragleave', () => tr.classList.remove('dragover'));
      tr.addEventListener('drop', e => {
        e.preventDefault(); tr.classList.remove('dragover');
        if (!dragId || dragId === el.id) return;
        const list = A.page().elements;
        const from = list.findIndex(x => x.id === dragId);
        const moved = list.splice(from, 1)[0];
        const to = list.findIndex(x => x.id === el.id);
        list.splice(to + 1, 0, moved); // бросили на строку — встаём над ней
        A.commit();
      });
      t.append(tr);
    }
    if (!els.length) t.append(h('tr', null, h('td', { colspan: 4, class: 'c' }, 'Страница пустая')));
    wrap.append(t); f.append(wrap);
    return f;
  }

  // Живая проверка текста на текущей странице
  function lintBox(opts) {
    const f = document.createDocumentFragment();
    f.append(h('div', { class: 'cap' }, 'Проверка текста на странице: кегль, контраст, края листа, переносы'));
    const box = h('div', { id: 'lintBox' });
    box.append(SD.lint.table(S.doc, i => {
      const ei = SD.wizard.STEPS.findIndex(x => x.id === 'editor');
      if (S.step !== ei) SD.wizard.go(ei);
      if (S.view !== 'edit') SD.views.setView('edit');
      if (i.page != null && i.page !== S.page) A.setPage(i.page);
      A.setSel([i.id]); SD.editor.render();
    }, opts));
    f.append(box);
    return f;
  }

  function shortcuts() {
    const rows = [
      ['V / R / O / L / S / K / T / I', 'Выбор, прямоугольник, эллипс, линия, звезда, значок, текст, картинка'],
      ['Shift + перетаскивание', 'Строго по горизонтали/вертикали; при изменении размера — сохранить пропорции; при повороте — шаг 15°'],
      ['Alt + ручка', 'Менять размер от центра'],
      ['Alt + перетаскивание', 'Перетащить копию'],
      ['Ctrl — при перетаскивании', 'Отключить прилипание к направляющим'],
      ['Стрелки / Shift+стрелки', 'Сдвиг на 1 / 10 мм'],
      ['Ctrl+D, Ctrl+C / V, Delete', 'Дублировать, копировать/вставить, удалить'],
      ['Ctrl+Z / Ctrl+Shift+Z', 'Отменить / повторить'],
      ['Ctrl+] / Ctrl+[', 'Выше / ниже (с Alt — на передний/задний план)'],
      ['Ctrl+колесо, пробел+мышь', 'Масштаб и перемещение по холсту; Shift+1 — по размеру']
    ];
    const f = document.createDocumentFragment();
    f.append(...P.tbl('Горячие клавиши (как в Figma)', rows, ['Клавиши', 'Действие']));
    return f;
  }

  // Быстрое обновление чисел во время перетаскивания, без перестройки панели.
  function liveGeometry() {
    if (!P.root) return;
    const el = A.selected()[0];
    if (!el || A.selected().length !== 1) return;
    for (const k of ['x', 'y', 'w', 'h', 'rot']) {
      const i = P.root.querySelector(`[data-k="${k}"]`);
      if (i && document.activeElement !== i) i.value = u.round(el[k] || 0, 2);
    }
    const hl = P.root.querySelector('[data-live="h"]');
    if (hl) hl.textContent = u.round(el.h, 1) + ' (авто)';
  }

  Object.assign(P, { layers, lintBox, shortcuts });

  return { mount: P.mount, unmount: P.unmount, refresh: P.refresh, liveGeometry, lintBox, isMounted: () => !!P.root };
})(SD._panel);
