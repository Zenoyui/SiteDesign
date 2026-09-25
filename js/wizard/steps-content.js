// Шаги мастера: цвета, текст, приёмы внимания.

(function (W) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

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
        h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => { S.answers.palette = strip(p); A.applySoft('palette'); A.save(); W.render(); } }, 'Взять'))));
    }
    root.append(ti);
    root.append(h('div', { class: 'q' }, 'Готовые палитры из выбранных стилей'));
    const t2 = h('table', { class: 'doc compact' });
    t2.append(h('tr', null, h('th', null, 'Палитра'), h('th', null, 'Цвета'), h('th', null, '')));
    SD.gen.variants(S.answers.styles, S.answers.fidelity).forEach((v) => {
      const p = SD.gen.palette(v);
      t2.append(h('tr', null, h('td', null, v.title), h('td', null, h('span', { class: 'strip' }, ...['bg', 'primary', 'accent', 'text', 'soft'].map(r => h('i', { style: { background: p[r] } })))),
        h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => { S.answers.palette = strip(p); A.applySoft('palette'); A.save(); W.render(); } }, 'Взять'))));
    });
    root.append(t2);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { const p = A.pal(); S.answers.palette = strip(Object.assign({}, p, { bg: p.primary, primary: u.readable(p.primary, [p.text, p.accent]), text: u.readable(p.primary, [p.bg, p.text]) })); A.applySoft('palette'); A.save(); W.render(); } }, 'Инвертировать (цветной фон)'),
      h('button', { class: 'btn sm', onclick: () => { const d = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 10); const p = A.pal(); const q = {}; for (const r of ['primary', 'accent', 'extra', 'soft']) q[r] = u.hueShift(p[r], d); S.answers.palette = strip(Object.assign({}, p, q)); A.applySoft('palette'); A.save(); W.render(); } }, 'Похожая палитра (сдвиг оттенка)'),
      h('button', { class: 'btn sm', onclick: () => { S.answers.palette = null; A.applySoft('palette'); A.save(); W.render(); } }, 'Вернуть палитру стиля')));
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
        clearTimeout(W.textTimer); W.textTimer = setTimeout(() => { A.applySoft('texts'); A.save(); }, 180);
      });
      t.append(h('tr', null, h('td', null, n), h('td', null, inp)));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 9. Тексты макета'), t);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { Object.assign(T, SD.EXAMPLES[S.answers.goal]); if (S.answers.kind === 'menu') T.details = SD.MENU_DETAILS; S.answers.textsEdited = false; A.applySoft('texts'); A.save(); W.render(); } }, 'Подставить пример'),
      h('button', { class: 'btn sm', onclick: () => { for (const k of ['title', 'subtitle', 'body', 'cta', 'promo', 'contacts', 'details']) T[k] = ''; T.title = 'Заголовок'; S.answers.textsEdited = true; A.applySoft('texts'); A.save(); W.render(); } }, 'Очистить всё')));
    root.append(h('div', { class: 'q' }, 'Идеи заголовков по маркетинговым формулам'));
    const it = h('table', { class: 'doc compact' });
    it.append(h('tr', null, h('th', null, 'Формула'), h('th', null, 'Заголовок для вашей сферы'), h('th', null, '')));
    for (const [f, txt] of SD.ideaGen(S.answers)) it.append(h('tr', null, h('td', null, f), h('td', null, txt),
      h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => { T.title = txt; S.answers.textsEdited = true; A.applySoft('texts'); A.save(); W.render(); } }, 'Взять'))));
    root.append(it);
    root.append(h('div', { class: 'q' }, 'Ещё идеи для заголовка (нажмите, чтобы подставить)'));
    const chips = h('div', { class: 'chips' });
    for (const k of Object.keys(SD.IDEAS)) for (const idea of SD.IDEAS[k]) {
      if (k !== S.answers.goal && Math.random() < 0.6) continue;
      chips.append(h('span', { class: 'chip', onclick: () => { T.title = idea; S.answers.textsEdited = true; A.applySoft('texts'); A.save(); W.render(); } }, idea));
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
      i.addEventListener('input', () => { T[k] = i.value; S.answers.textsEdited = true; clearTimeout(W.textTimer); W.textTimer = setTimeout(() => { A.applySoft('texts'); A.save(); }, 200); });
      return i;
    };
    const ind = SD.INDUSTRIES[S.answers.industry] || SD.INDUSTRIES.transport;
    const extra = {
      urgency: () => inp('urgency', 'Только до 30 сентября'),
      benefits: () => h('div', null, ...[1, 2, 3].map(i => h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', margin: '2px 0' } }, W.iconStrip([ind.icons[i - 1]], W.curFx().icons, '#000000', '#7A7A7A', 18), inp('benefit' + i)))),
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
      t.append(h('tr', { class: 'pick' + (on ? ' on' : ''), onclick: () => { W.set('mk.' + k, !on, 'structure'); W.render(); } },
        h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: on, tabindex: -1 })),
        h('td', null, h('b', null, tq.name), h('br'), h('span', { class: 'note' }, tq.desc)),
        h('td', null, extra[k] ? extra[k]() : '')));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 10. Приёмы внимания'), t);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm', onclick: () => { for (const k in SD.TECHNIQUES) mk[k] = true; A.regenerate(); A.save(); W.render(); } }, 'Включить все'),
      h('button', { class: 'btn sm', onclick: () => { Object.assign(mk, { urgency: true, benefits: false, price: false, proof: true, guarantee: false, arrow: true, contrastCta: true }); A.regenerate(); A.save(); W.render(); } }, 'Лёгкий набор (не перегружать)'),
      h('button', { class: 'btn sm', onclick: () => { for (const k in SD.TECHNIQUES) mk[k] = false; A.regenerate(); A.save(); W.render(); } }, 'Выключить все')));
    root.append(h('p', { class: 'note' }, 'Не включайте всё сразу на маленьком формате: на A6 лучше 2–3 приёма. Если текст не влезает, страница сама уменьшит кегль.'));
    const pr = h('table', { class: 'doc compact' });
    pr.append(h('tr', null, h('th', null, 'Принцип'), h('th', null, 'Почему работает'), h('th', null, 'Что делает страница')));
    for (const [a, b, c] of SD.PRINCIPLES) pr.append(h('tr', null, h('td', null, a), h('td', null, b), h('td', null, c)));
    root.append(h('div', { class: 'cap' }, 'Таблица 11. Принципы внимания — справка'), pr);
  }

  Object.assign(W, { stepColors, stepText, stepAttention });
})(SD._wiz = SD._wiz || {});
