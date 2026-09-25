// Генератор: оборот и внутренние страницы, финальный слайд презентации.

(function (G) {
  const u = SD.u;

  // ---------- Оборот / внутренние страницы ----------
  function backSide(ctx, idx) {
    const { ans, W, H, m } = ctx;
    const s = G.sizes(ctx);
    const o = ans.opts;
    const motifs = o.motif ? ctx.v.motifs.filter(k => !(ctx.base < 45 && k === 'wave')) : [];
    const els = [], back = [];
    const gap = m * 0.5;
    const land = W > H;
    const heading = G.mkTitle(ctx, Object.assign({}, s, { title: s.title * 0.62 }), { name: 'Заголовок оборота', role: 'title2', textKey: ans.kind === 'slides' ? 'subtitle' : 'title', text: ans.kind === 'slides' ? ans.texts.subtitle : ans.texts.title });
    const colW = land ? (W - 2 * m) * 0.6 : W - 2 * m;
    let y = m + (motifs.includes('block') ? m * 0.5 : 0);
    y = G.stack([heading], m, y, colW, 'left', [gap]);
    for (let g = 0; g < 30 && SD.render.layoutText(heading).broken && heading.size > G.SIZE_FLOOR.title; g++) { heading.size = u.round(heading.size * 0.93, 1); SD.render.fitHeight(heading); }
    y = heading.y + heading.h + gap;
    if (motifs.includes('block')) { back.push(G.headPanel(ctx, [heading], m * 0.45)); y += m * 0.45; }
    if (motifs.includes('stripe')) back.push(G.marker(ctx, heading));
    const detKey = ans.kind === 'slides' ? 'body' : 'details';
    const det = G.text({ name: 'Подробности', role: 'details', textKey: detKey, text: ans.texts[detKey] || '', font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.body * 1.1, 1), lh: 1.5, fillRole: 'text', w: colW });
    G.stack([det], m, y + gap * 0.4, colW, 'left', [0]);
    els.push(heading, det);
    const waveH = motifs.includes('wave') ? H * 0.16 : 0;
    if (o.contacts && ans.texts.contacts) {
      const c = G.mkSmall(ctx, s, 'contacts', { x: m, w: W - 2 * m - (o.qr ? ctx.base * 0.2 + gap : 0) });
      SD.render.fitHeight(c);
      c.y = H - m * (waveH ? 0.7 : 1) - c.h;
      c.cons = { h: 'scale', v: 'scale' };
      if (waveH) c.fillRole = 'onPrimary';
      els.push(c);
    }
    if (o.qr) {
      const q = ctx.base * (land ? 0.3 : 0.24);
      const qr = G.mkQr(ctx, s, W - m - q, land ? (H - q) / 2 : H - m - q - waveH * 0.6, q)[0];
      els.push(qr);
      const lab = ctx.base < 45 ? null : G.text({ name: 'Подпись QR', role: 'qrLabel', text: 'Наведите камеру', font: ctx.st.font, weight: ctx.st.bw, size: u.round(s.small, 1), align: 'center', fillRole: 'text', x: qr.x - 5, w: q + 10 });
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
    for (let g = 0; g < 40 && (det.y + det.h > limitB || SD.render.layoutText(det).broken) && det.size > G.SIZE_FLOOR.body; g++) { det.size = u.round(Math.max(G.SIZE_FLOOR.body, det.size * 0.93), 1); SD.render.fitHeight(det); }
    if (det.y + det.h > limitB + 0.5) ctx.notes.push('Текст на обороте не помещается — сократите его или выберите формат побольше.');
    // декор в свободном углу
    const z = land ? { x: m + colW + gap, y: m, w: W - colW - 2 * m - gap + m, h: H * 0.4 } : { x: W * 0.55, y: -H * 0.07, w: W * 0.55, h: H * 0.22 };
    for (const k of motifs) {
      if (k === 'wave') back.unshift(...G.motif(ctx, 'wave', null));
      else if (k === 'dot' || k === 'blobs' || k === 'bigdot') { if (!(land && o.qr)) back.push(...G.motif(ctx, k, z)); }
    }
    if (idx % 2 === 0 && ans.kind !== 'slides') heading.textKey = 'title';
    G.avoidDecor(ctx, back, els);
    return [...G.plate(ctx), ...back, ...els];
  }

  // Последний слайд презентации
  function finale(ctx) {
    const { ans, W, H, m } = ctx;
    const s = G.sizes(ctx);
    const els = [];
    els.push(G.base({ name: 'Фон', role: 'decor', under: true, x: 0, y: 0, w: W, h: H, fillRole: 'primary', cons: { h: 'left-right', v: 'top-bottom' } }));
    const t = G.mkTitle(ctx, s, { textKey: 'cta', text: ans.texts.cta || 'Спасибо!', align: 'center', fillRole: 'onPrimary' });
    const c = G.mkSmall(ctx, s, 'contacts', { align: 'center', fillRole: 'onPrimary' });
    G.stack([t, c], m, H * 0.36, W - 2 * m, 'center', [m * 0.5]);
    els.push(t, c);
    if (ctx.ans.opts.motif) els.splice(1, 0, ...G.motif(ctx, ctx.v.motifs[0] === 'wave' ? 'wave' : ctx.v.motifs[0], { x: W * 0.62, y: -H * 0.1, w: W * 0.45, h: H * 0.45 }, { main: 'accent', second: 'bg', dash: 'bg' }));
    return els;
  }

  Object.assign(G, { backSide, finale });
})(SD._gen = SD._gen || {});
