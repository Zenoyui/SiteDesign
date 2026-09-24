// Мини-редактор в духе Figma: выделение, перемещение, изменение размера,
// поворот, умные направляющие, рамка выделения, инструменты фигур,
// редактирование текста двойным кликом, горячие клавиши.

SD.editor = (function () {
  const u = SD.u, A = SD.app, S = SD.app.S;
  const PXMM = 96 / 25.4;
  const PAD = 40; // запас overlay вокруг листа, чтобы ручки не обрезались
  let stage, paper, canvas, ctx, overlay;
  let zoom = 1, fitMode = true, tool = 'move';
  let drag = null, hover = null, guides = [], marquee = null, editing = null;
  let clipboard = null, raf = 0;

  const ppm = () => zoom * PXMM;

  function init() {
    stage = document.getElementById('stage');
    paper = document.getElementById('paper');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    overlay = document.getElementById('overlay');

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    stage.addEventListener('dblclick', onDbl);
    stage.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => { if (fitMode) fit(); });
    document.addEventListener('paste', onPaste);
    stage.addEventListener('dragover', e => e.preventDefault());
    stage.addEventListener('drop', onDrop);

    document.querySelectorAll('#toolbar [data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
    document.getElementById('undoBtn').addEventListener('click', () => A.undo());
    document.getElementById('redoBtn').addEventListener('click', () => A.redo());
    document.getElementById('zoomIn').addEventListener('click', () => setZoom(zoom * 1.25));
    document.getElementById('zoomOut').addEventListener('click', () => setZoom(zoom / 1.25));
    document.getElementById('zoomFit').addEventListener('click', fit);
    document.getElementById('imageInput').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = '';
      if (f) addImage(await u.readFile(f));
    });

    SD.render.onAsset = () => { render(); SD.views && SD.views.refreshIfVisible(); };
  }

  // ---------- Масштаб ----------
  function fit() {
    if (!S.doc) return;
    const r = stage.getBoundingClientRect();
    const zw = (r.width - 60) / (S.doc.w * PXMM), zh = (r.height - 150) / (S.doc.h * PXMM);
    zoom = u.clamp(Math.min(zw, zh), 0.1, 8);
    fitMode = true;
    layout();
  }
  function setZoom(z, anchor) {
    const old = zoom;
    zoom = u.clamp(z, 0.1, 8); fitMode = false;
    const before = anchor ? toMm(anchor) : null;
    layout();
    if (anchor && before) {
      const r = canvas.getBoundingClientRect();
      stage.scrollLeft += (r.left + before[0] * ppm()) - anchor.clientX;
      stage.scrollTop += (r.top + before[1] * ppm()) - anchor.clientY;
    }
    return old;
  }
  function layout() {
    if (!S.doc) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = S.doc.w * ppm(), ch = S.doc.h * ppm();
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    paper.style.width = cw + 'px'; paper.style.height = ch + 'px';
    overlay.setAttribute('width', cw + PAD * 2); overlay.setAttribute('height', ch + PAD * 2);
    document.getElementById('zoomVal').textContent = Math.round(zoom * 100) + '%';
    render();
  }

  // ---------- Отрисовка ----------
  function render() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }
  function draw() {
    if (!S.doc) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    SD.render.drawPage(ctx, S.doc, A.page(), ppm() * dpr, { hideId: editing ? editing.id : null });
    drawOverlay();
  }

  function sx(v) { return v * ppm() + PAD; }
  function svgPoly(pts, attrs) {
    return `<polygon points="${pts.map(p => sx(p[0]) + ',' + sx(p[1])).join(' ')}" ${attrs}/>`;
  }
  function drawOverlay() {
    const sel = A.selected();
    let h = '';
    const blue = '#0D99FF';
    if (hover && !sel.includes(hover) && !drag) h += svgPoly(u.corners(hover), `fill="none" stroke="${blue}" stroke-width="1.5"`);
    for (const el of sel) {
      h += svgPoly(u.corners(el), `fill="none" stroke="${blue}" stroke-width="1"`);
      if (el.pin) {
        const t = A.byId(el.pin.id);
        if (t) {
          const a = [el.x + el.w / 2, el.y + el.h / 2], b = [t.x + t.w / 2, t.y + t.h / 2];
          h += `<line x1="${sx(a[0])}" y1="${sx(a[1])}" x2="${sx(b[0])}" y2="${sx(b[1])}" stroke="#9747FF" stroke-width="1" stroke-dasharray="4 3"/>`;
          h += svgPoly(u.corners(t), `fill="none" stroke="#9747FF" stroke-width="1" stroke-dasharray="4 3"`);
        }
      }
    }
    if (sel.length > 1) {
      const b = u.unionBox(sel.map(u.aabb));
      h += `<rect x="${sx(b.x)}" y="${sx(b.y)}" width="${b.w * ppm()}" height="${b.h * ppm()}" fill="none" stroke="${blue}" stroke-width="1"/>`;
    }
    if (sel.length === 1 && !editing) {
      const el = sel[0];
      if (!el.locked) {
        for (const hd of handles(el)) {
          if (hd.kind === 'rot') {
            const c = [el.x + el.w / 2, el.y + el.h / 2];
            const top = u.rotPt(c[0], el.y, c[0], c[1], el.rot || 0);
            h += `<line x1="${sx(top[0])}" y1="${sx(top[1])}" x2="${sx(hd.x)}" y2="${sx(hd.y)}" stroke="${blue}" stroke-width="1"/>`;
            h += `<circle cx="${sx(hd.x)}" cy="${sx(hd.y)}" r="5" fill="#fff" stroke="${blue}" stroke-width="1.2"/>`;
          } else {
            h += `<rect x="${sx(hd.x) - 4}" y="${sx(hd.y) - 4}" width="8" height="8" fill="#fff" stroke="${blue}" stroke-width="1.2" transform="rotate(${el.rot || 0} ${sx(hd.x)} ${sx(hd.y)})"/>`;
          }
        }
      }
      // подпись размеров, как в Figma
      const b = u.aabb(el);
      const label = `${u.round(el.w, 1)} × ${u.round(el.h, 1)} мм${el.rot ? ' · ' + u.round(el.rot, 0) + '°' : ''}`;
      const lx = sx(b.x + b.w / 2), ly = sx(b.y + b.h) + 18;
      const tw = label.length * 6.2 + 10;
      h += `<rect x="${lx - tw / 2}" y="${ly - 12}" width="${tw}" height="17" fill="${blue}" rx="2"/><text x="${lx}" y="${ly}" fill="#fff" font-size="11" font-family="Arial, sans-serif" text-anchor="middle">${label}</text>`;
    }
    for (const g of guides) {
      if (g.x != null) h += `<line x1="${sx(g.x)}" y1="${sx(g.a)}" x2="${sx(g.x)}" y2="${sx(g.b)}" stroke="#F24822" stroke-width="1"/>`;
      else h += `<line x1="${sx(g.a)}" y1="${sx(g.y)}" x2="${sx(g.b)}" y2="${sx(g.y)}" stroke="#F24822" stroke-width="1"/>`;
    }
    if (marquee) {
      const x = Math.min(marquee.x0, marquee.x1), y = Math.min(marquee.y0, marquee.y1);
      h += `<rect x="${sx(x)}" y="${sx(y)}" width="${Math.abs(marquee.x1 - marquee.x0) * ppm()}" height="${Math.abs(marquee.y1 - marquee.y0) * ppm()}" fill="rgba(13,153,255,.08)" stroke="${blue}" stroke-width="1"/>`;
    }
    if (drag && drag.kind === 'create' && drag.box) {
      const b = drag.box;
      h += `<rect x="${sx(b.x)}" y="${sx(b.y)}" width="${b.w * ppm()}" height="${b.h * ppm()}" fill="none" stroke="${blue}" stroke-width="1"/>`;
    }
    overlay.innerHTML = h;
  }

  function handles(el) {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2, r = el.rot || 0;
    const list = [];
    const small = el.w * ppm() < 24 || el.h * ppm() < 24;
    for (const hx of [-1, 0, 1]) for (const hy of [-1, 0, 1]) {
      if (!hx && !hy) continue;
      if (small && (!hx || !hy)) continue;
      if (el.type === 'line' && hy) continue;
      if (el.type === 'text' && el.autoH !== false && hy && !hx) continue;
      const p = u.rotPt(cx + hx * el.w / 2, cy + hy * el.h / 2, cx, cy, r);
      list.push({ kind: 'size', hx, hy, x: p[0], y: p[1] });
    }
    const off = 22 / ppm();
    const p = u.rotPt(cx, el.y - off, cx, cy, r);
    list.push({ kind: 'rot', x: p[0], y: p[1] });
    return list;
  }

  // ---------- Хит-тест ----------
  function toMm(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / ppm(), (e.clientY - r.top) / ppm()];
  }
  function hitEl(p, all) {
    const els = A.page().elements;
    const tol = 3 / ppm();
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (el.visible === false || (el.locked && !all)) continue;
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      const q = el.rot ? u.rotPt(p[0], p[1], cx, cy, -el.rot) : p;
      const lx = q[0] - el.x, ly = q[1] - el.y;
      const ht = el.type === 'line' ? Math.max(el.h, 6 / ppm()) : el.h;
      const ly2 = el.type === 'line' ? ly - el.h / 2 + ht / 2 : ly;
      if (lx < -tol || ly2 < -tol || lx > el.w + tol || ly2 > ht + tol) continue;
      if (el.type === 'ellipse') {
        const dx = (lx - el.w / 2) / (el.w / 2), dy = (ly - el.h / 2) / (el.h / 2);
        if (dx * dx + dy * dy > 1.05) continue;
      }
      return el;
    }
    return null;
  }
  function hitHandle(p) {
    const sel = A.selected();
    if (sel.length !== 1 || sel[0].locked) return null;
    const r = 7 / ppm();
    for (const hd of handles(sel[0])) if (Math.hypot(hd.x - p[0], hd.y - p[1]) < r) return hd;
    return null;
  }
  function cursorFor(hd, el) {
    if (hd.kind === 'rot') return 'grab';
    const a = (Math.atan2(hd.hy, hd.hx) * 180 / Math.PI + (el.rot || 0) + 360) % 180;
    return a < 22.5 || a >= 157.5 ? 'ew-resize' : a < 67.5 ? 'nwse-resize' : a < 112.5 ? 'ns-resize' : 'nesw-resize';
  }

  // ---------- Мышь ----------
  function onDown(e) {
    if (e.button === 1 || (e.button === 0 && spaceDown)) { drag = { kind: 'pan', x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop }; stage.classList.add('panning'); e.preventDefault(); return; }
    if (e.button !== 0) return;
    if (editing && e.target === editing.ta) return;
    if (editing) finishText();
    if (e.target.closest && e.target.closest('#toolbar')) return;
    stage.focus({ preventScroll: true });
    const p = toMm(e);

    if (tool !== 'move') {
      if (tool === 'image') { document.getElementById('imageInput').click(); setTool('move'); return; }
      drag = { kind: 'create', p0: p, box: null };
      return;
    }
    const hd = hitHandle(p);
    if (hd) {
      const el = A.selected()[0];
      drag = { kind: hd.kind === 'rot' ? 'rotate' : 'resize', hd, el, start: Object.assign({}, el), p0: p, moved: false };
      if (hd.kind === 'rot') drag.a0 = Math.atan2(p[1] - (el.y + el.h / 2), p[0] - (el.x + el.w / 2));
      return;
    }
    const el = hitEl(p);
    if (el) {
      if (e.shiftKey) {
        A.setSel(S.sel.includes(el.id) ? S.sel.filter(i => i !== el.id) : S.sel.concat(el.id));
      } else if (!S.sel.includes(el.id)) A.setSel([el.id]);
      if (e.altKey && S.sel.length) duplicateSel(0, true);
      const sel = A.selected().filter(x => !x.locked);
      drag = { kind: 'move', p0: p, items: sel.map(x => ({ el: x, x: x.x, y: x.y })), moved: false };
      drag.box0 = sel.length ? u.unionBox(sel.map(u.aabb)) : null;
    } else {
      if (!e.shiftKey) A.setSel([]);
      marquee = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], base: e.shiftKey ? S.sel.slice() : [] };
      drag = { kind: 'marquee' };
    }
  }

  function onMove(e) {
    if (!S.doc || S.view !== 'edit') return;
    if (!drag) {
      if (!e.target.closest || !e.target.closest('#stage') || editing) return;
      const p = toMm(e);
      const hd = tool === 'move' ? hitHandle(p) : null;
      const el = hd ? null : hitEl(p);
      stage.style.cursor = tool !== 'move' ? 'crosshair' : hd ? cursorFor(hd, A.selected()[0]) : spaceDown ? 'grab' : 'default';
      if (el !== hover) { hover = el; drawOverlay(); }
      return;
    }
    if (drag.kind === 'pan') {
      stage.scrollLeft = drag.sl - (e.clientX - drag.x);
      stage.scrollTop = drag.st - (e.clientY - drag.y);
      return;
    }
    const p = toMm(e);
    guides = [];
    if (drag.kind === 'move' && drag.items.length) {
      let dx = p[0] - drag.p0[0], dy = p[1] - drag.p0[1];
      if (!drag.moved && Math.hypot(dx, dy) * ppm() < 3) return;
      drag.moved = true;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (!e.ctrlKey && !e.metaKey) [dx, dy] = snapMove(drag.box0, dx, dy, drag.items.map(i => i.el.id));
      for (const it of drag.items) { it.el.x = u.round(it.x + dx, 2); it.el.y = u.round(it.y + dy, 2); }
      // если двигаем привязанный элемент без цели — обновляем смещение привязки
      for (const it of drag.items) if (it.el.pin && !S.sel.includes(it.el.pin.id)) {
        const t = A.byId(it.el.pin.id); if (t) { it.el.pin.dx = it.el.x - t.x; it.el.pin.dy = it.el.y - t.y; }
      }
      A.resolvePins(A.page());
      render();
      SD.panel && SD.panel.liveGeometry();
    } else if (drag.kind === 'resize') {
      doResize(p, e);
      drag.moved = true;
      A.resolvePins(A.page());
      render(); SD.panel && SD.panel.liveGeometry();
    } else if (drag.kind === 'rotate') {
      const el = drag.el, c = [drag.start.x + drag.start.w / 2, drag.start.y + drag.start.h / 2];
      let a = (drag.start.rot || 0) + (Math.atan2(p[1] - c[1], p[0] - c[0]) - drag.a0) * 180 / Math.PI;
      a = ((a % 360) + 540) % 360 - 180;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      el.rot = u.round(a, 1);
      drag.moved = true;
      render(); SD.panel && SD.panel.liveGeometry();
    } else if (drag.kind === 'marquee') {
      marquee.x1 = p[0]; marquee.y1 = p[1];
      const x = Math.min(marquee.x0, marquee.x1), y = Math.min(marquee.y0, marquee.y1);
      const w = Math.abs(marquee.x1 - marquee.x0), h = Math.abs(marquee.y1 - marquee.y0);
      const ids = A.page().elements.filter(el => {
        if (el.visible === false || el.locked) return false;
        const b = u.aabb(el);
        return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y;
      }).map(el => el.id);
      S.sel = Array.from(new Set(marquee.base.concat(ids)));
      drawOverlay();
    } else if (drag.kind === 'create') {
      let x0 = drag.p0[0], y0 = drag.p0[1], x1 = p[0], y1 = p[1];
      if (e.shiftKey) { const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); x1 = x0 + Math.sign(x1 - x0 || 1) * d; y1 = y0 + Math.sign(y1 - y0 || 1) * d; }
      drag.box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
      drawOverlay();
    }
  }

  function onUp(e) {
    if (!drag) return;
    const d = drag; drag = null; guides = [];
    stage.classList.remove('panning');
    if (d.kind === 'marquee') { marquee = null; A.setSel(S.sel); drawOverlay(); return; }
    if (d.kind === 'create') {
      let b = d.box;
      if (!b || b.w * ppm() < 4) {
        const def = tool === 'text' ? [60, 10] : tool === 'line' ? [40, 2] : tool === 'qr' ? [25, 25] : [30, 30];
        b = { x: d.p0[0], y: d.p0[1], w: def[0], h: def[1] };
      }
      createShape(tool, b);
      setTool('move');
      return;
    }
    if (d.kind === 'pan') return;
    if (d.moved) A.commit(); else if (d.kind === 'move' && !e.shiftKey) {
      // клик без перемещения по уже выделенной группе — выбираем один элемент
      const el = hitEl(toMm(e));
      if (el && S.sel.length > 1) A.setSel([el.id]);
    }
    render();
  }

  function doResize(p, e) {
    const { hd, el, start } = drag;
    const r = start.rot || 0;
    const c = [start.x + start.w / 2, start.y + start.h / 2];
    const q = u.rotPt(p[0], p[1], c[0], c[1], -r); // точка в локальных координатах
    const lx = q[0] - c[0], ly = q[1] - c[1];
    const fromCenter = e.altKey;
    const ax = fromCenter ? 0 : -hd.hx * start.w / 2, ay = fromCenter ? 0 : -hd.hy * start.h / 2;
    let w = start.w, h = start.h;
    if (hd.hx) w = Math.max(1, (lx - ax) * hd.hx * (fromCenter ? 2 : 1));
    if (hd.hy) h = Math.max(1, (ly - ay) * hd.hy * (fromCenter ? 2 : 1));
    const keep = e.shiftKey;
    if (keep && start.w && start.h) {
      const k = hd.hx && hd.hy ? Math.max(w / start.w, h / start.h) : hd.hx ? w / start.w : h / start.h;
      w = start.w * k; h = start.h * k;
    }
    // привязка края к направляющим (только без поворота)
    if (!r && !e.ctrlKey && !e.metaKey && !fromCenter) {
      const cand = snapCandidates([el.id]);
      const thr = 6 / ppm();
      if (hd.hx) {
        const edge = hd.hx > 0 ? start.x + w : start.x + start.w - w;
        const best = nearest(edge, cand.xs, thr);
        if (best) { w += (best.v - edge) * hd.hx; guides.push({ x: best.v, a: 0, b: S.doc.h }); }
      }
      if (hd.hy) {
        const edge = hd.hy > 0 ? start.y + h : start.y + start.h - h;
        const best = nearest(edge, cand.ys, thr);
        if (best) { h += (best.v - edge) * hd.hy; guides.push({ y: best.v, a: 0, b: S.doc.w }); }
      }
    }
    const ncx = fromCenter ? 0 : ax + hd.hx * w / 2, ncy = fromCenter ? 0 : ay + hd.hy * h / 2;
    const wc = u.rotPt(c[0] + (hd.hx || fromCenter ? ncx : 0), c[1] + (hd.hy || fromCenter ? ncy : 0), c[0], c[1], r);
    if (el.type === 'text' && e.shiftKey && hd.hx && hd.hy) el.size = u.round(start.size * w / start.w, 1);
    el.w = u.round(w, 2);
    if (el.type === 'text' && el.autoH !== false) { SD.render.fitHeight(el); h = el.h; }
    else el.h = u.round(h, 2);
    el.x = u.round(wc[0] - el.w / 2, 2);
    el.y = u.round(el.type === 'text' && el.autoH !== false && !r ? start.y : wc[1] - el.h / 2, 2);
  }

  // ---------- Умные направляющие ----------
  function snapCandidates(skip) {
    const W = S.doc.w, H = S.doc.h;
    const m = Math.max(6, Math.min(W, H * 0.75) * 0.08);
    const xs = [{ v: 0 }, { v: W / 2 }, { v: W }, { v: m }, { v: W - m }], ys = [{ v: 0 }, { v: H / 2 }, { v: H }, { v: m }, { v: H - m }];
    for (const el of A.page().elements) {
      if (skip.includes(el.id) || el.visible === false) continue;
      if (el.pin && skip.includes(el.pin.id)) continue;
      const b = u.aabb(el);
      xs.push({ v: b.x, b }, { v: b.x + b.w / 2, b }, { v: b.x + b.w, b });
      ys.push({ v: b.y, b }, { v: b.y + b.h / 2, b }, { v: b.y + b.h, b });
    }
    return { xs, ys };
  }
  function nearest(v, list, thr) {
    let best = null;
    for (const c of list) { const d = Math.abs(c.v - v); if (d < thr && (!best || d < best.d)) best = { v: c.v, d, b: c.b }; }
    return best;
  }
  function snapMove(box, dx, dy, ids) {
    if (!box) return [dx, dy];
    const skip = ids.concat(A.page().elements.filter(e => e.pin && ids.includes(e.pin.id)).map(e => e.id));
    const cand = snapCandidates(skip);
    const thr = 6 / ppm();
    let bx = null, by = null;
    for (const off of [0, box.w / 2, box.w]) {
      const n = nearest(box.x + dx + off, cand.xs, thr);
      if (n && (!bx || n.d < bx.d)) bx = { d: n.d, shift: n.v - (box.x + dx + off), v: n.v, b: n.b };
    }
    for (const off of [0, box.h / 2, box.h]) {
      const n = nearest(box.y + dy + off, cand.ys, thr);
      if (n && (!by || n.d < by.d)) by = { d: n.d, shift: n.v - (box.y + dy + off), v: n.v, b: n.b };
    }
    if (bx) dx += bx.shift;
    if (by) dy += by.shift;
    const nb = { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h };
    if (bx) { const o = bx.b || { y: 0, h: S.doc.h }; guides.push({ x: bx.v, a: Math.min(o.y, nb.y), b: Math.max(o.y + o.h, nb.y + nb.h) }); }
    if (by) { const o = by.b || { x: 0, w: S.doc.w }; guides.push({ y: by.v, a: Math.min(o.x, nb.x), b: Math.max(o.x + o.w, nb.x + nb.w) }); }
    return [dx, dy];
  }

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
    if (isTyping(e.target)) return;
    const items = e.clipboardData && e.clipboardData.files;
    if (items && items.length && items[0].type.startsWith('image/')) { e.preventDefault(); addImage(await u.readFile(items[0])); return; }
    if (clipboard) { e.preventDefault(); pasteInternal(); }
  }
  async function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) addImage(await u.readFile(f));
  }

  // ---------- Текст ----------
  function onDbl(e) {
    if (S.view !== 'edit') return;
    const el = hitEl(toMm(e));
    if (el && el.type === 'text' && !el.locked) startText(el);
    else if (el && el.pin) { const t = A.byId(el.pin.id); if (t) A.setSel([t.id]); }
  }
  function startText(el) {
    if (editing) finishText();
    const ta = document.createElement('textarea');
    ta.className = 'text-editor';
    ta.value = el.text;
    paper.appendChild(ta);
    editing = { id: el.id, el, ta, before: el.text };
    const pos = () => {
      const k = ppm();
      Object.assign(ta.style, {
        left: el.x * k + 'px', top: el.y * k + 'px', width: el.w * k + 'px', height: (el.h * k + 4) + 'px',
        font: `${el.italic ? 'italic ' : ''}${el.weight} ${el.size * SD.PT * k}px "${el.font}", sans-serif`,
        lineHeight: el.size * SD.PT * (el.lh || 1.2) * k + 'px', color: el.fill, textAlign: el.align,
        letterSpacing: ((el.ls || 0) * el.size * SD.PT * k) + 'px', textTransform: el.upper ? 'uppercase' : 'none',
        transform: el.rot ? `rotate(${el.rot}deg)` : 'none'
      });
    };
    pos();
    ta.addEventListener('input', () => { el.text = ta.value; SD.render.fitHeight(el); pos(); A.resolvePins(A.page()); render(); });
    ta.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); finishText(); }
    });
    ta.addEventListener('blur', () => setTimeout(finishText, 0));
    ta.focus(); ta.select();
    render();
  }
  function finishText() {
    if (!editing) return;
    const ed = editing; editing = null;
    ed.ta.remove();
    if (ed.el.text !== ed.before) { ed.el.textKey = null; A.commit(); } else render();
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
  function copySel() { const sel = A.selected(); if (sel.length) { clipboard = u.clone(sel); SD.toast('Скопировано: ' + sel.length); } }
  function pasteInternal() {
    if (!clipboard) return;
    const map = {}, copies = clipboard.map(e => { const c = u.clone(e); map[e.id] = c.id = u.uid(); c.x += 5; c.y += 5; return c; });
    for (const c of copies) if (c.pin) c.pin.id = map[c.pin.id] || c.pin.id;
    for (const c of copies) if (c.pin && !copies.some(x => x.id === c.pin.id) && !A.byId(c.pin.id)) c.pin = null;
    A.page().elements.push(...copies);
    clipboard = copies.map(c => u.clone(c));
    S.sel = copies.map(c => c.id); A.commit();
  }

  // ---------- Клавиатура ----------
  let spaceDown = false;
  function isTyping(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  function onKey(e) {
    if (e.type === 'keydown' && e.code === 'Space' && !isTyping(e.target)) { spaceDown = true; }
    if (isTyping(e.target) || S.view !== 'edit' || !S.doc) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    const step = e.shiftKey ? 10 : 1;
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); A.undo(); }
    else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); A.redo(); }
    else if (mod && k === 'd') { e.preventDefault(); duplicateSel(); }
    else if (mod && k === 'c') { copySel(); }
    else if (mod && k === 'x') { copySel(); deleteSel(); }
    else if (mod && k === 'a') { e.preventDefault(); A.setSel(A.page().elements.filter(x => x.visible !== false && !x.locked).map(x => x.id)); render(); }
    else if (mod && e.key === ']') { e.preventDefault(); reorder(e.altKey ? 'front' : 1); }
    else if (mod && e.key === '[') { e.preventDefault(); reorder(e.altKey ? 'back' : -1); }
    else if (mod && (k === '=' || k === '+')) { e.preventDefault(); setZoom(zoom * 1.25); }
    else if (mod && k === '-') { e.preventDefault(); setZoom(zoom / 1.25); }
    else if (mod && k === '0') { e.preventDefault(); setZoom(1); }
    else if (e.shiftKey && (k === '1' || e.code === 'Digit1')) { fit(); }
    else if (mod) return;
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSel(); }
    else if (k === 'escape') { if (S.sel.length) { const one = A.selected()[0]; A.setSel(one && one.pin ? [one.pin.id] : []); } setTool('move'); render(); }
    else if (k === 'enter') { const el = A.selected()[0]; if (el && el.type === 'text') { e.preventDefault(); startText(el); } }
    else if (k === 'arrowleft') { e.preventDefault(); nudge(-step, 0); }
    else if (k === 'arrowright') { e.preventDefault(); nudge(step, 0); }
    else if (k === 'arrowup') { e.preventDefault(); nudge(0, -step); }
    else if (k === 'arrowdown') { e.preventDefault(); nudge(0, step); }
    else if (k === 'v') setTool('move');
    else if (k === 'r') setTool('rect');
    else if (k === 'o') setTool('ellipse');
    else if (k === 'l') setTool('line');
    else if (k === 's') setTool('star');
    else if (k === 't') setTool('text');
    else if (k === 'i') setTool('image');
  }
  window.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; if (stage) stage.style.cursor = ''; } });

  function onWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(zoom * Math.pow(1.0018, -e.deltaY), e);
    }
  }

  function setTool(t) {
    if (t === 'image') { document.getElementById('imageInput').click(); t = 'move'; }
    tool = t;
    document.querySelectorAll('#toolbar [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
    stage.classList.toggle('tool-add', t !== 'move');
  }

  return {
    init, render, layout, fit, setZoom, setTool, duplicateSel, deleteSel, reorder, align, distribute, startText, finishText,
    isFit: () => fitMode, copySel, pasteInternal, addImage
  };
})();
