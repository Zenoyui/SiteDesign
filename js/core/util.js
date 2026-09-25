// Общие помощники: цвета, геометрия, DOM.
window.SD = window.SD || {};

SD.PT = 0.352778; // 1 пункт в миллиметрах

SD.u = {
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  round(v, d = 1) { const k = Math.pow(10, d); return Math.round(v * k) / k; },
  uid() { return 'e' + Math.random().toString(36).slice(2, 9); },
  clone(o) { return JSON.parse(JSON.stringify(o)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },

  hexToRgb(hex) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => SD.u.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  },
  mix(a, b, t) {
    const A = SD.u.hexToRgb(a), B = SD.u.hexToRgb(b);
    return SD.u.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  },
  lum(hex) {
    const c = SD.u.hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  },
  contrast(a, b) {
    const x = SD.u.lum(a), y = SD.u.lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  },
  // Читаемый цвет текста поверх фона: из кандидатов берём самый контрастный.
  readable(bg, candidates) {
    // Насыщенные тёмные и средние фоны (красный, фиолетовый, зелёный) — белый текст, как принято в брендах
    // белый — если он читается уверенно (от 4.5:1), иначе самый контрастный из вариантов
    if (SD.u.contrast(bg, '#FFFFFF') >= 4.5) return '#FFFFFF';
    const list = (candidates || []).concat(['#111111', '#FFFFFF']);
    let best = list[0], bc = 0;
    for (const c of list) { const k = SD.u.contrast(bg, c); if (k > bc + 0.01) { bc = k; best = c; } }
    return best;
  },
  // Сдвиг оттенка на несколько градусов: палитра «похожая, но не та же».
  hueShift(hex, deg, sat = 0, light = 0) {
    let [r, g, b] = SD.u.hexToRgb(hex).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    h = (h + deg / 360 + 1) % 1; s = SD.u.clamp(s + sat, 0, 1); const L = SD.u.clamp(l + light, 0, 1);
    const q = L < 0.5 ? L * (1 + s) : L + s - L * s, p = 2 * L - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return s === 0 ? SD.u.rgbToHex(L * 255, L * 255, L * 255) : SD.u.rgbToHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255);
  },

  rotPt(x, y, cx, cy, deg) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const dx = x - cx, dy = y - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  },
  corners(el) {
    const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
    return [[el.x, el.y], [el.x + el.w, el.y], [el.x + el.w, el.y + el.h], [el.x, el.y + el.h]]
      .map(p => el.rot ? SD.u.rotPt(p[0], p[1], cx, cy, el.rot) : p);
  },
  aabb(el) {
    const c = SD.u.corners(el);
    const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  },
  unionBox(boxes) {
    if (!boxes.length) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const b of boxes) { x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h); }
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  },

  h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (v === true) e.setAttribute(k, '');
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
    return e;
  },

  download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  // Загрузка библиотеки с повторами: при плохой сети первая попытка может сорваться
  loadScript(src, tries = 3) {
    SD.u._scripts = SD.u._scripts || {};
    if (!SD.u._scripts[src]) SD.u._scripts[src] = new Promise((ok, fail) => {
      const attempt = n => {
        const s = document.createElement('script');
        s.src = src; s.onload = ok;
        s.onerror = () => { s.remove(); if (n > 1) setTimeout(() => attempt(n - 1), 1200); else { delete SD.u._scripts[src]; fail(new Error('Не удалось загрузить ' + src + ' — проверьте интернет')); } };
        document.head.appendChild(s);
      };
      attempt(tries);
    });
    return SD.u._scripts[src];
  },
  readFile(file) {
    return new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(file); });
  },
  store: {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* нет доступа */ } }
  }
};

SD.toast = function (msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(SD.toast._t); SD.toast._t = setTimeout(() => t.classList.remove('show'), 2200);
};
