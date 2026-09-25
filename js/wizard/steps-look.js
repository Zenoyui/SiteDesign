// Шаги мастера: эффекты и значки, расположение, детали.

(function (W) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

  // ---------- Эффекты и значки ----------
  function stepEffects(root) {
    const fx = W.curFx();
    const tag = like => (like || []).map(id => SD.STYLES[id].name).join(', ');
    root.append(h('p', null, 'У каждой компании свои «штучки»: тени, наклейки, узоры, стиль значков, способ показать продукт. Здесь их можно взять целиком у одного стиля или смешать как угодно.'));

    root.append(h('div', { class: 'q' }, 'Готовые наборы по стилям'));
    const kt = h('table', { class: 'doc compact' });
    kt.append(h('tr', null, h('th', null, 'Стиль'), h('th', null, 'Фирменные приёмы'), h('th', null, '')));
    for (const id of SD.STYLE_ORDER) {
      const k = SD.KITS[id];
      kt.append(h('tr', { class: S.answers.styles.includes(id) ? 'on' : '' }, h('td', null, h('b', null, SD.STYLES[id].name), h('br'), h('span', { class: 'note' }, 'как ' + SD.STYLES[id].like)), h('td', null, k.note),
        h('td', { class: 'c' }, h('button', { class: 'btn sm', onclick: () => W.setFx({ effects: k.effects.slice(), icons: k.icons, pattern: k.pattern, display: k.display, gradient: k.gradient || 'auto' }) }, 'Взять'))));
    }
    root.append(kt);
    root.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn sm primary', onclick: () => {
        const Sx = S.answers.styles, kits = Sx.map(id => SD.KITS[id]);
        W.setFx({ effects: Array.from(new Set(kits.flatMap(k => k.effects))), icons: kits[0].icons, pattern: (kits[1] || kits[0]).pattern, display: (kits[2] || kits[0]).display, gradient: (kits.find(k => k.gradient) || {}).gradient || 'auto' });
      } }, 'Смешать наборы выбранных стилей'),
      h('button', { class: 'btn sm', onclick: () => { S.answers.fx = { auto: true, effects: [], icons: 'soft', pattern: 'none', display: 'none' }; A.regenerate(); A.save(); W.render(); } }, 'Сбросить (авто)')));
    if (fx.auto) root.append(h('p', { class: 'note' }, 'Сейчас режим «авто»: эффекты и значки берутся от первого выбранного стиля. Любой выбор ниже переключит на ручной.'));

    root.append(h('div', { class: 'q' }, 'Эффекты (можно несколько)'));
    const g1 = h('div', { class: 'thumbs' });
    for (const [k, e] of Object.entries(SD.EFFECTS)) {
      const on = fx.effects.includes(k);
      const eff = on ? fx.effects : fx.effects.concat(k);
      g1.append(h('div', { class: 'thumb' + (on ? ' on' : ''), onclick: () => W.setFx({ effects: on ? fx.effects.filter(x => x !== k) : fx.effects.concat(k) }) },
        W.thumb(W.withAns({ fx: Object.assign({}, fx, { auto: false, effects: eff }) }), 110, 130),
        h('div', null, (on ? '✓ ' : '') + e.name), h('div', { class: 'note' }, 'как ' + tag(e.like))));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 3. Эффекты'), g1);

    root.append(h('div', { class: 'q' }, 'Градиент'));
    root.append(h('p', { class: 'note' }, 'Градиенты строятся в цветовом пространстве OKLCH — без серой «грязной» середины, с мягкими пятнами и зерном, как в современных интерфейсах. «Авто» решает, нужен ли градиент, по правилам ниже.'));
    const gg = h('div', { class: 'thumbs' });
    for (const [k, nm] of Object.entries(Object.assign({ auto: 'Авто (решает страница)' }, SD.gen.GRAD_TYPES))) {
      gg.append(h('div', { class: 'thumb' + ((fx.gradient || 'auto') === k ? ' on' : ''), onclick: () => W.setFx({ gradient: k }) },
        W.thumb(W.withAns({ fx: Object.assign({}, fx, { auto: false, gradient: k }) }), 110, 130), h('div', null, nm)));
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
      it.append(h('tr', { class: 'pick' + (on ? ' on' : ''), onclick: () => W.setFx({ icons: k }) },
        h('td', { class: 'c' }, h('input', { type: 'radio', checked: on, tabindex: -1 })),
        h('td', null, st.name, h('br'), h('span', { class: 'note' }, 'как ' + tag(st.like))),
        h('td', null, W.iconStrip(['scooter', 'burger', 'clock', 'gift', 'shield', 'star'], k, pal.icon, pal.primary, 24))));
    }
    root.append(h('div', { class: 'cap' }, 'Таблица 12. Значки'), it);

    root.append(h('div', { class: 'q' }, 'Фоновый узор'));
    const g2 = h('div', { class: 'thumbs' });
    for (const [k, pt] of Object.entries(SD.PATTERNS)) {
      g2.append(h('div', { class: 'thumb' + (fx.pattern === k ? ' on' : ''), onclick: () => W.setFx({ pattern: k }) },
        W.thumb(W.withAns({ fx: Object.assign({}, fx, { auto: false, pattern: k }) }), 110, 130),
        h('div', null, pt.name), h('div', { class: 'note' }, pt.like.length ? 'как ' + tag(pt.like) : '—')));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 4. Узоры'), g2);

    root.append(h('div', { class: 'q' }, 'Как показать продукт'));
    if (!['top', 'left', 'bottom'].includes(S.answers.layout)) root.append(h('p', { class: 'warn' }, 'Показ продукта встаёт в свободную зону и работает с расположениями «Текст сверху», «Колонка слева» и «Текст снизу». Сейчас выбрано «' + SD.LAYOUTS[S.answers.layout].name + '».'));
    const g3 = h('div', { class: 'thumbs' });
    for (const [k, d] of Object.entries(SD.DISPLAYS)) {
      g3.append(h('div', { class: 'thumb' + (fx.display === k ? ' on' : ''), onclick: () => W.setFx({ display: k }) },
        W.thumb(W.withAns({ fx: Object.assign({}, fx, { auto: false, display: k }) }), 110, 130),
        h('div', null, d.name), h('div', { class: 'note' }, d.desc + (d.like.length ? ' · как ' + tag(d.like) : ''))));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 5. Показ продукта'), g3);
  }

  // ---------- 7. Расположение ----------
  function stepLayout(root) {
    root.append(h('div', { class: 'q' }, 'Вопрос 10. Как расположить текст?'));
    const g = h('div', { class: 'thumbs' });
    for (const [k, L] of Object.entries(SD.LAYOUTS)) {
      g.append(h('div', { class: 'thumb' + (k === S.answers.layout ? ' on' : ''), onclick: () => { W.set('layout', k, 'structure'); W.render(); } },
        W.thumb(W.withAns({ layout: k })), h('div', null, L.name), h('div', { class: 'note' }, L.desc)));
    }
    root.append(h('div', { class: 'cap' }, 'Рисунок 2. Варианты расположения'), g);
    if (!['center', 'diagonal'].includes(S.answers.layout)) {
      root.append(h('div', { class: 'q' }, 'Вопрос 11. Выключка текста'));
      root.append(...W.radioTable('Таблица 10. Выравнивание', ['Выравнивание'], [{ key: 'left', cells: ['По левому краю'] }, { key: 'center', cells: ['По центру'] }, { key: 'right', cells: ['По правому краю'] }],
        S.answers.align, k => { W.set('align', k, 'structure'); W.render(); }));
    }
    root.append(h('div', { class: 'q' }, 'Вопрос 12. Размер заголовка'));
    root.append(...W.radioTable('Таблица 11. Кегль заголовка', ['Размер', 'Когда подходит'],
      [{ key: 0.8, cells: ['Скромный', 'много текста'] }, { key: 1, cells: ['Обычный', 'большинство случаев'] }, { key: 1.2, cells: ['Крупный', 'короткий заголовок'] }, { key: 1.45, cells: ['Огромный', '2–3 слова, плакат'] }],
      S.answers.titleScale, k => { W.set('titleScale', k, 'structure'); W.render(); }));
  }

  // ---------- 8. Детали ----------
  function stepDetails(root) {
    const o = S.answers.opts;
    const v = A.variant();
    root.append(h('div', { class: 'q' }, 'Вопрос 13. Что ещё добавить на макет?'));
    const row = (k, name, note) => {
      const on = !!o[k];
      return h('tr', { class: 'pick' + (on ? ' on' : ''), onclick: () => { W.set('opts.' + k, !on, 'structure'); W.render(); } },
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
    file.addEventListener('change', async () => { if (file.files[0]) { W.set('opts.image', await u.readFile(file.files[0]), 'structure'); W.render(); } });
    it.append(h('tr', null, h('td', { style: { width: '32%' } }, 'Файл'), h('td', null, o.image ? h('span', null, h('img', { src: o.image, style: { height: '40px', verticalAlign: 'middle', border: '1px solid #000' } }), ' ', h('button', { class: 'btn sm', onclick: () => { W.set('opts.image', null, 'structure'); W.render(); } }, 'Убрать')) : file)));
    if (o.image) it.append(h('tr', null, h('td', null, 'Как вписать'), h('td', null, (() => {
      const s = h('select'); for (const [k, n] of [['cover', 'Заполнить область (обрезать края)'], ['contain', 'Показать целиком']]) s.append(h('option', { value: k, selected: o.imageFit === k }, n));
      s.addEventListener('change', () => W.set('opts.imageFit', s.value, 'structure')); return s;
    })())));
    root.append(h('div', { class: 'cap' }, 'Таблица 13. Изображение'), it);
    root.append(h('p', { class: 'note' }, 'Картинка встаёт в свободную зону выбранного расположения. Позже её можно двигать и менять в редакторе.'));

    root.append(h('div', { class: 'q' }, 'Вопрос 15. Шрифт и скругления'));
    const ft = h('table', { class: 'doc' });
    const fs = h('select');
    fs.append(h('option', { value: '' }, 'Как в стиле (' + SD.STYLES[v.fontFrom || v.colorsFrom].font + ')'));
    for (const f of SD.FONTS) fs.append(h('option', { value: f, selected: S.answers.font === f, style: { fontFamily: `"${f}"` } }, f));
    fs.addEventListener('change', () => { W.set('font', fs.value || null, 'structure'); W.render(); });
    const rg = h('input', { type: 'range', min: 0, max: 2.5, step: 0.25, value: o.rounded == null ? 1 : o.rounded });
    rg.addEventListener('change', () => W.set('opts.rounded', parseFloat(rg.value), 'structure'));
    ft.append(h('tr', null, h('td', { style: { width: '32%' } }, 'Шрифт'), h('td', null, fs)));
    ft.append(h('tr', null, h('td', null, 'Скругление углов'), h('td', null, h('span', { class: 'note' }, 'острые'), rg, h('span', { class: 'note' }, 'круглые'))));
    root.append(h('div', { class: 'cap' }, 'Таблица 14. Типографика и форма'), ft);
  }

  Object.assign(W, { stepEffects, stepLayout, stepDetails });
})(SD._wiz = SD._wiz || {});
