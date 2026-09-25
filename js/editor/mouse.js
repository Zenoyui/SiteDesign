// Редактор: мышь — выделение, перемещение, изменение размера, поворот, рамка, умные направляющие.

(function (E) {
  const u = SD.u, A = SD.app, S = SD.app.S;

  // ---------- Хит-тест ----------
  function toMm(e) {
    const r = E.canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / E.ppm(), (e.clientY - r.top) / E.ppm()];
  }
  function hitEl(p, all) {
    const els = A.page().elements;
    const tol = 3 / E.ppm();
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      if (el.visible === false || (el.locked && !all)) continue;
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      const q = el.rot ? u.rotPt(p[0], p[1], cx, cy, -el.rot) : p;
      const lx = q[0] - el.x, ly = q[1] - el.y;
      const ht = el.type === 'line' ? Math.max(el.h, 6 / E.ppm()) : el.h;
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
    const r = 7 / E.ppm();
    for (const hd of E.handles(sel[0])) if (Math.hypot(hd.x - p[0], hd.y - p[1]) < r) return hd;
    return null;
  }
  function cursorFor(hd, el) {
    if (hd.kind === 'rot') return 'grab';
    const a = (Math.atan2(hd.hy, hd.hx) * 180 / Math.PI + (el.rot || 0) + 360) % 180;
    return a < 22.5 || a >= 157.5 ? 'ew-resize' : a < 67.5 ? 'nwse-resize' : a < 112.5 ? 'ns-resize' : 'nesw-resize';
  }

  // ---------- Мышь ----------
  function onDown(e) {
    if (e.button === 1 || (e.button === 0 && E.spaceDown)) { E.drag = { kind: 'pan', x: e.clientX, y: e.clientY, sl: E.stage.scrollLeft, st: E.stage.scrollTop }; E.stage.classList.add('panning'); e.preventDefault(); return; }
    if (e.button !== 0) return;
    if (E.editing && e.target === E.editing.ta) return;
    if (E.editing) E.finishText();
    if (e.target.closest && e.target.closest('#toolbar')) return;
    E.stage.focus({ preventScroll: true });
    const p = toMm(e);

    if (E.tool !== 'move') {
      if (E.tool === 'image') { document.getElementById('imageInput').click(); E.setTool('move'); return; }
      E.drag = { kind: 'create', p0: p, box: null };
      return;
    }
    const hd = hitHandle(p);
    if (hd) {
      const el = A.selected()[0];
      E.drag = { kind: hd.kind === 'rot' ? 'rotate' : 'resize', hd, el, start: Object.assign({}, el), p0: p, moved: false };
      if (hd.kind === 'rot') E.drag.a0 = Math.atan2(p[1] - (el.y + el.h / 2), p[0] - (el.x + el.w / 2));
      return;
    }
    const el = hitEl(p);
    if (el) {
      if (e.shiftKey) {
        A.setSel(S.sel.includes(el.id) ? S.sel.filter(i => i !== el.id) : S.sel.concat(el.id));
      } else if (!S.sel.includes(el.id)) A.setSel([el.id]);
      if (e.altKey && S.sel.length) E.duplicateSel(0, true);
      const sel = A.selected().filter(x => !x.locked);
      E.drag = { kind: 'move', p0: p, items: sel.map(x => ({ el: x, x: x.x, y: x.y })), moved: false };
      E.drag.box0 = sel.length ? u.unionBox(sel.map(u.aabb)) : null;
    } else {
      if (!e.shiftKey) A.setSel([]);
      E.marquee = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], base: e.shiftKey ? S.sel.slice() : [] };
      E.drag = { kind: 'marquee' };
    }
  }

  function onMove(e) {
    if (!S.doc || S.view !== 'edit') return;
    if (!E.drag) {
      if (!e.target.closest || !e.target.closest('#stage') || E.editing) return;
      const p = toMm(e);
      const hd = E.tool === 'move' ? hitHandle(p) : null;
      const el = hd ? null : hitEl(p);
      E.stage.style.cursor = E.tool !== 'move' ? 'crosshair' : hd ? cursorFor(hd, A.selected()[0]) : E.spaceDown ? 'grab' : 'default';
      if (el !== E.hover) { E.hover = el; E.drawOverlay(); }
      return;
    }
    if (E.drag.kind === 'pan') {
      E.stage.scrollLeft = E.drag.sl - (e.clientX - E.drag.x);
      E.stage.scrollTop = E.drag.st - (e.clientY - E.drag.y);
      return;
    }
    const p = toMm(e);
    E.guides = [];
    if (E.drag.kind === 'move' && E.drag.items.length) {
      let dx = p[0] - E.drag.p0[0], dy = p[1] - E.drag.p0[1];
      if (!E.drag.moved && Math.hypot(dx, dy) * E.ppm() < 3) return;
      E.drag.moved = true;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (!e.ctrlKey && !e.metaKey) [dx, dy] = snapMove(E.drag.box0, dx, dy, E.drag.items.map(i => i.el.id));
      for (const it of E.drag.items) { it.el.x = u.round(it.x + dx, 2); it.el.y = u.round(it.y + dy, 2); }
      // если двигаем привязанный элемент без цели — обновляем смещение привязки
      for (const it of E.drag.items) if (it.el.pin && !S.sel.includes(it.el.pin.id)) {
        const t = A.byId(it.el.pin.id); if (t) { it.el.pin.dx = it.el.x - t.x; it.el.pin.dy = it.el.y - t.y; }
      }
      A.resolvePins(A.page());
      E.render();
      SD.panel && SD.panel.liveGeometry();
    } else if (E.drag.kind === 'resize') {
      doResize(p, e);
      E.drag.moved = true;
      A.resolvePins(A.page());
      E.render(); SD.panel && SD.panel.liveGeometry();
    } else if (E.drag.kind === 'rotate') {
      const el = E.drag.el, c = [E.drag.start.x + E.drag.start.w / 2, E.drag.start.y + E.drag.start.h / 2];
      let a = (E.drag.start.rot || 0) + (Math.atan2(p[1] - c[1], p[0] - c[0]) - E.drag.a0) * 180 / Math.PI;
      a = ((a % 360) + 540) % 360 - 180;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      el.rot = u.round(a, 1);
      E.drag.moved = true;
      E.render(); SD.panel && SD.panel.liveGeometry();
    } else if (E.drag.kind === 'marquee') {
      E.marquee.x1 = p[0]; E.marquee.y1 = p[1];
      const x = Math.min(E.marquee.x0, E.marquee.x1), y = Math.min(E.marquee.y0, E.marquee.y1);
      const w = Math.abs(E.marquee.x1 - E.marquee.x0), h = Math.abs(E.marquee.y1 - E.marquee.y0);
      const ids = A.page().elements.filter(el => {
        if (el.visible === false || el.locked) return false;
        const b = u.aabb(el);
        return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y;
      }).map(el => el.id);
      S.sel = Array.from(new Set(E.marquee.base.concat(ids)));
      E.drawOverlay();
    } else if (E.drag.kind === 'create') {
      let x0 = E.drag.p0[0], y0 = E.drag.p0[1], x1 = p[0], y1 = p[1];
      if (e.shiftKey) { const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); x1 = x0 + Math.sign(x1 - x0 || 1) * d; y1 = y0 + Math.sign(y1 - y0 || 1) * d; }
      E.drag.box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
      E.drawOverlay();
    }
  }

  function onUp(e) {
    if (!E.drag) return;
    const d = E.drag; E.drag = null; E.guides = [];
    E.stage.classList.remove('panning');
    if (d.kind === 'marquee') { E.marquee = null; A.setSel(S.sel); E.drawOverlay(); return; }
    if (d.kind === 'create') {
      let b = d.box;
      if (!b || b.w * E.ppm() < 4) {
        const def = E.tool === 'text' ? [60, 10] : E.tool === 'line' ? [40, 2] : E.tool === 'qr' ? [25, 25] : E.tool === 'icon' ? [14, 14] : E.tool === 'phone' ? [30, 62] : [30, 30];
        b = { x: d.p0[0], y: d.p0[1], w: def[0], h: def[1] };
      }
      E.createShape(E.tool, b);
      E.setTool('move');
      return;
    }
    if (d.kind === 'pan') return;
    if (d.moved) A.commit(); else if (d.kind === 'move' && !e.shiftKey) {
      // клик без перемещения по уже выделенной группе — выбираем один элемент
      const el = hitEl(toMm(e));
      if (el && S.sel.length > 1) A.setSel([el.id]);
    }
    E.render();
  }

  function doResize(p, e) {
    const { hd, el, start } = E.drag;
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
      const thr = 6 / E.ppm();
      if (hd.hx) {
        const edge = hd.hx > 0 ? start.x + w : start.x + start.w - w;
        const best = nearest(edge, cand.xs, thr);
        if (best) { w += (best.v - edge) * hd.hx; E.guides.push({ x: best.v, a: 0, b: S.doc.h }); }
      }
      if (hd.hy) {
        const edge = hd.hy > 0 ? start.y + h : start.y + start.h - h;
        const best = nearest(edge, cand.ys, thr);
        if (best) { h += (best.v - edge) * hd.hy; E.guides.push({ y: best.v, a: 0, b: S.doc.w }); }
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
    const thr = 6 / E.ppm();
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
    if (bx) { const o = bx.b || { y: 0, h: S.doc.h }; E.guides.push({ x: bx.v, a: Math.min(o.y, nb.y), b: Math.max(o.y + o.h, nb.y + nb.h) }); }
    if (by) { const o = by.b || { x: 0, w: S.doc.w }; E.guides.push({ y: by.v, a: Math.min(o.x, nb.x), b: Math.max(o.x + o.w, nb.x + nb.w) }); }
    return [dx, dy];
  }

  Object.assign(E, { toMm, hitEl, onDown, onMove, onUp });
})(SD._editor = SD._editor || {});
