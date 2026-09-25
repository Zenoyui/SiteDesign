// Генератор: фабрики элементов и смысловые блоки макета —
// заголовок, подзаголовок, кнопка, бейдж, QR, выгоды, цена, стрелка, показ продукта.

(function (G) {
  const PT = SD.PT, u = SD.u;

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

  const SIZE_FLOOR = { title: 12, sub: 8, body: 7.5, cta: 7.5, small: 7, promo: 9, promoText: 7 };
  // Что убирать, если не хватает места (от наименее важного)
  const DROP_ORDER = ['guarantee', 'proof', 'arrow', 'price', 'benefits', 'urgency', 'qr', 'promo'];
  const DROP_NAMES = { guarantee: 'гарантия', proof: 'отзывы', arrow: 'стрелка', price: 'цена-якорь', benefits: 'выгоды', urgency: 'срочность', qr: 'QR-код', promo: 'бейдж' };
  function sizes(ctx) {
    const b = ctx.base * (ctx.fitK || 1), k = ctx.ans.titleScale || 1;
    // нижние пределы кегля для печати: мельче не читается
    const F = SIZE_FLOOR;
    return { title: Math.max(F.title, b * 0.095 * k / PT), sub: Math.max(F.sub, b * 0.046 / PT), body: Math.max(F.body, b * 0.033 / PT), cta: Math.max(F.cta, b * 0.036 / PT), small: Math.max(F.small, b * 0.027 / PT), promo: Math.max(F.promo, b * 0.07 / PT) };
  }

  function mkTitle(ctx, s, extra) {
    const R = ctx.rc || {};
    return text(Object.assign({ name: 'Заголовок', role: 'title', textKey: 'title', text: ctx.T.title, font: ctx.st.font, weight: R.tw ? SD.nearWeight(ctx.st.font, R.tw) : ctx.st.tw, size: u.round(s.title, 1), lh: R.tlh || 1.05, ls: R.tls || 0, upper: R.upper != null ? R.upper : ctx.st.upper, fillRole: 'text', w: ctx.W - ctx.m * 2 }, extra));
  }
  function mkSub(ctx, s, extra) {
    const R = ctx.rc || {};
    return text(Object.assign({ name: 'Подзаголовок', role: 'subtitle', textKey: 'subtitle', text: ctx.T.subtitle, font: ctx.st.font, weight: R.sw ? SD.nearWeight(ctx.st.font, R.sw) : ctx.st.sw, size: u.round(s.sub, 1), lh: 1.2, fillRole: R.muted ? 'muted' : 'text', w: ctx.W - ctx.m * 2 }, extra));
  }
  function mkBody(ctx, s, extra) {
    return text(Object.assign({ name: 'Основной текст', role: 'body', textKey: 'body', text: ctx.T.body, font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.body, 1), lh: 1.35, fillRole: 'text', w: ctx.W - ctx.m * 2 }, extra));
  }
  function mkSmall(ctx, s, key, extra) {
    return text(Object.assign({ name: 'Контакты', role: 'contacts', textKey: key || 'contacts', text: ctx.T[key || 'contacts'], font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.small, 1), lh: 1.25, fillRole: 'text', w: ctx.W - ctx.m * 2 }, extra));
  }

  // Кнопка-призыв: плашка + текст, привязанный к плашке.
  // Кнопка: таблетка, строгая плашка, ссылка «Подробнее ›» или контур — как принято у стиля
  function mkCta(ctx, s, x, y, colW, align, role) {
    const R = ctx.rc || {};
    const kind = R.cta || (ctx.st.pill ? 'pill' : 'rect');
    role = role || R.ctaRole || ctx.st.ctaRole;
    let onRole = role === 'accent' ? 'onAccent' : role === 'text' ? 'bg' : role === 'ctaMax' ? 'onCtaMax' : 'onPrimary';
    if (kind === 'link') onRole = 'link';
    if (kind === 'outline') onRole = 'text';
    const t = text({ name: 'Текст кнопки', role: 'ctaText', textKey: 'cta', text: ctx.T.cta, suffix: kind === 'link' ? ' ›' : '', font: ctx.st.font, weight: kind === 'link' ? ctx.st.bw : ctx.st.sw, size: u.round(kind === 'link' ? s.cta * 1.12 : s.cta, 1), align: 'center', lh: 1.1, fillRole: onRole, w: 400 });
    const tw = Math.min(SD.render.textWidth(t) + 0.6, colW - 6);
    t.w = tw; SD.render.fitHeight(t);
    const flat = kind === 'link';
    const padX = flat ? 0 : t.size * PT * 1.1, padY = flat ? 0 : t.size * PT * 0.62;
    const bw = tw + padX * 2, bh = t.h + padY * 2;
    const bx = align === 'center' ? x + (colW - bw) / 2 : align === 'right' ? x + colW - bw : x;
    const r = kind === 'pill' ? bh / 2 : kind === 'rect' ? Math.min(bh / 2, ctx.st.radiusK * 60) : Math.min(bh / 2, ctx.st.radiusK * 30);
    const btn = base({ name: 'Кнопка', role: 'cta', ctaKind: kind, x: bx, y, w: bw, h: bh, radius: r, fillRole: role, cons: { h: 'scale', v: 'scale' } });
    if (kind === 'link' || kind === 'outline') { btn.fill = 'none'; btn.fillRole = null; }
    if (kind === 'outline') { btn.stroke = '#000'; btn.strokeRole = 'text'; btn.strokeW = u.round(Math.max(0.3, t.size * PT * 0.09), 2); }
    t.x = bx + padX; t.y = y + padY; t.cons = { h: 'scale', v: 'scale' };
    t.pin = { id: btn.id, dx: padX, dy: padY };
    t.fitParent = { padX, padY };
    return [btn, t];
  }

  // Бейдж: звезда, круг, таблетка, ценник или блок — как принято у стиля
  function mkPromo(ctx, s, cx, cy, k = 1) {
    const kind = (ctx.rc && ctx.rc.promo) || 'star';
    if (kind !== 'star') return mkPromoShape(ctx, s, cx, cy, k, kind);
    const d = ctx.base * 0.25 * k;
    const star = base({ type: 'star', name: 'Бейдж', role: 'promo', promoKind: 'star', x: cx - d / 2, y: cy - d / 2, w: d, h: d, points: 14, inner: 0.86, rot: -12, fillRole: 'accent', cons: { h: 'scale', v: 'scale' } });
    const t = text({ name: 'Текст бейджа', role: 'promoText', textKey: 'promo', text: ctx.T.promo, font: ctx.st.font, weight: ctx.st.tw, size: u.round(Math.max(SIZE_FLOOR.promoText, s.promo * k * (String(ctx.T.promo).length > 5 ? 0.62 : 1)), 1), align: 'center', lh: 1, fillRole: 'onAccent', w: d * 0.8, rot: -12 });
    for (let i = 0; i < 12 && SD.render.textWidth(t) > t.w * 0.98 && t.size > SIZE_FLOOR.promoText; i++) t.size = u.round(Math.max(SIZE_FLOOR.promoText, t.size * 0.9), 1);
    SD.render.fitHeight(t);
    // не влезло даже мелко — текст в две строки, а звезда побольше
    if (SD.render.layoutText(t).broken || t.h > d * 0.62) {
      const need = Math.max(t.h / 0.6, d);
      star.w = star.h = need; star.x = cx - need / 2; star.y = cy - need / 2;
      t.w = need * 0.8; SD.render.fitHeight(t);
    }
    const d2 = star.w;
    t.x = star.x + d2 * 0.1; t.y = star.y + (d2 - t.h) / 2;
    t.pin = { id: star.id, dx: t.x - star.x, dy: t.y - star.y };
    return [star, t];
  }

  function mkPromoShape(ctx, s, cx, cy, k, kind) {
    const d = ctx.base * 0.25 * k;
    const R = ctx.rc || {};
    const role = R.promoRole || 'accent', on = role === 'accent' ? 'onAccent' : role === 'primary' ? 'onPrimary' : role === 'text' ? 'bg' : 'onAccent';
    const big = kind === 'block' ? 1.25 : kind === 'circle' ? 1 : 0.85;
    const t = text({ name: 'Текст бейджа', role: 'promoText', textKey: 'promo', text: ctx.T.promo, font: ctx.st.font, weight: ctx.st.tw, size: u.round(Math.max(SIZE_FLOOR.promoText, s.promo * k * big * (String(ctx.T.promo).length > 5 ? 0.62 : 1)), 1), align: 'center', lh: 1, fillRole: on, w: 400 });
    let w, h, type = 'rect', radius = 0, rot = 0;
    const tw = SD.render.textWidth(t) + 0.6;
    if (kind === 'circle') { type = 'ellipse'; w = h = Math.max(d * 0.85, tw * 1.35); }
    else if (kind === 'pill') { h = t.size * PT * 2.1; w = Math.max(tw + h * 0.9, h * 1.6); radius = h / 2; }
    else if (kind === 'tag') { h = t.size * PT * 2.3; w = Math.max(tw + h * 0.8, h * 1.8); radius = h * 0.12; rot = -6; }
    else { h = t.size * PT * 2.4; w = Math.max(tw + h * 0.9, d * 1.1); radius = 0; } // block
    const sh = base({ type, name: 'Бейдж', role: 'promo', promoKind: kind, x: cx - w / 2, y: cy - h / 2, w, h, radius, rot, fillRole: role, cons: { h: 'scale', v: 'scale' } });
    t.w = Math.min(tw, w * 0.9); t.rot = rot; SD.render.fitHeight(t);
    t.x = sh.x + (w - t.w) / 2; t.y = sh.y + (h - t.h) / 2;
    t.pin = { id: sh.id, dx: t.x - sh.x, dy: t.y - sh.y };
    return [sh, t];
  }

  function mkQr(ctx, s, x, y, q) {
    // светлая подложка — «тихая зона» вокруг кода, чтобы он считывался на любом фоне
    const dark = u.lum(ctx.pal.text) < 0.4;
    const qr = base({ type: 'qr', name: 'QR-код', role: 'qr', data: ctx.T.qr || 'https://example.com', x, y, w: q, h: q, fillRole: dark ? 'text' : 'bg', fill2Role: dark ? 'bg' : 'text', radius: q * 0.06, cons: { h: 'scale', v: 'scale' } });
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
    const nw = text({ name: 'Новая цена', role: 'price', textKey: 'priceNew', text: ctx.T.priceNew, font: ctx.st.font, weight: ctx.st.tw, size: u.round(s.sub * 1.7, 1), lh: 1, fillRole: 'ink', w: 100 });
    const old = ctx.T.priceOld ? text({ name: 'Старая цена', role: 'priceOld', textKey: 'priceOld', text: ctx.T.priceOld, font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.sub, 1), lh: 1, fillRole: 'text', strike: true, w: 100 }) : null;
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
      const small = text({ name: 'Пояснение', role: 'cardText', textKey: 'benefit1', text: ctx.T.benefit1, font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.small, 1), lh: 1.2, fillRole: 'text', x: x + p + isz + p * 0.6, w: cw - 3 * p - isz });
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

  Object.assign(G, { base, text, SIZE_FLOOR, DROP_ORDER, DROP_NAMES, sizes, mkTitle, mkSub, mkBody, mkSmall, mkCta, mkPromo, mkQr, mkImage, stack, flat, mkEyebrow, mkRows, mkPrice, mkArrow, mkDisplay });
})(SD._gen = SD._gen || {});
