// Генератор макета: из ответов пользователя собирает страницы с элементами.
// Каждый элемент помнит свою «роль» цвета и текста, поэтому потом можно
// менять палитру и тексты, не теряя ручных правок в редакторе.

SD.gen = (function () {
  const PT = SD.PT, u = SD.u;

  // ---------- Варианты сочетания стилей ----------
  function variants(styles, fidelity) {
    const S = (styles && styles.length ? styles : ['yandex']).filter(s => SD.STYLES[s]);
    const out = [];
    // один стиль и режим «как если бы делала компания» — варианты это образы стиля из рецепта
    if (S.length === 1 && fidelity !== 'free' && SD.RECIPES && SD.RECIPES[S[0]]) {
      const s = S[0];
      SD.RECIPES[s].looks.forEach((L, i) => out.push({ key: s + '#' + i, title: `${SD.STYLES[s].name}: ${L.name}`, colorsFrom: s, fontFrom: s, motifs: L.motifs || [SD.STYLES[s].motif], motifFrom: [s], invert: !!L.invert, look: L }));
    }
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
  function mixAll(S0) {
    const S = S0.slice(0, 7); // в одной смеси заметны не больше 7 стилей
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
  // Цвет, на котором мелкий текст не читается ни белым, ни чёрным, чуть затемняем/осветляем
  function inkSafe(col) {
    let x = col;
    for (let i = 0; i < 20; i++) {
      const w = u.contrast(x, '#FFFFFF'), k = u.contrast(x, '#111111');
      if (Math.max(w, k) >= 4.5) return x;
      x = u.hueShift(x, 0, 0, w >= k ? -0.02 : 0.02);
    }
    return x;
  }
  function withDerived(c) {
    c.primaryOrig = c.primary; c.accentOrig = c.accent;
    c.primary = inkSafe(c.primary); c.accent = inkSafe(c.accent); c.bg = inkSafe(c.bg);
    c.onPrimary = u.readable(c.primary, [c.text, c.bg, '#FFFFFF']);
    c.onAccent = u.readable(c.accent, [c.text, c.bg, '#FFFFFF']);
    // самый контрастный к фону цвет — для кнопки (эффект изоляции)
    c.ctaMax = [c.primary, c.accent, c.extra || c.accent, c.text].sort((a, b) => u.contrast(c.bg, b) - u.contrast(c.bg, a))[0];
    c.onCtaMax = u.readable(c.ctaMax, [c.text, c.bg, '#FFFFFF']);
    // второй цвет градиента тоже должен держать контраст с текстом поверх него
    const grad = (col, on) => {
      let x = u.hueShift(col, 28, 0.05, -0.07);
      const dir = u.lum(on) > 0.5 ? -0.03 : 0.03;
      for (let i = 0; i < 20 && u.contrast(x, on) < 4.5; i++) x = u.hueShift(x, 0, 0, dir);
      return x;
    };
    c.primary2 = grad(c.primary, c.onPrimary);
    c.accent2 = grad(c.accent, c.onAccent);
    c.icon = u.contrast(c.primary, c.bg) >= 2 ? c.primary : c.text;
    // приглушённый текст (подзаголовки «как у Apple») — но читаемый, от 4,6:1
    let muted = u.mix(c.text, c.bg, 0.38);
    for (let i = 0; i < 20 && u.contrast(muted, c.bg) < 4.6; i++) muted = u.mix(muted, c.text, 0.15);
    c.muted = muted;
    // цвет ссылки-кнопки «Подробнее ›»
    c.link = u.contrast(c.accent, c.bg) >= 4.8 ? c.accent : u.contrast(c.primary, c.bg) >= 4.8 ? c.primary : c.text;
    // цвет для текста-акцента (цена): только если читается как текст — от 4,5:1
    c.ink = u.contrast(c.primary, c.bg) >= 5 ? c.primary : u.contrast(c.accent, c.bg) >= 5 ? c.accent : c.text; // с запасом на сглаживание букв
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
      pill: cs.pill || ['go', 'urent', 'bk'].includes(v.colorsFrom),
      ctaRole: !v.invert && (v.colorsFrom === 'go' || cs.ctaRole === 'accent') ? 'accent' : 'primary'
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
    const vs = variants(ans.styles, ans.fidelity);
    const v = vs[ans.variant] || vs[0];
    let pal = ans.palette ? withDerived(Object.assign({}, ans.palette)) : palette(v);
    // образ стиля может задать свою палитру (например, «тёмная витрина»)
    if (v.look && v.look.pal && !ans.palette) pal = withDerived(Object.assign({}, pal, v.look.pal));
    const st = styleProps(ans, v);
    const ctx = { ans, v, pal, st, W, H, T: ans.texts, notes: [], fx: fxFor(ans), icons: (SD.INDUSTRIES[ans.industry] || SD.INDUSTRIES.transport).icons };
    ctx.base = Math.min(W, H * 0.75);
    ctx.rc = v.look || null;
    ctx.m = Math.max(6, u.round(ctx.base * 0.08 * ((ctx.rc && ctx.rc.margin) || 1), 1));

    const n = Math.max(1, ans.pages || 1);
    const pages = [];
    for (let i = 0; i < n; i++) {
      let els;
      if (i === 0) {
        // если текст не влез — уменьшаем кегли и собираем заново
        // крошечный формат (визитка): только имя, подзаголовок и контакты
        ctx.tiny = ctx.base < 45;
        ctx.drop = new Set(ctx.tiny ? DROP_ORDER : []);
        if (ctx.tiny && (DROP_ORDER.some(d => d === 'qr' ? ans.opts.qr : d === 'promo' ? ans.opts.promo : ans.mk && ans.mk[d]) || ans.opts.cta || ans.texts.body)) ctx.notes.push('Формат маленький — оставлены только заголовок, подзаголовок и контакты, как на визитке.');
        let k = 1;
        for (let t = 0; t < 30; t++) {
          ctx.fitK = k; ctx.overflow = false; els = front(ctx);
          if (!ctx.overflow) break;
          if (k > 0.62) { k *= 0.92; continue; }
          // уменьшать дальше некуда — убираем второстепенные блоки
          const next = DROP_ORDER.find(d => !ctx.drop.has(d) && (d === 'qr' ? ans.opts.qr : d === 'promo' ? ans.opts.promo && ans.texts.promo : ans.mk && ans.mk[d]));
          if (!next) break;
          ctx.drop.add(next);
        }
        if (ctx.drop.size && !ctx.tiny) ctx.notes.push('Не хватило места, поэтому убрано: ' + [...ctx.drop].map(d => DROP_NAMES[d]).join(', ') + '. Можно выбрать формат побольше или сократить текст.');
        if (ctx.overflow) ctx.notes.push('Текст не помещается на лицевую сторону даже в минимальном кегле — сократите текст или выберите формат побольше.');
        ctx.fitK = 1;
      } else els = (ans.kind === 'slides' && i === n - 1 && n > 2) ? finale(ctx) : backSide(ctx, i);
      pages.push({ id: u.uid(), name: pageName(ans, i, n), bg: pal.bg, bgRole: 'bg', elements: els });
    }
    const doc = { w: W, h: H, format: ans.format, orient: ans.orient, pages, dirty: false, notes: ctx.notes };
    if (ctx.fx.pattern && ctx.fx.pattern !== 'none') for (const pg of pages) pg.elements.unshift(mkPattern(ctx, ctx.fx.pattern));
    applyEffects(doc, ctx);
    applyGradient(doc, ctx);
    applyPalette(doc, pal);
    return doc;
  }
  function pageName(ans, i, n) {
    if (ans.kind === 'slides') return 'Слайд ' + (i + 1);
    if (n === 2) return i ? 'Оборот' : 'Лицевая';
    return 'Страница ' + (i + 1);
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
        if (E.has('sticker') && ['promo', 'cta', 'image', 'display'].includes(el.role) && el.type !== 'text') {
          el.stroke = '#FFFFFF'; el.strokeRole = null; el.strokeW = b * 0.014;
          if (!el.shadow) el.shadow = { x: 0, y: b * 0.004, blur: b * 0.015, color: '#000000', alpha: 0.25 };
        }
        if (E.has('tilt')) {
          if (el.role === 'cta' || el.role === 'ctaText') el.rot = (el.rot || 0) - 3;
          if (el.role === 'panel' || el.role === 'card') el.rot = (el.rot || 0) - 2;
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
  // ---------- Градиент: нужен ли и какой ----------
  // Правила собраны из исследований восприятия (см. SD.GRADIENT_RULES в brands.js).
  const GRAD_IND = { finance: 2, event: 2, beauty: 2, kids: 1, transport: 1, premium: 1, education: 1, delivery: 0, coffee: 0, food: 0, retail: -1, eco: -2 };
  const GRAD_STYLE = { urent: 2, yandex: 0, go: -1, bk: -1, whoosh: -2, vit: -2, apple: 1, xiaomi: -1, samsung: 2, nothing: -3, pixel: 0, sber: 3, ozon: 0, wb: 3, ikea: -3, swiss: -3, brutal: -3, retro70: -1, y2k: 3, japan: -3, bauhaus: -3 };
  function surfaces(doc, ctx) {
    const A = ctx.W * ctx.H;
    const list = [];
    for (const p of doc.pages) for (const el of p.elements) {
      if (!['rect', 'ellipse', 'wave', 'star'].includes(el.type) || !el.fillRole || !['primary', 'accent', 'ctaMax', 'bg', 'soft'].includes(el.fillRole)) continue;
      if (el.role === 'pattern' || el.gradType || (el.opacity < 0.5 && !['panel', 'card'].includes(el.role))) continue; // фирменный градиент мотива не трогаем
      // почти бесцветным поверхностям (серые подложки) градиент не нужен — будет «грязь»
      if (SD.color.chroma(ctx.pal[el.fillRole] || '#888888') < 0.05) continue;
      const big = el.w * el.h / A;
      if (['panel', 'card', 'display', 'cta', 'promo'].includes(el.role) || big > 0.04) list.push({ el, big });
    }
    return list;
  }
  function decideGradient(doc, ctx) {
    const setting = (ctx.fx.gradient || 'auto');
    const forced = (ctx.fx.effects || []).includes('gradient');
    const reasons = [];
    const surf = surfaces(doc, ctx);
    const bigArea = surf.reduce((a, s) => a + (s.big > 0.04 ? s.big : 0), 0);
    if (!surf.length) return { type: 'none', reasons: ['На макете нет цветных поверхностей, куда можно положить градиент (кнопка и плашки тёмные или серые).'], score: null, surf };
    if (setting !== 'auto') return { type: setting, reasons: [setting === 'none' ? 'Градиент выключен вручную.' : 'Тип градиента выбран вручную.'], score: null, surf };
    let score = 0;
    const ind = ctx.ans.industry || 'transport';
    const gi = GRAD_IND[ind] || 0; score += gi;
    reasons.push(`Сфера «${(SD.INDUSTRIES[ind] || {}).name}»: ${gi > 0 ? 'градиенты уместны — ассоциируются с технологичностью, праздником, красотой' : gi < 0 ? 'лучше плоский цвет — честность и простота важнее эффекта' : 'нейтрально'} (${gi > 0 ? '+' : ''}${gi}).`);
    const st = ctx.v.colorsFrom, gs = GRAD_STYLE[st] || 0; score += gs;
    reasons.push(`Стиль «${SD.STYLES[st].name}» ${gs > 0 ? 'сам построен на градиентах' : gs < 0 ? 'построен на плоских цветах' : 'допускает оба варианта'} (${gs > 0 ? '+' : ''}${gs}).`);
    if (bigArea > 0.12) { score += 1; reasons.push(`Есть крупные цветные поверхности (${Math.round(bigArea * 100)}% листа) — на них градиент читается как объём (+1).`); }
    else { score -= 1; reasons.push('Крупных цветных поверхностей мало — на мелких деталях градиент выглядит устаревшим (−1).'); }
    const vivid = SD.color.chroma(ctx.pal.primary) > 0.12;
    if (vivid) { score += 1; reasons.push('Основной цвет насыщенный — переходы оттенков будут сочными (+1).'); }
    if (ctx.fx.pattern && ctx.fx.pattern !== 'none') { score -= 1; reasons.push('Уже есть фоновый узор — вместе с градиентом будет пёстро, растёт визуальная сложность (−1).'); }
    if (ctx.ans.opts.image) { score -= 1; reasons.push('Есть фотография — ей нужен спокойный фон (−1).'); }
    const load = Object.values(ctx.ans.mk || {}).filter(Boolean).length;
    if (load >= 5) { score -= 1; reasons.push(`Включено ${load} приёмов внимания — макет и так насыщен, лишний эффект повышает когнитивную нагрузку (−1).`); }
    if (forced) { score = Math.max(score, 3); reasons.push('Эффект «Градиент всегда» включён в наборе стиля.'); }
    let type = 'none';
    if (score >= 3) {
      const darkBg = SD.color.lightness(ctx.pal.bg) < 0.45;
      if (darkBg && ['event', 'finance', 'kids', 'beauty'].includes(ind)) type = 'aurora';
      else if (['premium'].includes(ind) || (darkBg && !vivid)) type = 'radial';
      else if (bigArea > 0.12 && vivid) type = 'mesh';
      else type = 'linear';
      reasons.push(`Итог ${score} ≥ 3 — градиент нужен. Тип: ${GRAD_TYPES[type]}.`);
    } else reasons.push(`Итог ${score} < 3 — плоский цвет выглядит чище и современнее здесь.`);
    return { type, reasons, score, surf };
  }
  const GRAD_TYPES = { none: 'без градиента', linear: 'линейный (OKLCH)', radial: 'радиальное свечение', mesh: 'многоточечный (mesh)', aurora: 'аврора с зерном' };
  function applyGradient(doc, ctx) {
    const d = decideGradient(doc, ctx);
    doc.decisions = doc.decisions || [];
    doc.decisions.push({ topic: 'Градиент', choice: GRAD_TYPES[d.type], reasons: d.reasons, score: d.score });
    if (d.type === 'none') return;
    for (const { el, big } of d.surf) {
      // на маленьких элементах сложный градиент превращается в «грязь» — там простой линейный
      el.gradType = big > 0.04 || el.role === 'panel' || el.role === 'display' ? d.type : 'linear';
      el.gradSeed = (el.x * 7 + el.y * 13) | 0;
    }
  }
  // Цвета градиента из базового цвета: соседние оттенки в OKLCH, контраст с текстом поверх сохраняется
  function gradFor(type, base, pal, on, seed) {
    const C = SD.color;
    const keep = c => {
      if (!on) return c;
      for (let i = 0; i < 14 && u.contrast(c, on) < 4.5; i++) c = C.shift(c, 0, SD.color.lightness(on) > 0.6 ? -0.025 : 0.025, 0);
      return c;
    };
    const r = n => { const x = Math.sin((seed || 1) * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    if (type === 'linear') return { type, angle: 110 + Math.round(r(1) * 50), colors: [keep(C.shift(base, -22, 0.04, 0.01)), base, keep(C.shift(base, 28, -0.05, 0.02))] };
    if (type === 'radial') return { type, cx: 0.25 + r(2) * 0.2, cy: 0.2 + r(3) * 0.15, colors: [keep(C.shift(base, 12, 0.1, 0.02)), base, keep(C.shift(base, -10, -0.05, 0))] };
    if (type === 'mesh') return { type, grain: 0.14, points: [
      { x: 0.1 + r(4) * 0.2, y: 0.15 + r(5) * 0.2, r: 0.65, a: 0.9, c: keep(C.shift(base, 38, 0.06, 0.03)) },
      { x: 0.75 + r(6) * 0.2, y: 0.25 + r(7) * 0.2, r: 0.6, a: 0.85, c: keep(C.mixOklch(base, pal.accent, 0.45)) },
      { x: 0.45 + r(8) * 0.3, y: 0.85 + r(9) * 0.15, r: 0.7, a: 0.9, c: keep(C.shift(base, -32, -0.04, 0.02)) }] };
    if (type === 'aurora') return { type, grain: 0.24, points: [
      { x: 0.05, y: 0.1, r: 0.8, a: 0.9, c: keep(C.shift(base, 45, 0.08, 0.04)) },
      { x: 0.95, y: 0.2, r: 0.75, a: 0.85, c: keep(C.mixOklch(base, pal.accent, 0.6)) },
      { x: 0.3 + r(10) * 0.4, y: 0.6, r: 0.6, a: 0.7, c: keep(C.shift(base, -40, 0.02, 0.03)) },
      { x: 0.9, y: 0.95, r: 0.7, a: 0.8, c: keep(C.shift(base, 22, 0.12, -0.01)) },
      { x: 0.1, y: 0.95, r: 0.6, a: 0.7, c: keep(C.shift(C.mixOklch(base, pal.accent, 0.3), -20, -0.03, 0.02)) }] };
    return null;
  }
  const ON = { primary: 'onPrimary', accent: 'onAccent', ctaMax: 'onCtaMax', bg: 'text', soft: 'text' };

  function fxFor(ans) {
    if (ans.fx && !ans.fx.auto) return ans.fx;
    const S = ans.styles && ans.styles.length ? ans.styles : ['yandex'];
    const k0 = SD.KITS[S[0]], k1 = S[1] ? SD.KITS[S[1]] : null;
    const eff = k0.effects.slice();
    if (k1 && k1.effects[0] && !eff.includes(k1.effects[0])) eff.push(k1.effects[0]);
    return { auto: true, effects: eff, icons: k0.icons, pattern: 'none', display: 'none', gradient: 'auto' };
    // подсказка набора (например, «Минималистичный» любит радиальное свечение) учитывается правилами градиента
  }


  // ---------- Мотивы стилей (все — обычные редактируемые элементы) ----------
  function motif(ctx, kind, z, roles) {
    const out = motifRaw(ctx, kind, z, roles);
    const grp = u.uid();
    for (const e of out) e.grp = grp; // части одного мотива двигаются вместе
    // декор не выходит из своей зоны влево — туда, где текст
    if (z && !['wave', 'stripe', 'rainbow'].includes(kind)) for (const e of out) if (e.x < z.x) e.x = z.x;
    if (z && kind === 'bigdot' && out.length === 2 && out[1].x < z.x) { const [dot, dash] = out; dash.x = dot.x; dash.y = dot.y + dot.h + dash.h; dash.w = Math.min(dash.w, dot.w); }
    return out;
  }
  function motifRaw(ctx, kind, z, roles) {
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
      case 'swissgrid': {
        // красный блок и тонкие линейки по модульной сетке
        const bw = z.w * 0.55, bh = Math.min(z.h, bw * 1.1);
        out.push(base({ name: 'Красный блок', role: 'decor', x: z.x + z.w - bw, y: z.y + (z.h - bh) / 2, w: bw, h: bh, fillRole: main }));
        for (let k = 0; k < 4; k++) out.push(base({ type: 'line', name: 'Линейка', role: 'decor', x: z.x, y: z.y + z.h * (0.12 + k * 0.25), w: z.w * 0.4, h: 1, stroke: '#000', strokeRole: 'text', strokeW: 0.3 }));
        break;
      }
      case 'brutal': {
        const bw = d0 * 0.9, bh = d0 * 0.6, sw = Math.max(0.6, d0 * 0.02);
        out.push(base({ name: 'Карточка в рамке', role: 'decor', x: z.x + z.w - bw, y: z.y + z.h * 0.1, w: bw, h: bh, fillRole: main, stroke: '#000', strokeRole: 'text', strokeW: sw, shadow: { x: sw * 2, y: sw * 2, blur: 0, colorRole: 'text', alpha: 1 } }));
        out.push(base({ type: 'ellipse', name: 'Круг в рамке', role: 'decor', x: z.x + z.w - bw * 1.1, y: z.y + z.h * 0.1 + bh * 0.75, w: bh * 0.7, h: bh * 0.7, fillRole: second, stroke: '#000', strokeRole: 'text', strokeW: sw }));
        break;
      }
      case 'rainbow': {
        // концентрические дуги из угла зоны
        const R = d0 * 0.98, cx = z.x + z.w, cy = z.y + z.h;
        ['extra', 'primary', 'accent', 'soft', 'bg'].forEach((role, k) => { const r = R * (1 - k * 0.18); out.push(base({ type: 'ellipse', name: 'Дуга', role: 'decor', x: cx - r, y: cy - r, w: r * 2, h: r * 2, fillRole: role })); });
        break;
      }
      case 'y2k': {
        const pw = d0 * 0.95, ph = d0 * 0.34;
        const pill = base({ name: 'Перламутровая пилюля', role: 'decor', x: z.x + z.w - pw, y: z.y + (z.h - ph) / 2, w: pw, h: ph, radius: ph / 2, rot: -12, fillRole: main });
        pill.gradType = 'aurora'; pill.gradSeed = 4;
        out.push(pill);
        [[0.2, 0.1, 0.22, 'extra'], [0.85, 0.05, 0.16, 'accent'], [0.55, 0.85, 0.12, 'extra']].forEach(([fx, fy, k, role]) => { const d = d0 * k; out.push(base({ type: 'star', name: 'Блёстка', role: 'decor', points: 4, inner: 0.28, x: z.x + z.w * fx - d / 2, y: z.y + z.h * fy - d / 2, w: d, h: d, fillRole: role })); });
        break;
      }
      case 'hanko': {
        const d = Math.min(d0 * 0.32, 20);
        out.push(base({ name: 'Печать', role: 'decor', x: z.x + z.w - d - z.w * 0.1, y: z.y + z.h - d - z.h * 0.1, w: d, h: d, radius: d * 0.08, fillRole: main }));
        out.push(base({ type: 'line', name: 'Тонкая вертикаль', role: 'decor', x: z.x + z.w - d * 0.5 - z.w * 0.1 - z.h * 0.3, y: z.y + z.h * 0.35, w: z.h * 0.6, h: 1, rot: 90, stroke: '#000', strokeRole: 'text', strokeW: 0.25 }));
        break;
      }
      case 'bauhaus': {
        const d = d0 * 0.5;
        out.push(base({ type: 'ellipse', name: 'Круг', role: 'decor', x: z.x + z.w - d * 1.9, y: z.y + z.h * 0.08, w: d, h: d, fillRole: main }));
        out.push(base({ name: 'Квадрат', role: 'decor', x: z.x + z.w - d, y: z.y + z.h * 0.08 + d * 0.5, w: d, h: d, fillRole: 'extra' }));
        out.push(base({ type: 'star', name: 'Треугольник', role: 'decor', points: 3, inner: 0.5, x: z.x + z.w - d * 1.6, y: z.y + z.h * 0.08 + d * 0.95, w: d * 1.1, h: d * 1.1, fillRole: second }));
        break;
      }
      case 'glow': {
        // мягкое свечение-прожектор из нескольких полупрозрачных кругов
        const d = d0 * 1.1, cx = z.x + z.w / 2, cy = z.y + z.h / 2;
        for (const [k, a] of [[1, 0.12], [0.72, 0.16], [0.46, 0.22]]) out.push(base({ type: 'ellipse', name: 'Свечение', role: 'decor', x: cx - d * k / 2, y: cy - d * k / 2, w: d * k, h: d * k, fillRole: 'accent', opacity: a }));
        break;
      }
      case 'squircle': {
        const d = d0 * 0.8;
        out.push(base({ name: 'Сквиркл', role: 'decor', x: z.x + z.w - d, y: z.y + (z.h - d) / 2, w: d, h: d, radius: d * 0.3, fillRole: main }));
        out.push(base({ name: 'Малый сквиркл', role: 'decor', x: z.x + z.w - d * 1.2, y: z.y + (z.h + d) / 2 - d * 0.32, w: d * 0.34, h: d * 0.34, radius: d * 0.1, fillRole: second }));
        break;
      }
      case 'orbit': {
        const d = d0 * 1.05, cx = z.x + z.w - d / 2, cy = z.y + z.h / 2, sw = Math.max(0.4, d * 0.012);
        out.push(base({ type: 'ellipse', name: 'Орбита', role: 'decor', x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: 'none', stroke: '#000', strokeRole: main, strokeW: sw }));
        out.push(base({ type: 'ellipse', name: 'Орбита малая', role: 'decor', x: cx - d * 0.33, y: cy - d * 0.33, w: d * 0.66, h: d * 0.66, fill: 'none', stroke: '#000', strokeRole: second, strokeW: sw }));
        out.push(base({ type: 'ellipse', name: 'Спутник', role: 'decor', x: cx + d * 0.35 - d * 0.06, y: cy - d * 0.35 - d * 0.06, w: d * 0.12, h: d * 0.12, fillRole: main }));
        break;
      }
      case 'dotmatrix': {
        const d = d0 * 0.95;
        out.push(base({ type: 'pattern', name: 'Точечная матрица', role: 'decor', kind: 'dotring', cell: u.round(d / 16, 2), x: z.x + z.w - d, y: z.y + (z.h - d) / 2, w: d, h: d, fillRole: 'text', fill2Role: 'accent' }));
        break;
      }
      case 'pills': {
        const pw = d0 * 1.0, ph = d0 * 0.28, x0 = z.x + z.w - pw * 0.9;
        [['primary', 0], ['accent', 1], ['extra', 2]].forEach(([role, i]) => out.push(base({ name: 'Пилюля', role: 'decor', x: x0 - i * ph * 0.35, y: z.y + z.h * 0.1 + i * ph * 1.15, w: pw * (1 - i * 0.15), h: ph, radius: ph / 2, rot: -18, fillRole: role })));
        break;
      }
      case 'ring': {
        const d = d0 * 0.95, sw = d * 0.13;
        const r = base({ type: 'ellipse', name: 'Кольцо', role: 'decor', x: z.x + z.w - d, y: z.y + (z.h - d) / 2, w: d, h: d, fillRole: main });
        r.gradType = 'mesh'; r.gradSeed = 5;
        const hole = base({ type: 'ellipse', name: 'Кольцо (внутри)', role: 'decor', x: r.x + sw, y: r.y + sw, w: d - sw * 2, h: d - sw * 2, fillRole: 'bg' });
        out.push(r, hole);
        break;
      }
      case 'tags': {
        const tw = d0 * 0.75, th = d0 * 0.42;
        [['primary', -14, 0], ['accent', 9, 1]].forEach(([role, rot, i]) => {
          const x = z.x + z.w - tw - i * tw * 0.35, y = z.y + z.h * 0.12 + i * th * 0.9;
          out.push(base({ name: 'Ценник', role: 'decor', x, y, w: tw, h: th, radius: th * 0.18, rot, fillRole: role }));
          out.push(base({ type: 'ellipse', name: 'Дырочка ценника', role: 'decor', x: x + tw * 0.08, y: y + th / 2 - th * 0.08, w: th * 0.16, h: th * 0.16, rot, fillRole: 'bg' }));
        });
        break;
      }
      case 'fullgrad': {
        const g = base({ name: 'Градиентная шапка', role: 'decor', x: z.x, y: z.y, w: z.w, h: z.h, radius: Math.min(z.w, z.h) * 0.08, fillRole: main });
        g.gradType = 'mesh'; g.gradSeed = 9;
        out.push(g);
        break;
      }
      case 'bigprice': {
        const bw = Math.min(z.w, d0 * 1.4), bh = Math.min(z.h, bw * 0.55);
        out.push(base({ name: 'Жёлтый блок', role: 'decor', x: z.x + z.w - bw, y: z.y + (z.h - bh) / 2, w: bw, h: bh, rot: -3, fillRole: second === 'accent' ? 'accent' : second }));
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
    // маркер должен быть светлее/темнее текста, иначе текст на нём пропадёт
    const tc = ctx.pal[title.fillRole] || ctx.pal.text;
    const role = ['primary', 'accent', 'extra', 'soft'].filter(r => ctx.pal[r]).sort((a, b) => u.contrast(tc, ctx.pal[b]) - u.contrast(tc, ctx.pal[a]))[0];
    return base({ name: 'Маркер', role: 'decor', x, y: title.y + L.lineH * 0.52, w, h: hh, fillRole: u.contrast(tc, ctx.pal.primary) >= 3 ? 'primary' : role, cons: { h: 'scale', v: 'scale' } });
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
    ctx.showcase = false;
    const mk0 = ans.mk || {}, T = ans.texts;
    const drop = ctx.drop || new Set();
    const mk = new Proxy(mk0, { get: (o, k) => o[k] && !drop.has(k) });
    const o = Object.assign({}, ans.opts, { qr: ans.opts.qr && !drop.has('qr'), promo: ans.opts.promo && !drop.has('promo') && !(ctx.rc && ctx.rc.promo === 'none'), cta: ans.opts.cta && !ctx.tiny, image: ctx.tiny ? null : ans.opts.image });
    // на визитке волна слишком тонкая — контакты легли бы на гребень
    const motifs = o.motif ? ctx.v.motifs.filter(k => !(ctx.tiny && k === 'wave')) : [];
    const has = k => motifs.includes(k);
    const lay = ans.layout || 'top';
    const align = lay === 'center' || lay === 'diagonal' ? 'center' : (ans.align || 'left');
    const back = [], mid = [], fore = [];
    const gap = m * 0.5;
    const waveH = has('wave') ? H * 0.16 : 0;
    const bottomLimit = waveH ? H - waveH * 1.35 - gap * 0.3 : H - m;
    let zone = null, zoneRoles = null, promoAt = null, limitY = H;
    const pd = ctx.base * 0.25;

    const title = mkTitle(ctx, s), sub = mkSub(ctx, s), body = mkBody(ctx, s);
    const heads = [title, ans.texts.subtitle ? sub : null].filter(Boolean);
    const bodies = ans.texts.body && !ctx.tiny ? [body] : [];
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
      // «витрина»: по центру текст сверху, продукт под ним (Apple, Samsung, Xiaomi)
      const showcase = lay === 'center' && !o.image && !ctx.tiny && ctx.fx.display && ctx.fx.display !== 'none';
      if (showcase) shift = m * 0.3;
      else if (lay === 'center' || lay === 'left') {
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
      ctx.showcase = showcase;
      if (lay === 'left') promoAt = [W - m - pd * 0.5, m + pd * 0.45];

      if (lay === 'top') {
        zone = { x: m, y: textEnd + gap * 1.5, w: W - 2 * m, h: yBottom - textEnd - gap * 2.5 };
        if (o.image) { back.push(mkImage(ctx, zone, ctx.st.radiusK * 80)); zone = { x: W * 0.55, y: zone.y - gap, w: W * 0.5, h: zone.h * 0.5 }; }
      } else if (lay === 'center') {
        if (o.image) { back.push(mkImage(ctx, { x: m, y: m, w: W - 2 * m, h: H * 0.36 }, ctx.st.radiusK * 80)); }
        zone = showcase ? { x: W * 0.12, y: textEnd + gap, w: W * 0.76, h: Math.max(8, yBottom - textEnd - gap * 2) } : { x: W * 0.45, y: -H * 0.08, w: W * 0.62, h: H * 0.3 };
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
      t.x = m * 0.8; t.w = W - m * 1.6; SD.render.fitHeight(t);
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
    // слово не влезло в строку — уменьшаем кегль, а не рвём слово
    if (mid.concat(fore).some(e => { if (e.type !== 'text' || !String(e.text || '').trim()) return false; const L = SD.render.layoutText(e); return L.broken || L.relaxed; })) ctx.overflow = true;
    if (mid.some(e => !e.rot && e.type === 'text' && e.y < m * 0.4)) ctx.overflow = true;

    // Показ продукта (телефон, круг, карточка, наклейка) — в свободной зоне
    const disp = ctx.tiny ? "none" : ctx.fx.display;
    if (disp && disp !== 'none' && zone && (['top', 'left', 'bottom'].includes(lay) || (lay === 'center' && ctx.showcase)) && !(o.image && lay !== 'bottom')) {
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
      const cands = [promoAt || [W - m - d * 0.4, m + d * 0.4], [W - m - d * 0.4, m + d * 0.4], [W - m - d * 0.45, limitY - d * 0.55], [W * 0.5, limitY - d * 0.55], [m + d * 0.45, limitY - d * 0.55], [m + d * 0.45, m + d * 0.4], [W * 0.5, m + d * 0.4]];
      const hits = (cx, cy, dd) => {
        const b = { x: cx - dd / 2, y: cy - dd / 2, w: dd, h: dd };
        return obstacles.reduce((a, o) => Math.max(a, Math.max(0, Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x)) * Math.max(0, Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y)) / Math.max(1, Math.min(dd * dd, o.w * o.h))), 0);
      };
      const clampC = (cx, cy, dd) => [u.clamp(cx, m * 0.6 + dd * 0.6, W - m * 0.6 - dd * 0.6), u.clamp(cy, m * 0.6 + dd * 0.6, H - m * 0.6 - dd * 0.6)];
      let best = null;
      for (const k of [1, 0.8, 0.65]) {
        for (const c0 of cands) { const [cx, cy] = clampC(c0[0], c0[1], d * k); const ov = hits(cx, cy, d * k * 0.9); if (!best || ov < best.ov - 0.001) best = { cx, cy, k, ov }; if (ov < 0.03) break; }
        if (best.ov < 0.03) break;
      }
      if (best.ov < 0.03) fore.push(...mkPromo(ctx, s, best.cx, best.cy, best.k));
      else ctx.notes.push('Бейдж убран: для него не нашлось места, где он не закрывает текст.');
    }
    avoidDecor(ctx, back, mid.concat(fore));
    return [...plate(ctx), ...back, ...mid, ...fore];
  }

  // Фон-подложка во весь лист (например, градиент фуксии или зелёный градиент)
  function plate(ctx) {
    if (!ctx.rc || !ctx.rc.plate) return [];
    const p = base({ name: 'Фон', role: 'bgplate', x: 0, y: 0, w: ctx.W, h: ctx.H, fillRole: 'bg', locked: true, cons: { h: 'left-right', v: 'top-bottom' } });
    p.gradType = ctx.rc.plate; p.gradSeed = 17;
    return [p];
  }

  // Декор, который сливается с текстом поверх него, уменьшаем и сдвигаем к краю; не помогло — убираем
  function avoidDecor(ctx, back, front) {
    const texts = front.filter(e => e.type === 'text' && String(e.text || '').trim()).map(e => ({ e, b: u.aabb(e) }));
    // видимый цвет декора: обводка для контурных фигур, с учётом прозрачности
    const col = el => {
      const c = (!el.fill || el.fill === 'none') ? (ctx.pal[el.strokeRole] || el.stroke || ctx.pal.bg) : (ctx.pal[el.fillRole] || el.fill);
      return (el.opacity != null && el.opacity < 1) ? u.mix(ctx.pal.bg, c, el.opacity) : c;
    };
    const bad = d => {
      const db = u.aabb(d);
      return texts.some(({ e, b }) => {
        const w = Math.min(db.x + db.w, b.x + b.w) - Math.max(db.x, b.x), h = Math.min(db.y + db.h, b.y + b.h) - Math.max(db.y, b.y);
        if (w <= 0 || h <= 0) return false;
        const tc = ctx.pal[e.fillRole] || e.fill;
        const c2 = d.fill2Role ? ctx.pal[d.fill2Role] : d.fill2;
        return Math.min(u.contrast(tc, col(d)), c2 ? u.contrast(tc, c2) : 99) < 4.5 && (w * h) / (b.w * b.h) > 0.02;
      });
    };
    // группы: части одного мотива сдвигаются и уменьшаются вместе
    const groups = [];
    const byGrp = {};
    for (const d of back) {
      // фоновые полосы во всю ширину не трогаем — они задуманы под текстом
      if (d.role !== 'decor' || d.type === 'wave' || (d.type === 'pattern' && d.role === 'pattern') || (d.type === 'rect' && d.w >= ctx.W * 0.95)) continue;
      const key = d.grp || d.id;
      if (!byGrp[key]) { byGrp[key] = []; groups.push(byGrp[key]); }
      byGrp[key].push(d);
    }
    for (const g of groups) {
      const badG = () => g.some(bad);
      for (let t = 0; t < 5 && badG(); t++) {
        const bb = u.unionBox(g.map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h })));
        const cx = bb.x + bb.w / 2 > ctx.W / 2 ? bb.x + bb.w : bb.x, cy = bb.y + bb.h / 2 > ctx.H / 2 ? bb.y + bb.h : bb.y;
        for (const d of g) {
          d.x = cx + (d.x - cx) * 0.75; d.y = cy + (d.y - cy) * 0.75; d.w *= 0.75; d.h *= 0.75;
          if (d.radius) d.radius *= 0.75; if (d.strokeW) d.strokeW *= 0.75; if (d.cell) d.cell *= 0.75;
        }
      }
      if (badG()) for (const d of g) back.splice(back.indexOf(d), 1);
    }
  }

  // ---------- Оборот / внутренние страницы ----------
  function backSide(ctx, idx) {
    const { ans, W, H, m } = ctx;
    const s = sizes(ctx);
    const o = ans.opts;
    const motifs = o.motif ? ctx.v.motifs.filter(k => !(ctx.base < 45 && k === 'wave')) : [];
    const els = [], back = [];
    const gap = m * 0.5;
    const land = W > H;
    const heading = mkTitle(ctx, Object.assign({}, s, { title: s.title * 0.62 }), { name: 'Заголовок оборота', role: 'title2', textKey: ans.kind === 'slides' ? 'subtitle' : 'title', text: ans.kind === 'slides' ? ans.texts.subtitle : ans.texts.title });
    const colW = land ? (W - 2 * m) * 0.6 : W - 2 * m;
    let y = m + (motifs.includes('block') ? m * 0.5 : 0);
    y = stack([heading], m, y, colW, 'left', [gap]);
    for (let g = 0; g < 30 && SD.render.layoutText(heading).broken && heading.size > SIZE_FLOOR.title; g++) { heading.size = u.round(heading.size * 0.93, 1); SD.render.fitHeight(heading); }
    y = heading.y + heading.h + gap;
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
      const lab = ctx.base < 45 ? null : text({ name: 'Подпись QR', role: 'qrLabel', text: 'Наведите камеру', font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.small, 1), align: 'center', fillRole: 'text', x: qr.x - 5, w: q + 10 });
      // на волне подпись не читается — ставим её над кодом
      if (lab) {
      const below = !waveH && qr.y + q + 1 + lab.h < H - Math.max(m * 0.5, 3.5);
      lab.y = below ? qr.y + q + 1 : qr.y - lab.h - 1;
      lab.pin = { id: qr.id, dx: -5, dy: lab.y - qr.y };
      els.push(lab);
      }
    }
    // подгонка: заголовок не рвёт слова, подробности не залезают на контакты и QR
    const limitB = Math.min(H - m, ...els.filter(e => e.role === 'contacts' || (e.type === 'qr' && !land)).map(e => e.y)) - gap * 0.5;
    for (let g = 0; g < 40 && (det.y + det.h > limitB || SD.render.layoutText(det).broken) && det.size > SIZE_FLOOR.body; g++) { det.size = u.round(Math.max(SIZE_FLOOR.body, det.size * 0.93), 1); SD.render.fitHeight(det); }
    if (det.y + det.h > limitB + 0.5) ctx.notes.push('Текст на обороте не помещается — сократите его или выберите формат побольше.');
    // декор в свободном углу
    const z = land ? { x: m + colW + gap, y: m, w: W - colW - 2 * m - gap + m, h: H * 0.4 } : { x: W * 0.55, y: -H * 0.07, w: W * 0.55, h: H * 0.22 };
    for (const k of motifs) {
      if (k === 'wave') back.unshift(...motif(ctx, 'wave', null));
      else if (k === 'dot' || k === 'blobs' || k === 'bigdot') { if (!(land && o.qr)) back.push(...motif(ctx, k, z)); }
    }
    if (idx % 2 === 0 && ans.kind !== 'slides') heading.textKey = 'title';
    avoidDecor(ctx, back, els);
    return [...plate(ctx), ...back, ...els];
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
        if (el.gradType) el.grad = gradFor(el.gradType, el.fill, pal, pal[ON[el.fillRole]] || null, el.gradSeed);
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

  return { variants, palette, withDerived, build, applyPalette, applyTexts, base, text, styleProps, fxFor, decideGradient, gradFor, GRAD_TYPES };
})();
