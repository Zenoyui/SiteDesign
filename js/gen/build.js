// Генератор макета: из ответов пользователя собирает страницы с элементами.
// Каждый элемент помнит свою «роль» цвета и текста, поэтому потом можно
// менять палитру и тексты, не теряя ручных правок в редакторе.
// Здесь сборка документа (подгонка под формат) и публичный SD.gen.

SD.gen = (function (G) {
  const u = SD.u;

  // ---------- Сборка документа ----------
  function build(ans) {
    const f = SD.FORMATS[ans.format] || SD.FORMATS.A5;
    let W = f.w, H = f.h;
    if (!f.fixedOrient && (ans.orient === 'landscape') !== (W > H)) { const t = W; W = H; H = t; }
    const vs = G.variants(ans.styles, ans.fidelity);
    const v = vs[ans.variant] || vs[0];
    let pal = ans.palette ? G.withDerived(Object.assign({}, ans.palette)) : G.palette(v);
    // образ стиля может задать свою палитру (например, «тёмная витрина»)
    if (v.look && v.look.pal && !ans.palette) pal = G.withDerived(Object.assign({}, pal, v.look.pal));
    const st = G.styleProps(ans, v);
    const ctx = { ans, v, pal, st, W, H, T: ans.texts, notes: [], fx: G.fxFor(ans), icons: (SD.INDUSTRIES[ans.industry] || SD.INDUSTRIES.transport).icons };
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
        ctx.drop = new Set(ctx.tiny ? G.DROP_ORDER : []);
        if (ctx.tiny && (G.DROP_ORDER.some(d => d === 'qr' ? ans.opts.qr : d === 'promo' ? ans.opts.promo : ans.mk && ans.mk[d]) || ans.opts.cta || ans.texts.body)) ctx.notes.push('Формат маленький — оставлены только заголовок, подзаголовок и контакты, как на визитке.');
        let k = 1;
        for (let t = 0; t < 30; t++) {
          ctx.fitK = k; ctx.overflow = false; els = G.front(ctx);
          if (!ctx.overflow) break;
          if (k > 0.62) { k *= 0.92; continue; }
          // уменьшать дальше некуда — убираем второстепенные блоки
          const next = G.DROP_ORDER.find(d => !ctx.drop.has(d) && (d === 'qr' ? ans.opts.qr : d === 'promo' ? ans.opts.promo && ans.texts.promo : ans.mk && ans.mk[d]));
          if (!next) break;
          ctx.drop.add(next);
        }
        if (ctx.drop.size && !ctx.tiny) ctx.notes.push('Не хватило места, поэтому убрано: ' + [...ctx.drop].map(d => G.DROP_NAMES[d]).join(', ') + '. Можно выбрать формат побольше или сократить текст.');
        if (ctx.overflow) ctx.notes.push('Текст не помещается на лицевую сторону даже в минимальном кегле — сократите текст или выберите формат побольше.');
        ctx.fitK = 1;
      } else els = (ans.kind === 'slides' && i === n - 1 && n > 2) ? G.finale(ctx) : G.backSide(ctx, i);
      pages.push({ id: u.uid(), name: pageName(ans, i, n), bg: pal.bg, bgRole: 'bg', elements: els });
    }
    const doc = { w: W, h: H, format: ans.format, orient: ans.orient, pages, dirty: false, notes: ctx.notes };
    if (ctx.fx.pattern && ctx.fx.pattern !== 'none') for (const pg of pages) pg.elements.unshift(G.mkPattern(ctx, ctx.fx.pattern));
    G.applyEffects(doc, ctx);
    G.applyGradient(doc, ctx);
    applyPalette(doc, pal);
    return doc;
  }
  function pageName(ans, i, n) {
    if (ans.kind === 'slides') return 'Слайд ' + (i + 1);
    if (n === 2) return i ? 'Оборот' : 'Лицевая';
    return 'Страница ' + (i + 1);
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
        if (el.gradType) el.grad = G.gradFor(el.gradType, el.fill, pal, pal[G.ON[el.fillRole]] || null, el.gradSeed);
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

  return { variants: G.variants, palette: G.palette, withDerived: G.withDerived, build, applyPalette, applyTexts, base: G.base, text: G.text, styleProps: G.styleProps, fxFor: G.fxFor, decideGradient: G.decideGradient, gradFor: G.gradFor, GRAD_TYPES: G.GRAD_TYPES };
})(SD._gen);
