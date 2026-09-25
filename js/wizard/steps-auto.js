// Шаг мастера «Автопилот»: оценка, сравнение пар для обучения вкусу, поиск лучших вариантов.

(function (W) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

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
        pair = makePair(); W.render();
      } }, c, h('div', null, i ? 'Правый' : 'Левый')));
    });
    root.append(pr, h('div', { class: 'btn-row' }, h('button', { class: 'btn sm', onclick: () => { pair = makePair(); W.render(); } }, 'Не могу выбрать — другую пару'),
      h('button', { class: 'btn sm', onclick: () => { SD.taste.reset(); pair = makePair(); W.render(); } }, 'Забыть мой вкус')));
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
      autoSel = 0; btn.disabled = false; W.render();
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
        g.append(h('div', { class: 'thumb' + (i === autoSel ? ' on' : ''), onclick: () => { autoSel = i; W.render(); } }, c,
          h('div', null, h('b', null, b.score.total + '/100'), b.score.taste ? ` · вкус ${b.score.taste > 0 ? '+' : ''}${b.score.taste}` : ''), h('div', { class: 'note' }, `${SD.LAYOUTS[b.ans.layout].name} · ${v.title || ''} · ${SD.gen.GRAD_TYPES[(b.doc.decisions || []).find(d => d.topic === 'Градиент') ? Object.keys(SD.gen.GRAD_TYPES).find(t => SD.gen.GRAD_TYPES[t] === b.doc.decisions.find(d => d.topic === 'Градиент').choice) : 'none']}`)));
      });
      root.append(h('div', { class: 'cap' }, 'Рисунок. Лучшие варианты'), g);
      const b = autoRes.best[autoSel];
      root.append(h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => {
        const texts = S.answers.texts, mk = S.answers.mk;
        S.answers = Object.assign(JSON.parse(JSON.stringify(b.ans)), { texts, mk });
        A.regenerate(true); A.save(); SD.toast('Применён вариант ' + b.score.total + '/100'); W.render();
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

  Object.assign(W, { stepAuto });
})(SD._wiz = SD._wiz || {});
