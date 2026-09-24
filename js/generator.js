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
    const mot = id => SD.STYLES[id].motif;
    // Первым идёт смесь ВСЕХ выбранных стилей — её и видно в превью сразу после выбора.
    if (S.length >= 2) out.push(mixAll(S));
    for (let i = 0; i < S.length; i++) for (let j = 0; j < S.length; j++) if (i !== j && S.length > 2 && out.length < 10) {
      const a = S[i], b = S[j];
      out.push({ key: a + '+' + b, title: nm(a) + ' × ' + nm(b), colorsFrom: a, accentFrom: b, fontFrom: b, motifs: [mot(a), mot(b)], motifFrom: [a, b], invert: false });
    }
    if (S.length === 2) {
      const [a, b] = S;
      out.push({ key: b + '+' + a, title: nm(b) + ' × ' + nm(a), colorsFrom: b, accentFrom: a, fontFrom: a, motifs: [mot(b), mot(a)], motifFrom: [b, a], invert: false });
    }
    for (const s of S) out.push({ key: s, title: nm(s) + ' (только он)', colorsFrom: s, fontFrom: s, motifs: [mot(s)], motifFrom: [s], invert: false });
    if (S.length >= 2) out.push(Object.assign(mixAll(S), { key: 'mix!inv', title: 'Смесь, цветной фон', invert: true }));
    for (const s of S) if (out.length < 16) out.push({ key: s + '!inv', title: nm(s) + ', цветной фон', colorsFrom: s, fontFrom: s, motifs: [mot(s)], motifFrom: [s], invert: true });
    return out;
  }
  // Каждый выбранный стиль что-то вносит: цвета, акцент, доп. цвет, шрифт или декор.
  function mixAll(S) {
    const n = S.length, nm = id => SD.STYLES[id].name;
    const v = { key: 'mix', title: 'Смесь: ' + S.map(nm).join(' + '), colorsFrom: S[0], accentFrom: S[1], fontFrom: S[n - 1], invert: false };
    if (n >= 4) v.extraFrom = S[2];
    const used = new Set([v.colorsFrom, v.accentFrom, v.fontFrom, v.extraFrom]);
    const rest = S.filter(s => !used.has(s));
    const from = rest.concat(S.filter(s => !rest.includes(s))).slice(0, 3);
    // один и тот же мотив дважды не рисуем
    v.motifFrom = []; v.motifs = [];
    for (const s of from) { const m = SD.STYLES[s].motif; if (!v.motifs.includes(m)) { v.motifs.push(m); v.motifFrom.push(s); } }
    return v;
  }

  function palette(v) {
    const s = SD.STYLES[v.colorsFrom];
    const c = Object.assign({ extra: null }, s.colors);
    if (v.accentFrom && v.accentFrom !== v.colorsFrom) {
      const o = SD.STYLES[v.accentFrom].colors;
      c.accent = u.contrast(o.primary, c.primary) > 1.4 ? o.primary : o.accent;
      if (!c.extra) c.extra = o.accent;
    }
    if (v.extraFrom) c.extra = SD.STYLES[v.extraFrom].colors.primary;
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
    // самый контрастный к фону цвет — для кнопки (эффект изоляции)
    c.ctaMax = [c.primary, c.accent, c.extra || c.accent, c.text].sort((a, b) => u.contrast(c.bg, b) - u.contrast(c.bg, a))[0];
    c.onCtaMax = u.readable(c.ctaMax, [c.text, c.bg, '#FFFFFF']);
    c.primary2 = u.hueShift(c.primary, 28, 0.05, -0.07);
    c.accent2 = u.hueShift(c.accent, 28, 0.05, -0.07);
    c.icon = u.contrast(c.primary, c.bg) >= 2 ? c.primary : c.text;
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
    const ctx = { ans, v, pal, st, W, H, T: ans.texts, fx: fxFor(ans), icons: (SD.INDUSTRIES[ans.industry] || SD.INDUSTRIES.transport).icons };
    ctx.base = Math.min(W, H * 0.75);
    ctx.m = Math.max(6, u.round(ctx.base * 0.08, 1));

    const n = Math.max(1, ans.pages || 1);
    const pages = [];
    for (let i = 0; i < n; i++) {
      let els;
      if (i === 0) {
        // если текст не влез — уменьшаем кегли и собираем заново
        for (let t = 0, k = 1; t < 12; t++, k *= 0.9) { ctx.fitK = k; ctx.overflow = false; els = front(ctx); if (!ctx.overflow) break; }
        ctx.fitK = 1;
      } else els = (ans.kind === 'slides' && i === n - 1 && n > 2) ? finale(ctx) : backSide(ctx, i);
      pages.push({ id: u.uid(), name: pageName(ans, i, n), bg: pal.bg, bgRole: 'bg', elements: els });
    }
    const doc = { w: W, h: H, format: ans.format, orient: ans.orient, pages, dirty: false };
    if (ctx.fx.pattern && ctx.fx.pattern !== 'none') for (const pg of pages) pg.elements.unshift(mkPattern(ctx, ctx.fx.pattern));
    applyEffects(doc, ctx);
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
    const onRole = role === 'accent' ? 'onAccent' : role === 'text' ? 'bg' : role === 'ctaMax' ? 'onCtaMax' : 'onPrimary';
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

  function mkPromo(ctx, s, cx, cy, k = 1) {
    const d = ctx.base * 0.25 * k;
    const star = base({ type: 'star', name: 'Бейдж', role: 'promo', x: cx - d / 2, y: cy - d / 2, w: d, h: d, points: 14, inner: 0.86, rot: -12, fillRole: 'accent', cons: { h: 'scale', v: 'scale' } });
    const t = text({ name: 'Текст бейджа', role: 'promoText', textKey: 'promo', text: ctx.T.promo, font: ctx.st.font, weight: ctx.st.tw, size: u.round(s.promo * k * (String(ctx.T.promo).length > 5 ? 0.62 : 1), 1), align: 'center', lh: 1, fillRole: 'onAccent', w: d * 0.8, rot: -12 });
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
      const g = gaps[i] != null ? gaps[i] : (gaps.length ? gaps[gaps.length - 1] : 0);
      if (el.group) { el.place(x, y, w, align); y += el.h + g; return; }
      el.x = x; el.y = y; el.w = w; el.align = align;
      SD.render.fitHeight(el);
      y += el.h + g;
    });
    return y;
  }
  function flat(list) { return list.flatMap(e => e.group ? e.els : [e]); }

  // ---------- Приёмы внимания ----------
  // Плашка срочности над заголовком
  function mkEyebrow(ctx, s) {
    const role = u.contrast(ctx.pal.accent, ctx.pal.bg) >= 1.5 ? 'accent' : 'primary';
    const size = u.round(s.small * 1.1, 1), pad = size * PT;
    return text({ name: 'Срочность', role: 'urgency', textKey: 'urgency', text: ctx.T.urgency, font: ctx.st.font, weight: ctx.st.sw, size,
      fillRole: role === 'accent' ? 'onAccent' : 'onPrimary', keepColor: true, lh: 1.15,
      bg: { fillRole: role, padX: pad * 0.75, padY: pad * 0.38, radius: ctx.st.pill ? null : ctx.st.radiusK * 30 } });
  }
  // Строки «значок + текст» (выгоды, отзывы, гарантия)
  function mkRows(ctx, sizePt, rows, weight) {
    const isz = sizePt * PT * 1.7, g = isz * 0.45, rg = isz * 0.3;
    const els = [];
    const items = rows.map(r => {
      const ic = base({ type: 'icon', name: 'Значок', role: 'icon', icon: r.icon, iconStyle: ctx.fx.icons, w: isz, h: isz, fillRole: 'icon', fill2Role: 'primary' });
      const t = text({ name: r.name || 'Строка', role: r.role || 'row', textKey: r.key, text: ctx.T[r.key], font: ctx.st.font, weight: weight || ctx.st.bw, size: u.round(sizePt, 1), lh: 1.2, fillRole: 'text', w: 50 });
      els.push(ic, t);
      return { ic, t };
    });
    const grp = { group: true, els, h: 0, place(x, y, w, align) {
      let maxW = 0;
      items.forEach(it => { it.t.w = Math.max(10, w - isz - g); it.t.align = 'left'; maxW = Math.max(maxW, Math.min(it.t.w, SD.render.textWidth(it.t) + 0.8)); });
      const bw = isz + g + maxW;
      const x0 = align === 'center' ? x + (w - bw) / 2 : align === 'right' ? x + w - bw : x;
      let yy = y;
      items.forEach(it => {
        it.t.w = maxW; SD.render.fitHeight(it.t);
        const rh = Math.max(isz, it.t.h);
        it.ic.x = x0; it.ic.y = yy + (rh - isz) / 2;
        it.t.x = x0 + isz + g; it.t.y = yy + (rh - it.t.h) / 2;
        it.t.pin = { id: it.ic.id, dx: it.t.x - it.ic.x, dy: it.t.y - it.ic.y };
        yy += rh + rg;
      });
      this.h = yy - rg - y;
    } };
    grp.place(0, 0, ctx.W - 2 * ctx.m, 'left');
    return grp;
  }
  // Цена-якорь: новая крупно, старая зачёркнута
  function mkPrice(ctx, s) {
    const nw = text({ name: 'Новая цена', role: 'price', textKey: 'priceNew', text: ctx.T.priceNew, font: ctx.st.font, weight: ctx.st.tw, size: u.round(s.sub * 1.7, 1), lh: 1, fillRole: 'icon', w: 100 });
    const old = ctx.T.priceOld ? text({ name: 'Старая цена', role: 'priceOld', textKey: 'priceOld', text: ctx.T.priceOld, font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.sub, 1), lh: 1, fillRole: 'text', opacity: 0.6, strike: true, w: 100 }) : null;
    const els = old ? [nw, old] : [nw];
    return { group: true, els, h: 0, place(x, y, w, align) {
      const a = SD.render.textWidth(nw) + 0.6, b = old ? SD.render.textWidth(old) + 0.8 : 0, g = old ? nw.size * PT * 0.35 : 0;
      nw.w = a; nw.align = 'left'; SD.render.fitHeight(nw);
      const tot = a + g + b;
      const x0 = align === 'center' ? x + (w - tot) / 2 : align === 'right' ? x + w - tot : x;
      nw.x = x0; nw.y = y;
      if (old) { old.w = b; old.align = 'left'; SD.render.fitHeight(old); old.x = x0 + a + g; old.y = y + nw.h - old.h - nw.h * 0.05; old.pin = { id: nw.id, dx: old.x - nw.x, dy: old.y - nw.y }; }
      this.h = nw.h;
    } };
  }
  // Стрелка, указывающая на кнопку
  function mkArrow(ctx, btn, align) {
    const sz = btn.h * 1.35;
    let x = btn.x + btn.w + sz * 0.15, flip = false;
    if (align === 'right' || x + sz > ctx.W - ctx.m * 0.3) { x = btn.x - sz * 1.15; flip = true; }
    if (x < ctx.m * 0.2) return null;
    const a = base({ type: 'icon', name: 'Стрелка', role: 'arrow', icon: 'arrowCurve', iconStyle: 'bold', x, y: btn.y - sz * 0.62, w: sz, h: sz, flipX: flip, fillRole: 'text' });
    a.pin = { id: btn.id, dx: a.x - btn.x, dy: a.y - btn.y };
    return a;
  }

  // ---------- Показ продукта ----------
  function mkDisplay(ctx, kind, z, s) {
    const out = [];
    const heroIcon = (SD.INDUSTRIES[ctx.ans.industry] || SD.INDUSTRIES.transport).hero;
    if (kind === 'phone') {
      let ph = Math.min(z.h * 0.96, z.w * 0.62 * 2.05), pw = ph / 2.05;
      out.push(base({ type: 'phone', name: 'Телефон', role: 'display', x: z.x + (z.w - pw) / 2, y: z.y + (z.h - ph) / 2, w: pw, h: ph, fillRole: 'soft', fill2Role: 'ctaMax', radius: 0 }));
    } else if (kind === 'circle') {
      const d = Math.min(z.w, z.h) * 0.88, x = z.x + (z.w - d) / 2, y = z.y + (z.h - d) / 2;
      if (ctx.ans.opts.image) out.push(Object.assign(mkImage(ctx, { x, y, w: d, h: d }, d / 2), { role: 'display' }));
      else {
        const c = base({ type: 'ellipse', name: 'Круг', role: 'display', x, y, w: d, h: d, fillRole: 'primary' });
        const ic = base({ type: 'icon', name: 'Значок', role: 'heroIcon', icon: heroIcon, iconStyle: 'line', x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, fillRole: 'onPrimary' });
        ic.pin = { id: c.id, dx: d * 0.22, dy: d * 0.22 };
        out.push(c, ic);
      }
    } else if (kind === 'card') {
      const cw = Math.min(z.w * 0.9, z.h * 1.5), chh = Math.min(z.h * 0.9, cw * 0.7), x = z.x + (z.w - cw) / 2, y = z.y + (z.h - chh) / 2;
      const card = base({ name: 'Карточка', role: 'display', x, y, w: cw, h: chh, radius: ctx.st.radiusK * 90 + 1, fillRole: u.lum(ctx.pal.bg) > 0.8 ? 'soft' : 'bg' });
      const isz = chh * 0.3, p = chh * 0.12;
      const ic = base({ type: 'icon', name: 'Значок', role: 'icon', icon: heroIcon, iconStyle: ctx.fx.icons, x: x + p, y: y + p, w: isz, h: isz, fillRole: 'icon', fill2Role: 'primary' });
      const big = text({ name: 'Выгода', role: 'cardText', textKey: ctx.T.promo ? 'promo' : 'priceNew', text: ctx.T.promo || ctx.T.priceNew, font: ctx.st.font, weight: ctx.st.tw, size: u.round(Math.min(s.sub * 1.6, chh * 0.28 / PT), 1), lh: 1, fillRole: 'text', x: x + p, w: cw - 2 * p });
      big.y = y + chh - p - big.h;
      const small = text({ name: 'Пояснение', role: 'cardText', textKey: 'benefit1', text: ctx.T.benefit1, font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.small, 1), lh: 1.2, fillRole: 'text', opacity: 0.7, x: x + p + isz + p * 0.6, w: cw - 3 * p - isz });
      small.y = y + p + (isz - small.h) / 2;
      for (const e of [ic, big, small]) e.pin = { id: card.id, dx: e.x - x, dy: e.y - y };
      out.push(card, ic, big, small);
    } else if (kind === 'hero') {
      const d = Math.min(z.w, z.h) * 0.78, x = z.x + (z.w - d) / 2, y = z.y + (z.h - d) / 2;
      const sq = base({ name: 'Наклейка', role: 'display', x, y, w: d, h: d, rot: -6, radius: d * 0.24, fillRole: 'accent', stroke: '#FFFFFF', strokeW: d * 0.04 });
      const ic = base({ type: 'icon', name: 'Значок', role: 'heroIcon', icon: heroIcon, iconStyle: 'bold', rot: -6, x: x + d * 0.2, y: y + d * 0.2, w: d * 0.6, h: d * 0.6, fillRole: 'onAccent' });
      ic.pin = { id: sq.id, dx: d * 0.2, dy: d * 0.2 };
      out.push(sq, ic);
    }
    return out;
  }

  // ---------- Эффекты ----------
  function applyEffects(doc, ctx) {
    const E = new Set(ctx.fx.effects || []), b = ctx.base, pal = ctx.pal;
    for (const p of doc.pages) {
      p.fx = { grain: E.has('grain') ? 0.4 : 0 };
      for (const el of p.elements) {
        const lifted = ['cta', 'promo', 'image', 'display', 'panel', 'card'].includes(el.role);
        if (E.has('glass') && ['panel', 'card'].includes(el.role)) {
          const light = u.lum(pal.bg) > 0.6;
          el.fillRole = light ? 'primary' : null; el.fill = '#FFFFFF'; el.opacity = light ? 0.22 : 0.16;
          el.stroke = '#FFFFFF'; el.strokeW = b * 0.006;
          for (const id of el.panelFor || []) { const t = p.elements.find(e => e.id === id); if (t) t.fillRole = 'text'; }
        }
        if (E.has('shadow') && lifted) el.shadow = { x: 0, y: b * 0.008, blur: b * 0.035, color: '#000000', alpha: 0.2 };
        // вместе с мягкой тенью жёсткая достаётся только кнопке и бейджу — так видны обе
        if (E.has('hardShadow') && (E.has('shadow') ? ['cta', 'promo'].includes(el.role) : lifted)) el.shadow = { x: b * 0.012, y: b * 0.012, blur: 0, colorRole: 'text', alpha: 1 };
        if (E.has('glow') && (el.role === 'cta' || el.role === 'promo')) el.shadow = { x: 0, y: 0, blur: b * 0.06, colorRole: el.fillRole || 'primary', alpha: 0.75 };
        if (E.has('gradient') && ['rect', 'ellipse', 'star', 'wave'].includes(el.type) && !el.fill2Role && (el.fillRole === 'primary' || el.fillRole === 'accent')) {
          el.fill2Role = el.fillRole + '2'; el.gradAngle = 120;
        }
        if (E.has('sticker') && ['promo', 'cta', 'image', 'display'].includes(el.role) && el.type !== 'text') {
          el.stroke = '#FFFFFF'; el.strokeRole = null; el.strokeW = b * 0.014;
          if (!el.shadow) el.shadow = { x: 0, y: b * 0.004, blur: b * 0.015, color: '#000000', alpha: 0.25 };
        }
        if (E.has('tilt')) {
          if (el.role === 'cta' || el.role === 'ctaText') el.rot = (el.rot || 0) - 3;
          if (el.role === 'panel' || el.role === 'card') el.rot = (el.rot || 0) - 2;
          if (el.role === 'urgency') el.rot = (el.rot || 0) - 3;
        }
      }
    }
  }
  function mkPattern(ctx, kind) {
    const lowC = u.contrast(ctx.pal.primary, ctx.pal.bg) < 1.6;
    const cellK = { grid: 0.07, checker: 0.05, stripes: 0.05, confetti: 0.06, halftone: 0.05, dots: 0.045 }[kind] || 0.05;
    const useText = kind === 'checker' || kind === 'grid' || lowC;
    return base({ type: 'pattern', name: 'Узор', role: 'pattern', kind, cell: u.round(ctx.base * cellK, 2), seed: 11, x: 0, y: 0, w: ctx.W, h: ctx.H,
      fillRole: useText ? 'text' : 'primary', fill2Role: 'accent', opacity: useText ? 0.07 : 0.16, locked: true, cons: { h: 'left-right', v: 'top-bottom' } });
  }
  function fxFor(ans) {
    if (ans.fx && !ans.fx.auto) return ans.fx;
    const S = ans.styles && ans.styles.length ? ans.styles : ['yandex'];
    const k0 = SD.KITS[S[0]], k1 = S[1] ? SD.KITS[S[1]] : null;
    const eff = k0.effects.slice();
    if (k1 && k1.effects[0] && !eff.includes(k1.effects[0])) eff.push(k1.effects[0]);
    return { auto: true, effects: eff, icons: k0.icons, pattern: 'none', display: 'none' };
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
        out.push(base({ name: 'Карточка', role: 'card', x: z.x, y: z.y, w: z.w, h: z.h, radius: r, fillRole: 'soft' }));
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
    items.forEach(e => { if (!e.keepColor) e.fillRole = 'onPrimary'; });
    return base({ name: 'Плашка заголовка', role: 'panel', panelFor: items.filter(e => !e.keepColor).map(e => e.id), x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2, radius: ctx.st.radiusK * 90, fillRole: 'primary' });
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
    const mk = ans.mk || {}, T = ans.texts;
    const eyebrow = mk.urgency && T.urgency ? mkEyebrow(ctx, s) : null;
    if (eyebrow && lay !== 'diagonal') heads.unshift(eyebrow);
    if (mk.benefits) {
      const rows = [1, 2, 3].map(i => ({ icon: ctx.icons[i - 1], key: 'benefit' + i, name: 'Выгода ' + i, role: 'benefit' })).filter(r => T[r.key]);
      if (rows.length) bodies.push(mkRows(ctx, s.body, rows, ctx.st.sw));
    }
    if (mk.price && T.priceNew) bodies.push(mkPrice(ctx, s));
    // кнопка + стрелка + строки доверия
    function ctaBlock(x, y, colW, al) {
      const els = [];
      let end = y;
      if (o.cta && T.cta) {
        const c = mkCta(ctx, s, x, y, colW, al, mk.contrastCta ? 'ctaMax' : undefined);
        els.push(...c); end = y + c[0].h;
        if (mk.arrow) { const a = mkArrow(ctx, c[0], al); if (a) els.push(a); }
      }
      const rows = [];
      if (mk.proof && T.proof) rows.push({ icon: 'star', key: 'proof', name: 'Отзывы', role: 'proof' });
      if (mk.guarantee && T.guarantee) rows.push({ icon: 'shield', key: 'guarantee', name: 'Гарантия', role: 'guarantee' });
      if (rows.length) {
        const g = mkRows(ctx, s.small, rows);
        const yy = els.length ? end + gap * 0.7 : y;
        g.place(x, yy, colW, al); els.push(...g.els); end = yy + g.h;
      }
      return { els, end };
    }

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
      const cb = ctaBlock(m, y, colW, align);
      const cta = cb.els;
      const groupEnd = cb.end;
      let shift = 0;
      if (lay === 'center' || lay === 'left') {
        const top = o.image && lay === 'center' ? m + H * 0.36 + gap : m;
        const avail = yBottom - top;
        shift = Math.max(0, top - m + (avail - (groupEnd - m)) / 2);
        if (has('block') && top === m) shift = Math.max(0, shift - m * 0.3);
      }
      flat([...heads, ...bodies]).concat(cta, back).forEach(e => { e.y += shift; });
      if (has('stripe')) back.push(marker(ctx, title));
      mid.push(...flat(heads), ...flat(bodies), ...cta);
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
      // картинка сверху уменьшается, если тексту не хватает места
      const topH = H * (lay === 'split' ? 0.5 : 0.42) * Math.max(0.55, ctx.fitK || 1);
      const topZone = { x: 0, y: 0, w: W, h: topH };
      promoAt = lay === 'split' ? [W - m - pd * 0.4, m + pd * 0.4] : [W - m - pd * 0.45, topH - pd * 0.3];
      let y;
      if (lay === 'split' && !o.image) {
        back.push(base({ name: 'Верхняя зона', role: 'decor', x: 0, y: 0, w: W, h: topH, fillRole: 'primary', cons: { h: 'left-right', v: 'scale' } }));
        heads.forEach(e => { if (!e.keepColor) e.fillRole = 'onPrimary'; });
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
      mid.push(...flat(heads), ...flat(bodies));
      mid.push(...ctaBlock(m, y, W - 2 * m, align).els);
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
      const lower = [eyebrow, ans.texts.subtitle ? sub : null, ...bodies].filter(Boolean);
      y = stack(lower, m, y, W - 2 * m, 'center', [gap * 0.6, gap]);
      mid.push(...flat(lower));
      mid.push(...ctaBlock(m, y, W - 2 * m, 'center').els);
      promoAt = [W - m - pd * 0.45, H * 0.1];
      zone = { x: W * 0.55, y: -H * 0.06, w: W * 0.55, h: H * 0.2 };
      if (!has('wave')) zone = { x: W * 0.55, y: H - H * 0.2, w: W * 0.55, h: H * 0.24 };
      motifs.splice(motifs.indexOf('stripe') >= 0 ? motifs.indexOf('stripe') : 99, 1);
    }

    // Проверка: влез ли текст над нижней строкой
    const bottomMost = Math.max(...mid.filter(e => !e.rot).map(e => e.y + e.h));
    if (bottomMost > limitY + 0.5) ctx.overflow = true;

    // Показ продукта (телефон, круг, карточка, наклейка) — в свободной зоне
    const disp = ctx.fx.display;
    if (disp && disp !== 'none' && zone && ['top', 'left', 'bottom'].includes(lay) && !(o.image && lay !== 'bottom')) {
      const vx = Math.max(zone.x, m * 0.5), vy = Math.max(zone.y, m * 0.5);
      const vz = { x: vx, y: vy, w: Math.min(zone.x + zone.w, W - m * 0.5) - vx, h: Math.min(zone.y + zone.h, limitY) - vy };
      if (lay === 'top' && vz.w > vz.h * 1.3) { vz.x += vz.w * 0.35; vz.w *= 0.65; }
      const minSide = Math.min(W, H) * 0.3; // слишком маленький показ не рисуем — будет мусором
      const fits = k => vz.w > minSide * k * (disp === 'phone' ? 0.5 : 1) && vz.h > minSide * k;
      if (fits(1) || ((ctx.fitK || 1) < 0.6 && fits(0.55))) mid.push(...mkDisplay(ctx, disp, vz, s));
      else if ((ctx.fitK || 1) >= 0.6) ctx.overflow = true; // освобождаем место: уменьшаем текст
      else ctx.displaySkipped = true;
    }

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
      // бейдж не должен закрывать текст и кнопку: пробуем несколько мест и размеров
      const d = ctx.base * 0.25;
      const obstacles = mid.filter(e => e.type === 'text' || ['cta', 'display', 'arrow', 'icon'].includes(e.role) || e.type === 'phone').concat(fore.filter(e => e.type === 'qr' || e.type === 'text')).map(u.aabb);
      const cands = [promoAt || [W - m - d * 0.4, m + d * 0.4], [W - m - d * 0.4, m + d * 0.4], [W - m - d * 0.45, limitY - d * 0.55], [W * 0.5, limitY - d * 0.55], [m + d * 0.45, limitY - d * 0.55]];
      const hits = (cx, cy, dd) => { const b = { x: cx - dd / 2, y: cy - dd / 2, w: dd, h: dd }; return obstacles.reduce((a, o) => a + Math.max(0, Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x)) * Math.max(0, Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y)), 0) / (dd * dd); };
      let best = null;
      for (const k of [1, 0.8, 0.65]) {
        for (const [cx, cy] of cands) { const ov = hits(cx, cy, d * k * 0.9); if (!best || ov < best.ov - 0.001) best = { cx, cy, k, ov }; if (ov < 0.03) break; }
        if (best.ov < 0.03) break;
      }
      fore.push(...mkPromo(ctx, s, best.cx, best.cy, best.k));
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
        if (el.bg && el.bg.fillRole && pal[el.bg.fillRole]) el.bg.fill = pal[el.bg.fillRole];
        if (el.shadow && el.shadow.colorRole && pal[el.shadow.colorRole]) el.shadow.color = pal[el.shadow.colorRole];
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

  return { variants, palette, withDerived, build, applyPalette, applyTexts, base, text, styleProps, fxFor };
})();
