// Панель свойств редактора (левая половина на шаге «Редактор»). Всё оформлено таблицами как в docx.
// Эта часть: поля ввода, свойства страницы и группы элементов. Общее лежит в SD._panel (P).

(function (P) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

  P.root = null;

  const TYPE_NAMES = { icon: 'Значок', pattern: 'Узор', phone: 'Телефон', rect: 'Прямоугольник', ellipse: 'Эллипс', line: 'Линия', star: 'Звезда', wave: 'Волна', text: 'Текст', image: 'Изображение', qr: 'QR-код' };
  const TYPE_ICON = { icon: '☆', pattern: '░', phone: '▯', rect: '▭', ellipse: '◯', line: '╱', star: '✶', wave: '∿', text: 'T', image: '▨', qr: '▦' };
  const HCONS = { left: 'Слева', right: 'Справа', 'left-right': 'Слева и справа', center: 'По центру', scale: 'Масштаб' };
  const VCONS = { top: 'Сверху', bottom: 'Снизу', 'top-bottom': 'Сверху и снизу', center: 'По центру', scale: 'Масштаб' };

  function mount(el) { P.root = el; refresh(); }
  function unmount() { P.root = null; }

  function refresh() {
    if (!P.root || !document.body.contains(P.root)) { P.root = null; return; }
    const active = document.activeElement;
    const key = active && active.dataset ? active.dataset.k : null;
    const caret = active && key && active.selectionStart != null ? [active.selectionStart, active.selectionEnd] : null;
    P.root.innerHTML = '';
    const sel = A.selected();
    if (!sel.length) pageProps();
    else if (sel.length === 1) P.elementProps(sel[0]);
    else multiProps(sel);
    P.root.append(P.lintBox({ page: S.page }));
    P.root.append(P.layers());
    P.root.append(P.shortcuts());
    if (SD.wizard && SD.wizard.renumber) SD.wizard.renumber();
    if (key) {
      const again = P.root.querySelector(`[data-k="${key}"]`);
      if (again) { again.focus(); if (caret && again.setSelectionRange) try { again.setSelectionRange(caret[0], caret[1]); } catch (e) { /* нет выделения */ } }
    }
  }

  // Поля ввода
  function num(k, val, onSet, opts = {}) {
    const i = h('input', { type: 'number', step: opts.step || 0.5, value: u.round(val, 2), 'data-k': k, min: opts.min, max: opts.max });
    i.addEventListener('input', () => { if (i.value !== '') { onSet(parseFloat(i.value), false); } });
    i.addEventListener('change', () => { if (i.value !== '') { onSet(parseFloat(i.value), true); } });
    return i;
  }
  function color(k, val, onSet) {
    const i = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(val || '') ? val : '#000000', 'data-k': k });
    i.addEventListener('input', () => onSet(i.value, false));
    i.addEventListener('change', () => onSet(i.value, true));
    return i;
  }
  function select(k, val, options, onSet) {
    const s = h('select', { 'data-k': k });
    for (const [v, t] of options) s.append(h('option', { value: v, selected: String(v) === String(val) }, t));
    s.addEventListener('change', () => onSet(s.value));
    return s;
  }
  function check(k, val, label, onSet) {
    const i = h('input', { type: 'checkbox', checked: !!val, 'data-k': k });
    i.addEventListener('change', () => onSet(i.checked));
    return h('label', null, i, ' ', label);
  }
  function tbl(caption, rows, cols) {
    const t = h('table', { class: 'doc compact' });
    if (cols) t.append(h('tr', null, ...cols.map(c => h('th', null, c))));
    for (const r of rows) if (r) t.append(h('tr', null, ...r.map(c => (c && c.tagName === 'TD') ? c : h('td', null, c))));
    return [h('div', { class: 'cap' }, caption), t];
  }
  function live(commit) { if (commit) A.commit(); else { A.resolvePins(A.page()); SD.editor.render(); } }
  function swatches(onPick) {
    const p = A.pal();
    const wrap = h('span');
    for (const role of ['primary', 'accent', 'bg', 'text', 'soft', 'extra']) {
      if (!p[role]) continue;
      wrap.append(h('span', { class: 'sw click', title: roleName(role) + ' ' + p[role], style: { background: p[role] }, onclick: () => onPick(p[role], role) }));
    }
    return wrap;
  }
  function roleName(r) { return { primary: 'Основной', accent: 'Акцент', bg: 'Фон', text: 'Текст', soft: 'Мягкий', extra: 'Доп.', onPrimary: 'На основном', onAccent: 'На акценте' }[r] || r; }

  // ---------- Страница ----------
  function pageProps() {
    const p = A.page();
    P.root.append(h('p', { class: 'note' }, 'Ничего не выделено. Кликните по элементу на листе справа, протяните рамку для выбора нескольких или выберите слой в списке ниже.'));
    P.root.append(...tbl('Таблица 1. Свойства страницы', [
      ['Название', (() => { const i = h('input', { type: 'text', value: p.name, 'data-k': 'pname' }); i.addEventListener('change', () => { p.name = i.value; A.commit(); }); return i; })()],
      ['Фон', h('span', null, color('pbg', p.bg, (v, c) => { p.bg = v; p.bgRole = null; live(c); }), ' ', swatches((v, role) => { p.bg = v; p.bgRole = role; A.commit(); }))],
      ['Зерно печати', h('span', null, num('grain', Math.round(((p.fx && p.fx.grain) || 0) * 100), (v, c) => { p.fx = Object.assign({}, p.fx, { grain: u.clamp(v, 0, 100) / 100 }); live(c); }, { step: 5, min: 0, max: 100 }), ' %')],
      ['Размер', `${u.round(S.doc.w, 1)} × ${u.round(S.doc.h, 1)} мм (${(SD.FORMATS[S.doc.format] || {}).name || ''})`],
      ['Страницы', h('span', { class: 'btn-row' },
        h('button', { class: 'btn sm', onclick: () => A.addPage() }, '+ Пустая'),
        h('button', { class: 'btn sm', onclick: () => A.duplicatePage(S.page) }, 'Дублировать'),
        h('button', { class: 'btn sm', onclick: () => A.deletePage(S.page) }, 'Удалить'))]
    ], ['Параметр', 'Значение']));
    P.root.append(...tbl('Таблица 2. Добавить элемент', [[h('span', { class: 'btn-row' },
      ...[['text', 'Текст'], ['icon', 'Значок'], ['pattern', 'Узор'], ['phone', 'Телефон'], ['rect', 'Прямоугольник'], ['ellipse', 'Эллипс'], ['line', 'Линия'], ['star', 'Звезда'], ['image', 'Картинка'], ['qr', 'QR-код']]
        .map(([t, n]) => h('button', { class: 'btn sm', onclick: () => SD.editor.setTool(t) }, n)))]]));
  }

  // ---------- Несколько элементов ----------
  function multiProps(sel) {
    P.root.append(h('p', null, `Выделено элементов: ${sel.length}.`));
    P.root.append(alignTable(true));
    P.root.append(...tbl('Действия', [[orderButtons()]]));
    P.root.append(...tbl('Заливка всех', [[h('span', null, swatches((v, role) => { sel.forEach(e => { if (e.type === 'line') e.stroke = v; else e.fill = v; e.fillRole = e.type === 'line' ? e.fillRole : role; }); A.commit(); }))]]));
  }

  function alignTable(multi) {
    const b = (t, how) => h('button', { class: 'btn sm', title: t, onclick: () => SD.editor.align(how, !multi) }, t);
    const rows = [
      [h('span', { class: 'btn-row' }, b('Слева', 'left'), b('По центру', 'hcenter'), b('Справа', 'right'))],
      [h('span', { class: 'btn-row' }, b('Сверху', 'top'), b('Посередине', 'vcenter'), b('Снизу', 'bottom'))]
    ];
    if (multi) rows.push([h('span', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => SD.editor.distribute('h') }, 'Распределить по горизонтали'),
      h('button', { class: 'btn sm', onclick: () => SD.editor.distribute('v') }, 'по вертикали'))]);
    const f = document.createDocumentFragment();
    f.append(...tbl(multi ? 'Выравнивание (относительно выделения)' : 'Выравнивание (относительно листа)', rows));
    return f;
  }
  function orderButtons() {
    const E = SD.editor;
    return h('span', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => E.reorder('front'), title: 'Ctrl+Alt+]' }, 'На передний план'),
      h('button', { class: 'btn sm', onclick: () => E.reorder(1), title: 'Ctrl+]' }, 'Выше'),
      h('button', { class: 'btn sm', onclick: () => E.reorder(-1), title: 'Ctrl+[' }, 'Ниже'),
      h('button', { class: 'btn sm', onclick: () => E.reorder('back'), title: 'Ctrl+Alt+[' }, 'На задний план'),
      h('button', { class: 'btn sm', onclick: () => E.duplicateSel(), title: 'Ctrl+D' }, 'Дублировать'),
      h('button', { class: 'btn sm', onclick: () => E.deleteSel(), title: 'Delete' }, 'Удалить'));
  }

  Object.assign(P, { TYPE_NAMES, TYPE_ICON, HCONS, VCONS, mount, unmount, refresh, num, color, select, check, tbl, live, swatches, alignTable, orderButtons });
})(SD._panel = SD._panel || {});
