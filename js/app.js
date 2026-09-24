// Состояние приложения: ответы, документ, выделение, история правок.

SD.app = (function () {
  const u = SD.u;
  const KEY = 'sitedesign.v1';

  function defaultAnswers() {
    return {
      kind: 'flyer', goal: 'sell', format: 'A6', orient: 'portrait', pages: 1,
      styles: ['go'], variant: 0, palette: null, font: null,
      texts: Object.assign({ qr: 'https://example.com' }, SD.EXAMPLES.sell),
      layout: 'top', align: 'left', titleScale: 1,
      opts: { motif: true, cta: true, promo: true, qr: false, contacts: true, image: null, imageFit: 'cover', rounded: 1 }
    };
  }

  const S = {
    step: 0,
    answers: defaultAnswers(),
    doc: null,
    page: 0,
    sel: [],
    view: 'edit',
    exportOpts: { dpi: 300, bleed: false, marks: false, jpgQ: 0.92 }
  };
  let hist = [], hi = -1;
  const listeners = [];

  function on(fn) { listeners.push(fn); }
  function emit(what) { for (const f of listeners) f(what || 'all'); }

  function page() { return S.doc.pages[S.page] || S.doc.pages[0]; }
  function byId(id, p) { return (p || page()).elements.find(e => e.id === id); }
  function selected() { return S.sel.map(id => byId(id)).filter(Boolean); }

  function variant() { const vs = SD.gen.variants(S.answers.styles); return vs[S.answers.variant] || vs[0]; }
  function pal() { return S.answers.palette ? SD.gen.withDerived(Object.assign({}, S.answers.palette)) : SD.gen.palette(variant()); }

  // ---------- История ----------
  function snapshot() { return JSON.stringify({ doc: S.doc, page: S.page }); }
  function resetHistory() { hist = [snapshot()]; hi = 0; }
  function commit(opts = {}) {
    if (opts.dirty !== false) S.doc.dirty = true;
    resolvePins(page());
    const snap = snapshot();
    if (hist[hi] !== snap) {
      hist = hist.slice(0, hi + 1); hist.push(snap);
      if (hist.length > 80) hist.shift();
      hi = hist.length - 1;
    }
    save();
    emit('doc');
  }
  function undo() { if (hi > 0) { hi--; restore(); } }
  function redo() { if (hi < hist.length - 1) { hi++; restore(); } }
  function restore() {
    const o = JSON.parse(hist[hi]);
    S.doc = o.doc; S.page = Math.min(o.page, S.doc.pages.length - 1);
    S.sel = S.sel.filter(id => byId(id));
    save(); emit('doc');
  }

  // ---------- Сохранение между визитами ----------
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      if (!u.store.set(KEY, { answers: S.answers, doc: S.doc, step: S.step, page: S.page })) {
        // не влезло (большие картинки) — сохраняем хотя бы ответы
        u.store.set(KEY, { answers: Object.assign({}, S.answers, { opts: Object.assign({}, S.answers.opts, { image: null }) }), step: S.step });
      }
    }, 400);
  }
  function load() {
    const o = u.store.get(KEY);
    if (!o || !o.answers) return false;
    const d = defaultAnswers();
    S.answers = Object.assign(d, o.answers, { opts: Object.assign(d.opts, o.answers.opts || {}), texts: Object.assign(d.texts, o.answers.texts || {}) });
    S.step = o.step || 0;
    if (o.doc && o.doc.pages) { S.doc = o.doc; S.page = Math.min(o.page || 0, S.doc.pages.length - 1); }
    return true;
  }
  function resetAll() {
    u.store.del(KEY);
    S.answers = defaultAnswers(); S.step = 0; S.page = 0; S.sel = [];
    regenerate(true);
  }

  // ---------- Пересборка по ответам ----------
  function regenerate(force) {
    if (S.doc && S.doc.dirty && !force) { emit('dirty'); return false; }
    S.doc = SD.gen.build(S.answers);
    S.page = Math.min(S.page, S.doc.pages.length - 1);
    S.sel = [];
    resetHistory(); save(); emit('doc');
    SD.render.assetsReady(S.doc).then(() => {
      // после загрузки шрифтов пересобираем ещё раз — размеры текста станут точными
      if (!S.doc.dirty) { S.doc = SD.gen.build(S.answers); resetHistory(); emit('doc'); }
    });
    return true;
  }
  // Изменение, которое можно применить без пересборки (цвета, тексты, формат).
  function applySoft(kind) {
    if (!S.doc) return regenerate(true);
    if (!S.doc.dirty) return regenerate(true);
    if (kind === 'palette') SD.gen.applyPalette(S.doc, pal());
    if (kind === 'texts') SD.gen.applyTexts(S.doc, S.answers.texts);
    if (kind === 'format') {
      const f = SD.FORMATS[S.answers.format];
      let W = f.w, H = f.h;
      if (!f.fixedOrient && (S.answers.orient === 'landscape') !== (W > H)) { const t = W; W = H; H = t; }
      resizeDoc(W, H);
      S.doc.format = S.answers.format; S.doc.orient = S.answers.orient;
    }
    commit();
    return true;
  }

  // ---------- Ограничения (как Constraints в Figma) ----------
  function resizeDoc(W, H) {
    const d = S.doc, ow = d.w, oh = d.h;
    if (Math.abs(ow - W) < 0.01 && Math.abs(oh - H) < 0.01) return;
    const kx = W / ow, ky = H / oh, k = Math.min(kx, ky);
    for (const p of d.pages) for (const el of p.elements) {
      if (el.pin) continue; // привязанные элементы поедут за своей целью
      const c = el.cons || { h: 'scale', v: 'scale' };
      const ax = axis(c.h, el.x, el.w, ow, W, kx);
      const ay = axis(c.v, el.y, el.h, oh, H, ky);
      const sx = ax[1] / (el.w || 1), sy = ay[1] / (el.h || 1);
      el.x = ax[0]; el.w = ax[1]; el.y = ay[0]; el.h = ay[1];
      if (el.type === 'text') {
        const fs = c.h === 'scale' || c.v === 'scale' ? Math.min(c.h === 'scale' ? kx : 9, c.v === 'scale' ? ky : 9) : 1;
        if (fs !== 1) el.size = u.round(el.size * fs, 1);
        SD.render.fitHeight(el);
      }
      if (el.radius) el.radius = u.round(el.radius * Math.min(sx, sy), 2);
      if (el.strokeW) el.strokeW = u.round(el.strokeW * k, 2);
    }
    // смещения привязок тоже масштабируем
    for (const p of d.pages) for (const el of p.elements) if (el.pin) {
      el.pin.dx *= kx; el.pin.dy *= ky; el.w *= kx; el.h *= ky;
      if (el.type === 'text') { el.size = u.round(el.size * Math.min(kx, ky), 1); SD.render.fitHeight(el); }
      if (el.fitParent) { el.fitParent.padX *= kx; el.fitParent.padY *= ky; }
    }
    d.w = W; d.h = H;
    for (const p of d.pages) resolvePins(p);
  }
  function axis(mode, pos, size, O, N, k) {
    switch (mode) {
      case 'left': case 'top': return [pos, size];
      case 'right': case 'bottom': return [N - (O - pos), size];
      case 'center': return [pos + (N - O) / 2, size];
      case 'left-right': case 'top-bottom': return [pos, Math.max(1, size + (N - O))];
      default: return [pos * k, size * k];
    }
  }

  // ---------- Привязка к другому элементу ----------
  function resolvePins(p) {
    for (let pass = 0; pass < 4; pass++) for (const el of p.elements) if (el.pin) {
      const t = p.elements.find(e => e.id === el.pin.id);
      if (!t) { el.pin = null; continue; }
      el.x = t.x + el.pin.dx; el.y = t.y + el.pin.dy;
    }
  }
  function pinTo(el, targetId) {
    if (!targetId) { el.pin = null; return; }
    const t = byId(targetId);
    if (!t || t.id === el.id) return;
    // не допускаем циклов
    let cur = t, guard = 0;
    while (cur && cur.pin && guard++ < 50) { if (cur.pin.id === el.id) { SD.toast('Нельзя: получится цикл привязок'); return; } cur = byId(cur.pin.id); }
    el.pin = { id: t.id, dx: el.x - t.x, dy: el.y - t.y };
  }

  // ---------- Страницы ----------
  function addPage() {
    const p = { id: u.uid(), name: 'Страница ' + (S.doc.pages.length + 1), bg: pal().bg, bgRole: 'bg', elements: [] };
    S.doc.pages.push(p); S.page = S.doc.pages.length - 1; S.sel = [];
    commit();
  }
  function duplicatePage(i) {
    const p = u.clone(S.doc.pages[i]);
    const map = {};
    p.id = u.uid(); p.name = p.name + ' (копия)';
    p.elements.forEach(e => { const n = u.uid(); map[e.id] = n; e.id = n; });
    p.elements.forEach(e => { if (e.pin) e.pin.id = map[e.pin.id] || e.pin.id; });
    S.doc.pages.splice(i + 1, 0, p); S.page = i + 1; S.sel = [];
    commit();
  }
  function deletePage(i) {
    if (S.doc.pages.length < 2) { SD.toast('Должна остаться хотя бы одна страница'); return; }
    S.doc.pages.splice(i, 1); S.page = Math.max(0, Math.min(S.page, S.doc.pages.length - 1)); S.sel = [];
    commit();
  }
  function setPage(i) { S.page = i; S.sel = []; emit('page'); }
  function setSel(ids) { S.sel = ids.slice(); emit('sel'); }

  return {
    S, on, emit, page, byId, selected, variant, pal, commit, undo, redo, resetHistory,
    regenerate, applySoft, resizeDoc, resolvePins, pinTo, addPage, duplicatePage, deletePage,
    setPage, setSel, save, load, resetAll, defaultAnswers,
    canUndo: () => hi > 0, canRedo: () => hi < hist.length - 1
  };
})();
