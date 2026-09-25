// Отрисовка страницы на canvas. Один и тот же код рисует редактор,
// миниатюры и файлы для скачивания, поэтому результат везде одинаковый.
// Все координаты — в миллиметрах, размер шрифта — в пунктах.

SD.render = (function (RD) {
  const PT = SD.PT;

  function drawEl(ctx, el) {
    const w = el.w, h = el.h;
    ctx.save();
    ctx.translate(el.x + w / 2, el.y + h / 2);
    if (el.rot) ctx.rotate(el.rot * Math.PI / 180);
    if (el.flipX) ctx.scale(-1, 1);
    ctx.translate(-w / 2, -h / 2);
    ctx.globalAlpha = el.opacity == null ? 1 : el.opacity;
    if (el.type !== 'text' && el.type !== 'image' && el.type !== 'phone') RD.setShadow(ctx, el);

    switch (el.type) {
      case 'rect':
        RD.rrect(ctx, 0, 0, w, h, el.radius); RD.fillStroke(ctx, el, w, h); break;
      case 'ellipse':
        ctx.beginPath(); ctx.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2); RD.fillStroke(ctx, el, w, h); break;
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
        ctx.closePath(); RD.fillStroke(ctx, el, w, h); break;
      }
      case 'wave': {
        const amp = (el.amp == null ? 0.3 : el.amp) * h, n = el.waves || 2, ph = (el.phase || 0) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(0, h);
        for (let i = 0; i <= 80; i++) { const t = i / 80; ctx.lineTo(t * w, amp / 2 + Math.sin(t * n * Math.PI * 2 + ph) * amp / 2); }
        ctx.lineTo(w, h); ctx.closePath(); RD.fillStroke(ctx, el, w, h); break;
      }
      case 'image': {
        const im = RD.getImg(el.src);
        RD.rrect(ctx, 0, 0, w, h, el.radius);
        if (el.shadow) { RD.setShadow(ctx, el); ctx.fillStyle = '#FFFFFF'; ctx.fill(); RD.noShadow(ctx); }
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
        if (el.fill2) { ctx.fillStyle = el.fill2; RD.rrect(ctx, 0, 0, w, h, el.radius); ctx.fill(); }
        const m = RD.qrMatrix(el.data);
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
        const L = RD.layoutText(el);
        if (el.autoH !== false) el.h = SD.u.round(L.height, 2);
        const mw = Math.max(0, ...L.widths);
        if (L.padX || L.padY) {
          // плашка под текстом, обтягивает строки
          const pw = mw + L.padX * 2;
          const px = el.align === 'center' ? (w - pw) / 2 : el.align === 'right' ? w - pw : 0;
          RD.setShadow(ctx, el);
          RD.rrect(ctx, px, 0, pw, el.h, el.bg.radius == null ? el.h / 2 : el.bg.radius);
          ctx.fillStyle = el.bg.fill; ctx.fill();
          RD.noShadow(ctx);
        } else RD.setShadow(ctx, el);
        ctx.scale(1 / RD.TX, 1 / RD.TX);
        ctx.font = RD.fontOf(el, RD.TX);
        if ('letterSpacing' in ctx) ctx.letterSpacing = ((el.ls || 0) * el.size * PT * RD.TX) + 'px';
        ctx.fillStyle = RD.paint(ctx, el, el.fill || '#000', w * RD.TX, el.h * RD.TX);
        ctx.textBaseline = 'middle';
        ctx.textAlign = el.align === 'center' ? 'center' : el.align === 'right' ? 'right' : 'left';
        const x = el.align === 'center' ? w / 2 : el.align === 'right' ? w - L.padX : L.padX;
        const yy = i => (L.padY + (i + 0.54) * L.lineH) * RD.TX;
        if (el.stroke && el.strokeW > 0) {
          ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW * 2 * RD.TX; ctx.lineJoin = 'round';
          L.lines.forEach((line, i) => ctx.strokeText(line, x * RD.TX, yy(i)));
          RD.noShadow(ctx);
        }
        L.lines.forEach((line, i) => ctx.fillText(line, x * RD.TX, yy(i)));
        if (el.strike) {
          RD.noShadow(ctx);
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = el.size * PT * 0.09 * RD.TX;
          L.lines.forEach((line, i) => {
            const lw = L.widths[i], sx = el.align === 'center' ? w / 2 - lw / 2 : el.align === 'right' ? w - L.padX - lw : L.padX;
            ctx.beginPath(); ctx.moveTo((sx - 0.3) * RD.TX, yy(i)); ctx.lineTo((sx + lw + 0.3) * RD.TX, yy(i)); ctx.stroke();
          });
        }
        break;
      }
      case 'icon':
        SD.drawIcon(ctx, el.icon, el.iconStyle || 'line', w, h, el.fill || '#000', el.fill2);
        break;
      case 'pattern':
        RD.noShadow(ctx); RD.drawPattern(ctx, el, w, h); break;
      case 'phone':
        RD.drawPhone(ctx, el, w, h); break;
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
    RD.curScale = scale;
    ctx.fillStyle = page.bg || '#fff';
    ctx.fillRect(-b, -b, doc.w + 2 * b, doc.h + 2 * b);
    for (const el of page.elements) {
      if (el.visible === false || el.id === opts.hideId) continue;
      drawEl(ctx, b ? bleedCopy(el, doc.w, doc.h, b) : el);
    }
    if (page.fx && page.fx.grain) RD.drawGrain(ctx, doc.w, doc.h, page.fx.grain, b);
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

  return { drawPage, drawEl, pageCanvas, layoutText: RD.layoutText, textWidth: RD.textWidth, typo: RD.typo, fitHeight: RD.fitHeight, fontsReady: RD.fontsReady, assetsReady: RD.assetsReady, preloadAll: RD.preloadAll, getImg: RD.getImg, rrect: RD.rrect, onAsset: null };
})(SD._render);
