// Отрисовка: вёрстка текста — типографика (неразрывные пробелы), переносы, строки, подгонка высоты.

(function (RD) {
  const PT = SD.PT;

  const TX = 10; // текст рисуем в 10× масштабе, чтобы мелкие кегли не дрожали
  const mctx = document.createElement('canvas').getContext('2d');

  function fontOf(el, k) {
    return `${el.italic ? 'italic ' : ''}${el.weight || 400} ${el.size * PT * k}px "${el.font}", "Tinos", sans-serif`;
  }
  // Типографика: неразрывные пробелы там, где перенос недопустим по правилам
  const NB = '\u00A0';
  function typo(t) {
    t = t.replace(/ +([—–])/g, NB + '$1');                                        // тире не начинает строку
    for (let i = 0; i < 2; i++) t = t.replace(/(^|[\s\u00A0(«"„])([А-Яа-яЁёA-Za-z]{1,2}) +/g, '$1$2' + NB); // предлоги и союзы держатся за следующее слово
    t = t.replace(/(\d) +(?=[\d₽%$€А-Яа-яЁёA-Za-z])/g, '$1' + NB);                 // число + единица, группы цифр
    return t;
  }
  function prepText(el) {
    const raw = String(el.text || '') + (String(el.text || '').trim() ? (el.suffix || '') : '');
    const t = el.upper ? raw.toUpperCase() : raw;
    return el.typo === false ? t : typo(t);
  }

  // Разбивка текста на строки по ширине блока.
  function layoutText(el) {
    mctx.font = fontOf(el, TX);
    if ('letterSpacing' in mctx) mctx.letterSpacing = ((el.ls || 0) * el.size * PT * TX) + 'px';
    const bg = el.bg && el.bg.fill ? el.bg : null;
    const padX = bg ? (bg.padX || 0) : 0, padY = bg ? (bg.padY || 0) : 0;
    const maxW = Math.max(1, el.w - padX * 2) * TX;
    const W = t => mctx.measureText(t).width;
    const lines = [], starts = [];
    let broken = false, relaxed = false;
    for (const para of prepText(el).split('\n')) {
      starts[lines.length] = true; // эта строка начинает абзац (после ручного перевода строки)
      const queue = para.split(/( +)/);
      let cur = '';
      while (queue.length) {
        const tk = queue.shift();
        if (!tk) continue;
        if (/^ +$/.test(tk)) { if (cur) cur += tk; continue; }
        if (W(cur + tk) <= maxW) { cur += tk; continue; }
        if (cur.trim()) { lines.push(cur.replace(/ +$/, '')); cur = ''; }
        if (W(tk) <= maxW) { cur = tk; continue; }
        // связка через неразрывные пробелы не влезает целиком: сначала рвём только в «хороших» местах
        // (не после предлога и не перед тире), и лишь если не помогло — где угодно
        if (tk.includes(NB)) {
          const parts = tk.split(NB);
          const good = [];
          let piece = parts[0];
          for (let i = 1; i < parts.length; i++) {
            const prev = parts[i - 1], next = parts[i];
            const bad = /^[А-Яа-яЁёA-Za-z]{1,2}$/.test(prev) || /^[—–₽%]/.test(next) || (/\d$/.test(prev) && /^[\d₽%]/.test(next));
            if (bad) piece += NB + next; else { good.push(piece); piece = next; }
          }
          good.push(piece);
          if (good.length > 1 && good.every(g => W(g) <= maxW)) queue.unshift(...good.flatMap((w, i) => i ? [' ', w] : [w]));
          else { relaxed = true; queue.unshift(...parts.flatMap((w, i) => i ? [' ', w] : [w])); }
          continue;
        }
        // слово длиннее строки — рвём с дефисом
        broken = true;
        let chunk = '';
        for (const ch of tk) {
          if (W(chunk + ch + '-') > maxW && chunk) { lines.push(chunk + '-'); chunk = ch; } else chunk += ch;
        }
        cur = chunk;
      }
      lines.push(cur.replace(/ +$/, ''));
    }
    const lineH = el.size * PT * (el.lh || 1.2);
    return { lines, starts, lineH, padX, padY, broken, relaxed, height: Math.max(lineH, lines.length * lineH) + padY * 2, widths: lines.map(l => W(l) / TX) };
  }
  function textWidth(el) {
    mctx.font = fontOf(el, TX);
    if ('letterSpacing' in mctx) mctx.letterSpacing = ((el.ls || 0) * el.size * PT * TX) + 'px';
    return Math.max(...prepText(el).split('\n').map(l => mctx.measureText(l).width)) / TX;
  }
  function fitHeight(el) {
    if (el.type === 'text' && el.autoH !== false) el.h = SD.u.round(layoutText(el).height, 2);
  }

  Object.assign(RD, { TX, fontOf, typo, layoutText, textWidth, fitHeight });
})(SD._render = SD._render || {});
