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
  function prepText(el) { return el.upper ? String(el.text || '').toUpperCase() : String(el.text || ''); }

  // Разбивка текста на строки по ширине блока.
  function layoutText(el) {
    mctx.font = fontOf(el, TX);
    if ('letterSpacing' in mctx) mctx.letterSpacing = ((el.ls || 0) * el.size * PT * TX) + 'px';
    const maxW = Math.max(1, el.w) * TX;
    const lines = [];
    for (const para of prepText(el).split('\n')) {
      const words = para.split(/(\s+)/);
      let cur = '';
      for (const part of words) {
        const test = cur + part;
        if (mctx.measureText(test).width <= maxW || !cur.trim()) {
          if (!cur.trim() && mctx.measureText(part).width > maxW && part.trim()) {
            // слово длиннее строки — рвём по буквам
            let chunk = cur;
            for (const ch of part) {
              if (mctx.measureText(chunk + ch).width > maxW && chunk) { lines.push(chunk); chunk = ch; } else chunk += ch;
            }
            cur = chunk;
          } else cur = test;
        } else { lines.push(cur.replace(/\s+$/, '')); cur = part.replace(/^\s+/, ''); }
      }
      lines.push(cur.replace(/\s+$/, ''));
    }
    const lineH = el.size * PT * (el.lh || 1.2);
    return { lines, lineH, height: Math.max(lineH, lines.length * lineH), widths: lines.map(l => mctx.measureText(l).width / TX) };
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
  function fillStroke(ctx, el, w, h) {
    if (el.fill && el.fill !== 'none') { ctx.fillStyle = paint(ctx, el, el.fill, w, h); ctx.fill(); }
    if (el.stroke && el.strokeW > 0) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW; ctx.stroke(); }
  }

  function drawEl(ctx, el) {
    const w = el.w, h = el.h;
    ctx.save();
    ctx.translate(el.x + w / 2, el.y + h / 2);
    if (el.rot) ctx.rotate(el.rot * Math.PI / 180);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = el.opacity == null ? 1 : el.opacity;

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
        ctx.scale(1 / TX, 1 / TX);
        ctx.font = fontOf(el, TX);
        if ('letterSpacing' in ctx) ctx.letterSpacing = ((el.ls || 0) * el.size * PT * TX) + 'px';
        ctx.fillStyle = paint(ctx, el, el.fill || '#000', w * TX, el.h * TX);
        ctx.textBaseline = 'middle';
        ctx.textAlign = el.align === 'center' ? 'center' : el.align === 'right' ? 'right' : 'left';
        const x = el.align === 'center' ? w / 2 : el.align === 'right' ? w : 0;
        L.lines.forEach((line, i) => ctx.fillText(line, x * TX, (i + 0.54) * L.lineH * TX));
        break;
      }
    }
    ctx.restore();
  }

  // Для печати с вылетами: элементы, касающиеся края листа, вытягиваем за край.
  function bleedCopy(el, W, H, b) {
    if (el.rot || el.type === 'text' || el.type === 'qr' || el.type === 'line') return el;
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
    ctx.fillStyle = page.bg || '#fff';
    ctx.fillRect(-b, -b, doc.w + 2 * b, doc.h + 2 * b);
    for (const el of page.elements) {
      if (el.visible === false || el.id === opts.hideId) continue;
      drawEl(ctx, b ? bleedCopy(el, doc.w, doc.h, b) : el);
    }
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

  return { drawPage, drawEl, pageCanvas, layoutText, textWidth, fitHeight, fontsReady, assetsReady, preloadAll, getImg, rrect, onAsset: null };
})();
