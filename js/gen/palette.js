// Генератор, часть 1: сочетания стилей (варианты) и палитра с производными цветами.
// Общие функции генератора лежат в SD._gen (G), наружу смотрит только SD.gen (js/gen/build.js).

(function (G) {
  const u = SD.u;

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
    for (let i = 0; i < 20 && u.contrast(muted, c.bg) < 5.2; i++) muted = u.mix(muted, c.text, 0.15); // с запасом на лёгкие подложки
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

  Object.assign(G, { variants, palette, withDerived, styleProps });
})(SD._gen = SD._gen || {});
