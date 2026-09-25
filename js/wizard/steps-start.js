// Шаги мастера: идея, формат, стиль, сочетание стилей.

(function (W) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

  // ---------- 1. Идея ----------
  function stepIdea(root) {
    root.append(h('p', null, 'Начнём с простого: что именно вы хотите получить на выходе и зачем. Ответы можно поменять в любой момент — макет справа обновится сам.'));
    root.append(h('div', { class: 'q' }, 'Вопрос 1. Что будем делать?'));
    root.append(...W.radioTable('Таблица 1. Вид продукта', ['Вид', 'Для чего', 'По умолчанию'],
      Object.entries(SD.KINDS).map(([k, v]) => ({ key: k, cells: [v.name, v.desc, `${SD.FORMATS[v.format].name}, ${v.pages === 1 ? '1 сторона' : v.pages === 2 ? '2 стороны' : v.pages + ' слайда'}`] })),
      S.answers.kind, k => {
        const K = SD.KINDS[k];
        S.answers.kind = k; S.answers.format = K.format; S.answers.orient = K.orient; S.answers.pages = K.pages;
        if (k === 'menu' && !S.answers.textsEdited) S.answers.texts.details = SD.MENU_DETAILS;
        A.regenerate(); W.render(); SD.editor.fit();
      }));
    root.append(h('div', { class: 'q' }, 'Вопрос 2. Какая главная цель?'));
    root.append(...W.radioTable('Таблица 2. Цель макета', ['Цель', 'Пример заголовка'],
      Object.entries(SD.GOALS).map(([k, v]) => ({ key: k, cells: [v.name, SD.EXAMPLES[k].title] })),
      S.answers.goal, k => {
        S.answers.goal = k;
        if (!S.answers.textsEdited) {
          Object.assign(S.answers.texts, SD.EXAMPLES[k]);
          if (S.answers.kind === 'menu') S.answers.texts.details = SD.MENU_DETAILS;
          A.applySoft('texts');
        }
        A.save(); W.render();
      }));
    if (S.answers.textsEdited) root.append(h('p', { class: 'note' }, 'Тексты уже изменены вами, поэтому при смене цели они не заменяются. Пример можно подставить на шаге «Текст».'));
    root.append(h('div', { class: 'q' }, 'Вопрос 3. В какой сфере бизнес?'));
    root.append(h('p', { class: 'note' }, 'От сферы зависят подсказки по цветам (психология цвета), значки и тексты выгод.'));
    root.append(...W.radioTable('Таблица 3. Сфера', ['Сфера', 'Цвета, которые работают', 'Значки'],
      Object.entries(SD.INDUSTRIES).map(([k, v]) => ({ key: k, cells: [v.name,
        h('span', null, ...v.palettes.map(pl => h('span', { class: 'strip', style: { marginRight: '4px' }, title: pl.name }, ...pl.c.map(c => h('i', { style: { background: c } }))))),
        W.iconStrip(v.icons, 'line', '#000000')] })),
      S.answers.industry, k => {
        S.answers.industry = k;
        if (!S.answers.textsEdited) Object.assign(S.answers.texts, A.benefitTexts(k));
        A.regenerate(); A.save(); W.render();
      }));
    root.append(h('p', { class: 'note' }, 'Не знаете, чего хотите? Нажмите «Случайная идея» вверху — страница сама подберёт комбинацию, а вы поправите.'));
  }

  // ---------- 2. Формат ----------
  function stepFormat(root) {
    root.append(h('div', { class: 'q' }, 'Вопрос 3. Какой формат листа?'));
    root.append(...W.radioTable('Таблица 3. Форматы', ['Формат', 'Размер, мм', 'Подходит для'],
      Object.entries(SD.FORMATS).map(([k, f]) => ({ key: k, cells: [f.name, `${f.w} × ${u.round(f.h, 1)}`, f.note] })),
      S.answers.format, k => { W.set('format', k, 'format'); W.render(); SD.editor.fit(); }));
    const f = SD.FORMATS[S.answers.format];
    if (!f.fixedOrient) {
      root.append(h('div', { class: 'q' }, 'Вопрос 4. Ориентация'));
      root.append(...W.radioTable('Таблица 4. Ориентация', ['Ориентация', 'Размер, мм'],
        [{ key: 'portrait', cells: ['Книжная', `${Math.min(f.w, f.h)} × ${Math.max(f.w, f.h)}`] }, { key: 'landscape', cells: ['Альбомная', `${Math.max(f.w, f.h)} × ${Math.min(f.w, f.h)}`] }],
        S.answers.orient, k => { W.set('orient', k, 'format'); W.render(); SD.editor.fit(); }));
    }
    root.append(h('div', { class: 'q' }, 'Вопрос 5. Сколько сторон / страниц?'));
    const opts = S.answers.kind === 'slides' ? [2, 3, 4, 5] : [1, 2, 3, 4];
    root.append(...W.radioTable('Таблица 5. Стороны', ['Количество', 'Что будет'],
      opts.map(n => ({ key: n, cells: [String(n), n === 1 ? 'Только лицевая сторона' : n === 2 ? 'Лицевая + оборот с подробностями' : S.answers.kind === 'slides' ? `Обложка, ${n - 2} слайд(а) с текстом и финальный слайд` : `Лицевая + ${n - 1} страницы с подробностями`] })),
      S.answers.pages, k => { W.set('pages', k, 'structure'); W.render(); }));
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
    root.append(...W.radioTable('Таблица. Похожесть', ['Режим', 'Что получится'], [
      { key: 'brand', cells: ['Как если бы делала компания', 'Композиция, фон, типографика, кнопка, бейдж, поля и «штучки» — в манере выбранного стиля (у каждого по два образа). Логотипы и названия не используются.'] },
      { key: 'free', cells: ['Свободно', 'От стиля берутся только цвета, шрифт и декор, остальное — общая раскладка. Больше простора, меньше похожести.'] }
    ], S.answers.fidelity || 'brand', k => { S.answers.fidelity = k; S.answers.variant = 0; SD.applyLook(S.answers); A.regenerate(); A.save(); W.render(); }));
    const cur = A.variant();
    const part = (label, id) => id ? `${label} — ${SD.STYLES[id].name}` : null;
    root.append(h('p', { class: 'note' }, S.answers.styles.length > 1
      ? 'Сейчас в превью: ' + [part('цвета', cur.colorsFrom), part('акцент', cur.accentFrom), part('доп. цвет', cur.extraFrom), part('шрифт', cur.fontFrom), 'декор — ' + (cur.motifFrom || []).map(x => SD.STYLES[x].name).join(', ')].filter(Boolean).join('; ') + '. Другие сочетания — на следующем шаге.'
      : 'Выбран один стиль. Отметьте ещё один или несколько — они смешаются.'));
    if (S.answers.styles.length > 7) root.append(h('p', { class: 'warn' }, `Выбрано стилей: ${S.answers.styles.length}. В одном макете заметны максимум 7 (цвета, акцент, доп. цвет, шрифт и три декоративных приёма) — сейчас это первые семь по таблице. Остальные участвуют в других сочетаниях на следующем шаге.`));
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { S.answers.styles = SD.STYLE_ORDER.slice(); S.answers.variant = 0; S.answers.palette = null; SD.applyLook(S.answers); A.regenerate(); W.render(); } }, 'Выбрать все'),
      h('button', { class: 'btn sm', onclick: () => { S.answers.styles = [S.answers.styles[0] || 'yandex']; S.answers.variant = 0; S.answers.palette = null; SD.applyLook(S.answers); A.regenerate(); W.render(); } }, 'Оставить один')));

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
    A.regenerate(); W.render();
  }

  // ---------- 4. Сочетание ----------
  function stepMix(root) {
    const vs = SD.gen.variants(S.answers.styles, S.answers.fidelity);
    root.append(h('p', null, `Выбрано стилей: ${S.answers.styles.length}. Из них собраны варианты сочетаний: цвета одного стиля, акцент и шрифт — другого, декоративные приёмы — обоих. Выберите самый близкий.`));
    root.append(h('div', { class: 'q' }, 'Вопрос 7. Какой вариант сочетания нравится больше?'));
    const g = h('div', { class: 'thumbs' });
    vs.forEach((v, i) => {
      const ta = W.withAns({ variant: i, palette: null }); SD.applyLook(ta);
      const card = h('div', { class: 'thumb' + (i === S.answers.variant ? ' on' : ''), onclick: () => { S.answers.variant = i; S.answers.palette = null; SD.applyLook(S.answers); A.regenerate(); W.render(); } },
        W.thumb(ta),
        h('div', null, `${i + 1}. ${v.title}`), v.look ? h('div', { class: 'note' }, v.look.desc) : '',
        h('div', { class: 'note' }, (SD.STYLES[v.fontFrom] || {}).font + ' · ' + v.motifs.map(m => SD.MOTIF_NAMES[m]).join(', ')));
      g.append(card);
    });
    root.append(h('div', { class: 'cap' }, 'Рисунок 1. Варианты сочетаний'), g);
  }

  Object.assign(W, { stepIdea, stepFormat, stepStyle, stepMix });
})(SD._wiz = SD._wiz || {});
