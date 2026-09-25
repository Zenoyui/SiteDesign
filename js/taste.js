// Вкус пользователя: учится на выборе «какой вариант нравится больше»
// (попарные сравнения, модель Брэдли — Терри в простом виде) и подсказывает автопилоту.

SD.taste = (function () {
  const KEY = 'sitedesign.taste';
  let w = {}, n = 0;
  function load() { const o = SD.u.store.get(KEY); if (o) { w = o.w || {}; n = o.n || 0; } }
  function save() { SD.u.store.set(KEY, { w, n }); }
  function reset() { w = {}; n = 0; SD.u.store.del(KEY); }

  // Признаки варианта: стиль, шрифт, приёмы, раскладка, эффекты, градиент, светлый/тёмный фон
  function features(ans, doc) {
    const f = {};
    const v = SD.gen.variants(ans.styles, ans.fidelity)[ans.variant] || {};
    if (v.colorsFrom) f['style:' + v.colorsFrom] = 1;
    if (v.fontFrom) f['font:' + SD.STYLES[v.fontFrom].font] = 1;
    for (const m of v.motifs || []) f['motif:' + m] = 1;
    f['layout:' + ans.layout] = 1;
    if (!['center', 'diagonal'].includes(ans.layout)) f['align:' + (ans.align || 'left')] = 1;
    f['title:' + ((ans.titleScale || 1) >= 1.2 ? 'big' : 'normal')] = 1;
    const fx = SD.gen.fxFor(ans);
    for (const e of fx.effects || []) f['fx:' + e] = 1;
    if (fx.pattern && fx.pattern !== 'none') f['pattern:' + fx.pattern] = 1;
    if (fx.display && fx.display !== 'none') f['display:' + fx.display] = 1;
    if (doc) {
      const d = (doc.decisions || []).find(x => x.topic === 'Градиент');
      const t = d ? Object.keys(SD.gen.GRAD_TYPES).find(k => SD.gen.GRAD_TYPES[k] === d.choice) : 'none';
      f['grad:' + (t || 'none')] = 1;
      f['bg:' + (SD.u.lum(doc.pages[0].bg) < 0.35 ? 'dark' : 'light')] = 1;
    }
    return f;
  }
  function update(win, lose) {
    for (const k of new Set([...Object.keys(win), ...Object.keys(lose)])) {
      w[k] = (w[k] || 0) + (win[k] || 0) - (lose[k] || 0);
      if (!w[k]) delete w[k];
    }
    n++; save();
  }
  // Бонус к оценке: от −10 до +10, растёт с числом сделанных выборов
  function bonus(ans, doc) {
    if (!n) return 0;
    const f = features(ans, doc);
    let sum = 0;
    for (const k in f) sum += (w[k] || 0) * f[k];
    const conf = Math.min(1, n / 8);
    return Math.round(Math.tanh(sum / 3) * 10 * conf);
  }
  function label(k) {
    const [t, v] = k.split(':');
    switch (t) {
      case 'style': return `стиль «${(SD.STYLES[v] || {}).name || v}»`;
      case 'font': return `шрифт ${v}`;
      case 'motif': return SD.MOTIF_NAMES[v] || v;
      case 'layout': return `расположение «${(SD.LAYOUTS[v] || {}).name || v}»`;
      case 'align': return v === 'center' ? 'текст по центру' : v === 'right' ? 'текст справа' : 'текст по левому краю';
      case 'title': return v === 'big' ? 'крупный заголовок' : 'обычный заголовок';
      case 'fx': return `эффект «${(SD.EFFECTS[v] || {}).name || v}»`;
      case 'pattern': return `узор «${(SD.PATTERNS[v] || {}).name || v}»`;
      case 'display': return `показ «${(SD.DISPLAYS[v] || {}).name || v}»`;
      case 'grad': return v === 'none' ? 'без градиента' : `градиент: ${SD.gen.GRAD_TYPES[v]}`;
      case 'bg': return v === 'dark' ? 'тёмный или цветной фон' : 'светлый фон';
    }
    return k;
  }
  function summary() {
    const e = Object.entries(w).sort((a, b) => b[1] - a[1]);
    return { n, likes: e.filter(x => x[1] > 0).slice(0, 5).map(x => label(x[0])), dislikes: e.filter(x => x[1] < 0).slice(-3).reverse().map(x => label(x[0])) };
  }
  load();
  return { features, update, bonus, summary, reset, count: () => n, _w: () => w };
})();
