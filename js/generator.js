// Генератор макета: из ответов пользователя собирает страницы с элементами.
// Каждый элемент помнит свою «роль» цвета и текста, поэтому потом можно
// менять палитру и тексты, не теряя ручных правок в редакторе.

SD.gen = (function () {
  const PT = SD.PT, u = SD.u;

  // ---------- Варианты сочетания стилей ----------
  function variants(styles) {
    const S = (styles && styles.length ? styles : ['yandex']).filter(s => SD.STYLES[s]);
    const out = [];
    const nm = id => SD.STYLES[id].name;
    for (const s of S) out.push({ key: s, title: nm(s), colorsFrom: s, fontFrom: s, motifs: [SD.STYLES[s].motif], invert: false });
    for (let i = 0; i < S.length; i++) for (let j = 0; j < S.length; j++) if (i !== j && out.length < 12) {
      const a = S[i], b = S[j];
      out.push({ key: a + '+' + b, title: nm(a) + ' × ' + nm(b), colorsFrom: a, accentFrom: b, fontFrom: b, motifs: [SD.STYLES[a].motif, SD.STYLES[b].motif], invert: false });
    }
    if (S.length >= 3) out.push({ key: 'all', title: 'Всё сразу', colorsFrom: S[0], accentFrom: S[1], fontFrom: S[2], motifs: S.slice(0, 3).map(s => SD.STYLES[s].motif), invert: false });
    for (const s of S) if (out.length < 14) out.push({ key: s + '!inv', title: nm(s) + ', тёмный фон', colorsFrom: s, fontFrom: s, motifs: [SD.STYLES[s].motif], invert: true });
    return out;
  }

  function palette(v) {
    const s = SD.STYLES[v.colorsFrom];
    const c = Object.assign({ extra: null }, s.colors);
    if (v.accentFrom && v.accentFrom !== v.colorsFrom) {
      const o = SD.STYLES[v.accentFrom].colors;
      c.accent = u.contrast(o.primary, c.primary) > 1.4 ? o.primary : o.accent;
      if (!c.extra) c.extra = o.accent;
    }
    if (v.invert) {
      const bg = c.primary;
      const cands = [c.accent, c.text, '#FFFFFF'].sort((a, b) => u.contrast(bg, b) - u.contrast(bg, a));
      c.bg = bg;
      c.primary = cands[0];
      c.accent = cands[1];
      c.text = u.readable(bg, ['#FFFFFF', s.colors.text]);
      c.soft = u.mix(bg, u.lum(bg) > 0.4 ? '#000000' : '#FFFFFF', 0.12);
    }
    c.extra = c.extra || c.accent;
    return withDerived(c);
  }
  function withDerived(c) {
    c.onPrimary = u.readable(c.primary, [c.text, c.bg, '#FFFFFF']);
    c.onAccent = u.readable(c.accent, [c.text, c.bg, '#FFFFFF']);
    return c;
  }

  function styleProps(ans, v) {
    const cs = SD.STYLES[v.colorsFrom], fs = SD.STYLES[v.fontFrom || v.colorsFrom];
    const font = ans.font || fs.font;
    return {
      font,
      tw: SD.nearWeight(font, fs.titleWeight),
      bw: SD.nearWeight(font, fs.bodyWeight),
      sw: SD.nearWeight(font, Math.min(fs.titleWeight, 600)),
      upper: fs.upper,
      radiusK: cs.radius * (ans.opts.rounded == null ? 1 : ans.opts.rounded),
      pill: ['go', 'urent', 'bk'].includes(v.colorsFrom),
      ctaRole: v.colorsFrom === 'go' && !v.invert ? 'accent' : 'primary'
    };
  }

  // ---------- Фабрики элементов ----------
  function base(o) {
    return Object.assign({
      id: u.uid(), type: 'rect', name: '', role: null, x: 0, y: 0, w: 10, h: 10, rot: 0,
      fill: '#000000', fillRole: null, fill2: null, fill2Role: null, gradAngle: 45,
      stroke: null, strokeW: 0, radius: 0, opacity: 1, visible: true, locked: false,
      cons: { h: 'scale', v: 'scale' }, pin: null
    }, o);
  }
  function text(o) {
    const el = base(Object.assign({ type: 'text', text: '', font: 'Onest', weight: 400, size: 12, align: 'left', lh: 1.2, ls: 0, upper: false, autoH: true }, o));
    SD.render.fitHeight(el);
    return el;
  }

  // ---------- Сборка документа ----------
  function build(ans) {
    const f = SD.FORMATS[ans.format] || SD.FORMATS.A5;
    let W = f.w, H = f.h;
    if (!f.fixedOrient && (ans.orient === 'landscape') !== (W > H)) { const t = W; W = H; H = t; }
    const vs = variants(ans.styles);
    const v = vs[ans.variant] || vs[0];
    const pal = ans.palette ? withDerived(Object.assign({}, ans.palette)) : palette(v);
    const st = styleProps(ans, v);
    const ctx = { ans, v, pal, st, W, H, T: ans.texts };
    ctx.base = Math.min(W, H * 0.75);
    ctx.m = Math.max(6, u.round(ctx.base * 0.08, 1));

    const n = Math.max(1, ans.pages || 1);
    const pages = [];
    for (let i = 0; i < n; i++) {
      let els;
      if (i === 0) {
        // если текст не влез — уменьшаем кегли и собираем заново
        for (let t = 0, k = 1; t < 6; t++, k *= 0.9) { ctx.fitK = k; ctx.overflow = false; els = front(ctx); if (!ctx.overflow) break; }
        ctx.fitK = 1;
      } else els = (ans.kind === 'slides' && i === n - 1 && n > 2) ? finale(ctx) : backSide(ctx, i);
      pages.push({ id: u.uid(), name: pageName(ans, i, n), bg: pal.bg, bgRole: 'bg', elements: els });
    }
    const doc = { w: W, h: H, format: ans.format, orient: ans.orient, pages, dirty: false };
    applyPalette(doc, pal);
    return doc;
  }
  function pageName(ans, i, n) {
    if (ans.kind === 'slides') return 'Слайд ' + (i + 1);
    if (n === 2) return i ? 'Оборот' : 'Лицевая';
    return 'Страница ' + (i + 1);
  }

  function sizes(ctx) {
    const b = ctx.base * (ctx.fitK || 1), k = ctx.ans.titleScale || 1;
    return { title: b * 0.095 * k / PT, sub: b * 0.046 / PT, body: b * 0.033 / PT, cta: b * 0.036 / PT, small: b * 0.027 / PT, promo: b * 0.07 / PT };
  }

  function mkTitle(ctx, s, extra) {
    return text(Object.assign({ name: 'Заголовок', role: 'title', textKey: 'title', text: ctx.T.title, font: ctx.st.font, weight: ctx.st.tw, size: u.round(s.title, 1), lh: 1.05, upper: ctx.st.upper, fillRole: 'text', w: ctx.W - ctx.m * 2 }, extra));
  }
  function mkSub(ctx, s, extra) {
    return text(Object.assign({ name: 'Подзаголовок', role: 'subtitle', textKey: 'subtitle', text: ctx.T.subtitle, font: ctx.st.font, weight: ctx.st.sw, size: u.round(s.sub, 1), lh: 1.2, fillRole: 'text', w: ctx.W - ctx.m * 2 }, extra));
  }
  function mkBody(ctx, s, extra) {
    return text(Object.assign({ name: 'Основной текст', role: 'body', textKey: 'body', text: ctx.T.body, font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.body, 1), lh: 1.35, fillRole: 'text', opacity: 0.9, w: ctx.W - ctx.m * 2 }, extra));
  }
  function mkSmall(ctx, s, key, extra) {
    return text(Object.assign({ name: 'Контакты', role: 'contacts', textKey: key || 'contacts', text: ctx.T[key || 'contacts'], font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.small, 1), lh: 1.25, fillRole: 'text', opacity: 0.75, w: ctx.W - ctx.m * 2 }, extra));
  }

  // Кнопка-призыв: плашка + текст, привязанный к плашке.
  function mkCta(ctx, s, x, y, colW, align, role) {
    role = role || ctx.st.ctaRole;
    const onRole = role === 'accent' ? 'onAccent' : role === 'text' ? 'bg' : 'onPrimary';
    const t = text({ name: 'Текст кнопки', role: 'ctaText', textKey: 'cta', text: ctx.T.cta, font: ctx.st.font, weight: ctx.st.sw, size: u.round(s.cta, 1), align: 'center', lh: 1.1, fillRole: onRole, w: 400 });
    const tw = Math.min(SD.render.textWidth(t) + 0.6, colW - 6);
    t.w = tw; SD.render.fitHeight(t);
    const padX = t.size * PT * 1.1, padY = t.size * PT * 0.62;
    const bw = tw + padX * 2, bh = t.h + padY * 2;
    const bx = align === 'center' ? x + (colW - bw) / 2 : align === 'right' ? x + colW - bw : x;
    const r = ctx.st.pill ? bh / 2 : Math.min(bh / 2, ctx.st.radiusK * 60);
    const btn = base({ name: 'Кнопка', role: 'cta', x: bx, y, w: bw, h: bh, radius: r, fillRole: role, cons: { h: 'scale', v: 'scale' } });
    t.x = bx + padX; t.y = y + padY; t.cons = { h: 'scale', v: 'scale' };
    t.pin = { id: btn.id, dx: padX, dy: padY };
    t.fitParent = { padX, padY };
    return [btn, t];
  }

  function mkPromo(ctx, s, cx, cy) {
    const d = ctx.base * 0.25;
    const star = base({ type: 'star', name: 'Бейдж', role: 'promo', x: cx - d / 2, y: cy - d / 2, w: d, h: d, points: 14, inner: 0.86, rot: -12, fillRole: 'accent', cons: { h: 'scale', v: 'scale' } });
    const t = text({ name: 'Текст бейджа', role: 'promoText', textKey: 'promo', text: ctx.T.promo, font: ctx.st.font, weight: ctx.st.tw, size: u.round(s.promo * (String(ctx.T.promo).length > 5 ? 0.62 : 1), 1), align: 'center', lh: 1, fillRole: 'onAccent', w: d * 0.8, rot: -12 });
    for (let i = 0; i < 12 && SD.render.textWidth(t) > t.w * 0.98; i++) t.size = u.round(t.size * 0.9, 1);
    SD.render.fitHeight(t);
    t.x = star.x + d * 0.1; t.y = star.y + (d - t.h) / 2;
    t.pin = { id: star.id, dx: t.x - star.x, dy: t.y - star.y };
    return [star, t];
  }

  function mkQr(ctx, s, x, y, q) {
    const qr = base({ type: 'qr', name: 'QR-код', role: 'qr', data: ctx.T.qr || 'https://example.com', x, y, w: q, h: q, fillRole: 'text', cons: { h: 'scale', v: 'scale' } });
    return [qr];
  }

  function mkImage(ctx, z, radius) {
    return base({ type: 'image', name: 'Изображение', role: 'image', src: ctx.ans.opts.image, fit: ctx.ans.opts.imageFit || 'cover', x: z.x, y: z.y, w: z.w, h: z.h, radius: radius || 0, fill: null });
  }

  function stack(items, x, y, w, align, gaps) {
    items.forEach((el, i) => {
      el.x = x; el.y = y; el.w = w; el.align = align;
      SD.render.fitHeight(el);
      y += el.h + (gaps[i] || 0);
    });
    return y;
  }

  // ---------- Мотивы стилей (все — обычные редактируемые элементы) ----------
  function motif(ctx, kind, z, roles) {
    roles = roles || {};
    const main = roles.main || 'primary', second = roles.second || 'accent';
    const out = [];
    if (kind !== 'wave' && (!z || z.w < 4 || z.h < 4)) return out;
    const d0 = z ? Math.min(z.w, z.h) : 0;
    switch (kind) {
      case 'dot': {
        const d = d0 * 0.95;
        out.push(base({ type: 'ellipse', name: 'Круг-акцент', role: 'decor', x: z.x + z.w - d, y: z.y + (z.h - d) / 2, w: d, h: d, fillRole: main }));
        out.push(base({ type: 'ellipse', name: 'Малый круг', role: 'decor', x: z.x + z.w - d * 1.05, y: z.y + (z.h + d) / 2 - d * 0.3, w: d * 0.26, h: d * 0.26, fillRole: second }));
        break;
      }
      case 'block': {
        const r = Math.min(z.w, z.h) * 0.12;
        out.push(base({ name: 'Карточка', role: 'decor', x: z.x, y: z.y, w: z.w, h: z.h, radius: r, fillRole: 'soft' }));
        const d = d0 * 0.42;
        out.push(base({ name: 'Плашка', role: 'decor', x: z.x + z.w * 0.08, y: z.y + z.h - d * 0.55 - z.h * 0.12, w: z.w * 0.84, h: d * 0.55, radius: d * 0.275, fillRole: main }));
        out.push(base({ type: 'ellipse', name: 'Точка', role: 'decor', x: z.x + z.w * 0.08, y: z.y + z.h * 0.14, w: d * 0.5, h: d * 0.5, fillRole: second }));
        break;
      }
      case 'stripe': {
        const hh = u.clamp(z.h * 0.22, 4, ctx.base * 0.12);
        out.push(base({ name: 'Полоса', role: 'decor', x: -6, y: z.y + (z.h - hh) / 2, w: ctx.W + 12, h: hh, rot: -3, fillRole: main, cons: { h: 'left-right', v: 'scale' } }));
        out.push(base({ name: 'Тонкая полоса', role: 'decor', x: -6, y: z.y + (z.h - hh) / 2 + hh * 1.35, w: ctx.W * 0.55, h: hh * 0.28, rot: -3, fillRole: second, cons: { h: 'scale', v: 'scale' } }));
        break;
      }
      case 'blobs': {
        const d = d0 * 1.0;
        out.push(base({ type: 'ellipse', name: 'Пятно', role: 'decor', x: z.x + z.w - d * 0.95, y: z.y + (z.h - d) / 2, w: d, h: d, fillRole: main, fill2Role: second, gradAngle: 45 }));
        out.push(base({ type: 'ellipse', name: 'Пятно малое', role: 'decor', x: z.x + z.w - d * 1.25, y: z.y + (z.h - d) / 2 + d * 0.5, w: d * 0.55, h: d * 0.55, fillRole: second, fill2Role: main, gradAngle: 200, opacity: 0.92 }));
        break;
      }
      case 'wave': {
        const hh = ctx.H * 0.16;
        out.push(base({ type: 'wave', name: 'Волна дальняя', role: 'decor', x: -1, y: ctx.H - hh * 1.3, w: ctx.W + 2, h: hh * 1.3, amp: 0.3, waves: 1.5, phase: 0.35, fillRole: second, cons: { h: 'left-right', v: 'scale' } }));
        out.push(base({ type: 'wave', name: 'Волна', role: 'decor', x: -1, y: ctx.H - hh, w: ctx.W + 2, h: hh + 1, amp: 0.35, waves: 1.5, fillRole: main, cons: { h: 'left-right', v: 'scale' } }));
        break;
      }
      case 'bigdot': {
        const d = d0 * 0.72;
        const cx = z.x + z.w - d, cy = z.y + (z.h - d) / 2;
        out.push(base({ type: 'ellipse', name: 'Точка', role: 'decor', x: cx, y: cy, w: d, h: d, fillRole: second === 'accent' ? 'accent' : second }));
        const dw = d * 0.95, dh = d * 0.22;
        out.push(base({ name: 'Тире', role: 'decor', x: cx - dw - d * 0.22, y: cy + (d - dh) / 2, w: dw, h: dh, radius: dh / 2, fillRole: roles.dash || 'extra' }));
        break;
      }
    }
    return out;
  }

  // Полоса-маркер под первой строкой заголовка (приём «Полосатого» стиля).
  function marker(ctx, title) {
    const L = SD.render.layoutText(title);
    const lw = L.widths[0] || title.w * 0.6;
    const hh = L.lineH * 0.42;
    const x = title.align === 'center' ? title.x + (title.w - lw) / 2 - 2 : title.align === 'right' ? title.x + title.w - lw - 2 : -3;
    const w = title.align === 'left' ? title.x + lw + 3 - x : lw + 4;
    return base({ name: 'Маркер', role: 'decor', x, y: title.y + L.lineH * 0.52, w, h: hh, fillRole: 'primary', cons: { h: 'scale', v: 'scale' } });
  }
  // Цветная плашка за заголовком (приём «Поездочного» стиля).
  function headPanel(ctx, items, pad) {
    const b = u.unionBox(items.map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h })));
    items.forEach(e => { e.fillRole = 'onPrimary'; });
    return base({ name: 'Плашка заголовка', role: 'decor', x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2, radius: ctx.st.radiusK * 90, fillRole: 'primary' });
  }

  // ---------- Лицевая сторона ----------
  function front(ctx) {
    const { ans, W, H, m, st } = ctx;
    const s = sizes(ctx);
    const o = ans.opts;
    const motifs = o.motif ? ctx.v.motifs.slice() : [];
    const has = k => motifs.includes(k);
    const lay = ans.layout || 'top';
    const align = lay === 'center' || lay === 'diagonal' ? 'center' : (ans.align || 'left');
    const back = [], mid = [], fore = [];
    const gap = m * 0.5;
    const waveH = has('wave') ? H * 0.16 : 0;
    const bottomLimit = H - m - (waveH ? waveH * 0.55 : 0);
    let zone = null, zoneRoles = null, promoAt = null, limitY = H;
    const pd = ctx.base * 0.25;

    const title = mkTitle(ctx, s), sub = mkSub(ctx, s), body = mkBody(ctx, s);
    const heads = [title, ans.texts.subtitle ? sub : null].filter(Boolean);
    const bodies = ans.texts.body ? [body] : [];

    // Нижняя строка: контакты и QR
    const contacts = o.contacts && ans.texts.contacts ? mkSmall(ctx, s) : null;
    let qr = null;
    const q = ctx.base * 0.2;

    function bottomRow(x, w, al) {
      let yb = bottomLimit;
      if (contacts) {
        contacts.x = x; contacts.w = w - (o.qr ? q + gap : 0); contacts.align = o.qr && al === 'center' ? 'left' : al;
        SD.render.fitHeight(contacts);
        contacts.y = yb - contacts.h;
        if (waveH) { contacts.fillRole = 'onPrimary'; contacts.y = H - m * 0.7 - contacts.h; contacts.cons = { h: 'scale', v: 'scale' }; }
        else contacts.cons = { h: 'scale', v: 'scale' };
        fore.push(contacts);
        if (!waveH) yb = contacts.y - gap;
      }
      if (o.qr) {
        qr = mkQr(ctx, s, x + w - q, (contacts && !waveH ? contacts.y + contacts.h : yb) - q, q)[0];
        if (waveH) qr.y = H - waveH - q - gap * 0.5;
        fore.push(qr);
        return Math.min(yb, qr.y - gap);
      }
      return yb;
    }

    if (lay === 'top' || lay === 'center' || lay === 'left') {
      const colW = lay === 'left' ? (W - 2 * m) * 0.58 : W - 2 * m;
      let yBottom = bottomRow(m, lay === 'left' ? colW : W - 2 * m, align);
      limitY = yBottom;
      // вычисляем высоту группы, чтобы расположить её
      let y0 = m;
      if (has('block')) y0 += m * 0.6;
      let y = stack(heads, m, y0, colW, align, [gap * 0.5, gap]);
      if (has('block')) { back.push(headPanel(ctx, heads, m * 0.55)); y += m * 0.55; }
      y = stack(bodies, m, y + gap * 0.3, colW, align, [gap]);
      let cta = [];
      if (o.cta && ans.texts.cta) cta = mkCta(ctx, s, m, y, colW, align);
      const groupEnd = cta.length ? y + cta[0].h : y;
      let shift = 0;
      if (lay === 'center' || lay === 'left') {
        const top = o.image && lay === 'center' ? m + H * 0.36 + gap : m;
        const avail = yBottom - top;
        shift = Math.max(0, top - m + (avail - (groupEnd - m)) / 2);
        if (has('block') && top === m) shift = Math.max(0, shift - m * 0.3);
      }
      [...heads, ...bodies, ...cta, ...back].forEach(e => { e.y += shift; });
      if (cta.length) cta[1].y = cta[0].y + cta[1].pin.dy;
      if (has('stripe')) back.push(marker(ctx, title));
      mid.push(...heads, ...bodies, ...cta);
      const textEnd = groupEnd + shift;
      if (lay === 'top') promoAt = [W - m - pd * 0.45, textEnd + gap + pd * 0.45];
      if (lay === 'left') promoAt = [W - m - pd * 0.5, m + pd * 0.45];

      if (lay === 'top') {
        zone = { x: m, y: textEnd + gap * 1.5, w: W - 2 * m, h: yBottom - textEnd - gap * 2.5 };
        if (o.image) { back.push(mkImage(ctx, zone, ctx.st.radiusK * 80)); zone = { x: W * 0.55, y: zone.y - gap, w: W * 0.5, h: zone.h * 0.5 }; }
      } else if (lay === 'center') {
        if (o.image) { back.push(mkImage(ctx, { x: m, y: m, w: W - 2 * m, h: H * 0.36 }, ctx.st.radiusK * 80)); }
        zone = { x: W * 0.45, y: -H * 0.08, w: W * 0.62, h: H * 0.3 };
        if (has('stripe') || has('block')) zone = { x: m, y: Math.min(textEnd + gap, yBottom - H * 0.14), w: W - 2 * m, h: Math.max(8, yBottom - textEnd - gap * 2) };
      } else {
        const zx = m + colW + gap;
        if (o.image) back.push(mkImage(ctx, { x: W * 0.62, y: 0, w: W * 0.38, h: H }, 0));
        zone = { x: zx, y: m, w: W - zx + m * 0.4, h: H - 2 * m - waveH };
      }
    } else if (lay === 'bottom' || lay === 'split') {
      const topH = H * (lay === 'split' ? 0.5 : 0.42);
      const topZone = { x: 0, y: 0, w: W, h: topH };
      promoAt = lay === 'split' ? [W - m - pd * 0.4, m + pd * 0.4] : [W - m - pd * 0.45, topH - pd * 0.3];
      let y;
      if (lay === 'split' && !o.image) {
        back.push(base({ name: 'Верхняя зона', role: 'decor', x: 0, y: 0, w: W, h: topH, fillRole: 'primary', cons: { h: 'left-right', v: 'scale' } }));
        heads.forEach(e => { e.fillRole = 'onPrimary'; });
        const hh = heads.reduce((a, e) => { e.w = W - 2 * m; SD.render.fitHeight(e); return a + e.h; }, 0) + gap * 0.5;
        stack(heads, m, topH - m * 0.8 - hh, W - 2 * m, align, [gap * 0.5]);
        y = topH + m * 0.8;
        zone = { x: W * 0.5, y: m * 0.6, w: W * 0.5 - m * 0.6, h: Math.max(6, topH - m * 1.4 - hh - gap) };
        zoneRoles = { main: 'accent', second: 'bg', dash: 'bg' };
        if (has('wave')) zoneRoles = { main: 'accent', second: 'soft' };
      } else {
        if (o.image) back.push(mkImage(ctx, topZone, 0));
        else { back.push(base({ name: 'Фон картинки', role: 'decor', x: 0, y: 0, w: W, h: topH, fillRole: 'soft', cons: { h: 'left-right', v: 'scale' } })); zone = { x: m, y: m, w: W - 2 * m, h: topH - 2 * m }; }
        y = stack(heads, m, topH + m * 0.8 + (has('block') ? m * 0.4 : 0), W - 2 * m, align, [gap * 0.5, gap]);
        if (has('block')) { back.push(headPanel(ctx, heads, m * 0.45)); y += m * 0.45; }
        if (has('stripe')) back.push(marker(ctx, title));
      }
      const yBottom = bottomRow(m, W - 2 * m, align);
      limitY = yBottom;
      y = stack(bodies, m, y + gap * 0.3, W - 2 * m, align, [gap]);
      mid.push(...heads, ...bodies);
      if (o.cta && ans.texts.cta) mid.push(...mkCta(ctx, s, m, y, W - 2 * m, align));
      if (has('stripe') && lay === 'split' && !o.image) zone = { x: 0, y: topH - 5, w: W, h: 10 };
      if (lay === 'split' && zone && has('stripe')) zoneRoles = { main: 'accent', second: 'text' };
    } else { // diagonal
      const bigS = Object.assign({}, s, { title: s.title * 1.45 });
      const t = mkTitle(ctx, bigS, { align: 'center', upper: true, lh: 1 });
      t.x = m * 0.5; t.w = W - m; SD.render.fitHeight(t);
      const cy = H * 0.34;
      t.y = cy - t.h / 2; t.rot = -8; t.fillRole = 'onPrimary';
      const pad = t.size * PT * 0.35;
      back.push(base({ name: 'Лента', role: 'decor', x: -W * 0.15, y: t.y - pad, w: W * 1.3, h: t.h + pad * 2, rot: -8, fillRole: 'primary', cons: { h: 'left-right', v: 'scale' } }));
      mid.push(t);
      const yBottom = bottomRow(m, W - 2 * m, 'center');
      limitY = yBottom;
      let y = cy + t.h / 2 + W * 0.09 + m * 0.6;
      y = stack([ans.texts.subtitle ? sub : null, ...bodies].filter(Boolean), m, y, W - 2 * m, 'center', [gap * 0.6, gap]);
      mid.push(...[ans.texts.subtitle ? sub : null, ...bodies].filter(Boolean));
      if (o.cta && ans.texts.cta) mid.push(...mkCta(ctx, s, m, y, W - 2 * m, 'center'));
      promoAt = [W - m - pd * 0.45, H * 0.1];
      zone = { x: W * 0.55, y: -H * 0.06, w: W * 0.55, h: H * 0.2 };
      if (!has('wave')) zone = { x: W * 0.55, y: H - H * 0.2, w: W * 0.55, h: H * 0.24 };
      motifs.splice(motifs.indexOf('stripe') >= 0 ? motifs.indexOf('stripe') : 99, 1);
    }

    // Проверка: влез ли текст над нижней строкой
    const bottomMost = Math.max(...mid.filter(e => !e.rot).map(e => e.y + e.h));
    if (bottomMost > limitY + 0.5) ctx.overflow = true;

    // Мотивы
    const allowZone = { block: ['top', 'bottom', 'left'], stripe: ['top', 'center', 'bottom', 'split'] };
    for (const k of motifs) {
      if (k === 'wave') { back.unshift(...motif(ctx, 'wave', null)); continue; }
      if (allowZone[k] && !allowZone[k].includes(lay)) continue;
      if (!zone) continue;
      const z = zone;
      back.push(...motif(ctx, k, z, zoneRoles));
      // второй мотив рисуем меньше и со сдвигом, чтобы не наложился
      zone = { x: z.x, y: z.y + z.h * 0.1, w: z.w * 0.55, h: z.h * 0.6 };
    }

    // Бейдж
    if (o.promo && ans.texts.promo) {
      const d = ctx.base * 0.25;
      const [cx, cy] = promoAt || [W - m - d * 0.4, m + d * 0.4];
      fore.push(...mkPromo(ctx, s, cx, cy));
    }
    return [...back, ...mid, ...fore];
  }

  // ---------- Оборот / внутренние страницы ----------
  function backSide(ctx, idx) {
    const { ans, W, H, m } = ctx;
    const s = sizes(ctx);
    const o = ans.opts;
    const motifs = o.motif ? ctx.v.motifs : [];
    const els = [], back = [];
    const gap = m * 0.5;
    const land = W > H;
    const heading = mkTitle(ctx, Object.assign({}, s, { title: s.title * 0.62 }), { name: 'Заголовок оборота', role: 'title2', textKey: ans.kind === 'slides' ? 'subtitle' : 'title', text: ans.kind === 'slides' ? ans.texts.subtitle : ans.texts.title });
    const colW = land ? (W - 2 * m) * 0.6 : W - 2 * m;
    let y = m + (motifs.includes('block') ? m * 0.5 : 0);
    y = stack([heading], m, y, colW, 'left', [gap]);
    if (motifs.includes('block')) { back.push(headPanel(ctx, [heading], m * 0.45)); y += m * 0.45; }
    if (motifs.includes('stripe')) back.push(marker(ctx, heading));
    const detKey = ans.kind === 'slides' ? 'body' : 'details';
    const det = text({ name: 'Подробности', role: 'details', textKey: detKey, text: ans.texts[detKey] || '', font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.body * 1.1, 1), lh: 1.5, fillRole: 'text', w: colW });
    stack([det], m, y + gap * 0.4, colW, 'left', [0]);
    els.push(heading, det);
    const waveH = motifs.includes('wave') ? H * 0.16 : 0;
    if (o.contacts && ans.texts.contacts) {
      const c = mkSmall(ctx, s, 'contacts', { x: m, w: W - 2 * m - (o.qr ? ctx.base * 0.2 + gap : 0) });
      SD.render.fitHeight(c);
      c.y = H - m * (waveH ? 0.7 : 1) - c.h;
      c.cons = { h: 'scale', v: 'scale' };
      if (waveH) c.fillRole = 'onPrimary';
      els.push(c);
    }
    if (o.qr) {
      const q = ctx.base * (land ? 0.3 : 0.24);
      const qr = mkQr(ctx, s, W - m - q, land ? (H - q) / 2 : H - m - q - waveH * 0.6, q)[0];
      els.push(qr);
      els.push(text({ name: 'Подпись QR', role: 'qrLabel', text: 'Наведите камеру', font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.small * 0.9, 1), align: 'center', fillRole: 'text', x: qr.x - 5, y: qr.y + q + 1, w: q + 10, pin: { id: qr.id, dx: -5, dy: q + 1 }, opacity: 0.7 }));
    }
    // декор в свободном углу
    const z = land ? { x: m + colW + gap, y: m, w: W - colW - 2 * m - gap + m, h: H * 0.4 } : { x: W * 0.55, y: -H * 0.07, w: W * 0.55, h: H * 0.22 };
    for (const k of motifs) {
      if (k === 'wave') back.unshift(...motif(ctx, 'wave', null));
      else if (k === 'dot' || k === 'blobs' || k === 'bigdot') { if (!(land && o.qr)) back.push(...motif(ctx, k, z)); }
    }
    if (idx % 2 === 0 && ans.kind !== 'slides') heading.textKey = 'title';
    return [...back, ...els];
  }

  // Последний слайд презентации
  function finale(ctx) {
    const { ans, W, H, m } = ctx;
    const s = sizes(ctx);
    const els = [];
    els.push(base({ name: 'Фон', role: 'decor', x: 0, y: 0, w: W, h: H, fillRole: 'primary', cons: { h: 'left-right', v: 'top-bottom' } }));
    const t = mkTitle(ctx, s, { textKey: 'cta', text: ans.texts.cta || 'Спасибо!', align: 'center', fillRole: 'onPrimary' });
    const c = mkSmall(ctx, s, 'contacts', { align: 'center', fillRole: 'onPrimary' });
    stack([t, c], m, H * 0.36, W - 2 * m, 'center', [m * 0.5]);
    els.push(t, c);
    if (ctx.ans.opts.motif) els.splice(1, 0, ...motif(ctx, ctx.v.motifs[0] === 'wave' ? 'wave' : ctx.v.motifs[0], { x: W * 0.62, y: -H * 0.1, w: W * 0.45, h: H * 0.45 }, { main: 'accent', second: 'bg', dash: 'bg' }));
    return els;
  }

  // ---------- Применение палитры и текстов к существующему документу ----------
  function applyPalette(doc, pal) {
    for (const p of doc.pages) {
      if (p.bgRole && pal[p.bgRole]) p.bg = pal[p.bgRole];
      for (const el of p.elements) {
        if (el.fillRole && pal[el.fillRole]) el.fill = pal[el.fillRole];
        if (el.fill2Role && pal[el.fill2Role]) el.fill2 = pal[el.fill2Role];
        if (el.strokeRole && pal[el.strokeRole]) el.stroke = pal[el.strokeRole];
      }
    }
  }
  function applyTexts(doc, texts) {
    for (const p of doc.pages) for (const el of p.elements) {
      if (el.type === 'text' && el.textKey && texts[el.textKey] != null) {
        el.text = texts[el.textKey];
        if (el.fitParent && el.pin) {
          const btn = p.elements.find(e => e.id === el.pin.id);
          if (btn) {
            const tw = SD.render.textWidth(el) + 0.6;
            const cx = btn.x + btn.w / 2;
            el.w = tw; SD.render.fitHeight(el);
            btn.w = tw + el.fitParent.padX * 2; btn.h = el.h + el.fitParent.padY * 2;
            if (el.align === 'center' && btn.x > doc.w * 0.2 && btn.x + btn.w < doc.w * 0.8) btn.x = cx - btn.w / 2;
          }
        } else SD.render.fitHeight(el);
      }
      if (el.type === 'qr' && el.role === 'qr' && texts.qr) el.data = texts.qr;
    }
  }

  return { variants, palette, withDerived, build, applyPalette, applyTexts, base, text, styleProps };
})();
