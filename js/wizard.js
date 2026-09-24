// Левая половина: пошаговый путь от идеи до готового макета.
// Каждый шаг — формальный вопрос и готовые варианты ответа (не чат).

SD.wizard = (function () {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;
  let el, textTimer = null;

  const STEPS = [
    { id: 'idea', title: 'Идея', render: stepIdea },
    { id: 'format', title: 'Формат', render: stepFormat },
    { id: 'style', title: 'Стиль', render: stepStyle },
    { id: 'mix', title: 'Сочетание', render: stepMix, live: true },
    { id: 'colors', title: 'Цвета', render: stepColors },
    { id: 'text', title: 'Текст', render: stepText },
    { id: 'layout', title: 'Расположение', render: stepLayout, live: true },
    { id: 'details', title: 'Детали', render: stepDetails },
    { id: 'editor', title: 'Редактор', render: stepEditor },
    { id: 'result', title: 'Результат', render: stepResult, live: true }
  ];

  function init() {
    el = document.getElementById('step');
    document.getElementById('prevStep').addEventListener('click', () => go(S.step - 1));
    document.getElementById('nextStep').addEventListener('click', () => go(S.step + 1));
    document.getElementById('randomIdea').addEventListener('click', randomIdea);
    document.getElementById('resetAll').addEventListener('click', () => {
      if (confirmSafe('Сбросить все ответы и макет?')) { A.resetAll(); render(); }
    });
    let thumbT = null;
    A.on(what => {
      if (what === 'dirty') { SD.toast('Ответ сохранён. Макет правился вручную — нажмите «Пересобрать», чтобы применить.'); showDirty(); return; }
      if (what === 'doc' || what === 'sel' || what === 'page') {
        if (STEPS[S.step].id === 'editor') SD.panel.refresh();
        else if (STEPS[S.step].live && what === 'doc') { clearTimeout(thumbT); thumbT = setTimeout(render, 60); }
        if (what === 'doc') showDirty();
      }
    });
  }
  function confirmSafe(msg) { try { return window.confirm(msg); } catch (e) { return true; } }

  function go(i) {
    i = u.clamp(i, 0, STEPS.length - 1);
    if (i === S.step) return;
    S.step = i; A.save();
    if (STEPS[i].id === 'editor' && S.view !== 'edit') SD.views.setView('edit');
    render();
    el.scrollTop = 0;
  }

  function render() {
    const st = STEPS[S.step];
    if (st.id !== 'editor') SD.panel.unmount();
    document.getElementById('stepCounter').textContent = `Шаг ${S.step + 1} из ${STEPS.length}`;
    const toc = document.getElementById('toc');
    toc.innerHTML = '';
    const t = h('table');
    t.append(h('tr', null, ...STEPS.map((s, i) => h('td', { class: i === S.step ? 'on' : i < S.step ? 'done' : '', title: s.title, onclick: () => go(i) }, String(i + 1)))));
    toc.append(t);
    const scroll = el.scrollTop;
    el.innerHTML = '';
    el.append(h('h2', null, `Часть ${S.step + 1}. ${st.title}`));
    el.append(h('div', { id: 'dirtyBox' }));
    st.render(el);
    showDirty();
    el.scrollTop = scroll;
    document.getElementById('prevStep').disabled = S.step === 0;
    const nx = document.getElementById('nextStep');
    nx.disabled = S.step === STEPS.length - 1;
    nx.textContent = S.step === STEPS.length - 2 ? 'К скачиванию →' : 'Далее →';
  }

  function showDirty() {
    const box = document.getElementById('dirtyBox');
    if (!box) return;
    box.innerHTML = '';
    const id = STEPS[S.step].id;
    if (S.doc && S.doc.dirty && !['editor', 'result'].includes(id)) {
      box.append(h('div', { class: 'warn' },
        'Макет уже правился в редакторе. Цвета, тексты и формат применяются поверх правок; вид, стиль, расположение и детали — только после пересборки. ',
        h('button', { class: 'btn sm', onclick: () => { A.regenerate(true); render(); } }, 'Пересобрать макет по ответам')));
    }
  }

  // Изменение ответа
  function set(path, value, kind) {
    const parts = path.split('.');
    let o = S.answers;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
    if (kind === 'structure') A.regenerate();
    else A.applySoft(kind);
    A.save();
  }

  // Табличный выбор одного варианта
  function radioTable(caption, cols, rows, current, onPick) {
    const t = h('table', { class: 'doc' });
    t.append(h('tr', null, h('th', { style: { width: '48px' } }, '№'), ...cols.map(c => h('th', null, c))));
    rows.forEach((r, i) => {
      const on = r.key === current;
      const tr = h('tr', { class: 'pick' + (on ? ' on' : ''), onclick: () => onPick(r.key) },
        h('td', { class: 'c nowrap' }, h('input', { type: 'radio', checked: on, tabindex: -1 }), ' ', String(i + 1)),
        ...r.cells.map(c => h('td', null, c)));
      t.append(tr);
    });
    return [h('div', { class: 'cap' }, caption), t];
  }

  function thumb(ans, maxW = 120, maxH = 150, pageIdx = 0) {
    let doc;
    try { doc = SD.gen.build(ans); } catch (e) { console.error(e); return h('div', null, 'ошибка'); }
    const k = Math.min(maxW / doc.w, maxH / doc.h);
    const c = SD.render.pageCanvas(doc, doc.pages[Math.min(pageIdx, doc.pages.length - 1)], k * 2);
    c.style.width = doc.w * k + 'px'; c.style.height = doc.h * k + 'px';
    return c;
  }
  function withAns(patch) {
    const a = u.clone(S.answers);
    for (const k in patch) a[k] = patch[k];
    return a;
  }

  // ---------- 1. Идея ----------
  function stepIdea(root) {
    root.append(h('p', null, 'Начнём с простого: что именно вы хотите получить на выходе и зачем. Ответы можно поменять в любой момент — макет справа обновится сам.'));
    root.append(h('div', { class: 'q' }, 'Вопрос 1. Что будем делать?'));
    root.append(...radioTable('Таблица 1. Вид продукта', ['Вид', 'Для чего', 'По умолчанию'],
      Object.entries(SD.KINDS).map(([k, v]) => ({ key: k, cells: [v.name, v.desc, `${SD.FORMATS[v.format].name}, ${v.pages === 1 ? '1 сторона' : v.pages === 2 ? '2 стороны' : v.pages + ' слайда'}`] })),
      S.answers.kind, k => {
        const K = SD.KINDS[k];
        S.answers.kind = k; S.answers.format = K.format; S.answers.orient = K.orient; S.answers.pages = K.pages;
        if (k === 'menu' && !S.answers.textsEdited) S.answers.texts.details = SD.MENU_DETAILS;
        A.regenerate(); render(); SD.editor.fit();
      }));
    root.append(h('div', { class: 'q' }, 'Вопрос 2. Какая главная цель?'));
    root.append(...radioTable('Таблица 2. Цель макета', ['Цель', 'Пример заголовка'],
      Object.entries(SD.GOALS).map(([k, v]) => ({ key: k, cells: [v.name, SD.EXAMPLES[k].title] })),
      S.answers.goal, k => {
        S.answers.goal = k;
        if (!S.answers.textsEdited) {
          Object.assign(S.answers.texts, SD.EXAMPLES[k]);
          if (S.answers.kind === 'menu') S.answers.texts.details = SD.MENU_DETAILS;
          A.applySoft('texts');
        }
        A.save(); render();
      }));
    if (S.answers.textsEdited) root.append(h('p', { class: 'note' }, 'Тексты уже изменены вами, поэтому при смене цели они не заменяются. Пример можно подставить на шаге «Текст».'));
    root.append(h('p', { class: 'note' }, 'Не знаете, чего хотите? Нажмите «Случайная идея» вверху — страница сама подберёт комбинацию, а вы поправите.'));
  }

  // ---------- 2. Формат ----------
  function stepFormat(root) {
    root.append(h('div', { class: 'q' }, 'Вопрос 3. Какой формат листа?'));
    root.append(...radioTable('Таблица 3. Форматы', ['Формат', 'Размер, мм', 'Подходит для'],
      Object.entries(SD.FORMATS).map(([k, f]) => ({ key: k, cells: [f.name, `${f.w} × ${u.round(f.h, 1)}`, f.note] })),
      S.answers.format, k => { set('format', k, 'format'); render(); SD.editor.fit(); }));
    const f = SD.FORMATS[S.answers.format];
    if (!f.fixedOrient) {
      root.append(h('div', { class: 'q' }, 'Вопрос 4. Ориентация'));
      root.append(...radioTable('Таблица 4. Ориентация', ['Ориентация', 'Размер, мм'],
        [{ key: 'portrait', cells: ['Книжная', `${Math.min(f.w, f.h)} × ${Math.max(f.w, f.h)}`] }, { key: 'landscape', cells: ['Альбомная', `${Math.max(f.w, f.h)} × ${Math.min(f.w, f.h)}`] }],
        S.answers.orient, k => { set('orient', k, 'format'); render(); SD.editor.fit(); }));
    }
    root.append(h('div', { class: 'q' }, 'Вопрос 5. Сколько сторон / страниц?'));
    const opts = S.answers.kind === 'slides' ? [2, 3, 4, 5] : [1, 2, 3, 4];
    root.append(...radioTable('Таблица 5. Стороны', ['Количество', 'Что будет'],
      opts.map(n => ({ key: n, cells: [String(n), n === 1 ? 'Только лицевая сторона' : n === 2 ? 'Лицевая + оборот с подробностями' : S.answers.kind === 'slides' ? `Обложка, ${n - 2} слайд(а) с текстом и финальный слайд` : `Лицевая + ${n - 1} страницы с подробностями`] })),
      S.answers.pages, k => { set('pages', k, 'structure'); render(); }));
    root.append(h('p', { class: 'note' }, 'Если макет уже правился в редакторе, при смене формата элементы перестроятся по своим «Ограничениям» — так же, как фреймы в Figma.'));
  }

  // ---------- 3. Стиль ----------
  function stepStyle(root) {
    root.append(h('p', null, 'Ниже — разбор визуального языка шести компаний. Страница не копирует их: она берёт приёмы (цветовую логику, форму, характер шрифта) и делает похоже, но по-своему. Можно выбрать один стиль или любую комбинацию — от двух до всех сразу.'));
    root.append(h('div', { class: 'q' }, 'Вопрос 6. В каком стиле ближе? (можно несколько)'));
    const t = h('table', { class: 'doc' });
    t.append(h('tr', null, h('th', null, '✓'), h('th', null, 'Стиль (похоже на…)'), h('th', null, 'Палитра'), h('th', null, 'Приёмы'), h('th', null, 'Настроение')));
    for (const id of SD.STYLE_ORDER) {
      const s = SD.STYLES[id];
      const on = S.answers.styles.includes(id);
      const tr = h('tr', { class: 'pick' + (on ? ' on' : ''), onclick: () => toggleStyle(id) },
        h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: on, tabindex: -1 })),
        h('td', null, h('b', null, s.name), h('br'), h('span', { class: 'note' }, 'как ' + s.like)),
        h('td', { class: 'nowrap' }, ...['primary', 'accent', 'bg', 'text'].map(r => h('span', { class: 'sw', style: { background: s.colors[r] }, title: s.colors[r] })), h('br'), h('span', { class: 'note', style: { fontFamily: `"${s.font}"` } }, s.font)),
        h('td', null, s.shapes),
        h('td', null, s.mood));
      t.append(tr);
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 6. Анализ стилей'), t);
    const cur = A.variant();
    const part = (label, id) => id ? `${label} — ${SD.STYLES[id].name}` : null;
    root.append(h('p', { class: 'note' }, S.answers.styles.length > 1
      ? 'Сейчас в превью: ' + [part('цвета', cur.colorsFrom), part('акцент', cur.accentFrom), part('доп. цвет', cur.extraFrom), part('шрифт', cur.fontFrom), 'декор — ' + (cur.motifFrom || []).map(x => SD.STYLES[x].name).join(', ')].filter(Boolean).join('; ') + '. Другие сочетания — на следующем шаге.'
      : 'Выбран один стиль. Отметьте ещё один или несколько — они смешаются.'));
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { S.answers.styles = SD.STYLE_ORDER.slice(); S.answers.variant = 0; S.answers.palette = null; A.regenerate(); render(); } }, 'Выбрать все'),
      h('button', { class: 'btn sm', onclick: () => { S.answers.styles = [S.answers.styles[0] || 'yandex']; S.answers.variant = 0; S.answers.palette = null; A.regenerate(); render(); } }, 'Оставить один')));

    const t2 = h('table', { class: 'doc compact' });
    t2.append(h('tr', null, h('th', null, 'Бренд'), h('th', null, 'Как в оригинале'), h('th', null, 'Что берём'), h('th', null, 'Что меняем')));
    for (const id of SD.STYLE_ORDER) {
      const s = SD.STYLES[id];
      t2.append(h('tr', null, h('td', null, s.like), h('td', null, s.original), h('td', null, s.about), h('td', null, 'Оттенки сдвинуты; ' + s.fontNote + '; без логотипа и фирменных знаков')));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 7. Почему это «похоже», а не копия'), t2);
    root.append(h('p', { class: 'note' }, 'Логотипы, названия и фирменные шрифты — это охраняемые объекты. Поэтому здесь используются только свободные шрифты Google Fonts и собственные цвета, близкие по характеру.'));
  }
  function toggleStyle(id) {
    const list = S.answers.styles.slice();
    const i = list.indexOf(id);
    if (i >= 0) { if (list.length === 1) { SD.toast('Нужен хотя бы один стиль'); return; } list.splice(i, 1); } else list.push(id);
    S.answers.styles = SD.STYLE_ORDER.filter(s => list.includes(s));
    S.answers.variant = 0; S.answers.palette = null;
    A.regenerate(); render();
  }

  // ---------- 4. Сочетание ----------
  function stepMix(root) {
    const vs = SD.gen.variants(S.answers.styles);
    root.append(h('p', null, `Выбрано стилей: ${S.answers.styles.length}. Из них собраны варианты сочетаний: цвета одного стиля, акцент и шрифт — другого, декоративные приёмы — обоих. Выберите самый близкий.`));
    root.append(h('div', { class: 'q' }, 'Вопрос 7. Какой вариант сочетания нравится больше?'));
    const g = h('div', { class: 'thumbs' });
    vs.forEach((v, i) => {
      const card = h('div', { class: 'thumb' + (i === S.answers.variant ? ' on' : ''), onclick: () => { S.answers.variant = i; S.answers.palette = null; A.regenerate(); render(); } },
        thumb(withAns({ variant: i, palette: null })),
        h('div', null, `${i + 1}. ${v.title}`),
        h('div', { class: 'note' }, (SD.STYLES[v.fontFrom] || {}).font + ' · ' + v.motifs.map(m => SD.MOTIF_NAMES[m]).join(', ')));
      g.append(card);
    });
    root.append(h('div', { class: 'cap' }, 'Рисунок 1. Варианты сочетаний'), g);
  }

  // ---------- 5. Цвета ----------
  function stepColors(root) {
    const pal = A.pal();
    root.append(h('p', null, 'Основные цвета взяты из выбранного сочетания. Их можно заменить вручную или выбрать готовую палитру. Текст на цветных плашках подбирается автоматически, чтобы читался.'));
    root.append(h('div', { class: 'q' }, 'Вопрос 8. Какие основные цвета?'));
    const roles = [['primary', 'Основной', 'плашки, кнопки, крупный декор'], ['accent', 'Акцент', 'бейдж, мелкий декор'], ['bg', 'Фон', 'цвет листа'], ['text', 'Текст', 'заголовки и основной текст'], ['soft', 'Мягкий', 'подложки, карточки'], ['extra', 'Дополнительный', 'редкие детали']];
    const t = h('table', { class: 'doc' });
    t.append(h('tr', null, h('th', null, 'Роль'), h('th', null, 'Цвет'), h('th', null, 'Где используется')));
    for (const [r, n, where] of roles) {
      const inp = h('input', { type: 'color', value: pal[r] || '#000000' });
      const hex = h('input', { type: 'text', value: (pal[r] || '').toUpperCase(), style: { width: '90px' } });
      const setC = v => { const p = Object.assign({}, A.pal()); p[r] = v; S.answers.palette = strip(p); A.applySoft('palette'); A.save(); };
      inp.addEventListener('input', () => { hex.value = inp.value.toUpperCase(); setC(inp.value); });
      hex.addEventListener('change', () => { if (/^#?[0-9a-f]{6}$/i.test(hex.value)) { const v = '#' + hex.value.replace('#', ''); inp.value = v; setC(v); } });
      t.append(h('tr', null, h('td', null, n), h('td', { class: 'nowrap' }, inp, ' ', hex), h('td', null, where)));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 8. Палитра макета'), t);

    root.append(h('div', { class: 'q' }, 'Готовые палитры из выбранных стилей'));
    const t2 = h('table', { class: 'doc compact' });
    t2.append(h('tr', null, h('th', null, 'Палитра'), h('th', null, 'Цвета'), h('th', null, '')));
    SD.gen.variants(S.answers.styles).forEach((v) => {
      const p = SD.gen.palette(v);
      t2.append(h('tr', null, h('td', null, v.title), h('td', null, h('span', { class: 'strip' }, ...['bg', 'primary', 'accent', 'text', 'soft'].map(r => h('i', { style: { background: p[r] } })))),
        h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => { S.answers.palette = strip(p); A.applySoft('palette'); A.save(); render(); } }, 'Взять'))));
    });
    root.append(t2);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { const p = A.pal(); S.answers.palette = strip(Object.assign({}, p, { bg: p.primary, primary: u.readable(p.primary, [p.text, p.accent]), text: u.readable(p.primary, [p.bg, p.text]) })); A.applySoft('palette'); A.save(); render(); } }, 'Инвертировать (цветной фон)'),
      h('button', { class: 'btn sm', onclick: () => { const d = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 10); const p = A.pal(); const q = {}; for (const r of ['primary', 'accent', 'extra', 'soft']) q[r] = u.hueShift(p[r], d); S.answers.palette = strip(Object.assign({}, p, q)); A.applySoft('palette'); A.save(); render(); } }, 'Похожая палитра (сдвиг оттенка)'),
      h('button', { class: 'btn sm', onclick: () => { S.answers.palette = null; A.applySoft('palette'); A.save(); render(); } }, 'Вернуть палитру стиля')));
    const warn = u.contrast(pal.bg, pal.text) < 4.5;
    root.append(h('p', { class: 'note' }, `Контраст текста и фона: ${u.round(u.contrast(pal.bg, pal.text), 1)} : 1 ${warn ? '— маловато, текст может плохо читаться (желательно от 4,5).' : '— хорошо читается.'}`));
  }
  function strip(p) { const o = {}; for (const r of ['primary', 'accent', 'bg', 'text', 'soft', 'extra']) o[r] = p[r]; return o; }

  // ---------- 6. Текст ----------
  function stepText(root) {
    root.append(h('p', null, 'Впишите свои тексты. Пустое поле — элемента не будет. Всё можно потом поправить прямо на макете двойным кликом.'));
    root.append(h('div', { class: 'q' }, 'Вопрос 9. Что написать?'));
    const T = S.answers.texts;
    const fields = [['title', 'Заголовок', 1], ['subtitle', 'Подзаголовок', 1], ['body', 'Основной текст', 3], ['cta', 'Кнопка / призыв', 1], ['promo', 'Бейдж (скидка, цена)', 1], ['contacts', 'Контакты / адрес', 1]];
    if (S.answers.pages > 1) fields.push(['details', S.answers.kind === 'menu' ? 'Позиции меню (оборот)' : 'Текст оборота', 5]);
    fields.push(['qr', 'Ссылка для QR-кода', 1]);
    const t = h('table', { class: 'doc' });
    t.append(h('tr', null, h('th', { style: { width: '32%' } }, 'Поле'), h('th', null, 'Текст')));
    for (const [k, n, rows] of fields) {
      const inp = rows > 1 ? h('textarea', { rows }, T[k] || '') : h('input', { type: 'text', value: T[k] || '' });
      inp.addEventListener('input', () => {
        T[k] = inp.value; S.answers.textsEdited = true;
        clearTimeout(textTimer); textTimer = setTimeout(() => { A.applySoft('texts'); A.save(); }, 180);
      });
      t.append(h('tr', null, h('td', null, n), h('td', null, inp)));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 9. Тексты макета'), t);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { Object.assign(T, SD.EXAMPLES[S.answers.goal]); if (S.answers.kind === 'menu') T.details = SD.MENU_DETAILS; S.answers.textsEdited = false; A.applySoft('texts'); A.save(); render(); } }, 'Подставить пример'),
      h('button', { class: 'btn sm', onclick: () => { for (const k of ['title', 'subtitle', 'body', 'cta', 'promo', 'contacts', 'details']) T[k] = ''; T.title = 'Заголовок'; S.answers.textsEdited = true; A.applySoft('texts'); A.save(); render(); } }, 'Очистить всё')));
    root.append(h('div', { class: 'q' }, 'Идеи для заголовка (нажмите, чтобы подставить)'));
    const chips = h('div', { class: 'chips' });
    for (const k of Object.keys(SD.IDEAS)) for (const idea of SD.IDEAS[k]) {
      if (k !== S.answers.goal && Math.random() < 0.6) continue;
      chips.append(h('span', { class: 'chip', onclick: () => { T.title = idea; S.answers.textsEdited = true; A.applySoft('texts'); A.save(); render(); } }, idea));
    }
    root.append(chips);
  }

  // ---------- 7. Расположение ----------
  function stepLayout(root) {
    root.append(h('div', { class: 'q' }, 'Вопрос 10. Как расположить текст?'));
    const g = h('div', { class: 'thumbs' });
    for (const [k, L] of Object.entries(SD.LAYOUTS)) {
      g.append(h('div', { class: 'thumb' + (k === S.answers.layout ? ' on' : ''), onclick: () => { set('layout', k, 'structure'); render(); } },
        thumb(withAns({ layout: k })), h('div', null, L.name), h('div', { class: 'note' }, L.desc)));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 2. Варианты расположения'), g);
    if (!['center', 'diagonal'].includes(S.answers.layout)) {
      root.append(h('div', { class: 'q' }, 'Вопрос 11. Выключка текста'));
      root.append(...radioTable('Таблица 10. Выравнивание', ['Выравнивание'], [{ key: 'left', cells: ['По левому краю'] }, { key: 'center', cells: ['По центру'] }, { key: 'right', cells: ['По правому краю'] }],
        S.answers.align, k => { set('align', k, 'structure'); render(); }));
    }
    root.append(h('div', { class: 'q' }, 'Вопрос 12. Размер заголовка'));
    root.append(...radioTable('Таблица 11. Кегль заголовка', ['Размер', 'Когда подходит'],
      [{ key: 0.8, cells: ['Скромный', 'много текста'] }, { key: 1, cells: ['Обычный', 'большинство случаев'] }, { key: 1.2, cells: ['Крупный', 'короткий заголовок'] }, { key: 1.45, cells: ['Огромный', '2–3 слова, плакат'] }],
      S.answers.titleScale, k => { set('titleScale', k, 'structure'); render(); }));
  }

  // ---------- 8. Детали ----------
  function stepDetails(root) {
    const o = S.answers.opts;
    const v = A.variant();
    root.append(h('div', { class: 'q' }, 'Вопрос 13. Что ещё добавить на макет?'));
    const row = (k, name, note) => {
      const on = !!o[k];
      return h('tr', { class: 'pick' + (on ? ' on' : ''), onclick: () => { set('opts.' + k, !on, 'structure'); render(); } },
        h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: on, tabindex: -1 })), h('td', null, name), h('td', null, note));
    };
    const t = h('table', { class: 'doc' });
    t.append(h('tr', null, h('th', null, '✓'), h('th', null, 'Элемент'), h('th', null, 'Пояснение')));
    t.append(row('motif', 'Декор стиля', 'Приёмы выбранных стилей: ' + v.motifs.map(m => SD.MOTIF_NAMES[m]).join(', ')));
    t.append(row('cta', 'Кнопка-призыв', `«${S.answers.texts.cta || '—'}»`));
    t.append(row('promo', 'Бейдж', `Звезда-наклейка с текстом «${S.answers.texts.promo || '—'}»`));
    t.append(row('contacts', 'Контакты', 'Строка внизу листа'));
    t.append(row('qr', 'QR-код', 'Ведёт на: ' + (S.answers.texts.qr || '—')));
    root.append(h('div', { class: 'cap' }, 'Таблица 12. Элементы макета'), t);

    root.append(h('div', { class: 'q' }, 'Вопрос 14. Своя картинка или фото'));
    const it = h('table', { class: 'doc' });
    const file = h('input', { type: 'file', accept: 'image/*' });
    file.addEventListener('change', async () => { if (file.files[0]) { set('opts.image', await u.readFile(file.files[0]), 'structure'); render(); } });
    it.append(h('tr', null, h('td', { style: { width: '32%' } }, 'Файл'), h('td', null, o.image ? h('span', null, h('img', { src: o.image, style: { height: '40px', verticalAlign: 'middle', border: '1px solid #000' } }), ' ', h('button', { class: 'btn sm', onclick: () => { set('opts.image', null, 'structure'); render(); } }, 'Убрать')) : file)));
    if (o.image) it.append(h('tr', null, h('td', null, 'Как вписать'), h('td', null, (() => {
      const s = h('select'); for (const [k, n] of [['cover', 'Заполнить область (обрезать края)'], ['contain', 'Показать целиком']]) s.append(h('option', { value: k, selected: o.imageFit === k }, n));
      s.addEventListener('change', () => set('opts.imageFit', s.value, 'structure')); return s;
    })())));
    root.append(h('div', { class: 'cap' }, 'Таблица 13. Изображение'), it);
    root.append(h('p', { class: 'note' }, 'Картинка встаёт в свободную зону выбранного расположения. Позже её можно двигать и менять в редакторе.'));

    root.append(h('div', { class: 'q' }, 'Вопрос 15. Шрифт и скругления'));
    const ft = h('table', { class: 'doc' });
    const fs = h('select');
    fs.append(h('option', { value: '' }, 'Как в стиле (' + SD.STYLES[v.fontFrom || v.colorsFrom].font + ')'));
    for (const f of SD.FONTS) fs.append(h('option', { value: f, selected: S.answers.font === f, style: { fontFamily: `"${f}"` } }, f));
    fs.addEventListener('change', () => { set('font', fs.value || null, 'structure'); render(); });
    const rg = h('input', { type: 'range', min: 0, max: 2.5, step: 0.25, value: o.rounded == null ? 1 : o.rounded });
    rg.addEventListener('change', () => set('opts.rounded', parseFloat(rg.value), 'structure'));
    ft.append(h('tr', null, h('td', { style: { width: '32%' } }, 'Шрифт'), h('td', null, fs)));
    ft.append(h('tr', null, h('td', null, 'Скругление углов'), h('td', null, h('span', { class: 'note' }, 'острые'), rg, h('span', { class: 'note' }, 'круглые'))));
    root.append(h('div', { class: 'cap' }, 'Таблица 14. Типографика и форма'), ft);
  }

  // ---------- 9. Редактор ----------
  function stepEditor(root) {
    root.append(h('p', null, 'Теперь макет можно довести руками, как в Figma: выделяйте элементы на листе справа, тяните за ручки, поворачивайте за кружок сверху, двигайте — лист подскажет красными направляющими, где край и центр. Инструменты — на панели внизу справа.'));
    const box = h('div');
    root.append(box);
    SD.panel.mount(box);
  }

  // ---------- 10. Результат ----------
  function stepResult(root) {
    const a = S.answers, d = S.doc, v = A.variant(), pal = A.pal();
    const f = SD.FORMATS[a.format];
    root.append(h('p', null, 'Итоговые параметры макета и скачивание. Справа можно переключить вид: «Все стороны» или «Как в жизни».'));
    const rows = [
      ['Вид', SD.KINDS[a.kind].name], ['Цель', SD.GOALS[a.goal].name],
      ['Формат', `${f.name}, ${u.round(d.w, 1)} × ${u.round(d.h, 1)} мм`], ['Страниц', String(d.pages.length)],
      ['Стили', a.styles.map(s => SD.STYLES[s].name + ' (как ' + SD.STYLES[s].like + ')').join(', ')],
      ['Сочетание', v.title],
      ['Цвета', h('span', { class: 'strip' }, ...['bg', 'primary', 'accent', 'text', 'soft'].map(r => h('i', { style: { background: pal[r] }, title: pal[r] })))],
      ['Шрифт', a.font || SD.STYLES[v.fontFrom || v.colorsFrom].font],
      ['Расположение', SD.LAYOUTS[a.layout].name],
      ['Правки в редакторе', d.dirty ? 'есть' : 'нет']
    ];
    const t = h('table', { class: 'doc' });
    t.append(h('tr', null, h('th', null, 'Параметр'), h('th', null, 'Значение')));
    for (const [k, val] of rows) t.append(h('tr', null, h('td', null, k), h('td', null, val)));
    root.append(h('div', { class: 'cap' }, 'Таблица 15. Сводка по макету'), t);

    const o = S.exportOpts;
    const dpi = h('select');
    for (const n of [150, 300, 600]) dpi.append(h('option', { value: n, selected: o.dpi === n }, n + ' dpi' + (n === 300 ? ' (типография)' : n === 150 ? ' (экран, быстрее)' : ' (очень чётко)')));
    dpi.addEventListener('change', () => { o.dpi = +dpi.value; });
    const bl = h('input', { type: 'checkbox', checked: o.bleed }); bl.addEventListener('change', () => { o.bleed = bl.checked; });
    const mk = h('input', { type: 'checkbox', checked: o.marks }); mk.addEventListener('change', () => { o.marks = mk.checked; });
    const ot = h('table', { class: 'doc' });
    ot.append(h('tr', null, h('td', { style: { width: '40%' } }, 'Разрешение'), h('td', null, dpi)));
    ot.append(h('tr', null, h('td', null, 'Вылеты 3 мм'), h('td', null, h('label', null, bl, ' фон и плашки у края выходят за обрез'))));
    ot.append(h('tr', null, h('td', null, 'Метки реза'), h('td', null, h('label', null, mk, ' уголки для резки в типографии'))));
    root.append(h('div', { class: 'cap' }, 'Таблица 16. Параметры файлов'), ot);

    const E = SD.exporter;
    const list = [
      ['PDF для печати', 'Типография, принтер. Точный размер листа, все страницы в одном файле', () => E.pdf()],
      ['Печать', 'Сразу отправить на принтер из браузера', () => E.print()],
      ['PNG', 'Картинка без потерь для каждой страницы', () => E.images('png')],
      ['JPG', 'Лёгкая картинка для мессенджеров и соцсетей', () => E.images('jpeg')],
      ['Презентация PowerPoint (.pptx)', 'Каждая страница — отдельный слайд', () => E.pptx()],
      ['Презентация HTML', 'Один файл, открывается в любом браузере, листается стрелками', () => E.htmlDeck()],
      ['Проект (.json)', 'Сохранить, чтобы продолжить позже на этой странице', () => E.saveProject()]
    ];
    const et = h('table', { class: 'doc' });
    et.append(h('tr', null, h('th', null, 'Формат'), h('th', null, 'Для чего'), h('th', null, '')));
    for (const [n, why, fn] of list) {
      const b = h('button', { class: 'btn sm primary' }, 'Скачать');
      if (n === 'Печать') b.textContent = 'Печать';
      b.addEventListener('click', async () => { b.disabled = true; const old = b.textContent; b.textContent = 'Готовим…'; try { await fn(); } catch (e) { console.error(e); SD.toast('Ошибка: ' + e.message); } b.disabled = false; b.textContent = old; });
      et.append(h('tr', null, h('td', null, n), h('td', null, why), h('td', { class: 'c' }, b)));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 17. Скачать результат'), et);
    root.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => document.getElementById('projectInput').click() }, 'Открыть сохранённый проект…')));
  }

  // ---------- Случайная идея ----------
  function randomIdea() {
    const P = u.pick;
    const kinds = Object.keys(SD.KINDS);
    const kind = P(kinds), K = SD.KINDS[kind];
    const goal = P(Object.keys(SD.GOALS));
    const pool = SD.STYLE_ORDER.slice().sort(() => Math.random() - 0.5);
    const styles = SD.STYLE_ORDER.filter(s => pool.slice(0, 1 + Math.floor(Math.random() * 3)).includes(s));
    const a = S.answers;
    Object.assign(a, { kind, goal, format: K.format, orient: K.orient, pages: K.pages, styles, palette: null, font: null, textsEdited: false });
    a.variant = Math.floor(Math.random() * SD.gen.variants(styles).length);
    a.layout = P(Object.keys(SD.LAYOUTS));
    a.align = P(['left', 'left', 'center']);
    a.titleScale = P([1, 1, 1.2, 1.45]);
    a.texts = Object.assign({ qr: a.texts.qr }, SD.EXAMPLES[goal]);
    a.texts.title = P(SD.IDEAS[goal]);
    if (kind === 'menu') a.texts.details = SD.MENU_DETAILS;
    Object.assign(a.opts, { motif: true, cta: Math.random() < 0.8, promo: Math.random() < 0.6, qr: Math.random() < 0.35, contacts: true, rounded: P([0.5, 1, 1, 1.5]) });
    A.regenerate(true);
    render(); SD.editor.fit();
    SD.toast('Идея: ' + SD.KINDS[kind].name + ' · ' + styles.map(s => SD.STYLES[s].name).join(' + '));
  }

  return { init, render, go, STEPS };
})();
