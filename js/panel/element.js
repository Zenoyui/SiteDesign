// Панель свойств: один элемент — положение, размер, ограничения, заливка, эффекты, текст.

(function (P) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

  // ---------- Один элемент ----------
  function elementProps(el) {
    const nameIn = h('input', { type: 'text', value: el.name || P.TYPE_NAMES[el.type], 'data-k': 'name' });
    nameIn.addEventListener('change', () => { el.name = nameIn.value; A.commit(); });
    P.root.append(h('p', null, h('b', null, P.TYPE_NAMES[el.type] + ': '), ''), nameIn);

    const setG = k => (v, c) => {
      if (k === 'rot') v = ((v % 360) + 540) % 360 - 180;
      if ((k === 'w' || k === 'h') && v < 0.5) v = 0.5;
      const dx = k === 'x' ? v - el.x : 0, dy = k === 'y' ? v - el.y : 0;
      el[k] = v;
      if (el.pin && (dx || dy)) { el.pin.dx += dx; el.pin.dy += dy; }
      if (el.type === 'text' && k === 'w') SD.render.fitHeight(el);
      P.live(c);
    };
    P.root.append(...P.tbl('Таблица 1. Положение и размер (мм)', [
      ['X', P.num('x', el.x, setG('x')), 'Y', P.num('y', el.y, setG('y'))],
      ['Ширина', P.num('w', el.w, setG('w'), { min: 0.5 }), 'Высота', el.type === 'text' && el.autoH !== false ? h('span', { 'data-live': 'h' }, u.round(el.h, 1) + ' (авто)') : P.num('h', el.h, setG('h'), { min: 0.5 })],
      ['Поворот°', P.num('rot', el.rot || 0, setG('rot'), { step: 1 }), 'Прозр., %', P.num('op', Math.round((el.opacity == null ? 1 : el.opacity) * 100), (v, c) => { el.opacity = u.clamp(v, 0, 100) / 100; P.live(c); }, { step: 5, min: 0, max: 100 })]
    ]));
    P.root.append(P.alignTable(false));

    // Ограничения
    P.root.append(...P.tbl('Таблица 2. Ограничения — как элемент ведёт себя при смене формата листа', [
      ['По горизонтали', P.select('ch', el.cons.h, Object.entries(P.HCONS), v => { el.cons.h = v; A.commit(); })],
      ['По вертикали', P.select('cv', el.cons.v, Object.entries(P.VCONS), v => { el.cons.v = v; A.commit(); })]
    ]));

    // Привязка и блокировка
    const others = A.page().elements.filter(e => e.id !== el.id);
    P.root.append(...P.tbl('Таблица 3. Привязка и фиксация', [
      ['Привязать к элементу', P.select('pin', el.pin ? el.pin.id : '', [['', '— нет (свободно) —']].concat(others.slice().reverse().map(o => [o.id, (o.name || P.TYPE_NAMES[o.type]) + ' · ' + P.TYPE_NAMES[o.type]])), v => { A.pinTo(el, v); A.commit(); })],
      el.pin ? ['Смещение от цели', h('span', null, 'X ', P.num('pdx', el.pin.dx, (v, c) => { el.pin.dx = v; P.live(c); }), ' Y ', P.num('pdy', el.pin.dy, (v, c) => { el.pin.dy = v; P.live(c); }))] : null,
      ['Фиксация', h('span', null, P.check('lock', el.locked, 'Закрепить (нельзя двигать мышью)', v => { el.locked = v; A.commit(); }), h('br'), P.check('vis', el.visible !== false, 'Показывать', v => { el.visible = v; A.commit(); }))]
    ]));
    if (el.pin) P.root.append(h('p', { class: 'note' }, 'Элемент движется вместе с целью (фиолетовый пунктир на листе). Перетащите его, чтобы изменить смещение. Двойной клик — выделить цель.'));

    // Заливка / обводка
    const fillRows = [];
    if (el.type !== 'line' && el.type !== 'image') {
      fillRows.push(['Заливка', h('span', null, P.color('fill', el.fill, (v, c) => { el.fill = v; el.fillRole = null; if (el.gradType) el.grad = SD.gen.gradFor(el.gradType, v, A.pal(), null, el.gradSeed); P.live(c); }), ' ', P.swatches((v, role) => { el.fill = v; el.fillRole = role; A.commit(); }))]);
      if (['rect', 'ellipse', 'star', 'wave', 'text'].includes(el.type)) fillRows.push(['Градиент', h('span', null,
        P.check('grad', !!el.fill2, 'вкл. ', v => { el.fill2 = v ? A.pal().accent : null; el.fill2Role = null; A.commit(); }),
        el.fill2 ? P.color('fill2', el.fill2, (v, c) => { el.fill2 = v; el.fill2Role = null; P.live(c); }) : '',
        el.fill2 ? h('span', null, ' угол ', P.num('ga', el.gradAngle || 0, (v, c) => { el.gradAngle = v; P.live(c); }, { step: 15 })) : '')]);
      else if (el.type === 'qr') fillRows.push(['Фон QR', h('span', null, P.check('qbg', !!el.fill2, 'подложка ', v => { el.fill2 = v ? '#FFFFFF' : null; A.commit(); }), el.fill2 ? P.color('fill2', el.fill2, (v, c) => { el.fill2 = v; P.live(c); }) : '')]);
    }
    if (el.type === 'icon') {
      fillRows.push(['Значок', P.select('icon', el.icon, Object.entries(SD.ICON_NAMES), v => { el.icon = v; A.commit(); })]);
      fillRows.push(['Стиль значка', P.select('istyle', el.iconStyle || 'line', Object.entries(SD.ICON_STYLES).map(([k, v]) => [k, v.name + ' (как ' + v.like.map(x => SD.STYLES[x].name).join(', ') + ')']), v => { el.iconStyle = v; A.commit(); })]);
      fillRows.push(['Цвет подложки', h('span', null, P.color('fill2', el.fill2 || el.fill, (v, c) => { el.fill2 = v; el.fill2Role = null; P.live(c); }), ' ', P.swatches((v, role) => { el.fill2 = v; el.fill2Role = role; A.commit(); }))]);
      fillRows.push(['Отразить', P.check('flip', el.flipX, 'по горизонтали', v => { el.flipX = v; A.commit(); })]);
    }
    if (el.type === 'pattern') {
      fillRows.push(['Узор', P.select('kind', el.kind, Object.entries(SD.PATTERNS).filter(([k]) => k !== 'none').map(([k, v]) => [k, v.name]), v => { el.kind = v; A.commit(); })]);
      fillRows.push(['Шаг, мм', P.num('cell', el.cell || 6, (v, c) => { el.cell = Math.max(0.8, v); P.live(c); }, { step: 0.5, min: 0.8 })]);
      fillRows.push(['Второй цвет', P.color('fill2', el.fill2 || el.fill, (v, c) => { el.fill2 = v; el.fill2Role = null; P.live(c); })]);
    }
    if (el.type === 'phone') {
      fillRows.push(['Акцент экрана', P.color('fill2', el.fill2 || '#000000', (v, c) => { el.fill2 = v; el.fill2Role = null; P.live(c); })]);
      fillRows.push(['Скриншот', h('span', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => pickImage(src => { el.src = src; A.commit(); }) }, 'Поставить свой…'), el.src ? h('button', { class: 'btn sm', onclick: () => { el.src = null; A.commit(); } }, 'Убрать') : '')]);
    }
    if (!['text', 'qr', 'icon', 'pattern'].includes(el.type)) {
      fillRows.push([el.type === 'line' ? 'Линия' : 'Обводка', h('span', null,
        P.color('stroke', el.stroke || '#000000', (v, c) => { el.stroke = v; el.strokeRole = null; if (!el.strokeW) el.strokeW = 0.5; P.live(c); }), ' толщина ',
        P.num('sw', el.strokeW || 0, (v, c) => { el.strokeW = Math.max(0, v); P.live(c); }, { step: 0.1, min: 0 }))]);
    }
    if (['rect', 'ellipse', 'star', 'wave'].includes(el.type)) fillRows.push(['Современный градиент', P.select('gtype', el.gradType || 'none', Object.entries(SD.gen.GRAD_TYPES), v => {
      el.gradType = v === 'none' ? null : v; el.gradSeed = el.gradSeed || 3;
      el.grad = el.gradType ? SD.gen.gradFor(el.gradType, el.fill, A.pal(), null, el.gradSeed) : null;
      A.commit();
    })]);
    if (el.type === 'rect' || el.type === 'image' || el.type === 'qr') fillRows.push(['Скругление', P.num('rad', el.radius || 0, (v, c) => { el.radius = Math.max(0, v); P.live(c); }, { min: 0 })]);
    if (el.type === 'star') fillRows.push(['Лучей / глубина', h('span', null, P.num('pts', el.points || 5, (v, c) => { el.points = u.clamp(Math.round(v), 3, 40); P.live(c); }, { step: 1, min: 3 }), ' ', P.num('inr', Math.round((el.inner || 0.5) * 100), (v, c) => { el.inner = u.clamp(v, 5, 100) / 100; P.live(c); }, { step: 5 }))]);
    if (el.type === 'wave') fillRows.push(['Волны / высота', h('span', null, P.num('wv', el.waves || 2, (v, c) => { el.waves = Math.max(0.5, v); P.live(c); }, { step: 0.5 }), ' ', P.num('amp', Math.round((el.amp || 0.3) * 100), (v, c) => { el.amp = u.clamp(v, 0, 100) / 100; P.live(c); }, { step: 5 }))]);
    if (el.type === 'image') {
      fillRows.push(['Файл', h('button', { class: 'btn sm', onclick: () => pickImage(src => { el.src = src; A.commit(); }) }, 'Заменить…')]);
      fillRows.push(['Вписать', P.select('fit', el.fit || 'cover', [['cover', 'Заполнить (обрезать)'], ['contain', 'Вписать целиком']], v => { el.fit = v; A.commit(); })]);
    }
    if (el.type === 'qr') {
      const i = h('input', { type: 'text', value: el.data || '', 'data-k': 'qrdata' });
      i.addEventListener('change', () => { el.data = i.value; el.role = null; A.commit(); });
      fillRows.push(['Ссылка / текст', i]);
    }
    if (fillRows.length) P.root.append(...P.tbl('Таблица 4. Оформление', fillRows));

    // Эффекты элемента
    const sh = el.shadow;
    const kind = !sh ? 'none' : sh.blur === 0 ? 'hard' : (sh.x || sh.y) ? 'soft' : 'glow';
    const fxRows = [['Тень', h('span', null, P.select('shadow', kind, [['none', 'Нет'], ['soft', 'Мягкая (как Поисковый, Поездочный)'], ['hard', 'Жёсткая сдвиг (как Полосатый)'], ['glow', 'Свечение (как Фиолетовый)']], v => {
      const b = Math.min(S.doc.w, S.doc.h * 0.75);
      el.shadow = v === 'none' ? null : v === 'soft' ? { x: 0, y: b * 0.008, blur: b * 0.035, color: '#000000', alpha: 0.2 } : v === 'hard' ? { x: b * 0.012, y: b * 0.012, blur: 0, color: A.pal().text, alpha: 1 } : { x: 0, y: 0, blur: b * 0.06, color: el.fill || A.pal().primary, alpha: 0.75 };
      A.commit();
    }), sh ? h('span', null, ' ', P.color('shc', sh.color, (v, c) => { sh.color = v; sh.colorRole = null; P.live(c); }), ' размытие ', P.num('shb', sh.blur, (v, c) => { sh.blur = Math.max(0, v); P.live(c); }, { step: 0.5, min: 0 })) : '')]];
    if (el.type === 'text') {
      fxRows.push(['Обводка букв', h('span', null, P.check('tout', el.stroke && el.strokeW > 0, 'вкл. ', v => { el.stroke = v ? '#FFFFFF' : null; el.strokeW = v ? Math.max(0.2, el.size * SD.PT * 0.06) : 0; A.commit(); }),
        el.stroke && el.strokeW > 0 ? h('span', null, P.color('tsc', el.stroke, (v, c) => { el.stroke = v; P.live(c); }), ' ', P.num('tsw', el.strokeW, (v, c) => { el.strokeW = Math.max(0, v); P.live(c); }, { step: 0.1, min: 0 })) : '')]);
      fxRows.push(['Зачёркнутый', P.check('strike', el.strike, 'как старая цена', v => { el.strike = v; A.commit(); })]);
      fxRows.push(['Плашка под текстом', h('span', null, P.check('tbg', el.bg && el.bg.fill, 'вкл. ', v => {
        const pad = el.size * SD.PT;
        el.bg = v ? { fill: A.pal().accent, fillRole: null, padX: pad * 0.7, padY: pad * 0.35, radius: null } : null;
        SD.render.fitHeight(el); A.commit();
      }), el.bg && el.bg.fill ? P.color('tbgc', el.bg.fill, (v, c) => { el.bg.fill = v; el.bg.fillRole = null; P.live(c); }) : '')]);
    }
    P.root.append(...P.tbl('Эффекты элемента', fxRows));

    if (el.type === 'text') textProps(el);
    P.root.append(...P.tbl('Таблица 5. Порядок и действия', [[P.orderButtons()]]));
  }

  function textProps(el) {
    const ta = h('textarea', { 'data-k': 'text', rows: 3 }, el.text);
    ta.addEventListener('input', () => { el.text = ta.value; el.textKey = null; SD.render.fitHeight(el); P.live(false); });
    ta.addEventListener('change', () => A.commit());
    const weights = (SD.FONT_WEIGHTS[el.font] || [400, 700]).map(w => [w, { 400: 'Обычный', 500: 'Средний', 600: 'Полужирный', 700: 'Жирный', 800: 'Очень жирный', 900: 'Чёрный' }[w] + ' ' + w]);
    const alignBtns = h('span', { class: 'btn-row' }, ...[['left', 'Влево'], ['center', 'По центру'], ['right', 'Вправо']].map(([a, t]) =>
      h('button', { class: 'btn sm' + (el.align === a ? ' primary' : ''), onclick: () => { el.align = a; A.commit(); } }, t)));
    const after = () => { SD.render.fitHeight(el); };
    P.root.append(...P.tbl('Таблица 6. Текст', [
      ['Текст', ta],
      ['Шрифт', P.select('font', el.font, SD.FONTS.map(f => [f, f]), v => { el.font = v; el.weight = SD.nearWeight(v, el.weight); SD.render.fontsReady(S.doc).then(() => { after(); A.commit(); }); })],
      ['Начертание', h('span', null, P.select('wt', el.weight, weights, v => { el.weight = +v; SD.render.fontsReady(S.doc).then(() => { after(); A.commit(); }); }), ' ', P.check('it', el.italic, 'курсив', v => { el.italic = v; after(); A.commit(); }))],
      ['Кегль, пт', P.num('size', el.size, (v, c) => { el.size = Math.max(1, v); after(); P.live(c); }, { step: 1, min: 1 })],
      ['Интерлиньяж', P.num('lh', el.lh || 1.2, (v, c) => { el.lh = Math.max(0.5, v); after(); P.live(c); }, { step: 0.05 })],
      ['Трекинг, %', P.num('ls', Math.round((el.ls || 0) * 100), (v, c) => { el.ls = v / 100; after(); P.live(c); }, { step: 1 })],
      ['Выключка', alignBtns],
      ['Регистр', h('span', null, P.check('up', el.upper, 'ВСЕ ПРОПИСНЫЕ', v => { el.upper = v; after(); A.commit(); }), h('br'), P.check('ah', el.autoH !== false, 'Автовысота блока', v => { el.autoH = v; after(); A.commit(); }))]
    ]));
    P.root.append(h('p', { class: 'note' }, 'Двойной клик по тексту на листе — редактировать прямо на макете. Shift + угловая ручка — масштабировать вместе с кеглем.'));
  }

  function pickImage(cb) {
    const inp = h('input', { type: 'file', accept: 'image/*' });
    inp.addEventListener('change', async () => { if (inp.files[0]) cb(await u.readFile(inp.files[0])); });
    inp.click();
  }

  Object.assign(P, { elementProps });
})(SD._panel = SD._panel || {});
