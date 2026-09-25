// Мини-редактор в духе Figma. Эта часть: состояние, масштаб, отрисовка листа и рамок выделения.
// Общее состояние редактора лежит в SD._editor (E).

(function (E) {
  const u = SD.u, A = SD.app, S = SD.app.S;

  const PXMM = 96 / 25.4;
  const PAD = 40; // запас overlay вокруг листа, чтобы ручки не обрезались
  let ctx, overlay;
  E.stage = undefined; E.paper = undefined; E.canvas = undefined;
  E.zoom = 1; E.fitMode = true; E.tool = 'move';
  E.drag = null; E.hover = null; E.guides = []; E.marquee = null; E.editing = null;
  let raf = 0;
  E.clipboard = null;

  const ppm = () => E.zoom * PXMM;

  function init() {
    E.stage = document.getElementById('stage');
    E.paper = document.getElementById('paper');
    E.canvas = document.getElementById('canvas');
    ctx = E.canvas.getContext('2d');
    overlay = document.getElementById('overlay');

    E.stage.addEventListener('pointerdown', E.onDown);
    window.addEventListener('pointermove', E.onMove);
    window.addEventListener('pointerup', E.onUp);
    E.stage.addEventListener('dblclick', E.onDbl);
    E.stage.addEventListener('wheel', E.onWheel, { passive: false });
    window.addEventListener('keydown', E.onKey);
    window.addEventListener('resize', () => { if (E.fitMode) fit(); });
    document.addEventListener('paste', E.onPaste);
    E.stage.addEventListener('dragover', e => e.preventDefault());
    E.stage.addEventListener('drop', E.onDrop);

    document.querySelectorAll('#toolbar [data-tool]').forEach(b => b.addEventListener('click', () => E.setTool(b.dataset.tool)));
    document.getElementById('undoBtn').addEventListener('click', () => A.undo());
    document.getElementById('redoBtn').addEventListener('click', () => A.redo());
    document.getElementById('zoomIn').addEventListener('click', () => setZoom(E.zoom * 1.25));
    document.getElementById('zoomOut').addEventListener('click', () => setZoom(E.zoom / 1.25));
    document.getElementById('zoomFit').addEventListener('click', fit);
    document.getElementById('imageInput').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = '';
      if (f) E.addImage(await u.readFile(f));
    });

    SD.render.onAsset = () => { render(); SD.views && SD.views.refreshIfVisible(); };
  }

  // ---------- Масштаб ----------
  function fit() {
    if (!S.doc) return;
    const r = E.stage.getBoundingClientRect();
    const zw = (r.width - 60) / (S.doc.w * PXMM), zh = (r.height - 150) / (S.doc.h * PXMM);
    E.zoom = u.clamp(Math.min(zw, zh), 0.1, 8);
    E.fitMode = true;
    layout();
  }
  function setZoom(z, anchor) {
    const old = E.zoom;
    E.zoom = u.clamp(z, 0.1, 8); E.fitMode = false;
    const before = anchor ? E.toMm(anchor) : null;
    layout();
    if (anchor && before) {
      const r = E.canvas.getBoundingClientRect();
      E.stage.scrollLeft += (r.left + before[0] * ppm()) - anchor.clientX;
      E.stage.scrollTop += (r.top + before[1] * ppm()) - anchor.clientY;
    }
    return old;
  }
  function layout() {
    if (!S.doc) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = S.doc.w * ppm(), ch = S.doc.h * ppm();
    E.canvas.style.width = cw + 'px'; E.canvas.style.height = ch + 'px';
    E.canvas.width = Math.round(cw * dpr); E.canvas.height = Math.round(ch * dpr);
    E.paper.style.width = cw + 'px'; E.paper.style.height = ch + 'px';
    overlay.setAttribute('width', cw + PAD * 2); overlay.setAttribute('height', ch + PAD * 2);
    document.getElementById('zoomVal').textContent = Math.round(E.zoom * 100) + '%';
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
    ctx.clearRect(0, 0, E.canvas.width, E.canvas.height);
    SD.render.drawPage(ctx, S.doc, A.page(), ppm() * dpr, { hideId: E.editing ? E.editing.id : null });
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
    if (E.hover && !sel.includes(E.hover) && !E.drag) h += svgPoly(u.corners(E.hover), `fill="none" stroke="${blue}" stroke-width="1.5"`);
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
    if (sel.length === 1 && !E.editing) {
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
    for (const g of E.guides) {
      if (g.x != null) h += `<line x1="${sx(g.x)}" y1="${sx(g.a)}" x2="${sx(g.x)}" y2="${sx(g.b)}" stroke="#F24822" stroke-width="1"/>`;
      else h += `<line x1="${sx(g.a)}" y1="${sx(g.y)}" x2="${sx(g.b)}" y2="${sx(g.y)}" stroke="#F24822" stroke-width="1"/>`;
    }
    if (E.marquee) {
      const x = Math.min(E.marquee.x0, E.marquee.x1), y = Math.min(E.marquee.y0, E.marquee.y1);
      h += `<rect x="${sx(x)}" y="${sx(y)}" width="${Math.abs(E.marquee.x1 - E.marquee.x0) * ppm()}" height="${Math.abs(E.marquee.y1 - E.marquee.y0) * ppm()}" fill="rgba(13,153,255,.08)" stroke="${blue}" stroke-width="1"/>`;
    }
    if (E.drag && E.drag.kind === 'create' && E.drag.box) {
      const b = E.drag.box;
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

  Object.assign(E, { ppm, init, fit, setZoom, layout, render, drawOverlay, handles });
})(SD._editor = SD._editor || {});
