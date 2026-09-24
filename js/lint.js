// Проверка текста на макете: кегль, контраст, выход за лист и поля обреза,
// переносы, висячие предлоги, перекрытия, длина строки, иерархия.
// Используется и страницей (живая проверка), и тестами.

SD.lint = (function () {
  const PT = SD.PT, u = SD.u;
  const SAFE = 3;          // мм от края листа: зона риска при резке
  const MIN_PT = 6;        // меньше — не читается в печати
  const MIN_BODY_PT = 7;   // основной текст
  const SHORT = /(^|[\s ])(в|во|и|а|к|ко|с|со|у|о|об|от|до|на|по|за|из|не|но|ни|же|ли)$/i;

  const LEVEL = { error: 'Ошибка', warn: 'Внимание' };

  function visibleTexts(page) {
    return page.elements.filter(e => e.type === 'text' && e.visible !== false && String(e.text || '').trim());
  }
  function isLarge(el) { return el.size >= 18 || (el.size >= 14 && (el.weight || 400) >= 700); }
  function inter(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }
  // Реальные прямоугольники строк текста (в локальных координатах элемента)
  function lineRects(el, L) {
    return L.lines.map((line, i) => {
      const lw = L.widths[i];
      const x = el.align === 'center' ? (el.w - lw) / 2 : el.align === 'right' ? el.w - L.padX - lw : L.padX;
      return { x, y: L.padY + i * L.lineH + L.lineH * 0.2, w: lw, h: L.lineH * 0.65, text: line };
    }).filter(r => r.w > 0.2);
  }
  function toPage(el, px, py) {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    return el.rot ? u.rotPt(el.x + px, el.y + py, cx, cy, el.rot) : [el.x + px, el.y + py];
  }
  function inkBox(el, L) {
    const pts = [];
    for (const r of lineRects(el, L)) for (const [a, b] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) pts.push(toPage(el, a, b));
    if (!pts.length) return null;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // Группа привязок: элементы, связанные pin, считаются одним блоком
  function root(p, el) { let cur = el, g = 0; while (cur && cur.pin && g++ < 20) cur = p.elements.find(e => e.id === cur.pin.id) || null; return cur ? cur.id : el.id; }

  // Контраст: рисуем страницу без текстов и смотрим, что под буквами
  function contrastIssues(doc, page, texts, out, pi) {
    const s = 2.5; // пикселей на мм
    const c = document.createElement('canvas');
    c.width = Math.ceil(doc.w * s); c.height = Math.ceil(doc.h * s);
    const ctx = c.getContext('2d');
    const hide = new Set(texts.map(t => t.id));
    // зерно печати — текстура, а не цвет: контраст меряем по цветам макета
    SD.render.drawPage(ctx, doc, { bg: page.bg, elements: page.elements.filter(e => !hide.has(e.id)) }, s);
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    for (const el of texts) {
      const L = SD.render.layoutText(el);
      const fg = u.hexToRgb(el.fill || '#000');
      const a = el.opacity == null ? 1 : el.opacity;
      const vals = [];
      const bgPill = el.bg && el.bg.fill ? u.hexToRgb(el.bg.fill) : null;
      for (const r of lineRects(el, L)) {
        for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++) {
          const [x, y] = toPage(el, r.x + r.w * i / 6, r.y + r.h * j / 2);
          const X = Math.round(x * s), Y = Math.round(y * s);
          if (X < 0 || Y < 0 || X >= c.width || Y >= c.height) continue;
          const k = (Y * c.width + X) * 4;
          const bg = bgPill || [img[k], img[k + 1], img[k + 2]];
          const col = u.rgbToHex(fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a));
          vals.push(u.contrast(col, u.rgbToHex(bg[0], bg[1], bg[2])));
        }
      }
      if (!vals.length) continue;
      vals.sort((p, q) => p - q);
      const low = vals[Math.floor(vals.length * 0.15)];
      const need = isLarge(el) ? 3 : 4.5;
      if (low < 3) out.push(issue('error', pi, el, 'contrast', `Низкий контраст ${u.round(low, 1)}:1 — текст почти не виден (нужно от ${need}:1)`));
      else if (low < need) out.push(issue('warn', pi, el, 'contrast', `Контраст ${u.round(low, 1)}:1 — слабовато для ${isLarge(el) ? 'крупного' : 'мелкого'} текста (лучше от ${need}:1)`));
    }
  }

  function issue(level, pi, el, code, msg) {
    return { level, page: pi, id: el ? el.id : null, name: el ? (el.name || 'Текст') : '', code, msg };
  }

  function check(doc, opts = {}) {
    const out = [];
    doc.pages.forEach((page, pi) => {
      if (opts.page != null && opts.page !== pi) return;
      const texts = visibleTexts(page);
      const title = texts.find(t => t.role === 'title');
      const body = texts.find(t => t.role === 'body');
      for (const el of texts) {
        const L = SD.render.layoutText(el);
        const ink = inkBox(el, L) || u.aabb(el);
        const box = u.aabb(el);
        // выход за лист
        const off = Math.max(-ink.x, -ink.y, ink.x + ink.w - doc.w, ink.y + ink.h - doc.h);
        if (off > 0.3) out.push(issue('error', pi, el, 'offpage', `Текст выходит за край листа на ${u.round(off, 1)} мм — будет обрезан`));
        else {
          const near = Math.min(ink.x, ink.y, doc.w - ink.x - ink.w, doc.h - ink.y - ink.h);
          if (near < SAFE) out.push(issue('warn', pi, el, 'safe', `Текст ближе ${SAFE} мм к краю (${u.round(Math.max(near, 0), 1)} мм) — может срезаться при резке`));
        }
        void box;
        // кегль
        if (el.size < MIN_PT) out.push(issue('error', pi, el, 'size', `Кегль ${u.round(el.size, 1)} пт — слишком мелко для печати (минимум ${MIN_PT} пт)`));
        else if (el.size < MIN_BODY_PT && L.lines.length > 1) out.push(issue('warn', pi, el, 'size', `Кегль ${u.round(el.size, 1)} пт — многострочный текст мельче ${MIN_BODY_PT} пт трудно читать`));
        // строки шире блока
        const avail = el.w - L.padX * 2;
        const wide = Math.max(...L.widths) - avail;
        if (wide > 0.3) out.push(issue('error', pi, el, 'overflow', `Строка шире блока на ${u.round(wide, 1)} мм`));
        // переносы
        if (L.broken) out.push(issue('warn', pi, el, 'midword', 'Слово не поместилось в строку и разорвано переносом — уменьшите кегль или расширьте блок'));
        L.lines.forEach((line, i) => {
          if (i < L.lines.length - 1 && SHORT.test(line.trim())) out.push(issue('error', pi, el, 'hanging', `Висячий предлог или союз в конце строки: «…${line.trim().slice(-12)}»`));
          if (i > 0 && /^[—–]/.test(line.trim())) out.push(issue('error', pi, el, 'dash', 'Строка начинается с тире — по правилам тире остаётся в конце предыдущей строки'));
        });
        // длина строки для основного текста
        if (el.role !== 'title' && L.lines.length > 2) {
          const avg = L.lines.reduce((a, l) => a + l.length, 0) / L.lines.length;
          if (avg > 80) out.push(issue('warn', pi, el, 'measure', `Длинные строки (~${Math.round(avg)} знаков) — глаз теряет строку, удобно 45–75`));
          if (avg < 12) out.push(issue('warn', pi, el, 'narrow', `Узкая колонка (~${Math.round(avg)} знаков в строке) — много переносов`));
        }
        if (L.lines.length > 1 && (el.lh || 1.2) < 0.95) out.push(issue('warn', pi, el, 'leading', 'Строки почти наезжают друг на друга — увеличьте интерлиньяж'));
        if (el.role === 'title' && L.lines.length > 5) out.push(issue('warn', pi, el, 'titleLines', `Заголовок в ${L.lines.length} строк — за 3 секунды его не прочитают, сократите`));
      }
      // иерархия
      if (title && body && title.size < body.size * 1.3) out.push(issue('warn', pi, title, 'hierarchy', 'Заголовок почти не крупнее основного текста — нет иерархии'));
      // текст на тексте
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], b = texts[j];
        if (root(page, a) === root(page, b) && (a.pin || b.pin)) continue;
        const A = inkBox(a, SD.render.layoutText(a)), B = inkBox(b, SD.render.layoutText(b));
        if (!A || !B) continue;
        const ov = inter(A, B), m = Math.min(A.w * A.h, B.w * B.h);
        if (m > 0 && ov / m > 0.12) out.push(issue('error', pi, b, 'overlap', `Текст наезжает на «${a.name || 'текст'}»`));
      }
      // текст закрыт другим элементом сверху
      const idx = new Map(page.elements.map((e, i) => [e.id, i]));
      const covers = page.elements.filter(e => e.visible !== false && (['promo', 'display', 'qr', 'image'].includes(e.role) || ['phone', 'qr', 'image', 'star'].includes(e.type)) && !(e.opacity < 0.5));
      for (const t of texts) {
        const tb = inkBox(t, SD.render.layoutText(t));
        if (!tb) continue;
        for (const c of covers) {
          if (idx.get(c.id) < idx.get(t.id) || root(page, c) === root(page, t)) continue;
          const bb = u.aabb(c), k = c.rot ? 0.15 : 0;
          const sh = { x: bb.x + bb.w * k, y: bb.y + bb.h * k, w: bb.w * (1 - 2 * k), h: bb.h * (1 - 2 * k) };
          const ov = inter(tb, sh);
          if (ov / (tb.w * tb.h) > 0.1) out.push(issue('error', pi, t, 'covered', `Текст закрыт элементом «${c.name || c.type}»`));
        }
      }
      if (opts.contrast !== false) contrastIssues(doc, page, texts, out, pi);
    });
    for (const n of doc.notes || []) out.push({ level: 'warn', page: null, id: null, name: '', code: 'note', msg: n });
    return out;
  }

  // Таблица с результатами проверки для левой панели
  function table(doc, onPick, opts) {
    const h = SD.u.h;
    const list = check(doc, opts);
    const wrap = h('div');
    const errs = list.filter(i => i.level === 'error').length, warns = list.length - errs;
    wrap.append(h('p', null, list.length ? `Найдено: ошибок — ${errs}, замечаний — ${warns}.` : 'Проверка пройдена: текст читается, влезает в лист и не заходит на поля обреза.'));
    if (!list.length) return wrap;
    const t = h('table', { class: 'doc compact' });
    t.append(h('tr', null, h('th', null, 'Уровень'), h('th', null, 'Где'), h('th', null, 'Что не так'), h('th', null, '')));
    for (const i of list.slice(0, 40)) {
      t.append(h('tr', null, h('td', null, LEVEL[i.level]), h('td', null, i.page == null ? '—' : `${doc.pages[i.page].name}${i.name ? ': ' + i.name : ''}`), h('td', null, i.msg),
        h('td', { class: 'c' }, i.id ? h('button', { class: 'btn sm', onclick: () => onPick(i) }, 'Показать') : '')));
    }
    wrap.append(t);
    return wrap;
  }

  return { check, table, SAFE, MIN_PT };
})();
