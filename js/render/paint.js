// Отрисовка: заливки (градиенты OKLCH, mesh, аврора), тени, узоры, телефон, зерно.

(function (RD) {
  function paint(ctx, el, color, w, h) {
    const G = el.grad;
    if (G && G.colors && G.colors.length > 1 && (G.type === 'linear' || G.type === 'radial')) {
      const stops = SD.color.ramp(G.colors, 12);
      let g;
      if (G.type === 'radial') {
        const cx = (G.cx == null ? 0.3 : G.cx) * w, cy = (G.cy == null ? 0.25 : G.cy) * h;
        g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)));
      } else {
        const a = (G.angle || 0) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
        const L = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
        g = ctx.createLinearGradient(w / 2 - dx * L, h / 2 - dy * L, w / 2 + dx * L, h / 2 + dy * L);
      }
      for (const st of stops) g.addColorStop(st.t, st.c);
      return g;
    }
    if (el.fill2) {
      const a = (el.gradAngle || 0) * Math.PI / 180;
      const dx = Math.cos(a), dy = Math.sin(a);
      const L = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
      const g = ctx.createLinearGradient(w / 2 - dx * L, h / 2 - dy * L, w / 2 + dx * L, h / 2 + dy * L);
      g.addColorStop(0, color); g.addColorStop(1, el.fill2);
      return g;
    }
    return color;
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // Многоточечный (mesh) градиент: база + мягкие цветные пятна, сглаженные по smoothstep
  function drawMesh(ctx, el, w, h) {
    const G = el.grad;
    for (const p of G.points || []) {
      const cx = p.x * w, cy = p.y * h, r = p.r * Math.max(w, h);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      for (let i = 0; i <= 8; i++) { const t = i / 8, a = (1 - (3 * t * t - 2 * t * t * t)) * (p.a == null ? 1 : p.a); g.addColorStop(t, rgba(p.c, a)); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }
  function fillStroke(ctx, el, w, h) {
    const G = el.grad;
    if (G && el.fill && (G.type === 'mesh' || G.type === 'aurora')) {
      ctx.save();
      ctx.fillStyle = el.fill; ctx.fill();
      noShadow(ctx);
      ctx.clip();
      drawMesh(ctx, el, w, h);
      if (G.grain) drawGrain(ctx, w, h, G.grain, 0);
      ctx.restore();
      if (el.stroke && el.strokeW > 0) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW; ctx.stroke(); }
      return;
    }
    if (G && G.grain && el.fill) {
      ctx.save(); ctx.fillStyle = paint(ctx, el, el.fill, w, h); ctx.fill(); noShadow(ctx); ctx.clip(); drawGrain(ctx, w, h, G.grain, 0); ctx.restore();
      if (el.stroke && el.strokeW > 0) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW; ctx.stroke(); }
      return;
    }
    if (el.fill && el.fill !== 'none') { ctx.fillStyle = paint(ctx, el, el.fill, w, h); ctx.fill(); }
    if (el.stroke && el.strokeW > 0) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW; ctx.stroke(); }
  }

  RD.curScale = 1;
  function rgba(hex, a) { const c = SD.u.hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : a})`; }
  function setShadow(ctx, el) {
    const s = el.shadow;
    if (!s) return;
    ctx.shadowColor = rgba(s.color || '#000000', s.alpha == null ? 0.25 : s.alpha);
    ctx.shadowBlur = (s.blur || 0) * RD.curScale;
    ctx.shadowOffsetX = (s.x || 0) * RD.curScale;
    ctx.shadowOffsetY = (s.y || 0) * RD.curScale;
  }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }

  // Псевдослучайные числа с зерном — узоры одинаковые при каждой отрисовке
  function rnd(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function drawPattern(ctx, el, w, h) {
    const c = Math.max(0.8, el.cell || 6), col = el.fill || '#000', col2 = el.fill2 || col;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    ctx.fillStyle = col; ctx.strokeStyle = col;
    const k = el.kind || 'dots';
    if (k === 'dots') {
      for (let y = c / 2, r = 0; y < h + c; y += c, r++) for (let x = (r % 2 ? c : c / 2); x < w + c; x += c) { ctx.beginPath(); ctx.arc(x, y, c * 0.14, 0, Math.PI * 2); ctx.fill(); }
    } else if (k === 'grid') {
      ctx.lineWidth = c * 0.05; ctx.beginPath();
      for (let x = 0; x <= w; x += c) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += c) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
    } else if (k === 'checker') {
      for (let y = 0, r = 0; y < h; y += c, r++) for (let x = (r % 2) * c; x < w; x += c * 2) ctx.fillRect(x, y, c, c);
    } else if (k === 'stripes') {
      ctx.lineWidth = c * 0.32; ctx.beginPath();
      for (let x = -h; x < w + h; x += c) { ctx.moveTo(x, h); ctx.lineTo(x + h, 0); }
      ctx.stroke();
    } else if (k === 'confetti') {
      const R = rnd(el.seed || 7), n = Math.min(900, Math.round(w * h / (c * c) * 0.5));
      for (let i = 0; i < n; i++) {
        ctx.save(); ctx.translate(R() * w, R() * h); ctx.rotate(R() * Math.PI);
        ctx.fillStyle = i % 2 ? col : col2;
        if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, c * 0.12, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-c * 0.18, -c * 0.06, c * 0.36, c * 0.12);
        ctx.restore();
      }
    } else if (k === 'dotring') {
      // круг из точек, как на точечно-матричном экране; одна точка — акцентная
      const R = Math.min(w, h) / 2, cx = w / 2, cy = h / 2;
      for (let y = c / 2; y < h; y += c) for (let x = c / 2; x < w; x += c) {
        const r = Math.hypot(x - cx, y - cy);
        if (r < R * 0.98 && r > R * 0.55) { ctx.beginPath(); ctx.arc(x, y, c * 0.3, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = col2; ctx.beginPath(); ctx.arc(cx + R * 0.35, cy - R * 0.35, c * 0.9, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'halftone') {
      for (let y = c / 2; y < h + c; y += c) for (let x = c / 2; x < w + c; x += c) {
        const t = SD.u.clamp((x / w + y / h) / 2, 0, 1), r = c * 0.48 * t;
        if (r > 0.05) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  function drawPhone(ctx, el, w, h) {
    const p = w * 0.045;
    setShadow(ctx, el);
    rrect(ctx, 0, 0, w, h, w * 0.16); ctx.fillStyle = '#16161B'; ctx.fill();
    noShadow(ctx);
    if (el.stroke && el.strokeW) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW; ctx.stroke(); }
    ctx.save();
    rrect(ctx, p, p, w - 2 * p, h - 2 * p, w * 0.12); ctx.clip();
    ctx.fillStyle = el.fill || '#EEE'; ctx.fillRect(0, 0, w, h);
    const im = RD.getImg(el.src);
    if (im) {
      const ir = im.naturalWidth / im.naturalHeight, sw = w - 2 * p, sh = h - 2 * p;
      let dw = sw, dh = sw / ir; if (dh < sh) { dh = sh; dw = sh * ir; }
      ctx.drawImage(im, p + (sw - dw) / 2, p + (sh - dh) / 2, dw, dh);
    } else {
      const light = SD.u.mix(el.fill || '#EEEEEE', '#FFFFFF', 0.55);
      ctx.strokeStyle = light; ctx.lineWidth = w * 0.012;
      ctx.beginPath();
      for (let x = p; x < w; x += w * 0.14) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = p; y < h; y += w * 0.14) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = w * 0.05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-w * 0.1, h * 0.45); ctx.quadraticCurveTo(w * 0.4, h * 0.3, w * 1.1, h * 0.36); ctx.moveTo(w * 0.3, 0); ctx.lineTo(w * 0.62, h * 0.6); ctx.stroke();
      ctx.fillStyle = el.fill2 || '#000';
      ctx.beginPath(); ctx.arc(w * 0.56, h * 0.33, w * 0.075, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(w * 0.56, h * 0.33, w * 0.028, 0, Math.PI * 2); ctx.fill();
      rrect(ctx, p, h * 0.6, w - 2 * p, h * 0.45, w * 0.09); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.fillStyle = '#E4E4E8';
      rrect(ctx, p + w * 0.08, h * 0.65, w * 0.5, h * 0.025, h * 0.012); ctx.fill();
      rrect(ctx, p + w * 0.08, h * 0.7, w * 0.35, h * 0.02, h * 0.01); ctx.fill();
      rrect(ctx, p + w * 0.08, h * 0.8, w - 2 * p - w * 0.16, h * 0.075, h * 0.0375); ctx.fillStyle = el.fill2 || '#000'; ctx.fill();
    }
    rrect(ctx, w * 0.36, p * 1.5, w * 0.28, w * 0.07, w * 0.035); ctx.fillStyle = '#16161B'; ctx.fill();
    ctx.restore();
  }

  let grainTile = null;
  function drawGrain(ctx, W, H, amount, b) {
    if (!grainTile) {
      grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 128;
      const g = grainTile.getContext('2d'), d = g.createImageData(128, 128), R = rnd(42);
      for (let i = 0; i < d.data.length; i += 4) { const v = R() < 0.5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.round(R() * 160); }
      g.putImageData(d, 0, 0);
    }
    const pat = ctx.createPattern(grainTile, 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(0.09));
    ctx.save();
    ctx.globalAlpha = SD.u.clamp(amount, 0, 1);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pat; ctx.fillRect(-b, -b, W + 2 * b, H + 2 * b);
    ctx.restore();
  }

  Object.assign(RD, { paint, rrect, fillStroke, setShadow, noShadow, drawPattern, drawPhone, drawGrain });
})(SD._render = SD._render || {});
