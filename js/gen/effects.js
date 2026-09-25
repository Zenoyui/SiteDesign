// Генератор: эффекты стиля, узоры и решение «нужен ли градиент и какой».
// Правила градиента собраны из исследований восприятия.

(function (G) {
  const u = SD.u;

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
    return G.base({ type: 'pattern', name: 'Узор', role: 'pattern', kind, cell: u.round(ctx.base * cellK, 2), seed: 11, x: 0, y: 0, w: ctx.W, h: ctx.H,
      fillRole: useText ? 'text' : 'primary', fill2Role: 'accent', opacity: useText ? 0.07 : 0.16, locked: true, cons: { h: 'left-right', v: 'top-bottom' } });
  }
  // ---------- Градиент: нужен ли и какой ----------
  // Правила собраны из исследований восприятия (источники — SD.BRAIN_SOURCES в data/marketing.js).
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
    if (!surf.length) {
      if (setting !== 'auto' && setting !== 'none' && SD.color.chroma(ctx.pal.bg) > 0.05) return { type: setting, reasons: ['Цветных плашек нет — градиент положен на фон листа.'], score: null, surf, plateBg: true };
      return { type: 'none', reasons: ['На макете нет цветных поверхностей, куда можно положить градиент (кнопка и плашки тёмные или серые).'], score: null, surf };
    }
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
    if (d.plateBg) for (const p of doc.pages) if (!p.elements.some(e => e.role === 'bgplate')) {
      const pl = G.base({ name: 'Фон', role: 'bgplate', x: 0, y: 0, w: ctx.W, h: ctx.H, fillRole: 'bg', locked: true, cons: { h: 'left-right', v: 'top-bottom' } });
      pl.gradType = d.type; pl.gradSeed = 17;
      p.elements.unshift(pl);
    }
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
      for (let i = 0; i < 16 && u.contrast(c, on) < 5; i++) c = C.shift(c, 0, SD.color.lightness(on) > 0.6 ? -0.025 : 0.025, 0); // с запасом на смешение пятен
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

  Object.assign(G, { applyEffects, mkPattern, decideGradient, GRAD_TYPES, applyGradient, gradFor, ON, fxFor });
})(SD._gen = SD._gen || {});
