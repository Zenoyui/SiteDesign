// Отрисовка страницы на canvas. Один и тот же код рисует редактор,
// миниатюры и файлы для скачивания, поэтому результат везде одинаковый.
// Все координаты — в миллиметрах, размер шрифта — в пунктах.

SD.render = (function () {
  const PT = SD.PT;
  const TX = 10; // текст рисуем в 10× масштабе, чтобы мелкие кегли не дрожали
  const imgCache = {};
  const qrCache = {};
  let qrLoading = null;
  const mctx = document.createElement('canvas').getContext('2d');

  function assetReady() { if (SD.render.onAsset) SD.render.onAsset(); }

  function getImg(src) {
    if (!src) return null;
    let im = imgCache[src];
    if (!im) { im = new Image(); im.onload = assetReady; im.src = src; imgCache[src] = im; }
    return im.complete && im.naturalWidth ? im : null;
  }
  function imagesReady(doc) {
    const list = [];
    for (const p of doc.pages) for (const el of p.elements) if (el.type === 'image' && el.src) {
      getImg(el.src);
      const im = imgCache[el.src];
      if (!(im.complete && im.naturalWidth)) list.push(new Promise(ok => { im.addEventListener('load', ok); im.addEventListener('error', ok); }));
    }
    return Promise.all(list);
  }

  function loadQrLib() {
    if (window.qrcode) return Promise.resolve();
    if (!qrLoading) qrLoading = SD.u.loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js').then(assetReady).catch(() => { qrLoading = null; });
    return qrLoading;
  }
  function qrMatrix(data) {
    data = data || ' ';
    if (qrCache[data]) return qrCache[data];
    if (!window.qrcode) { loadQrLib(); return null; }
    try {
      const q = window.qrcode(0, 'M');
      q.addData(unescape(encodeURIComponent(data)));
      q.make();
      const n = q.getModuleCount(), m = [];
      for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); m.push(row); }
      return (qrCache[data] = m);
    } catch (e) { return null; }
  }

  function fontOf(el, k) {
    return `${el.italic ? 'italic ' : ''}${el.weight || 400} ${el.size * PT * k}px "${el.font}", "Tinos", sans-serif`;
  }
  // Типографика: неразрывные пробелы там, где перенос недопустим по правилам
  const NB = '\u00A0';
  function typo(t) {
    t = t.replace(/ +([—–])/g, NB + '$1');                                        // тире не начинает строку
    for (let i = 0; i < 2; i++) t = t.replace(/(^|[\s\u00A0(«"„])([А-Яа-яЁёA-Za-z]{1,2}) +/g, '$1$2' + NB); // предлоги и союзы держатся за следующее слово
    t = t.replace(/(\d) +(?=[\d₽%$€А-Яа-яЁёA-Za-z])/g, '$1' + NB);                 // число + единица, группы цифр
    return t;
  }
  function prepText(el) {
    const raw = String(el.text || '') + (String(el.text || '').trim() ? (el.suffix || '') : '');
    const t = el.upper ? raw.toUpperCase() : raw;
    return el.typo === false ? t : typo(t);
  }

  // Разбивка текста на строки по ширине блока.
  function layoutText(el) {
    mctx.font = fontOf(el, TX);
    if ('letterSpacing' in mctx) mctx.letterSpacing = ((el.ls || 0) * el.size * PT * TX) + 'px';
    const bg = el.bg && el.bg.fill ? el.bg : null;
    const padX = bg ? (bg.padX || 0) : 0, padY = bg ? (bg.padY || 0) : 0;
    const maxW = Math.max(1, el.w - padX * 2) * TX;
    const W = t => mctx.measureText(t).width;
    const lines = [], starts = [];
    let broken = false, relaxed = false;
    for (const para of prepText(el).split('\n')) {
      starts[lines.length] = true; // эта строка начинает абзац (после ручного перевода строки)
      const queue = para.split(/( +)/);
      let cur = '';
      while (queue.length) {
        const tk = queue.shift();
        if (!tk) continue;
        if (/^ +$/.test(tk)) { if (cur) cur += tk; continue; }
        if (W(cur + tk) <= maxW) { cur += tk; continue; }
        if (cur.trim()) { lines.push(cur.replace(/ +$/, '')); cur = ''; }
        if (W(tk) <= maxW) { cur = tk; continue; }
        // связка через неразрывные пробелы не влезает целиком: сначала рвём только в «хороших» местах
        // (не после предлога и не перед тире), и лишь если не помогло — где угодно
        if (tk.includes(NB)) {
          const parts = tk.split(NB);
          const good = [];
          let piece = parts[0];
          for (let i = 1; i < parts.length; i++) {
            const prev = parts[i - 1], next = parts[i];
            const bad = /^[А-Яа-яЁёA-Za-z]{1,2}$/.test(prev) || /^[—–₽%]/.test(next) || (/\d$/.test(prev) && /^[\d₽%]/.test(next));
            if (bad) piece += NB + next; else { good.push(piece); piece = next; }
          }
          good.push(piece);
          if (good.length > 1 && good.every(g => W(g) <= maxW)) queue.unshift(...good.flatMap((w, i) => i ? [' ', w] : [w]));
          else { relaxed = true; queue.unshift(...parts.flatMap((w, i) => i ? [' ', w] : [w])); }
          continue;
        }
        // слово длиннее строки — рвём с дефисом
        broken = true;
        let chunk = '';
        for (const ch of tk) {
          if (W(chunk + ch + '-') > maxW && chunk) { lines.push(chunk + '-'); chunk = ch; } else chunk += ch;
        }
        cur = chunk;
      }
      lines.push(cur.replace(/ +$/, ''));
    }
    const lineH = el.size * PT * (el.lh || 1.2);
    return { lines, starts, lineH, padX, padY, broken, relaxed, height: Math.max(lineH, lines.length * lineH) + padY * 2, widths: lines.map(l => W(l) / TX) };
  }
  function textWidth(el) {
    mctx.font = fontOf(el, TX);
    if ('letterSpacing' in mctx) mctx.letterSpacing = ((el.ls || 0) * el.size * PT * TX) + 'px';
    return Math.max(...prepText(el).split('\n').map(l => mctx.measureText(l).width)) / TX;
  }
  function fitHeight(el) {
    if (el.type === 'text' && el.autoH !== false) el.h = SD.u.round(layoutText(el).height, 2);
  }

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

  let curScale = 1;
  function rgba(hex, a) { const c = SD.u.hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : a})`; }
  function setShadow(ctx, el) {
    const s = el.shadow;
    if (!s) return;
    ctx.shadowColor = rgba(s.color || '#000000', s.alpha == null ? 0.25 : s.alpha);
    ctx.shadowBlur = (s.blur || 0) * curScale;
    ctx.shadowOffsetX = (s.x || 0) * curScale;
    ctx.shadowOffsetY = (s.y || 0) * curScale;
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
    const im = getImg(el.src);
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

  function drawEl(ctx, el) {
    const w = el.w, h = el.h;
    ctx.save();
    ctx.translate(el.x + w / 2, el.y + h / 2);
    if (el.rot) ctx.rotate(el.rot * Math.PI / 180);
    if (el.flipX) ctx.scale(-1, 1);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = el.opacity == null ? 1 : el.opacity;
    if (el.type !== 'text' && el.type !== 'image' && el.type !== 'phone') setShadow(ctx, el);

    switch (el.type) {
      case 'rect':
        rrect(ctx, 0, 0, w, h, el.radius); fillStroke(ctx, el, w, h); break;
      case 'ellipse':
        ctx.beginPath(); ctx.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2); fillStroke(ctx, el, w, h); break;
      case 'line':
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.lineCap = 'round'; ctx.strokeStyle = el.stroke || el.fill || '#000'; ctx.lineWidth = el.strokeW || 0.5; ctx.stroke(); break;
      case 'star': {
        const n = Math.max(3, el.points || 5), inner = el.inner == null ? 0.5 : el.inner;
        ctx.beginPath();
        for (let i = 0; i < n * 2; i++) {
          const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? inner : 1;
          const px = w / 2 + Math.cos(a) * w / 2 * r, py = h / 2 + Math.sin(a) * h / 2 * r;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath(); fillStroke(ctx, el, w, h); break;
      }
      case 'wave': {
        const amp = (el.amp == null ? 0.3 : el.amp) * h, n = el.waves || 2, ph = (el.phase || 0) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(0, h);
        for (let i = 0; i <= 80; i++) { const t = i / 80; ctx.lineTo(t * w, amp / 2 + Math.sin(t * n * Math.PI * 2 + ph) * amp / 2); }
        ctx.lineTo(w, h); ctx.closePath(); fillStroke(ctx, el, w, h); break;
      }
      case 'image': {
        const im = getImg(el.src);
        rrect(ctx, 0, 0, w, h, el.radius);
        if (el.shadow) { setShadow(ctx, el); ctx.fillStyle = '#FFFFFF'; ctx.fill(); noShadow(ctx); }
        if (im) {
          ctx.save(); ctx.clip();
          const ir = im.naturalWidth / im.naturalHeight, br = w / h;
          let dw = w, dh = h;
          if ((el.fit || 'cover') === 'cover' ? ir > br : ir < br) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
          ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
          ctx.restore();
          if (el.stroke && el.strokeW > 0) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW; ctx.stroke(); }
        } else {
          ctx.fillStyle = '#E6E6E6'; ctx.fill();
          ctx.strokeStyle = '#9A9A9A'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
        }
        break;
      }
      case 'qr': {
        if (el.fill2) { ctx.fillStyle = el.fill2; rrect(ctx, 0, 0, w, h, el.radius); ctx.fill(); }
        const m = qrMatrix(el.data);
        const pad = Math.min(w, h) * 0.06;
        ctx.fillStyle = el.fill || '#000';
        if (m) {
          const n = m.length, cw = (w - pad * 2) / n, ch = (h - pad * 2) / n;
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) ctx.fillRect(pad + c * cw - 0.01, pad + r * ch - 0.01, cw + 0.02, ch + 0.02);
        } else {
          ctx.globalAlpha *= 0.4; ctx.fillRect(pad, pad, w - pad * 2, h - pad * 2);
        }
        break;
      }
      case 'text': {
        const L = layoutText(el);
        if (el.autoH !== false) el.h = SD.u.round(L.height, 2);
        const mw = Math.max(0, ...L.widths);
        if (L.padX || L.padY) {
          // плашка под текстом, обтягивает строки
          const pw = mw + L.padX * 2;
          const px = el.align === 'center' ? (w - pw) / 2 : el.align === 'right' ? w - pw : 0;
          setShadow(ctx, el);
          rrect(ctx, px, 0, pw, el.h, el.bg.radius == null ? el.h / 2 : el.bg.radius);
          ctx.fillStyle = el.bg.fill; ctx.fill();
          noShadow(ctx);
        } else setShadow(ctx, el);
        ctx.scale(1 / TX, 1 / TX);
        ctx.font = fontOf(el, TX);
        if ('letterSpacing' in ctx) ctx.letterSpacing = ((el.ls || 0) * el.size * PT * TX) + 'px';
        ctx.fillStyle = paint(ctx, el, el.fill || '#000', w * TX, el.h * TX);
        ctx.textBaseline = 'middle';
        ctx.textAlign = el.align === 'center' ? 'center' : el.align === 'right' ? 'right' : 'left';
        const x = el.align === 'center' ? w / 2 : el.align === 'right' ? w - L.padX : L.padX;
        const yy = i => (L.padY + (i + 0.54) * L.lineH) * TX;
        if (el.stroke && el.strokeW > 0) {
          ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW * 2 * TX; ctx.lineJoin = 'round';
          L.lines.forEach((line, i) => ctx.strokeText(line, x * TX, yy(i)));
          noShadow(ctx);
        }
        L.lines.forEach((line, i) => ctx.fillText(line, x * TX, yy(i)));
        if (el.strike) {
          noShadow(ctx);
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = el.size * PT * 0.09 * TX;
          L.lines.forEach((line, i) => {
            const lw = L.widths[i], sx = el.align === 'center' ? w / 2 - lw / 2 : el.align === 'right' ? w - L.padX - lw : L.padX;
            ctx.beginPath(); ctx.moveTo((sx - 0.3) * TX, yy(i)); ctx.lineTo((sx + lw + 0.3) * TX, yy(i)); ctx.stroke();
          });
        }
        break;
      }
      case 'icon':
        SD.drawIcon(ctx, el.icon, el.iconStyle || 'line', w, h, el.fill || '#000', el.fill2);
        break;
      case 'pattern':
        noShadow(ctx); drawPattern(ctx, el, w, h); break;
      case 'phone':
        drawPhone(ctx, el, w, h); break;
    }
    ctx.restore();
  }

  // Для печати с вылетами: элементы, касающиеся края листа, вытягиваем за край.
  function bleedCopy(el, W, H, b) {
    if (el.rot || ['text', 'qr', 'line', 'icon', 'phone'].includes(el.type)) return el;
    const e = Object.assign({}, el), t = 0.6;
    if (e.x <= t) { e.w += e.x + b; e.x = -b; }
    if (e.y <= t) { e.h += e.y + b; e.y = -b; }
    if (e.x + e.w >= W - t) e.w = W + b - e.x;
    if (e.y + e.h >= H - t) e.h = H + b - e.y;
    return e;
  }

  // Рисует страницу. ctx должен быть в пикселях; scale — пикселей на мм.
  function drawPage(ctx, doc, page, scale, opts = {}) {
    const ox = opts.ox || 0, oy = opts.oy || 0, b = opts.bleed || 0;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, ox * scale, oy * scale);
    ctx.beginPath();
    ctx.rect(-b, -b, doc.w + 2 * b, doc.h + 2 * b);
    ctx.clip();
    curScale = scale;
    ctx.fillStyle = page.bg || '#fff';
    ctx.fillRect(-b, -b, doc.w + 2 * b, doc.h + 2 * b);
    for (const el of page.elements) {
      if (el.visible === false || el.id === opts.hideId) continue;
      drawEl(ctx, b ? bleedCopy(el, doc.w, doc.h, b) : el);
    }
    if (page.fx && page.fx.grain) drawGrain(ctx, doc.w, doc.h, page.fx.grain, b);
    ctx.restore();
  }

  function pageCanvas(doc, page, pxPerMm, opts = {}) {
    const b = opts.bleed || 0, slug = opts.marks ? 8 : 0;
    const c = document.createElement('canvas');
    c.width = Math.round((doc.w + 2 * (b + slug)) * pxPerMm);
    c.height = Math.round((doc.h + 2 * (b + slug)) * pxPerMm);
    const ctx = c.getContext('2d');
    if (slug) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
    drawPage(ctx, doc, page, pxPerMm, { ox: b + slug, oy: b + slug, bleed: b });
    if (opts.marks) drawCropMarks(ctx, doc, pxPerMm, b, slug);
    return c;
  }
  function drawCropMarks(ctx, doc, s, b, slug) {
    ctx.save(); ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 0.15;
    const x0 = slug + b, y0 = slug + b, x1 = x0 + doc.w, y1 = y0 + doc.h, L = slug - 2;
    ctx.beginPath();
    for (const x of [x0, x1]) { ctx.moveTo(x, 0); ctx.lineTo(x, L); ctx.moveTo(x, y1 + b + 2 + (slug - L)); ctx.lineTo(x, y1 + b + slug); }
    for (const y of [y0, y1]) { ctx.moveTo(0, y); ctx.lineTo(L, y); ctx.moveTo(x1 + b + 2 + (slug - L), y); ctx.lineTo(x1 + b + slug, y); }
    ctx.stroke(); ctx.restore();
  }

  // Шрифты, которые реально использует документ, подгружаем заранее.
  function fontsReady(doc) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const set = new Set();
    for (const p of doc.pages) for (const el of p.elements) if (el.type === 'text') set.add(`${el.italic ? 'italic ' : ''}${el.weight || 400} 20px "${el.font}"`);
    return Promise.all([...set].map(f => document.fonts.load(f, 'АаЯяZz0₽—№').catch(() => null)));
  }
  // Все шрифты каталога (для миниатюр других стилей)
  function preloadAll() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const list = [];
    for (const f of SD.FONTS) for (const w of SD.FONT_WEIGHTS[f] || [400]) list.push(document.fonts.load(`${w} 20px "${f}"`, 'АаЯяZz0₽—№').catch(() => null));
    return Promise.all(list);
  }
  function assetsReady(doc) {
    const needQr = doc.pages.some(p => p.elements.some(e => e.type === 'qr'));
    return Promise.all([fontsReady(doc), imagesReady(doc), needQr ? loadQrLib() : null]);
  }

  return { drawPage, drawEl, pageCanvas, layoutText, textWidth, typo, fitHeight, fontsReady, assetsReady, preloadAll, getImg, rrect, onAsset: null };
})();
