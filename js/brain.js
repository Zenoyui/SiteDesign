// «Дизайн-мозг»: оценивает макет так, как его за доли секунды оценит человек,
// и перебирает варианты, чтобы выбрать лучший. Каждый критерий опирается на исследование:
//  • первое впечатление за 50 мс зависит от визуальной сложности и типичности (Lindgaard 2006, Tuch 2012);
//  • красиво то, что легко обработать: контраст, симметрия, порядок (Reber, Schwarz, Winkielman 2004);
//  • выделяется и запоминается отличающееся — кнопка (эффект изоляции, фон Ресторфф 1933);
//  • чем больше вариантов и блоков, тем медленнее решение (закон Хика; Iyengar & Lepper 2000);
//  • гармония выше при близких оттенках, цвета любят по ассоциациям (Ou & Luo 2006; Palmer & Schloss 2010);
//  • решение принимает быстрая «Система 1» — макет должен считываться без усилия (Kahneman 2011).

SD.brain = (function () {
  const u = SD.u, C = SD.color;

  const CRITERIA = [
    { key: 'legibility', name: 'Читаемость', w: 18, src: 'Проверка текста: кегль, контраст, края' },
    { key: 'hierarchy', name: 'Иерархия', w: 12, src: 'Система 1: главное видно первым (Kahneman)' },
    { key: 'complexity', name: 'Простота', w: 12, src: 'Визуальная сложность и первое впечатление (Tuch 2012)' },
    { key: 'space', name: 'Воздух', w: 9, src: 'Лёгкость обработки (Reber 2004)' },
    { key: 'cta', name: 'Заметность кнопки', w: 10, src: 'Эффект изоляции (фон Ресторфф)' },
    { key: 'harmony', name: 'Гармония цвета', w: 10, src: 'Близкие оттенки, 60-30-10 (Ou & Luo; Palmer & Schloss)' },
    { key: 'balance', name: 'Баланс', w: 7, src: 'Симметрия и равновесие (Reber 2004)' },
    { key: 'load', name: 'Нагрузка', w: 10, src: 'Закон Хика, перегрузка выбором (Iyengar 2000)' },
    { key: 'proto', name: 'Типичность для сферы', w: 7, src: 'Прототипичность (Tuch 2012)' },
    { key: 'order', name: 'Порядок', w: 5, src: 'Выравнивание по общим линиям (гештальт, Reber 2004)' }
  ];
  const WORD_BUDGET = { A3: 60, A4: 70, A5: 50, A6: 35, DL: 45, SQ: 35, SLIDE: 30 };

  // Небольшой растр страницы для «взгляда»
  function look(doc, page, longSide = 180) {
    const k = longSide / Math.max(doc.w, doc.h);
    const c = document.createElement('canvas');
    c.width = Math.max(8, Math.round(doc.w * k)); c.height = Math.max(8, Math.round(doc.h * k));
    SD.render.drawPage(c.getContext('2d'), doc, { bg: page.bg, elements: page.elements }, k);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const W = c.width, H = c.height, N = W * H;
    const lum = new Float32Array(N);
    for (let i = 0; i < N; i++) lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    return { d, W, H, N, lum, k };
  }

  function score(doc, ans, opts = {}) {
    const page = doc.pages[0];
    const L = look(doc, page);
    const parts = {};
    const why = {};
    const texts = page.elements.filter(e => e.type === 'text' && e.visible !== false && String(e.text || '').trim());

    // 1. Читаемость — жёсткое условие
    const issues = opts.lint || SD.lint.check(doc, { contrast: opts.contrast !== false });
    const errs = issues.filter(i => i.level === 'error').length, warns = issues.filter(i => i.level === 'warn' && i.code !== 'note').length;
    parts.legibility = errs ? Math.max(0, 0.4 - errs * 0.1) : Math.max(0.6, 1 - warns * 0.08);
    why.legibility = errs ? `Ошибок текста: ${errs} — такой макет нельзя печатать` : warns ? `Замечаний: ${warns}` : 'Текст читается, влезает, не заходит на поля';

    // 2. Иерархия: заголовок заметно крупнее остального и один главный
    const title = texts.find(t => t.role === 'title');
    const others = texts.filter(t => t !== title && !['promoText', 'ctaText'].includes(t.role));
    const maxOther = Math.max(1, ...others.map(t => t.size));
    const ratio = title ? title.size / maxOther : 0;
    parts.hierarchy = title ? u.clamp((ratio - 1.2) / (2.2 - 1.2), 0, 1) : 0;
    why.hierarchy = title ? `Заголовок в ${u.round(ratio, 1)} раза крупнее следующего текста (хорошо от 2)` : 'Нет заголовка';

    // 3. Визуальная сложность: доля «рёбер» на растре
    let edges = 0;
    for (let y = 1; y < L.H - 1; y++) for (let x = 1; x < L.W - 1; x++) {
      const i = y * L.W + x;
      const gx = L.lum[i + 1] - L.lum[i - 1], gy = L.lum[i + L.W] - L.lum[i - L.W];
      if (gx * gx + gy * gy > 0.02) edges++;
    }
    const ed = edges / L.N;
    const objects = page.elements.filter(e => e.visible !== false && e.role !== 'pattern').length;
    // низкая и средняя сложность нравятся больше всего; совсем пусто — скучно
    parts.complexity = u.clamp(1 - Math.max(0, ed - 0.13) / 0.12, 0, 1) * (ed < 0.03 ? 0.7 : 1) * u.clamp(1 - Math.max(0, objects - 22) / 20, 0.4, 1);
    why.complexity = `Плотность деталей ${Math.round(ed * 100)}% (спокойно до 13%), элементов: ${objects}`;

    // 4. Воздух: доля спокойных областей (без деталей)
    let calm = 0;
    const B = 4;
    for (let by = 0; by + B <= L.H; by += B) for (let bx = 0; bx + B <= L.W; bx += B) {
      let mn = 1, mx = 0;
      for (let y = by; y < by + B; y++) for (let x = bx; x < bx + B; x++) { const v = L.lum[y * L.W + x]; if (v < mn) mn = v; if (v > mx) mx = v; }
      if (mx - mn < 0.06) calm++;
    }
    const calmR = calm / (Math.floor(L.H / B) * Math.floor(L.W / B));
    parts.space = u.clamp((calmR - 0.4) / 0.3, 0, 1);
    why.space = `Спокойных областей ${Math.round(calmR * 100)}% (хорошо от 70%)`;

    // 5. Заметность кнопки: её контраст с фоном выше, чем у других цветных пятен
    const cta = page.elements.find(e => e.role === 'cta');
    const needCta = ['sell', 'event', 'inform'].includes(ans.goal);
    if (cta) {
      const c0 = u.contrast(cta.fill, page.bg);
      const rivals = page.elements.filter(e => e !== cta && ['rect', 'ellipse', 'star', 'wave'].includes(e.type) && e.fill && e.role !== 'pattern' && e.w * e.h < doc.w * doc.h * 0.3);
      const stronger = rivals.filter(e => u.contrast(e.fill, page.bg) > c0 + 0.3).length;
      parts.cta = u.clamp(Math.min(c0, 7) / 7, 0, 1) * (stronger === 0 ? 1 : stronger <= 2 ? 0.8 : 0.55);
      why.cta = `Контраст кнопки с фоном ${u.round(c0, 1)}:1, ярче неё элементов: ${stronger}`;
    } else { parts.cta = needCta ? 0.3 : 0.8; why.cta = needCta ? 'Нет кнопки-призыва, а цель требует действия' : 'Кнопка не нужна для этой цели'; }

    // 6. Гармония: число заметных оттенков, их близость, 60-30-10
    const buckets = {};
    let colored = 0;
    for (let i = 0; i < L.N; i += 3) {
      const hex = u.rgbToHex(L.d[i * 4], L.d[i * 4 + 1], L.d[i * 4 + 2]);
      const [l, c, h] = C.toOklch(hex);
      if (c < 0.04) continue;
      colored++;
      const hb = Math.round(h / 30) % 12;
      buckets[hb] = (buckets[hb] || 0) + 1;
    }
    const total = L.N / 3;
    const hues = Object.entries(buckets).filter(([, n]) => n / total > 0.015).map(([h]) => +h * 30);
    let spread = 0;
    for (let i = 0; i < hues.length; i++) for (let j = i + 1; j < hues.length; j++) spread = Math.max(spread, C.hueDist(hues[i], hues[j]));
    const colorShare = colored / total;
    // цветов много и они разбросаны — хуже; один-два оттенка или пара с контрастным акцентом — лучше
    const hueScore = hues.length <= 1 ? 1 : hues.length === 2 ? (spread <= 60 || spread >= 150 ? 1 : 0.85) : hues.length === 3 ? (spread <= 90 ? 0.8 : 0.65) : hues.length === 4 ? 0.5 : 0.35;
    // 60-30-10: цвет (не фон) должен занимать примерно 15–45% листа
    const shareScore = colorShare < 0.06 ? 0.6 : colorShare < 0.15 ? 0.85 : colorShare <= 0.45 ? 1 : u.clamp(1 - (colorShare - 0.45) / 0.35, 0.45, 1);
    parts.harmony = hueScore * shareScore;
    why.harmony = `Заметных оттенков: ${hues.length}, цветом занято ${Math.round(colorShare * 100)}% листа`;

    // 7. Баланс: центр визуального веса
    let sx = 0, sy = 0, sw = 0;
    const bgL = u.lum(page.bg);
    for (let y = 0; y < L.H; y += 2) for (let x = 0; x < L.W; x += 2) {
      const v = Math.abs(L.lum[y * L.W + x] - Math.sqrt(bgL));
      sx += x * v; sy += y * v; sw += v;
    }
    const cx = sw ? sx / sw / L.W : 0.5, cy = sw ? sy / sw / L.H : 0.5;
    const off = Math.hypot(cx - 0.5, (cy - 0.5) * 0.8);
    parts.balance = u.clamp(1 - Math.max(0, off - 0.08) / 0.22, 0, 1);
    why.balance = `Центр тяжести смещён на ${Math.round(off * 100)}% от центра`;

    // 8. Нагрузка: слова и число блоков
    const words = texts.reduce((a, t) => a + String(t.text).split(/\s+/).filter(w => /[А-Яа-яA-Za-z0-9]/.test(w)).length, 0);
    const budget = WORD_BUDGET[doc.format] || 50;
    const blocks = texts.length;
    parts.load = u.clamp(1 - Math.max(0, words - budget) / budget, 0, 1) * u.clamp(1 - Math.max(0, blocks - 8) / 8, 0.3, 1);
    why.load = `Слов на лицевой стороне: ${words} (удобно до ${budget}), текстовых блоков: ${blocks} (до 8)`;

    // 9. Типичность для сферы: цвета похожи на то, что люди ждут от этой сферы
    const ind = SD.INDUSTRIES[ans.industry] || SD.INDUSTRIES.transport;
    const cand = ind.palettes.flatMap(p => [p.c[1], p.c[2]]);
    const pal = SD.app && SD.app.S && SD.app.S.answers === ans ? SD.app.pal() : null;
    const prim = cta ? cta.fill : (pal ? pal.primary : page.bg);
    const mainColor = (page.elements.find(e => e.role === 'panel' || (e.role === 'decor' && e.w * e.h > doc.w * doc.h * 0.1)) || {}).fill || prim;
    const dmin = Math.min(...cand.map(c => Math.min(C.deltaE(c, mainColor), C.deltaE(c, prim))));
    parts.proto = u.clamp(1 - Math.max(0, dmin - 0.06) / 0.25, 0.3, 1);
    why.proto = `Цвета ${dmin < 0.1 ? 'типичны' : dmin < 0.2 ? 'близки к ожиданиям' : 'необычны'} для сферы «${ind.name}»`;

    // 10. Порядок: сколько разных левых краёв у текстов с выключкой влево
    const main = texts.filter(t => !t.rot && !t.pin && !['promoText', 'ctaText', 'contacts', 'qrLabel'].includes(t.role));
    const lefts = new Set(main.filter(t => t.align === 'left').map(t => Math.round(t.x)));
    const aligns = new Set(main.map(t => t.align));
    parts.order = (lefts.size <= 1 ? 1 : lefts.size === 2 ? 0.8 : 0.55) * (aligns.size <= 1 ? 1 : 0.75);
    why.order = `Линий выравнивания: ${lefts.size || 1}, видов выключки: ${aligns.size}${aligns.size > 1 ? ' (смешаны — глазу труднее)' : ''}`;

    let totalScore = 0;
    for (const c of CRITERIA) totalScore += c.w * parts[c.key];
    // с ошибками текста — не больше 55, даже если остальное красиво
    if (errs) totalScore = Math.min(totalScore, 55);
    return { total: Math.round(totalScore), parts, why, errs, criteria: CRITERIA };
  }

  // Перебор вариантов: сначала быстро (без проверки контраста по пикселям), потом тщательно для лучших
  function candidates(ans, keep = {}, n = 160, seed = 1) {
    let r = seed;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const vs = SD.gen.variants(ans.styles);
    const layouts = keep.layout ? [ans.layout] : Object.keys(SD.LAYOUTS);
    const out = [JSON.parse(JSON.stringify(ans))];
    const seen = new Set();
    const kits = ans.styles.map(id => SD.KITS[id]);
    for (let i = 0; i < n * 3 && out.length < n; i++) {
      const a = JSON.parse(JSON.stringify(ans));
      if (!keep.style) { a.variant = Math.floor(rnd() * vs.length); a.palette = null; }
      a.layout = pick(layouts);
      if (!keep.layout) a.align = pick(['left', 'left', 'center']);
      a.titleScale = pick([1, 1, 1.2, 1.45]);
      if (!keep.fx) {
        const kit = pick(kits);
        a.fx = { auto: false, effects: rnd() < 0.5 ? kit.effects.filter(e => e !== 'gradient') : (a.fx && a.fx.effects ? a.fx.effects : []), icons: kit.icons,
          pattern: rnd() < 0.25 ? kit.pattern : 'none', display: rnd() < 0.5 ? kit.display : 'none', gradient: pick(['auto', 'auto', 'none', 'mesh', 'linear', kit.gradient || 'auto']) };
      }
      const key = JSON.stringify([a.variant, a.layout, a.align, a.titleScale, a.fx]);
      if (seen.has(key)) continue;
      seen.add(key); out.push(a);
    }
    return out;
  }

  async function search(ans, opts = {}) {
    const list = candidates(ans, opts.keep || {}, opts.n || 160, opts.seed || 7);
    const res = [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      let doc;
      try { doc = SD.gen.build(a); } catch (e) { continue; }
      const sc = score(doc, a, { contrast: false });
      withTaste(sc, a, doc);
      res.push({ ans: a, doc, score: sc });
      if (opts.onProgress && i % 8 === 0) { opts.onProgress(i / list.length * 0.8, i, list.length); await new Promise(r => setTimeout(r, 0)); }
    }
    res.sort((x, y) => y.score.rank - x.score.rank);
    // второй этап: для лучших — полная проверка с контрастом по пикселям
    const top = res.slice(0, opts.deep || 18);
    for (let i = 0; i < top.length; i++) {
      top[i].score = withTaste(score(top[i].doc, top[i].ans, { contrast: true }), top[i].ans, top[i].doc);
      if (opts.onProgress) { opts.onProgress(0.8 + 0.2 * i / top.length, i, top.length); await new Promise(r => setTimeout(r, 0)); }
    }
    top.sort((x, y) => y.score.rank - x.score.rank);
    // разнообразие: не показываем почти одинаковые
    const pickd = [];
    for (const t of top) {
      if (pickd.some(p => p.ans.layout === t.ans.layout && p.ans.variant === t.ans.variant)) continue;
      pickd.push(t);
      if (pickd.length >= (opts.show || 6)) break;
    }
    return { best: pickd, tested: list.length, current: res.find(x => x.ans === list[0]) };
  }

  // Вкус пользователя влияет на порядок вариантов, но не на объективную оценку
  function withTaste(sc, ans, doc) {
    sc.taste = SD.taste ? SD.taste.bonus(ans, doc) : 0;
    sc.rank = sc.total + sc.taste;
    return sc;
  }

  // Пояснение «почему этот вариант»
  function explain(sc) {
    return sc.criteria.map(c => ({ name: c.name, value: Math.round(sc.parts[c.key] * 100), why: sc.why[c.key], src: c.src, w: c.w }));
  }

  return { score, search, explain, candidates, CRITERIA };
})();
