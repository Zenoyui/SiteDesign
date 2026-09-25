// Редактор: создание фигур и картинок, редактирование текста, операции над выделением.

(function (E) {
  const u = SD.u, A = SD.app, S = SD.app.S;

  // ---------- Создание элементов ----------
  function createShape(kind, b) {
    const p = A.pal();
    const G = SD.gen;
    const font = (SD.gen.styleProps(S.answers, A.variant())).font;
    let el;
    if (kind === 'rect') el = G.base({ name: 'Прямоугольник', x: b.x, y: b.y, w: b.w, h: b.h, fill: p.primary, radius: 0 });
    else if (kind === 'ellipse') el = G.base({ type: 'ellipse', name: 'Эллипс', x: b.x, y: b.y, w: b.w, h: b.h, fill: p.accent });
    else if (kind === 'star') el = G.base({ type: 'star', name: 'Звезда', x: b.x, y: b.y, w: b.w, h: b.h, fill: p.accent, points: 5, inner: 0.5 });
    else if (kind === 'line') el = G.base({ type: 'line', name: 'Линия', x: b.x, y: b.y, w: Math.max(b.w, 5), h: 2, stroke: p.text, strokeW: 0.6, fill: null });
    else if (kind === 'qr') el = G.base({ type: 'qr', name: 'QR-код', x: b.x, y: b.y, w: Math.max(b.w, b.h), h: Math.max(b.w, b.h), data: S.answers.texts.qr || 'https://example.com', fill: p.text });
    else if (kind === 'icon') { const d = Math.max(b.w, b.h, 8); el = G.base({ type: 'icon', name: 'Значок', icon: 'star', iconStyle: SD.gen.fxFor(S.answers).icons, x: b.x, y: b.y, w: d, h: d, fill: p.icon, fill2: p.primary }); }
    else if (kind === 'pattern') el = G.base({ type: 'pattern', name: 'Узор', kind: 'dots', cell: 4, x: b.x, y: b.y, w: Math.max(b.w, 20), h: Math.max(b.h, 20), fill: p.primary, fill2: p.accent, opacity: 0.4 });
    else if (kind === 'phone') { const hh = Math.max(b.h, 60); el = G.base({ type: 'phone', name: 'Телефон', x: b.x, y: b.y, w: hh / 2.05, h: hh, fill: p.soft, fill2: p.ctaMax }); }
    else if (kind === 'text') el = G.text({ name: 'Текст', text: 'Текст', font, weight: 400, size: 14, x: b.x, y: b.y, w: Math.max(b.w, 20), fill: p.text });
    if (!el) return;
    el.cons = { h: 'left', v: 'top' };
    A.page().elements.push(el);
    S.sel = [el.id];
    A.commit();
    if (kind === 'text') setTimeout(() => startText(el), 30);
  }
  function addImage(src) {
    const im = new Image();
    im.onload = () => {
      const W = S.doc.w, H = S.doc.h;
      let w = W * 0.6, h = w * im.naturalHeight / im.naturalWidth;
      if (h > H * 0.6) { h = H * 0.6; w = h * im.naturalWidth / im.naturalHeight; }
      const el = SD.gen.base({ type: 'image', name: 'Изображение', src, fit: 'cover', x: (W - w) / 2, y: (H - h) / 2, w, h, fill: null, cons: { h: 'scale', v: 'scale' } });
      A.page().elements.push(el); S.sel = [el.id]; A.commit();
    };
    im.src = src;
  }
  async function onPaste(e) {
    if (E.isTyping(e.target)) return;
    const items = e.clipboardData && e.clipboardData.files;
    if (items && items.length && items[0].type.startsWith('image/')) { e.preventDefault(); addImage(await u.readFile(items[0])); return; }
    if (E.clipboard) { e.preventDefault(); pasteInternal(); }
  }
  async function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) addImage(await u.readFile(f));
  }

  // ---------- Текст ----------
  function onDbl(e) {
    if (S.view !== 'edit') return;
    const el = E.hitEl(E.toMm(e));
    if (el && el.type === 'text' && !el.locked) startText(el);
    else if (el && el.pin) { const t = A.byId(el.pin.id); if (t) A.setSel([t.id]); }
  }
  function startText(el) {
    if (E.editing) finishText();
    const ta = document.createElement('textarea');
    ta.className = 'text-editor';
    ta.value = el.text;
    E.paper.appendChild(ta);
    E.editing = { id: el.id, el, ta, before: el.text };
    const pos = () => {
      const k = E.ppm();
      Object.assign(ta.style, {
        left: el.x * k + 'px', top: el.y * k + 'px', width: el.w * k + 'px', height: (el.h * k + 4) + 'px',
        font: `${el.italic ? 'italic ' : ''}${el.weight} ${el.size * SD.PT * k}px "${el.font}", sans-serif`,
        lineHeight: el.size * SD.PT * (el.lh || 1.2) * k + 'px', color: el.fill, textAlign: el.align,
        letterSpacing: ((el.ls || 0) * el.size * SD.PT * k) + 'px', textTransform: el.upper ? 'uppercase' : 'none',
        transform: el.rot ? `rotate(${el.rot}deg)` : 'none'
      });
    };
    pos();
    ta.addEventListener('input', () => { el.text = ta.value; SD.render.fitHeight(el); pos(); A.resolvePins(A.page()); E.render(); });
    ta.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); finishText(); }
    });
    ta.addEventListener('blur', () => setTimeout(finishText, 0));
    ta.focus(); ta.select();
    E.render();
  }
  function finishText() {
    if (!E.editing) return;
    const ed = E.editing; E.editing = null;
    ed.ta.remove();
    if (ed.el.text !== ed.before) { ed.el.textKey = null; A.commit(); } else E.render();
  }

  // ---------- Операции над выделением ----------
  function duplicateSel(offset = 5, inPlace = false) {
    const els = A.page().elements;
    const sel = A.selected();
    if (!sel.length) return;
    const map = {}, copies = [];
    for (const el of sel) {
      const c = u.clone(el); c.id = u.uid(); map[el.id] = c.id;
      c.x += offset; c.y += offset; c.name = (c.name || 'Элемент') + (inPlace ? '' : ' копия');
      copies.push(c);
    }
    for (const c of copies) if (c.pin && map[c.pin.id]) c.pin.id = map[c.pin.id];
    const maxIdx = Math.max(...sel.map(e => els.indexOf(e)));
    els.splice(maxIdx + 1, 0, ...copies);
    if (inPlace) {
      // Alt+перетаскивание: тянем копию, оригинал остаётся на месте
      S.sel = copies.map(c => c.id);
    } else { S.sel = copies.map(c => c.id); A.commit(); }
  }
  function deleteSel() {
    const ids = S.sel.slice();
    if (!ids.length) return;
    const p = A.page();
    p.elements = p.elements.filter(e => !ids.includes(e.id));
    for (const e of p.elements) if (e.pin && ids.includes(e.pin.id)) e.pin = null;
    S.sel = []; A.commit();
  }
  function nudge(dx, dy) {
    const sel = A.selected().filter(e => !e.locked);
    if (!sel.length) return;
    for (const el of sel) {
      el.x = u.round(el.x + dx, 2); el.y = u.round(el.y + dy, 2);
      if (el.pin && !S.sel.includes(el.pin.id)) { el.pin.dx += dx; el.pin.dy += dy; }
    }
    A.commit();
  }
  function reorder(dir) {
    const els = A.page().elements;
    const sel = A.selected();
    if (!sel.length) return;
    if (dir === 'front' || dir === 'back') {
      const rest = els.filter(e => !sel.includes(e));
      A.page().elements = dir === 'front' ? rest.concat(sel) : sel.concat(rest);
    } else {
      const order = dir > 0 ? sel.slice().sort((a, b) => els.indexOf(b) - els.indexOf(a)) : sel.slice().sort((a, b) => els.indexOf(a) - els.indexOf(b));
      for (const el of order) {
        const i = els.indexOf(el), j = i + dir;
        if (j < 0 || j >= els.length || sel.includes(els[j])) continue;
        els[i] = els[j]; els[j] = el;
      }
    }
    A.commit();
  }
  function align(how, toPage) {
    const sel = A.selected().filter(e => !e.locked);
    if (!sel.length) return;
    const ref = toPage || sel.length === 1 ? { x: 0, y: 0, w: S.doc.w, h: S.doc.h } : u.unionBox(sel.map(u.aabb));
    for (const el of sel) {
      const b = u.aabb(el);
      let dx = 0, dy = 0;
      if (how === 'left') dx = ref.x - b.x;
      if (how === 'hcenter') dx = ref.x + ref.w / 2 - (b.x + b.w / 2);
      if (how === 'right') dx = ref.x + ref.w - (b.x + b.w);
      if (how === 'top') dy = ref.y - b.y;
      if (how === 'vcenter') dy = ref.y + ref.h / 2 - (b.y + b.h / 2);
      if (how === 'bottom') dy = ref.y + ref.h - (b.y + b.h);
      el.x = u.round(el.x + dx, 2); el.y = u.round(el.y + dy, 2);
      if (el.pin && !S.sel.includes(el.pin.id)) { el.pin.dx += dx; el.pin.dy += dy; }
    }
    A.commit();
  }
  function distribute(axisName) {
    const sel = A.selected().filter(e => !e.locked);
    if (sel.length < 3) { SD.toast('Для распределения выделите 3+ элемента'); return; }
    const k = axisName === 'h' ? 'x' : 'y', s = axisName === 'h' ? 'w' : 'h';
    const boxes = sel.map(el => ({ el, b: u.aabb(el) })).sort((a, b) => a.b[k] - b.b[k]);
    const first = boxes[0].b, last = boxes[boxes.length - 1].b;
    const total = boxes.reduce((a, o) => a + o.b[s], 0);
    const gap = (last[k] + last[s] - first[k] - total) / (boxes.length - 1);
    let pos = first[k];
    for (const o of boxes) { const d = pos - o.b[k]; o.el[k] = u.round(o.el[k] + d, 2); pos += o.b[s] + gap; }
    A.commit();
  }
  function copySel() { const sel = A.selected(); if (sel.length) { E.clipboard = u.clone(sel); SD.toast('Скопировано: ' + sel.length); } }
  function pasteInternal() {
    if (!E.clipboard) return;
    const map = {}, copies = E.clipboard.map(e => { const c = u.clone(e); map[e.id] = c.id = u.uid(); c.x += 5; c.y += 5; return c; });
    for (const c of copies) if (c.pin) c.pin.id = map[c.pin.id] || c.pin.id;
    for (const c of copies) if (c.pin && !copies.some(x => x.id === c.pin.id) && !A.byId(c.pin.id)) c.pin = null;
    A.page().elements.push(...copies);
    E.clipboard = copies.map(c => u.clone(c));
    S.sel = copies.map(c => c.id); A.commit();
  }

  Object.assign(E, { createShape, addImage, onPaste, onDrop, onDbl, startText, finishText, duplicateSel, deleteSel, nudge, reorder, align, distribute, copySel, pasteInternal });
})(SD._editor = SD._editor || {});
