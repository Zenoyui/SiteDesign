// Шаги мастера: редактор и результат (серия, готовность, скачивание); случайная идея.

(function (W) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

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
        A.regenerate(true); SD.editor.fit(); W.render(); SD.toast('Открыт формат: ' + it.name);
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
    W.render(); SD.editor.fit();
    SD.toast('Идея: ' + SD.KINDS[kind].name + ' · ' + styles.map(s => SD.STYLES[s].name).join(' + '));
  }

  Object.assign(W, { stepEditor, stepResult, randomIdea });
})(SD._wiz = SD._wiz || {});
