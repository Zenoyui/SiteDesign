// Генератор: лицевая сторона во всех композициях, фон-подложка и увод декора из-под текста.

(function (G) {
  const PT = SD.PT, u = SD.u;

  // ---------- Лицевая сторона ----------
  function front(ctx) {
    const { ans, W, H, m, st } = ctx;
    const s = G.sizes(ctx);
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

    const title = G.mkTitle(ctx, s), sub = G.mkSub(ctx, s), body = G.mkBody(ctx, s);
    const heads = [title, ans.texts.subtitle ? sub : null].filter(Boolean);
    const bodies = ans.texts.body && !ctx.tiny ? [body] : [];
    const eyebrow = mk.urgency && T.urgency ? G.mkEyebrow(ctx, s) : null;
    if (eyebrow && lay !== 'diagonal') heads.unshift(eyebrow);
    if (mk.benefits) {
      const rows = [1, 2, 3].map(i => ({ icon: ctx.icons[i - 1], key: 'benefit' + i, name: 'Выгода ' + i, role: 'benefit' })).filter(r => T[r.key]);
      if (rows.length) bodies.push(G.mkRows(ctx, s.body, rows, ctx.st.sw));
    }
    if (mk.price && T.priceNew) bodies.push(G.mkPrice(ctx, s));
    // кнопка + стрелка + строки доверия
    function ctaBlock(x, y, colW, al) {
      const els = [];
      let end = y;
      if (o.cta && T.cta) {
        const c = G.mkCta(ctx, s, x, y, colW, al, mk.contrastCta ? 'ctaMax' : undefined);
        els.push(...c); end = y + c[0].h;
        if (mk.arrow) { const a = G.mkArrow(ctx, c[0], al); if (a) els.push(a); }
      }
      const rows = [];
      if (mk.proof && T.proof) rows.push({ icon: 'star', key: 'proof', name: 'Отзывы', role: 'proof' });
      if (mk.guarantee && T.guarantee) rows.push({ icon: 'shield', key: 'guarantee', name: 'Гарантия', role: 'guarantee' });
      if (rows.length) {
        const g = G.mkRows(ctx, s.small, rows);
        const yy = els.length ? end + gap * 0.7 : y;
        g.place(x, yy, colW, al); els.push(...g.els); end = yy + g.h;
      }
      return { els, end };
    }

    // Нижняя строка: контакты и QR
    const contacts = o.contacts && ans.texts.contacts ? G.mkSmall(ctx, s) : null;
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
        qr = G.mkQr(ctx, s, x + w - q, (contacts && !waveH ? contacts.y + contacts.h : yb) - q, q)[0];
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
      let y = G.stack(heads, m, y0, colW, align, [gap * 0.5, gap]);
      if (has('block')) { back.push(G.headPanel(ctx, heads, m * 0.55)); y += m * 0.55; }
      y = G.stack(bodies, m, y + gap * 0.3, colW, align, [gap]);
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
      G.flat([...heads, ...bodies]).concat(cta, back).forEach(e => { e.y += shift; });
      if (has('stripe')) back.push(G.marker(ctx, title));
      mid.push(...G.flat(heads), ...G.flat(bodies), ...cta);
      const textEnd = groupEnd + shift;
      if (lay === 'top') promoAt = [W - m - pd * 0.45, textEnd + gap + pd * 0.45];
      ctx.showcase = showcase;
      if (lay === 'left') promoAt = [W - m - pd * 0.5, m + pd * 0.45];

      if (lay === 'top') {
        zone = { x: m, y: textEnd + gap * 1.5, w: W - 2 * m, h: yBottom - textEnd - gap * 2.5 };
        if (o.image) { back.push(G.mkImage(ctx, zone, ctx.st.radiusK * 80)); zone = { x: W * 0.55, y: zone.y - gap, w: W * 0.5, h: zone.h * 0.5 }; }
      } else if (lay === 'center') {
        if (o.image) { back.push(G.mkImage(ctx, { x: m, y: m, w: W - 2 * m, h: H * 0.36 }, ctx.st.radiusK * 80)); }
        zone = showcase ? { x: W * 0.12, y: textEnd + gap, w: W * 0.76, h: Math.max(8, yBottom - textEnd - gap * 2) } : { x: W * 0.45, y: -H * 0.08, w: W * 0.62, h: H * 0.3 };
        if (has('stripe') || has('block')) zone = { x: m, y: Math.min(textEnd + gap, yBottom - H * 0.14), w: W - 2 * m, h: Math.max(8, yBottom - textEnd - gap * 2) };
      } else {
        const zx = m + colW + gap;
        if (o.image) back.push(G.mkImage(ctx, { x: W * 0.62, y: 0, w: W * 0.38, h: H }, 0));
        zone = { x: zx, y: m, w: W - zx + m * 0.4, h: H - 2 * m - waveH };
      }
    } else if (lay === 'bottom' || lay === 'split') {
      // картинка сверху уменьшается, если тексту не хватает места
      const topH = H * (lay === 'split' ? 0.5 : 0.42) * Math.max(0.55, ctx.fitK || 1);
      const topZone = { x: 0, y: 0, w: W, h: topH };
      promoAt = lay === 'split' ? [W - m - pd * 0.4, m + pd * 0.4] : [W - m - pd * 0.45, topH - pd * 0.3];
      let y;
      if (lay === 'split' && !o.image) {
        back.push(G.base({ name: 'Верхняя зона', role: 'decor', under: true, x: 0, y: 0, w: W, h: topH, fillRole: 'primary', cons: { h: 'left-right', v: 'scale' } }));
        heads.forEach(e => { if (!e.keepColor) e.fillRole = 'onPrimary'; });
        const hh = heads.reduce((a, e) => { e.w = W - 2 * m; SD.render.fitHeight(e); return a + e.h; }, 0) + gap * 0.5;
        G.stack(heads, m, topH - m * 0.8 - hh, W - 2 * m, align, [gap * 0.5]);
        y = topH + m * 0.8;
        zone = { x: W * 0.5, y: m * 0.6, w: W * 0.5 - m * 0.6, h: Math.max(6, topH - m * 1.4 - hh - gap) };
        zoneRoles = { main: 'accent', second: 'bg', dash: 'bg' };
        if (has('wave')) zoneRoles = { main: 'accent', second: 'soft' };
      } else {
        if (o.image) back.push(G.mkImage(ctx, topZone, 0));
        else { back.push(G.base({ name: 'Фон картинки', role: 'decor', under: true, x: 0, y: 0, w: W, h: topH, fillRole: 'soft', cons: { h: 'left-right', v: 'scale' } })); zone = { x: m, y: m, w: W - 2 * m, h: topH - 2 * m }; }
        y = G.stack(heads, m, topH + m * 0.8 + (has('block') ? m * 0.4 : 0), W - 2 * m, align, [gap * 0.5, gap]);
        if (has('block')) { back.push(G.headPanel(ctx, heads, m * 0.45)); y += m * 0.45; }
        if (has('stripe')) back.push(G.marker(ctx, title));
      }
      const yBottom = bottomRow(m, W - 2 * m, align);
      limitY = yBottom;
      y = G.stack(bodies, m, y + gap * 0.3, W - 2 * m, align, [gap]);
      mid.push(...G.flat(heads), ...G.flat(bodies));
      mid.push(...ctaBlock(m, y, W - 2 * m, align).els);
      if (has('stripe') && lay === 'split' && !o.image) zone = { x: 0, y: topH - 5, w: W, h: 10 };
      if (lay === 'split' && zone && has('stripe')) zoneRoles = { main: 'accent', second: 'text' };
    } else { // diagonal
      const bigS = Object.assign({}, s, { title: s.title * 1.45 });
      const t = G.mkTitle(ctx, bigS, { align: 'center', upper: true, lh: 1 });
      t.x = m; t.w = W - m * 2; SD.render.fitHeight(t);
      const cy = H * 0.34;
      t.y = cy - t.h / 2; t.rot = -8; t.fillRole = 'onPrimary';
      const pad = t.size * PT * 0.35;
      back.push(G.base({ name: 'Лента', role: 'decor', under: true, x: -W * 0.15, y: t.y - pad, w: W * 1.3, h: t.h + pad * 2, rot: -8, fillRole: 'primary', cons: { h: 'left-right', v: 'scale' } }));
      mid.push(t);
      const yBottom = bottomRow(m, W - 2 * m, 'center');
      limitY = yBottom;
      let y = cy + t.h / 2 + W * 0.09 + m * 0.6;
      const lower = [eyebrow, ans.texts.subtitle ? sub : null, ...bodies].filter(Boolean);
      y = G.stack(lower, m, y, W - 2 * m, 'center', [gap * 0.6, gap]);
      mid.push(...G.flat(lower));
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
      if (fits(1) || ((ctx.fitK || 1) < 0.6 && fits(0.55))) mid.push(...G.mkDisplay(ctx, disp, vz, s));
      else if ((ctx.fitK || 1) >= 0.6) ctx.overflow = true; // освобождаем место: уменьшаем текст
      else ctx.displaySkipped = true;
    }

    // Мотивы
    const allowZone = { block: ['top', 'bottom', 'left'], stripe: ['top', 'center', 'bottom', 'split'] };
    for (const k of motifs) {
      if (k === 'wave') { back.unshift(...G.motif(ctx, 'wave', null)); continue; }
      if (allowZone[k] && !allowZone[k].includes(lay)) continue;
      if (!zone) continue;
      const z = zone;
      back.push(...G.motif(ctx, k, z, zoneRoles));
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
      // место проверяем по настоящим размерам бейджа (таблетка и блок шире звезды)
      const realHits = els => {
        const b0 = u.aabb(els[0]), k0 = els[0].type === 'star' ? 0.12 : 0.02;
        const b = { x: b0.x + b0.w * k0, y: b0.y + b0.h * k0, w: b0.w * (1 - 2 * k0), h: b0.h * (1 - 2 * k0) };
        if (b.x < m * 0.5 || b.y < m * 0.5 || b.x + b.w > W - m * 0.5 || b.y + b.h > H - m * 0.5) return 1;
        return obstacles.reduce((a, o) => Math.max(a, Math.max(0, Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x)) * Math.max(0, Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y)) / Math.max(1, Math.min(b.w * b.h, o.w * o.h))), 0);
      };
      let best = null;
      for (const k of [1, 0.8, 0.65]) {
        for (const c0 of cands) {
          const [cx, cy] = clampC(c0[0], c0[1], d * k);
          const els = G.mkPromo(ctx, s, cx, cy, k);
          const ov = realHits(els);
          if (!best || ov < best.ov - 0.001) best = { els, ov };
          if (ov < 0.03) break;
        }
        if (best.ov < 0.03) break;
      }
      if (best.ov < 0.03) fore.push(...best.els);
      else ctx.notes.push('Бейдж убран: для него не нашлось места, где он не закрывает текст.');
    }
    avoidDecor(ctx, back, mid.concat(fore));
    return [...plate(ctx), ...back, ...mid, ...fore];
  }

  // Фон-подложка во весь лист (например, градиент фуксии или зелёный градиент)
  function plate(ctx) {
    if (!ctx.rc || !ctx.rc.plate) return [];
    const p = G.base({ name: 'Фон', role: 'bgplate', x: 0, y: 0, w: ctx.W, h: ctx.H, fillRole: 'bg', locked: true, cons: { h: 'left-right', v: 'top-bottom' } });
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
      if (d.role !== 'decor' || d.type === 'wave' || (d.type === 'pattern' && d.role === 'pattern') || d.under) continue;
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

  Object.assign(G, { front, plate, avoidDecor });
})(SD._gen = SD._gen || {});
