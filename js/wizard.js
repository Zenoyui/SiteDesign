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
    { id: 'attention', title: 'Внимание', render: stepAttention },
    { id: 'layout', title: 'Расположение', render: stepLayout, live: true },
    { id: 'details', title: 'Детали', render: stepDetails },
    { id: 'effects', title: 'Эффекты и значки', render: stepEffects, live: true },
    { id: 'auto', title: 'Автопилот', render: stepAuto },
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
    renumber();
    showDirty();
    el.scrollTop = scroll;
    document.getElementById('prevStep').disabled = S.step === 0;
    const nx = document.getElementById('nextStep');
    nx.disabled = S.step === STEPS.length - 1;
    nx.textContent = S.step === STEPS.length - 2 ? 'К скачиванию →' : 'Далее →';
  }

  // Нумерация как в отчёте: «Вопрос 7.1», «Таблица 7.2», «Рисунок 7.1»
  function renumber() {
    if (!el) return;
    const n = S.step + 1, cnt = {};
    el.querySelectorAll('.q, .cap').forEach(node => {
      const m = node.textContent.match(/^(Вопрос|Таблица|Рисунок)(\s+[\d.]+)?\.?\s*/);
      if (!m) return;
      cnt[m[1]] = (cnt[m[1]] || 0) + 1;
      const first = node.firstChild;
      if (first && first.nodeType === 3 && first.textContent.startsWith(m[0])) first.textContent = `${m[1]} ${n}.${cnt[m[1]]}. ` + first.textContent.slice(m[0].length);
    });
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

  // Маленькая полоска значков для таблиц
  function iconStrip(names, style, color, color2, size = 20) {
    const c = document.createElement('canvas');
    const dpr = 2;
    c.width = names.length * (size + 6) * dpr; c.height = size * dpr;
    c.style.width = names.length * (size + 6) + 'px'; c.style.height = size + 'px'; c.style.verticalAlign = 'middle';
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    names.forEach((n, i) => { x.save(); x.translate(i * (size + 6), 0); SD.drawIcon(x, n, style, size, size, color, color2); x.restore(); });
    return c;
  }
  function curFx() { return Object.assign({}, SD.gen.fxFor(S.answers)); }
  function setFx(patch) {
    S.answers.fx = Object.assign(curFx(), patch, { auto: false });
    S.answers.fx.effects = (S.answers.fx.effects || []).slice();
    A.regenerate(); A.save(); render();
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
    root.append(h('div', { class: 'q' }, 'Вопрос 3. В какой сфере бизнес?'));
    root.append(h('p', { class: 'note' }, 'От сферы зависят подсказки по цветам (психология цвета), значки и тексты выгод.'));
    root.append(...radioTable('Таблица 3. Сфера', ['Сфера', 'Цвета, которые работают', 'Значки'],
      Object.entries(SD.INDUSTRIES).map(([k, v]) => ({ key: k, cells: [v.name,
        h('span', null, ...v.palettes.map(pl => h('span', { class: 'strip', style: { marginRight: '4px' }, title: pl.name }, ...pl.c.map(c => h('i', { style: { background: c } }))))),
        iconStrip(v.icons, 'line', '#000000')] })),
      S.answers.industry, k => {
        S.answers.industry = k;
        if (!S.answers.textsEdited) Object.assign(S.answers.texts, A.benefitTexts(k));
        A.regenerate(); A.save(); render();
      }));
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
    let lastGroup = null;
    for (const id of SD.STYLE_ORDER) {
      const s = SD.STYLES[id];
      if (s.group !== lastGroup) { lastGroup = s.group; t.append(h('tr', null, h('td', { colspan: 5, style: { background: '#F2F2F2', fontWeight: 'bold' } }, SD.STYLE_GROUPS[s.group]))); }
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
    root.append(h('div', { class: 'q' }, 'Вопрос. Насколько близко к стилю компании?'));
    root.append(...radioTable('Таблица. Похожесть', ['Режим', 'Что получится'], [
      { key: 'brand', cells: ['Как если бы делала компания', 'Композиция, фон, типографика, кнопка, бейдж, поля и «штучки» — в манере выбранного стиля (у каждого по два образа). Логотипы и названия не используются.'] },
      { key: 'free', cells: ['Свободно', 'От стиля берутся только цвета, шрифт и декор, остальное — общая раскладка. Больше простора, меньше похожести.'] }
    ], S.answers.fidelity || 'brand', k => { S.answers.fidelity = k; S.answers.variant = 0; SD.applyLook(S.answers); A.regenerate(); A.save(); render(); }));
    const cur = A.variant();
    const part = (label, id) => id ? `${label} — ${SD.STYLES[id].name}` : null;
    root.append(h('p', { class: 'note' }, S.answers.styles.length > 1
      ? 'Сейчас в превью: ' + [part('цвета', cur.colorsFrom), part('акцент', cur.accentFrom), part('доп. цвет', cur.extraFrom), part('шрифт', cur.fontFrom), 'декор — ' + (cur.motifFrom || []).map(x => SD.STYLES[x].name).join(', ')].filter(Boolean).join('; ') + '. Другие сочетания — на следующем шаге.'
      : 'Выбран один стиль. Отметьте ещё один или несколько — они смешаются.'));
    if (S.answers.styles.length > 7) root.append(h('p', { class: 'warn' }, `Выбрано стилей: ${S.answers.styles.length}. В одном макете заметны максимум 7 (цвета, акцент, доп. цвет, шрифт и три декоративных приёма) — сейчас это первые семь по таблице. Остальные участвуют в других сочетаниях на следующем шаге.`));
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { S.answers.styles = SD.STYLE_ORDER.slice(); S.answers.variant = 0; S.answers.palette = null; SD.applyLook(S.answers); A.regenerate(); render(); } }, 'Выбрать все'),
      h('button', { class: 'btn sm', onclick: () => { S.answers.styles = [S.answers.styles[0] || 'yandex']; S.answers.variant = 0; S.answers.palette = null; SD.applyLook(S.answers); A.regenerate(); render(); } }, 'Оставить один')));

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
    SD.applyLook(S.answers);
    A.regenerate(); render();
  }

  // ---------- 4. Сочетание ----------
  function stepMix(root) {
    const vs = SD.gen.variants(S.answers.styles, S.answers.fidelity);
    root.append(h('p', null, `Выбрано стилей: ${S.answers.styles.length}. Из них собраны варианты сочетаний: цвета одного стиля, акцент и шрифт — другого, декоративные приёмы — обоих. Выберите самый близкий.`));
    root.append(h('div', { class: 'q' }, 'Вопрос 7. Какой вариант сочетания нравится больше?'));
    const g = h('div', { class: 'thumbs' });
    vs.forEach((v, i) => {
      const ta = withAns({ variant: i, palette: null }); SD.applyLook(ta);
      const card = h('div', { class: 'thumb' + (i === S.answers.variant ? ' on' : ''), onclick: () => { S.answers.variant = i; S.answers.palette = null; SD.applyLook(S.answers); A.regenerate(); render(); } },
        thumb(ta),
        h('div', null, `${i + 1}. ${v.title}`), v.look ? h('div', { class: 'note' }, v.look.desc) : '',
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

    const ind = SD.INDUSTRIES[S.answers.industry] || SD.INDUSTRIES.transport;
    root.append(h('div', { class: 'q' }, `Палитры для сферы «${ind.name}» — по психологии цвета`));
    const ti = h('table', { class: 'doc compact' });
    ti.append(h('tr', null, h('th', null, 'Палитра'), h('th', null, 'Цвета'), h('th', null, 'Почему работает'), h('th', null, '')));
    for (const pl of ind.palettes) {
      const [bg, primary, accent, text] = pl.c;
      const p = { bg, primary, accent, text, soft: u.mix(bg, primary, 0.12), extra: u.hueShift(accent, 30) };
      ti.append(h('tr', null, h('td', null, pl.name), h('td', null, h('span', { class: 'strip' }, ...pl.c.map(c => h('i', { style: { background: c } })))), h('td', null, pl.why),
        h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => { S.answers.palette = strip(p); A.applySoft('palette'); A.save(); render(); } }, 'Взять'))));
    }
    root.append(ti);
    root.append(h('div', { class: 'q' }, 'Готовые палитры из выбранных стилей'));
    const t2 = h('table', { class: 'doc compact' });
    t2.append(h('tr', null, h('th', null, 'Палитра'), h('th', null, 'Цвета'), h('th', null, '')));
    SD.gen.variants(S.answers.styles, S.answers.fidelity).forEach((v) => {
      const p = SD.gen.palette(v);
      t2.append(h('tr', null, h('td', null, v.title), h('td', null, h('span', { class: 'strip' }, ...['bg', 'primary', 'accent', 'text', 'soft'].map(r => h('i', { style: { background: p[r] } })))),
        h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => { S.answers.palette = strip(p); A.applySoft('palette'); A.save(); render(); } }, 'Взять'))));
    });
    root.append(t2);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { const p = A.pal(); S.answers.palette = strip(Object.assign({}, p, { bg: p.primary, primary: u.readable(p.primary, [p.text, p.accent]), text: u.readable(p.primary, [p.bg, p.text]) })); A.applySoft('palette'); A.save(); render(); } }, 'Инвертировать (цветной фон)'),
      h('button', { class: 'btn sm', onclick: () => { const d = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 10); const p = A.pal(); const q = {}; for (const r of ['primary', 'accent', 'extra', 'soft']) q[r] = u.hueShift(p[r], d); S.answers.palette = strip(Object.assign({}, p, q)); A.applySoft('palette'); A.save(); render(); } }, 'Похожая палитра (сдвиг оттенка)'),
      h('button', { class: 'btn sm', onclick: () => { S.answers.palette = null; A.applySoft('palette'); A.save(); render(); } }, 'Вернуть палитру стиля')));
    const tp = h('table', { class: 'doc compact' });
    tp.append(h('tr', null, h('th', null, ''), h('th', null, 'Цвет'), h('th', null, 'Что чувствует покупатель'), h('th', null, 'Где работает'), h('th', null, 'Осторожно')));
    for (const [c, n, feel, where, careful] of SD.COLOR_PSY) tp.append(h('tr', null, h('td', { class: 'c' }, h('span', { class: 'sw', style: { background: c } })), h('td', null, n), h('td', null, feel), h('td', null, where), h('td', null, careful)));
    root.append(h('div', { class: 'cap' }, 'Таблица 9. Психология цвета — справка'), tp);
    root.append(h('p', { class: 'note' }, 'По исследованиям, до 62–90% первого впечатления о товаре складывается из цвета (S. Singh, 2006). Самый любимый цвет в мире — синий (YouGov, 10 стран), но для еды он подавляет аппетит. Правило 60-30-10: 60% фон, 30% основной, 10% акцент.'));
    if (pal.primaryOrig && (pal.primaryOrig !== pal.primary || pal.accentOrig !== pal.accent)) root.append(h('p', { class: 'warn' },
      'Оттенок ' + [pal.primaryOrig !== pal.primary ? `основного (${pal.primaryOrig} → ${pal.primary})` : '', pal.accentOrig !== pal.accent ? `акцента (${pal.accentOrig} → ${pal.accent})` : ''].filter(Boolean).join(' и ') +
      ' чуть изменён: на исходном цвете мелкий текст не читался бы ни белым, ни чёрным (контраст меньше 4,5:1).'));
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
    root.append(h('div', { class: 'q' }, 'Идеи заголовков по маркетинговым формулам'));
    const it = h('table', { class: 'doc compact' });
    it.append(h('tr', null, h('th', null, 'Формула'), h('th', null, 'Заголовок для вашей сферы'), h('th', null, '')));
    for (const [f, txt] of SD.ideaGen(S.answers)) it.append(h('tr', null, h('td', null, f), h('td', null, txt),
      h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => { T.title = txt; S.answers.textsEdited = true; A.applySoft('texts'); A.save(); render(); } }, 'Взять'))));
    root.append(it);
    root.append(h('div', { class: 'q' }, 'Ещё идеи для заголовка (нажмите, чтобы подставить)'));
    const chips = h('div', { class: 'chips' });
    for (const k of Object.keys(SD.IDEAS)) for (const idea of SD.IDEAS[k]) {
      if (k !== S.answers.goal && Math.random() < 0.6) continue;
      chips.append(h('span', { class: 'chip', onclick: () => { T.title = idea; S.answers.textsEdited = true; A.applySoft('texts'); A.save(); render(); } }, idea));
    }
    root.append(chips);
  }

  // ---------- Внимание ----------
  function stepAttention(root) {
    const mk = S.answers.mk, T = S.answers.texts;
    root.append(h('p', null, 'Как макет цепляет взгляд и подталкивает к действию. Ниже — проверенные приёмы маркетинга и психологии. Включайте любые, в любых сочетаниях: каждый добавит на макет свой блок.'));
    root.append(h('div', { class: 'q' }, 'Вопрос. Какие приёмы привлечения использовать?'));
    const t = h('table', { class: 'doc' });
    t.append(h('tr', null, h('th', null, '✓'), h('th', null, 'Приём'), h('th', null, 'Что на макете и текст')));
    const inp = (k, ph) => {
      const i = h('input', { type: 'text', value: T[k] || '', placeholder: ph || '' });
      i.addEventListener('click', e => e.stopPropagation());
      i.addEventListener('input', () => { T[k] = i.value; S.answers.textsEdited = true; clearTimeout(textTimer); textTimer = setTimeout(() => { A.applySoft('texts'); A.save(); }, 200); });
      return i;
    };
    const ind = SD.INDUSTRIES[S.answers.industry] || SD.INDUSTRIES.transport;
    const extra = {
      urgency: () => inp('urgency', 'Только до 30 сентября'),
      benefits: () => h('div', null, ...[1, 2, 3].map(i => h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', margin: '2px 0' } }, iconStrip([ind.icons[i - 1]], curFx().icons, '#000000', '#7A7A7A', 18), inp('benefit' + i)))),
      price: () => h('div', { style: { display: 'flex', gap: '6px' } }, h('span', null, 'новая'), inp('priceNew'), h('span', null, 'старая'), inp('priceOld')),
      proof: () => inp('proof', '4,9 ★ · 10 000 клиентов'),
      guarantee: () => inp('guarantee', 'Вернём деньги'),
      contrastCta: () => {
        const pal = A.pal(), st = SD.gen.styleProps(S.answers, A.variant()), cur = pal[st.ctaRole];
        const same = String(cur).toUpperCase() === String(pal.ctaMax).toUpperCase();
        return h('span', { class: 'note', 'data-same': same ? '1' : '0' }, h('span', { class: 'sw', style: { background: cur } }), ' → ', h('span', { class: 'sw', style: { background: pal.ctaMax } }),
          same ? ' Кнопка уже самого контрастного цвета — при этой палитре ничего не изменится.' : ' Кнопка станет этого цвета.');
      }
    };
    for (const [k, tq] of Object.entries(SD.TECHNIQUES)) {
      const on = !!mk[k];
      t.append(h('tr', { class: 'pick' + (on ? ' on' : ''), onclick: () => { set('mk.' + k, !on, 'structure'); render(); } },
        h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: on, tabindex: -1 })),
        h('td', null, h('b', null, tq.name), h('br'), h('span', { class: 'note' }, tq.desc)),
        h('td', null, extra[k] ? extra[k]() : '')));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 10. Приёмы внимания'), t);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { for (const k in SD.TECHNIQUES) mk[k] = true; A.regenerate(); A.save(); render(); } }, 'Включить все'),
      h('button', { class: 'btn sm', onclick: () => { Object.assign(mk, { urgency: true, benefits: false, price: false, proof: true, guarantee: false, arrow: true, contrastCta: true }); A.regenerate(); A.save(); render(); } }, 'Лёгкий набор (не перегружать)'),
      h('button', { class: 'btn sm', onclick: () => { for (const k in SD.TECHNIQUES) mk[k] = false; A.regenerate(); A.save(); render(); } }, 'Выключить все')));
    root.append(h('p', { class: 'note' }, 'Не включайте всё сразу на маленьком формате: на A6 лучше 2–3 приёма. Если текст не влезает, страница сама уменьшит кегль.'));
    const pr = h('table', { class: 'doc compact' });
    pr.append(h('tr', null, h('th', null, 'Принцип'), h('th', null, 'Почему работает'), h('th', null, 'Что делает страница')));
    for (const [a, b, c] of SD.PRINCIPLES) pr.append(h('tr', null, h('td', null, a), h('td', null, b), h('td', null, c)));
    root.append(h('div', { class: 'cap' }, 'Таблица 11. Принципы внимания — справка'), pr);
  }

  // ---------- Эффекты и значки ----------
  function stepEffects(root) {
    const fx = curFx();
    const tag = like => (like || []).map(id => SD.STYLES[id].name).join(', ');
    root.append(h('p', null, 'У каждой компании свои «штучки»: тени, наклейки, узоры, стиль значков, способ показать продукт. Здесь их можно взять целиком у одного стиля или смешать как угодно.'));

    root.append(h('div', { class: 'q' }, 'Готовые наборы по стилям'));
    const kt = h('table', { class: 'doc compact' });
    kt.append(h('tr', null, h('th', null, 'Стиль'), h('th', null, 'Фирменные приёмы'), h('th', null, '')));
    for (const id of SD.STYLE_ORDER) {
      const k = SD.KITS[id];
      kt.append(h('tr', { class: S.answers.styles.includes(id) ? 'on' : '' }, h('td', null, h('b', null, SD.STYLES[id].name), h('br'), h('span', { class: 'note' }, 'как ' + SD.STYLES[id].like)), h('td', null, k.note),
        h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => setFx({ effects: k.effects.slice(), icons: k.icons, pattern: k.pattern, display: k.display, gradient: k.gradient || 'auto' }) }, 'Взять'))));
    }
    root.append(kt);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm primary', onclick: () => {
        const Sx = S.answers.styles, kits = Sx.map(id => SD.KITS[id]);
        setFx({ effects: Array.from(new Set(kits.flatMap(k => k.effects))), icons: kits[0].icons, pattern: (kits[1] || kits[0]).pattern, display: (kits[2] || kits[0]).display, gradient: (kits.find(k => k.gradient) || {}).gradient || 'auto' });
      } }, 'Смешать наборы выбранных стилей'),
      h('button', { class: 'btn sm', onclick: () => { S.answers.fx = { auto: true, effects: [], icons: 'soft', pattern: 'none', display: 'none' }; A.regenerate(); A.save(); render(); } }, 'Сбросить (авто)')));
    if (fx.auto) root.append(h('p', { class: 'note' }, 'Сейчас режим «авто»: эффекты и значки берутся от первого выбранного стиля. Любой выбор ниже переключит на ручной.'));

    root.append(h('div', { class: 'q' }, 'Эффекты (можно несколько)'));
    const g1 = h('div', { class: 'thumbs' });
    for (const [k, e] of Object.entries(SD.EFFECTS)) {
      const on = fx.effects.includes(k);
      const eff = on ? fx.effects : fx.effects.concat(k);
      g1.append(h('div', { class: 'thumb' + (on ? ' on' : ''), onclick: () => setFx({ effects: on ? fx.effects.filter(x => x !== k) : fx.effects.concat(k) }) },
        thumb(withAns({ fx: Object.assign({}, fx, { auto: false, effects: eff }) }), 110, 130),
        h('div', null, (on ? '✓ ' : '') + e.name), h('div', { class: 'note' }, 'как ' + tag(e.like))));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 3. Эффекты'), g1);

    root.append(h('div', { class: 'q' }, 'Градиент'));
    root.append(h('p', { class: 'note' }, 'Градиенты строятся в цветовом пространстве OKLCH — без серой «грязной» середины, с мягкими пятнами и зерном, как в современных интерфейсах. «Авто» решает, нужен ли градиент, по правилам ниже.'));
    const gg = h('div', { class: 'thumbs' });
    for (const [k, nm] of Object.entries(Object.assign({ auto: 'Авто (решает страница)' }, SD.gen.GRAD_TYPES))) {
      gg.append(h('div', { class: 'thumb' + ((fx.gradient || 'auto') === k ? ' on' : ''), onclick: () => setFx({ gradient: k }) },
        thumb(withAns({ fx: Object.assign({}, fx, { auto: false, gradient: k }) }), 110, 130), h('div', null, nm)));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 6. Градиенты'), gg);
    const dec = (S.doc.decisions || []).find(d => d.topic === 'Градиент');
    if (dec) {
      const td = h('table', { class: 'doc compact' });
      td.append(h('tr', null, h('th', null, `Решение для текущего макета: ${dec.choice}`)));
      for (const r of dec.reasons) td.append(h('tr', null, h('td', null, r)));
      root.append(h('div', { class: 'cap' }, 'Таблица. Почему так решено'), td);
    }

    root.append(h('div', { class: 'q' }, 'Стиль значков'));
    const it = h('table', { class: 'doc compact' });
    const pal = A.pal();
    for (const [k, st] of Object.entries(SD.ICON_STYLES)) {
      const on = fx.icons === k;
      it.append(h('tr', { class: 'pick' + (on ? ' on' : ''), onclick: () => setFx({ icons: k }) },
        h('td', { class: 'c' }, h('input', { type: 'radio', checked: on, tabindex: -1 })),
        h('td', null, st.name, h('br'), h('span', { class: 'note' }, 'как ' + tag(st.like))),
        h('td', null, iconStrip(['scooter', 'burger', 'clock', 'gift', 'shield', 'star'], k, pal.icon, pal.primary, 24))));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 12. Значки'), it);

    root.append(h('div', { class: 'q' }, 'Фоновый узор'));
    const g2 = h('div', { class: 'thumbs' });
    for (const [k, pt] of Object.entries(SD.PATTERNS)) {
      g2.append(h('div', { class: 'thumb' + (fx.pattern === k ? ' on' : ''), onclick: () => setFx({ pattern: k }) },
        thumb(withAns({ fx: Object.assign({}, fx, { auto: false, pattern: k }) }), 110, 130),
        h('div', null, pt.name), h('div', { class: 'note' }, pt.like.length ? 'как ' + tag(pt.like) : '—')));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 4. Узоры'), g2);

    root.append(h('div', { class: 'q' }, 'Как показать продукт'));
    if (!['top', 'left', 'bottom'].includes(S.answers.layout)) root.append(h('p', { class: 'warn' }, 'Показ продукта встаёт в свободную зону и работает с расположениями «Текст сверху», «Колонка слева» и «Текст снизу». Сейчас выбрано «' + SD.LAYOUTS[S.answers.layout].name + '».'));
    const g3 = h('div', { class: 'thumbs' });
    for (const [k, d] of Object.entries(SD.DISPLAYS)) {
      g3.append(h('div', { class: 'thumb' + (fx.display === k ? ' on' : ''), onclick: () => setFx({ display: k }) },
        thumb(withAns({ fx: Object.assign({}, fx, { auto: false, display: k }) }), 110, 130),
        h('div', null, d.name), h('div', { class: 'note' }, d.desc + (d.like.length ? ' · как ' + tag(d.like) : ''))));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 5. Показ продукта'), g3);
  }

  // ---------- Автопилот ----------
  let autoRes = null, autoSel = 0, pair = null, pairSeed = 1;
  // Пара заметно разных вариантов для сравнения
  function makePair() {
    const list = SD.brain.candidates(S.answers, {}, 30, 1000 + (pairSeed++) * 7);
    const a = list[1 + Math.floor(Math.random() * (list.length - 1))];
    let b = null;
    for (let t = 0; t < 20 && !b; t++) { const c = list[1 + Math.floor(Math.random() * (list.length - 1))]; if (c !== a && (c.layout !== a.layout || c.variant !== a.variant)) b = c; }
    b = b || list[0];
    return [a, b].map(x => ({ ans: x, doc: SD.gen.build(x) }));
  }
  const autoKeep = { style: false, layout: false, fx: false };
  function scoreTable(sc) {
    const t = h('table', { class: 'doc compact' });
    t.append(h('tr', null, h('th', null, 'Критерий'), h('th', null, 'Вес'), h('th', null, 'Оценка'), h('th', null, 'Что видит «мозг»')));
    for (const e of SD.brain.explain(sc)) t.append(h('tr', null, h('td', null, e.name, h('br'), h('span', { class: 'note' }, e.src)), h('td', { class: 'c' }, String(e.w)), h('td', { class: 'c' }, e.value + '%'), h('td', null, e.why)));
    t.append(h('tr', null, h('td', null, h('b', null, 'Итого')), h('td', { class: 'c' }, '100'), h('td', { class: 'c' }, h('b', null, sc.total + '/100')), h('td', null, sc.errs ? 'Есть ошибки текста — итог ограничен 55' : sc.total >= 85 ? 'Сильный макет' : sc.total >= 75 ? 'Хороший макет' : 'Можно лучше')));
    return t;
  }
  function stepAuto(root) {
    root.append(h('p', null, 'Здесь страница «думает» за дизайнера: собирает сотни вариантов из ваших ответов и оценивает каждый так, как человек за первые доли секунды — по 10 критериям из исследований восприятия и принятия решений. Потом тщательно перепроверяет лучших и показывает шесть самых сильных, с объяснением.'));
    const cur = SD.brain.score(S.doc, S.answers);
    root.append(h('div', { class: 'q' }, `Текущий макет: ${cur.total}/100`));
    root.append(h('div', { class: 'cap' }, 'Таблица. Оценка текущего макета'), scoreTable(cur));
    // «Какой лучше?» — обучение вкусу
    root.append(h('div', { class: 'q' }, 'Вопрос. Какой вариант нравится больше?'));
    root.append(h('p', { class: 'note' }, 'Выберите из двух — страница запомнит ваш вкус и будет ставить похожие варианты выше. Чем больше выборов, тем точнее (от 5–8).'));
    if (!pair) pair = makePair();
    const pr = h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } });
    pair.forEach((pc, i) => {
      const k = Math.min(150 / pc.doc.w, 190 / pc.doc.h);
      const c = SD.render.pageCanvas(pc.doc, pc.doc.pages[0], k * 2);
      c.style.width = pc.doc.w * k + 'px'; c.style.height = pc.doc.h * k + 'px';
      pr.append(h('div', { class: 'thumb pairpick', style: { width: 'auto' }, onclick: () => {
        SD.taste.update(SD.taste.features(pc.ans, pc.doc), SD.taste.features(pair[1 - i].ans, pair[1 - i].doc));
        pair = makePair(); render();
      } }, c, h('div', null, i ? 'Правый' : 'Левый')));
    });
    root.append(pr, h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => { pair = makePair(); render(); } }, 'Не могу выбрать — другую пару'),
      h('button', { class: 'btn sm', onclick: () => { SD.taste.reset(); pair = makePair(); render(); } }, 'Забыть мой вкус')));
    const ts = SD.taste.summary();
    if (ts.n) root.append(h('p', { id: 'tasteBox' }, `Сделано выборов: ${ts.n}. `, ts.likes.length ? `Вам нравится: ${ts.likes.join(', ')}. ` : '', ts.dislikes.length ? `Меньше нравится: ${ts.dislikes.join(', ')}.` : ''));
    else root.append(h('p', { id: 'tasteBox', class: 'note' }, 'Выборов пока нет.'));

    root.append(h('div', { class: 'q' }, 'Вопрос. Что нельзя менять при подборе?'));
    const kt = h('table', { class: 'doc compact' });
    for (const [k, nm] of [['style', 'Стиль и цвета (вариант сочетания)'], ['layout', 'Расположение'], ['fx', 'Эффекты, узор, показ, градиент']]) {
      const cb = h('input', { type: 'checkbox', checked: autoKeep[k] });
      cb.addEventListener('change', () => { autoKeep[k] = cb.checked; });
      kt.append(h('tr', null, h('td', { class: 'c', style: { width: '32px' } }, cb), h('td', null, nm)));
    }
    root.append(kt, h('p', { class: 'note' }, 'Тексты, формат, сфера и приёмы внимания не меняются никогда — это ваше содержание.'));
    const bar = h('div', { style: { border: '1px solid #000', height: '12px', margin: '6px 0', display: 'none' } }, h('div', { style: { background: '#D9D9D9', height: '100%', width: '0%' } }));
    const status = h('p', { class: 'note' });
    const btn = h('button', { class: 'btn primary' }, autoRes ? 'Подобрать ещё раз' : 'Подобрать лучший вариант');
    btn.addEventListener('click', async () => {
      btn.disabled = true; bar.style.display = 'block';
      const t0 = performance.now();
      autoRes = await SD.brain.search(S.answers, { keep: autoKeep, n: 300, deep: 20, seed: 7 + Math.floor(Math.random() * 1000), onProgress: (f, i, n) => { bar.firstChild.style.width = Math.round(f * 100) + '%'; status.textContent = f < 0.8 ? `Смотрю варианты: ${i} из ${n}…` : 'Тщательно проверяю лучших (контраст по пикселям)…'; } });
      autoRes.ms = Math.round(performance.now() - t0);
      autoSel = 0; btn.disabled = false; render();
    });
    root.append(h('div', { class: 'btn-row' }, btn), bar, status);
    if (autoRes && autoRes.best.length) {
      root.append(h('p', null, `Проверено вариантов: ${autoRes.tested} за ${u.round(autoRes.ms / 1000, 1)} с. Лучшие:`));
      const g = h('div', { class: 'thumbs' });
      autoRes.best.forEach((b, i) => {
        const k = Math.min(120 / b.doc.w, 150 / b.doc.h);
        const c = SD.render.pageCanvas(b.doc, b.doc.pages[0], k * 2);
        c.style.width = b.doc.w * k + 'px'; c.style.height = b.doc.h * k + 'px';
        const v = SD.gen.variants(b.ans.styles, b.ans.fidelity)[b.ans.variant] || {};
        g.append(h('div', { class: 'thumb' + (i === autoSel ? ' on' : ''), onclick: () => { autoSel = i; render(); } }, c,
          h('div', null, h('b', null, b.score.total + '/100'), b.score.taste ? ` · вкус ${b.score.taste > 0 ? '+' : ''}${b.score.taste}` : ''), h('div', { class: 'note' }, `${SD.LAYOUTS[b.ans.layout].name} · ${v.title || ''} · ${SD.gen.GRAD_TYPES[(b.doc.decisions || []).find(d => d.topic === 'Градиент') ? Object.keys(SD.gen.GRAD_TYPES).find(t => SD.gen.GRAD_TYPES[t] === b.doc.decisions.find(d => d.topic === 'Градиент').choice) : 'none']}`)));
      });
      root.append(h('div', { class: 'cap' }, 'Рисунок. Лучшие варианты'), g);
      const b = autoRes.best[autoSel];
      root.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => {
        const texts = S.answers.texts, mk = S.answers.mk;
        S.answers = Object.assign(JSON.parse(JSON.stringify(b.ans)), { texts, mk });
        A.regenerate(true); A.save(); SD.toast('Применён вариант ' + b.score.total + '/100'); render();
      } }, `Применить вариант ${autoSel + 1} (${b.score.total}/100)`)));
      root.append(h('div', { class: 'cap' }, `Таблица. Почему вариант ${autoSel + 1} сильный`), scoreTable(b.score));
      const dec = (b.doc.decisions || [])[0];
      if (dec) { const td = h('table', { class: 'doc compact' }); td.append(h('tr', null, h('th', null, `Градиент: ${dec.choice}`))); for (const r of dec.reasons) td.append(h('tr', null, h('td', null, r))); root.append(td); }
    }
    const src = h('table', { class: 'doc compact' });
    src.append(h('tr', null, h('th', null, 'Исследование'), h('th', null, 'Вывод'), h('th', null, 'Как вшито в код')));
    for (const [a, b2, c] of SD.BRAIN_SOURCES) src.append(h('tr', null, h('td', null, a), h('td', null, b2), h('td', null, c)));
    root.append(h('div', { class: 'cap' }, 'Таблица. На чём основана оценка'), src);
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

    // Серия в одном стиле
    root.append(h('div', { class: 'q' }, 'Серия в одном стиле'));
    root.append(h('p', { class: 'note' }, 'Из тех же ответов страница собирает сразу флаер, пост, сторис, баннер и визитку — единый фирменный комплект для клиента.'));
    const ser = SD.series.build(S.answers);
    const sg = h('div', { class: 'thumbs' });
    for (const it of ser) {
      const k = Math.min(120 / it.doc.w, 140 / it.doc.h);
      const c = SD.render.pageCanvas(it.doc, it.doc.pages[0], k * 2);
      c.style.width = it.doc.w * k + 'px'; c.style.height = it.doc.h * k + 'px';
      const errs = SD.lint.check(it.doc, { contrast: false }).filter(i => i.level === 'error').length;
      sg.append(h('div', { class: 'thumb', title: 'Открыть этот формат в редакторе', onclick: () => {
        S.answers = Object.assign(S.answers, { format: it.ans.format, orient: it.ans.orient, pages: 1, layout: it.ans.layout });
        A.regenerate(true); SD.editor.fit(); render(); SD.toast('Открыт формат: ' + it.name);
      } }, c, h('div', null, it.name), h('div', { class: 'note' }, `${Math.round(it.doc.w)}×${Math.round(it.doc.h)} мм${errs ? ' · ошибок: ' + errs : ''}`)));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок. Серия'), sg);
    const sb = (label, fn) => { const b = h('button', { class: 'btn sm' }, label); b.addEventListener('click', async () => { b.disabled = true; try { await fn(); } catch (e) { SD.toast('Ошибка: ' + e.message); } b.disabled = false; }); return b; };
    root.append(h('div', { class: 'btn-row' }, sb('Скачать серию одним PDF', () => SD.exporter.seriesPdf(ser)), sb('Скачать серию PNG', () => SD.exporter.seriesPng(ser))));

    const bs = SD.brain.score(S.doc, S.answers);
    root.append(h('div', { class: 'cap' }, 'Таблица. Готовность к выпуску'), SD.ready.table(SD.ready.check(S.doc, S.answers, S.exportOpts, bs.total)));
    root.append(SD.panel.lintBox({}));
    root.append(h('p', { class: 'note' }, 'Перед печатью исправьте ошибки: текст за краем листа срежется, мелкий или бледный текст не прочитают. Нажмите «Показать» — элемент выделится в редакторе.'));
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
    a.variant = Math.floor(Math.random() * SD.gen.variants(styles, a.fidelity).length);
    SD.applyLook(a);
    a.layout = P(Object.keys(SD.LAYOUTS));
    a.align = P(['left', 'left', 'center']);
    a.titleScale = P([1, 1, 1.2, 1.45]);
    a.texts = Object.assign({ qr: a.texts.qr }, SD.EXAMPLES[goal]);
    a.texts.title = P(SD.IDEAS[goal]);
    if (kind === 'menu') a.texts.details = SD.MENU_DETAILS;
    a.industry = P(Object.keys(SD.INDUSTRIES));
    Object.assign(a.texts, A.benefitTexts(a.industry));
    for (const k in SD.TECHNIQUES) a.mk[k] = Math.random() < 0.3;
    if (Math.random() < 0.6) {
      const kits = styles.map(id => SD.KITS[id]);
      a.fx = { auto: false, effects: Array.from(new Set(kits.flatMap(k => k.effects))).filter(() => Math.random() < 0.7), icons: P(Object.keys(SD.ICON_STYLES)), pattern: P(['none', 'none', ...Object.keys(SD.PATTERNS)]), display: P(Object.keys(SD.DISPLAYS)) };
    } else a.fx = { auto: true, effects: [], icons: 'soft', pattern: 'none', display: 'none' };
    Object.assign(a.opts, { motif: true, cta: Math.random() < 0.8, promo: Math.random() < 0.6, qr: Math.random() < 0.35, contacts: true, rounded: P([0.5, 1, 1, 1.5]) });
    A.regenerate(true);
    render(); SD.editor.fit();
    SD.toast('Идея: ' + SD.KINDS[kind].name + ' · ' + styles.map(s => SD.STYLES[s].name).join(' + '));
  }

  return { init, render, go, renumber, STEPS };
})();
