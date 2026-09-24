// Панель свойств редактора (левая половина на шаге «Редактор»):
// положение, размер, поворот, выравнивание, ограничения, привязки,
// заливка, текст, слои. Всё оформлено таблицами как в docx.

SD.panel = (function () {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;
  let root = null;

  const TYPE_NAMES = { icon: 'Значок', pattern: 'Узор', phone: 'Телефон', rect: 'Прямоугольник', ellipse: 'Эллипс', line: 'Линия', star: 'Звезда', wave: 'Волна', text: 'Текст', image: 'Изображение', qr: 'QR-код' };
  const TYPE_ICON = { icon: '☆', pattern: '░', phone: '▯', rect: '▭', ellipse: '◯', line: '╱', star: '✶', wave: '∿', text: 'T', image: '▨', qr: '▦' };
  const HCONS = { left: 'Слева', right: 'Справа', 'left-right': 'Слева и справа', center: 'По центру', scale: 'Масштаб' };
  const VCONS = { top: 'Сверху', bottom: 'Снизу', 'top-bottom': 'Сверху и снизу', center: 'По центру', scale: 'Масштаб' };

  function mount(el) { root = el; refresh(); }
  function unmount() { root = null; }

  function refresh() {
    if (!root || !document.body.contains(root)) { root = null; return; }
    const active = document.activeElement;
    const key = active && active.dataset ? active.dataset.k : null;
    const caret = active && key && active.selectionStart != null ? [active.selectionStart, active.selectionEnd] : null;
    root.innerHTML = '';
    const sel = A.selected();
    if (!sel.length) pageProps();
    else if (sel.length === 1) elementProps(sel[0]);
    else multiProps(sel);
    root.append(lintBox({ page: S.page }));
    root.append(layers());
    root.append(shortcuts());
    if (SD.wizard && SD.wizard.renumber) SD.wizard.renumber();
    if (key) {
      const again = root.querySelector(`[data-k="${key}"]`);
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
    root.append(h('p', { class: 'note' }, 'Ничего не выделено. Кликните по элементу на листе справа, протяните рамку для выбора нескольких или выберите слой в списке ниже.'));
    root.append(...tbl('Таблица 1. Свойства страницы', [
      ['Название', (() => { const i = h('input', { type: 'text', value: p.name, 'data-k': 'pname' }); i.addEventListener('change', () => { p.name = i.value; A.commit(); }); return i; })()],
      ['Фон', h('span', null, color('pbg', p.bg, (v, c) => { p.bg = v; p.bgRole = null; live(c); }), ' ', swatches((v, role) => { p.bg = v; p.bgRole = role; A.commit(); }))],
      ['Зерно печати', h('span', null, num('grain', Math.round(((p.fx && p.fx.grain) || 0) * 100), (v, c) => { p.fx = Object.assign({}, p.fx, { grain: u.clamp(v, 0, 100) / 100 }); live(c); }, { step: 5, min: 0, max: 100 }), ' %')],
      ['Размер', `${u.round(S.doc.w, 1)} × ${u.round(S.doc.h, 1)} мм (${(SD.FORMATS[S.doc.format] || {}).name || ''})`],
      ['Страницы', h('span', { class: 'btn-row' },
        h('button', { class: 'btn sm', onclick: () => A.addPage() }, '+ Пустая'),
        h('button', { class: 'btn sm', onclick: () => A.duplicatePage(S.page) }, 'Дублировать'),
        h('button', { class: 'btn sm', onclick: () => A.deletePage(S.page) }, 'Удалить'))]
    ], ['Параметр', 'Значение']));
    root.append(...tbl('Таблица 2. Добавить элемент', [[h('span', { class: 'btn-row' },
      ...[['text', 'Текст'], ['icon', 'Значок'], ['pattern', 'Узор'], ['phone', 'Телефон'], ['rect', 'Прямоугольник'], ['ellipse', 'Эллипс'], ['line', 'Линия'], ['star', 'Звезда'], ['image', 'Картинка'], ['qr', 'QR-код']]
        .map(([t, n]) => h('button', { class: 'btn sm', onclick: () => SD.editor.setTool(t) }, n)))]]));
  }

  // ---------- Несколько элементов ----------
  function multiProps(sel) {
    root.append(h('p', null, `Выделено элементов: ${sel.length}.`));
    root.append(alignTable(true));
    root.append(...tbl('Действия', [[orderButtons()]]));
    root.append(...tbl('Заливка всех', [[h('span', null, swatches((v, role) => { sel.forEach(e => { if (e.type === 'line') e.stroke = v; else e.fill = v; e.fillRole = e.type === 'line' ? e.fillRole : role; }); A.commit(); }))]]));
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

  // ---------- Один элемент ----------
  function elementProps(el) {
    const nameIn = h('input', { type: 'text', value: el.name || TYPE_NAMES[el.type], 'data-k': 'name' });
    nameIn.addEventListener('change', () => { el.name = nameIn.value; A.commit(); });
    root.append(h('p', null, h('b', null, TYPE_NAMES[el.type] + ': '), ''), nameIn);

    const setG = k => (v, c) => {
      if (k === 'rot') v = ((v % 360) + 540) % 360 - 180;
      if ((k === 'w' || k === 'h') && v < 0.5) v = 0.5;
      const dx = k === 'x' ? v - el.x : 0, dy = k === 'y' ? v - el.y : 0;
      el[k] = v;
      if (el.pin && (dx || dy)) { el.pin.dx += dx; el.pin.dy += dy; }
      if (el.type === 'text' && k === 'w') SD.render.fitHeight(el);
      live(c);
    };
    root.append(...tbl('Таблица 1. Положение и размер (мм)', [
      ['X', num('x', el.x, setG('x')), 'Y', num('y', el.y, setG('y'))],
      ['Ширина', num('w', el.w, setG('w'), { min: 0.5 }), 'Высота', el.type === 'text' && el.autoH !== false ? h('span', { 'data-live': 'h' }, u.round(el.h, 1) + ' (авто)') : num('h', el.h, setG('h'), { min: 0.5 })],
      ['Поворот°', num('rot', el.rot || 0, setG('rot'), { step: 1 }), 'Прозр., %', num('op', Math.round((el.opacity == null ? 1 : el.opacity) * 100), (v, c) => { el.opacity = u.clamp(v, 0, 100) / 100; live(c); }, { step: 5, min: 0, max: 100 })]
    ]));
    root.append(alignTable(false));

    // Ограничения
    root.append(...tbl('Таблица 2. Ограничения — как элемент ведёт себя при смене формата листа', [
      ['По горизонтали', select('ch', el.cons.h, Object.entries(HCONS), v => { el.cons.h = v; A.commit(); })],
      ['По вертикали', select('cv', el.cons.v, Object.entries(VCONS), v => { el.cons.v = v; A.commit(); })]
    ]));

    // Привязка и блокировка
    const others = A.page().elements.filter(e => e.id !== el.id);
    root.append(...tbl('Таблица 3. Привязка и фиксация', [
      ['Привязать к элементу', select('pin', el.pin ? el.pin.id : '', [['', '— нет (свободно) —']].concat(others.slice().reverse().map(o => [o.id, (o.name || TYPE_NAMES[o.type]) + ' · ' + TYPE_NAMES[o.type]])), v => { A.pinTo(el, v); A.commit(); })],
      el.pin ? ['Смещение от цели', h('span', null, 'X ', num('pdx', el.pin.dx, (v, c) => { el.pin.dx = v; live(c); }), ' Y ', num('pdy', el.pin.dy, (v, c) => { el.pin.dy = v; live(c); }))] : null,
      ['Фиксация', h('span', null, check('lock', el.locked, 'Закрепить (нельзя двигать мышью)', v => { el.locked = v; A.commit(); }), h('br'), check('vis', el.visible !== false, 'Показывать', v => { el.visible = v; A.commit(); }))]
    ]));
    if (el.pin) root.append(h('p', { class: 'note' }, 'Элемент движется вместе с целью (фиолетовый пунктир на листе). Перетащите его, чтобы изменить смещение. Двойной клик — выделить цель.'));

    // Заливка / обводка
    const fillRows = [];
    if (el.type !== 'line' && el.type !== 'image') {
      fillRows.push(['Заливка', h('span', null, color('fill', el.fill, (v, c) => { el.fill = v; el.fillRole = null; live(c); }), ' ', swatches((v, role) => { el.fill = v; el.fillRole = role; A.commit(); }))]);
      if (['rect', 'ellipse', 'star', 'wave', 'text'].includes(el.type)) fillRows.push(['Градиент', h('span', null,
        check('grad', !!el.fill2, 'вкл. ', v => { el.fill2 = v ? A.pal().accent : null; el.fill2Role = null; A.commit(); }),
        el.fill2 ? color('fill2', el.fill2, (v, c) => { el.fill2 = v; el.fill2Role = null; live(c); }) : '',
        el.fill2 ? h('span', null, ' угол ', num('ga', el.gradAngle || 0, (v, c) => { el.gradAngle = v; live(c); }, { step: 15 })) : '')]);
      else if (el.type === 'qr') fillRows.push(['Фон QR', h('span', null, check('qbg', !!el.fill2, 'подложка ', v => { el.fill2 = v ? '#FFFFFF' : null; A.commit(); }), el.fill2 ? color('fill2', el.fill2, (v, c) => { el.fill2 = v; live(c); }) : '')]);
    }
    if (el.type === 'icon') {
      fillRows.push(['Значок', select('icon', el.icon, Object.entries(SD.ICON_NAMES), v => { el.icon = v; A.commit(); })]);
      fillRows.push(['Стиль значка', select('istyle', el.iconStyle || 'line', Object.entries(SD.ICON_STYLES).map(([k, v]) => [k, v.name + ' (как ' + v.like.map(x => SD.STYLES[x].name).join(', ') + ')']), v => { el.iconStyle = v; A.commit(); })]);
      fillRows.push(['Цвет подложки', h('span', null, color('fill2', el.fill2 || el.fill, (v, c) => { el.fill2 = v; el.fill2Role = null; live(c); }), ' ', swatches((v, role) => { el.fill2 = v; el.fill2Role = role; A.commit(); }))]);
      fillRows.push(['Отразить', check('flip', el.flipX, 'по горизонтали', v => { el.flipX = v; A.commit(); })]);
    }
    if (el.type === 'pattern') {
      fillRows.push(['Узор', select('kind', el.kind, Object.entries(SD.PATTERNS).filter(([k]) => k !== 'none').map(([k, v]) => [k, v.name]), v => { el.kind = v; A.commit(); })]);
      fillRows.push(['Шаг, мм', num('cell', el.cell || 6, (v, c) => { el.cell = Math.max(0.8, v); live(c); }, { step: 0.5, min: 0.8 })]);
      fillRows.push(['Второй цвет', color('fill2', el.fill2 || el.fill, (v, c) => { el.fill2 = v; el.fill2Role = null; live(c); })]);
    }
    if (el.type === 'phone') {
      fillRows.push(['Акцент экрана', color('fill2', el.fill2 || '#000000', (v, c) => { el.fill2 = v; el.fill2Role = null; live(c); })]);
      fillRows.push(['Скриншот', h('span', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => pickImage(src => { el.src = src; A.commit(); }) }, 'Поставить свой…'), el.src ? h('button', { class: 'btn sm', onclick: () => { el.src = null; A.commit(); } }, 'Убрать') : '')]);
    }
    if (!['text', 'qr', 'icon', 'pattern'].includes(el.type)) {
      fillRows.push([el.type === 'line' ? 'Линия' : 'Обводка', h('span', null,
        color('stroke', el.stroke || '#000000', (v, c) => { el.stroke = v; el.strokeRole = null; if (!el.strokeW) el.strokeW = 0.5; live(c); }), ' толщина ',
        num('sw', el.strokeW || 0, (v, c) => { el.strokeW = Math.max(0, v); live(c); }, { step: 0.1, min: 0 }))]);
    }
    if (el.type === 'rect' || el.type === 'image' || el.type === 'qr') fillRows.push(['Скругление', num('rad', el.radius || 0, (v, c) => { el.radius = Math.max(0, v); live(c); }, { min: 0 })]);
    if (el.type === 'star') fillRows.push(['Лучей / глубина', h('span', null, num('pts', el.points || 5, (v, c) => { el.points = u.clamp(Math.round(v), 3, 40); live(c); }, { step: 1, min: 3 }), ' ', num('inr', Math.round((el.inner || 0.5) * 100), (v, c) => { el.inner = u.clamp(v, 5, 100) / 100; live(c); }, { step: 5 }))]);
    if (el.type === 'wave') fillRows.push(['Волны / высота', h('span', null, num('wv', el.waves || 2, (v, c) => { el.waves = Math.max(0.5, v); live(c); }, { step: 0.5 }), ' ', num('amp', Math.round((el.amp || 0.3) * 100), (v, c) => { el.amp = u.clamp(v, 0, 100) / 100; live(c); }, { step: 5 }))]);
    if (el.type === 'image') {
      fillRows.push(['Файл', h('button', { class: 'btn sm', onclick: () => pickImage(src => { el.src = src; A.commit(); }) }, 'Заменить…')]);
      fillRows.push(['Вписать', select('fit', el.fit || 'cover', [['cover', 'Заполнить (обрезать)'], ['contain', 'Вписать целиком']], v => { el.fit = v; A.commit(); })]);
    }
    if (el.type === 'qr') {
      const i = h('input', { type: 'text', value: el.data || '', 'data-k': 'qrdata' });
      i.addEventListener('change', () => { el.data = i.value; el.role = null; A.commit(); });
      fillRows.push(['Ссылка / текст', i]);
    }
    if (fillRows.length) root.append(...tbl('Таблица 4. Оформление', fillRows));

    // Эффекты элемента
    const sh = el.shadow;
    const kind = !sh ? 'none' : sh.blur === 0 ? 'hard' : (sh.x || sh.y) ? 'soft' : 'glow';
    const fxRows = [['Тень', h('span', null, select('shadow', kind, [['none', 'Нет'], ['soft', 'Мягкая (как Поисковый, Поездочный)'], ['hard', 'Жёсткая сдвиг (как Полосатый)'], ['glow', 'Свечение (как Фиолетовый)']], v => {
      const b = Math.min(S.doc.w, S.doc.h * 0.75);
      el.shadow = v === 'none' ? null : v === 'soft' ? { x: 0, y: b * 0.008, blur: b * 0.035, color: '#000000', alpha: 0.2 } : v === 'hard' ? { x: b * 0.012, y: b * 0.012, blur: 0, color: A.pal().text, alpha: 1 } : { x: 0, y: 0, blur: b * 0.06, color: el.fill || A.pal().primary, alpha: 0.75 };
      A.commit();
    }), sh ? h('span', null, ' ', color('shc', sh.color, (v, c) => { sh.color = v; sh.colorRole = null; live(c); }), ' размытие ', num('shb', sh.blur, (v, c) => { sh.blur = Math.max(0, v); live(c); }, { step: 0.5, min: 0 })) : '')]];
    if (el.type === 'text') {
      fxRows.push(['Обводка букв', h('span', null, check('tout', el.stroke && el.strokeW > 0, 'вкл. ', v => { el.stroke = v ? '#FFFFFF' : null; el.strokeW = v ? Math.max(0.2, el.size * SD.PT * 0.06) : 0; A.commit(); }),
        el.stroke && el.strokeW > 0 ? h('span', null, color('tsc', el.stroke, (v, c) => { el.stroke = v; live(c); }), ' ', num('tsw', el.strokeW, (v, c) => { el.strokeW = Math.max(0, v); live(c); }, { step: 0.1, min: 0 })) : '')]);
      fxRows.push(['Зачёркнутый', check('strike', el.strike, 'как старая цена', v => { el.strike = v; A.commit(); })]);
      fxRows.push(['Плашка под текстом', h('span', null, check('tbg', el.bg && el.bg.fill, 'вкл. ', v => {
        const pad = el.size * SD.PT;
        el.bg = v ? { fill: A.pal().accent, fillRole: null, padX: pad * 0.7, padY: pad * 0.35, radius: null } : null;
        SD.render.fitHeight(el); A.commit();
      }), el.bg && el.bg.fill ? color('tbgc', el.bg.fill, (v, c) => { el.bg.fill = v; el.bg.fillRole = null; live(c); }) : '')]);
    }
    root.append(...tbl('Эффекты элемента', fxRows));

    if (el.type === 'text') textProps(el);
    root.append(...tbl('Таблица 5. Порядок и действия', [[orderButtons()]]));
  }

  function textProps(el) {
    const ta = h('textarea', { 'data-k': 'text', rows: 3 }, el.text);
    ta.addEventListener('input', () => { el.text = ta.value; el.textKey = null; SD.render.fitHeight(el); live(false); });
    ta.addEventListener('change', () => A.commit());
    const weights = (SD.FONT_WEIGHTS[el.font] || [400, 700]).map(w => [w, { 400: 'Обычный', 500: 'Средний', 600: 'Полужирный', 700: 'Жирный', 800: 'Очень жирный', 900: 'Чёрный' }[w] + ' ' + w]);
    const alignBtns = h('span', { class: 'btn-row' }, ...[['left', 'Влево'], ['center', 'По центру'], ['right', 'Вправо']].map(([a, t]) =>
      h('button', { class: 'btn sm' + (el.align === a ? ' primary' : ''), onclick: () => { el.align = a; A.commit(); } }, t)));
    const after = () => { SD.render.fitHeight(el); };
    root.append(...tbl('Таблица 6. Текст', [
      ['Текст', ta],
      ['Шрифт', select('font', el.font, SD.FONTS.map(f => [f, f]), v => { el.font = v; el.weight = SD.nearWeight(v, el.weight); SD.render.fontsReady(S.doc).then(() => { after(); A.commit(); }); })],
      ['Начертание', h('span', null, select('wt', el.weight, weights, v => { el.weight = +v; SD.render.fontsReady(S.doc).then(() => { after(); A.commit(); }); }), ' ', check('it', el.italic, 'курсив', v => { el.italic = v; after(); A.commit(); }))],
      ['Кегль, пт', num('size', el.size, (v, c) => { el.size = Math.max(1, v); after(); live(c); }, { step: 1, min: 1 })],
      ['Интерлиньяж', num('lh', el.lh || 1.2, (v, c) => { el.lh = Math.max(0.5, v); after(); live(c); }, { step: 0.05 })],
      ['Трекинг, %', num('ls', Math.round((el.ls || 0) * 100), (v, c) => { el.ls = v / 100; after(); live(c); }, { step: 1 })],
      ['Выключка', alignBtns],
      ['Регистр', h('span', null, check('up', el.upper, 'ВСЕ ПРОПИСНЫЕ', v => { el.upper = v; after(); A.commit(); }), h('br'), check('ah', el.autoH !== false, 'Автовысота блока', v => { el.autoH = v; after(); A.commit(); }))]
    ]));
    root.append(h('p', { class: 'note' }, 'Двойной клик по тексту на листе — редактировать прямо на макете. Shift + угловая ручка — масштабировать вместе с кеглем.'));
  }

  function pickImage(cb) {
    const inp = h('input', { type: 'file', accept: 'image/*' });
    inp.addEventListener('change', async () => { if (inp.files[0]) cb(await u.readFile(inp.files[0])); });
    inp.click();
  }

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
        h('td', { class: 'ic' }, TYPE_ICON[el.type] || '?'),
        h('td', { class: 'nm', title: el.name }, (el.pin ? '↳ ' : '') + (el.name || TYPE_NAMES[el.type]) + (el.type === 'text' ? ' — ' + String(el.text).slice(0, 24) : '')));
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
    f.append(...tbl('Горячие клавиши (как в Figma)', rows, ['Клавиши', 'Действие']));
    return f;
  }

  // Быстрое обновление чисел во время перетаскивания, без перестройки панели.
  function liveGeometry() {
    if (!root) return;
    const el = A.selected()[0];
    if (!el || A.selected().length !== 1) return;
    for (const k of ['x', 'y', 'w', 'h', 'rot']) {
      const i = root.querySelector(`[data-k="${k}"]`);
      if (i && document.activeElement !== i) i.value = u.round(el[k] || 0, 2);
    }
    const hl = root.querySelector('[data-live="h"]');
    if (hl) hl.textContent = u.round(el.h, 1) + ' (авто)';
  }

  return { mount, unmount, refresh, liveGeometry, lintBox, isMounted: () => !!root };
})();
