// Левая половина: пошаговый путь от идеи до готового макета.
// Каждый шаг — формальный вопрос и готовые варианты ответа (не чат).
// Здесь ядро мастера: переходы, нумерация, общие таблицы и миниатюры. Общее лежит в SD._wiz (W).

(function (W) {
  const u = SD.u, A = SD.app, S = SD.app.S, h = SD.u.h;

  let el;
  W.textTimer = null;

  function init() {
    el = document.getElementById('step');
    document.getElementById('prevStep').addEventListener('click', () => go(S.step - 1));
    document.getElementById('nextStep').addEventListener('click', () => go(S.step + 1));
    document.getElementById('randomIdea').addEventListener('click', W.randomIdea);
    document.getElementById('resetAll').addEventListener('click', () => {
      if (confirmSafe('Сбросить все ответы и макет?')) { A.resetAll(); render(); }
    });
    let thumbT = null;
    A.on(what => {
      if (what === 'dirty') { SD.toast('Ответ сохранён. Макет правился вручную — нажмите «Пересобрать», чтобы применить.'); showDirty(); return; }
      if (what === 'doc' || what === 'sel' || what === 'page') {
        if (W.STEPS[S.step].id === 'editor') SD.panel.refresh();
        else if (W.STEPS[S.step].live && what === 'doc') { clearTimeout(thumbT); thumbT = setTimeout(render, 60); }
        if (what === 'doc') showDirty();
      }
    });
  }
  function confirmSafe(msg) { try { return window.confirm(msg); } catch (e) { return true; } }

  function go(i) {
    i = u.clamp(i, 0, W.STEPS.length - 1);
    if (i === S.step) return;
    S.step = i; A.save();
    if (W.STEPS[i].id === 'editor' && S.view !== 'edit') SD.views.setView('edit');
    render();
    el.scrollTop = 0;
  }

  function render() {
    const st = W.STEPS[S.step];
    if (st.id !== 'editor') SD.panel.unmount();
    document.getElementById('stepCounter').textContent = `Шаг ${S.step + 1} из ${W.STEPS.length}`;
    const toc = document.getElementById('toc');
    toc.innerHTML = '';
    const t = h('table');
    t.append(h('tr', null, ...W.STEPS.map((s, i) => h('td', { class: i === S.step ? 'on' : i < S.step ? 'done' : '', title: s.title, onclick: () => go(i) }, String(i + 1)))));
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
    nx.disabled = S.step === W.STEPS.length - 1;
    nx.textContent = S.step === W.STEPS.length - 2 ? 'К скачиванию →' : 'Далее →';
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
    const id = W.STEPS[S.step].id;
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

  Object.assign(W, { init, go, render, renumber, set, radioTable, iconStrip, curFx, setFx, thumb, withAns });
})(SD._wiz = SD._wiz || {});
