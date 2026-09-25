// Генератор: фирменные приёмы (мотивы) стилей — все они обычные редактируемые элементы.

(function (G) {
  const u = SD.u;

  // ---------- Мотивы стилей (все — обычные редактируемые элементы) ----------
  function motif(ctx, kind, z, roles) {
    const out = motifRaw(ctx, kind, z, roles);
    const grp = u.uid();
    for (const e of out) e.grp = grp; // части одного мотива двигаются вместе
    // декор не выходит из своей зоны влево — туда, где текст
    if (z && !['wave', 'stripe', 'rainbow'].includes(kind)) for (const e of out) if (e.x < z.x) e.x = z.x;
    if (z && kind === 'bigdot' && out.length === 2 && out[1].x < z.x) { const [dot, dash] = out; dash.x = dot.x; dash.y = dot.y + dot.h + dash.h; dash.w = Math.min(dash.w, dot.w); }
    return out;
  }
  function motifRaw(ctx, kind, z, roles) {
    roles = roles || {};
    const main = roles.main || 'primary', second = roles.second || 'accent';
    const out = [];
    if (kind !== 'wave' && (!z || z.w < 4 || z.h < 4)) return out;
    const d0 = z ? Math.min(z.w, z.h) : 0;
    switch (kind) {
      case 'dot': {
        const d = d0 * 0.95;
        out.push(G.base({ type: 'ellipse', name: 'Круг-акцент', role: 'decor', x: z.x + z.w - d, y: z.y + (z.h - d) / 2, w: d, h: d, fillRole: main }));
        out.push(G.base({ type: 'ellipse', name: 'Малый круг', role: 'decor', x: z.x + z.w - d * 1.05, y: z.y + (z.h + d) / 2 - d * 0.3, w: d * 0.26, h: d * 0.26, fillRole: second }));
        break;
      }
      case 'block': {
        const r = Math.min(z.w, z.h) * 0.12;
        out.push(G.base({ name: 'Карточка', role: 'card', x: z.x, y: z.y, w: z.w, h: z.h, radius: r, fillRole: 'soft' }));
        const d = d0 * 0.42;
        out.push(G.base({ name: 'Плашка', role: 'decor', x: z.x + z.w * 0.08, y: z.y + z.h - d * 0.55 - z.h * 0.12, w: z.w * 0.84, h: d * 0.55, radius: d * 0.275, fillRole: main }));
        out.push(G.base({ type: 'ellipse', name: 'Точка', role: 'decor', x: z.x + z.w * 0.08, y: z.y + z.h * 0.14, w: d * 0.5, h: d * 0.5, fillRole: second }));
        break;
      }
      case 'stripe': {
        const hh = u.clamp(z.h * 0.22, 4, ctx.base * 0.12);
        out.push(G.base({ name: 'Полоса', role: 'decor', x: -6, y: z.y + (z.h - hh) / 2, w: ctx.W + 12, h: hh, rot: -3, fillRole: main, cons: { h: 'left-right', v: 'scale' } }));
        out.push(G.base({ name: 'Тонкая полоса', role: 'decor', x: -6, y: z.y + (z.h - hh) / 2 + hh * 1.35, w: ctx.W * 0.55, h: hh * 0.28, rot: -3, fillRole: second, cons: { h: 'scale', v: 'scale' } }));
        break;
      }
      case 'blobs': {
        const d = d0 * 1.0;
        out.push(G.base({ type: 'ellipse', name: 'Пятно', role: 'decor', x: z.x + z.w - d * 0.95, y: z.y + (z.h - d) / 2, w: d, h: d, fillRole: main, fill2Role: second, gradAngle: 45 }));
        out.push(G.base({ type: 'ellipse', name: 'Пятно малое', role: 'decor', x: z.x + z.w - d * 1.25, y: z.y + (z.h - d) / 2 + d * 0.5, w: d * 0.55, h: d * 0.55, fillRole: second, fill2Role: main, gradAngle: 200, opacity: 0.92 }));
        break;
      }
      case 'wave': {
        const hh = ctx.H * 0.16;
        out.push(G.base({ type: 'wave', name: 'Волна дальняя', role: 'decor', x: -1, y: ctx.H - hh * 1.3, w: ctx.W + 2, h: hh * 1.3, amp: 0.3, waves: 1.5, phase: 0.35, fillRole: second, cons: { h: 'left-right', v: 'scale' } }));
        out.push(G.base({ type: 'wave', name: 'Волна', role: 'decor', x: -1, y: ctx.H - hh, w: ctx.W + 2, h: hh + 1, amp: 0.35, waves: 1.5, fillRole: main, cons: { h: 'left-right', v: 'scale' } }));
        break;
      }
      case 'bigdot': {
        const d = d0 * 0.72;
        const cx = z.x + z.w - d, cy = z.y + (z.h - d) / 2;
        out.push(G.base({ type: 'ellipse', name: 'Точка', role: 'decor', x: cx, y: cy, w: d, h: d, fillRole: second === 'accent' ? 'accent' : second }));
        const dw = d * 0.95, dh = d * 0.22;
        out.push(G.base({ name: 'Тире', role: 'decor', x: cx - dw - d * 0.22, y: cy + (d - dh) / 2, w: dw, h: dh, radius: dh / 2, fillRole: roles.dash || 'extra' }));
        break;
      }
      case 'swissgrid': {
        // красный блок и тонкие линейки по модульной сетке
        const bw = z.w * 0.55, bh = Math.min(z.h, bw * 1.1);
        out.push(G.base({ name: 'Красный блок', role: 'decor', x: z.x + z.w - bw, y: z.y + (z.h - bh) / 2, w: bw, h: bh, fillRole: main }));
        for (let k = 0; k < 4; k++) out.push(G.base({ type: 'line', name: 'Линейка', role: 'decor', x: z.x, y: z.y + z.h * (0.12 + k * 0.25), w: z.w * 0.4, h: 1, stroke: '#000', strokeRole: 'text', strokeW: 0.3 }));
        break;
      }
      case 'brutal': {
        const bw = d0 * 0.9, bh = d0 * 0.6, sw = Math.max(0.6, d0 * 0.02);
        out.push(G.base({ name: 'Карточка в рамке', role: 'decor', x: z.x + z.w - bw, y: z.y + z.h * 0.1, w: bw, h: bh, fillRole: main, stroke: '#000', strokeRole: 'text', strokeW: sw, shadow: { x: sw * 2, y: sw * 2, blur: 0, colorRole: 'text', alpha: 1 } }));
        out.push(G.base({ type: 'ellipse', name: 'Круг в рамке', role: 'decor', x: z.x + z.w - bw * 1.1, y: z.y + z.h * 0.1 + bh * 0.75, w: bh * 0.7, h: bh * 0.7, fillRole: second, stroke: '#000', strokeRole: 'text', strokeW: sw }));
        break;
      }
      case 'rainbow': {
        // концентрические дуги из угла зоны
        const R = d0 * 0.98, cx = z.x + z.w, cy = z.y + z.h;
        ['extra', 'primary', 'accent', 'soft', 'bg'].forEach((role, k) => { const r = R * (1 - k * 0.18); out.push(G.base({ type: 'ellipse', name: 'Дуга', role: 'decor', x: cx - r, y: cy - r, w: r * 2, h: r * 2, fillRole: role })); });
        break;
      }
      case 'y2k': {
        const pw = d0 * 0.95, ph = d0 * 0.34;
        const pill = G.base({ name: 'Перламутровая пилюля', role: 'decor', x: z.x + z.w - pw, y: z.y + (z.h - ph) / 2, w: pw, h: ph, radius: ph / 2, rot: -12, fillRole: main });
        pill.gradType = 'aurora'; pill.gradSeed = 4;
        out.push(pill);
        [[0.2, 0.1, 0.22, 'extra'], [0.85, 0.05, 0.16, 'accent'], [0.55, 0.85, 0.12, 'extra']].forEach(([fx, fy, k, role]) => { const d = d0 * k; out.push(G.base({ type: 'star', name: 'Блёстка', role: 'decor', points: 4, inner: 0.28, x: z.x + z.w * fx - d / 2, y: z.y + z.h * fy - d / 2, w: d, h: d, fillRole: role })); });
        break;
      }
      case 'hanko': {
        const d = Math.min(d0 * 0.32, 20);
        out.push(G.base({ name: 'Печать', role: 'decor', x: z.x + z.w - d - z.w * 0.1, y: z.y + z.h - d - z.h * 0.1, w: d, h: d, radius: d * 0.08, fillRole: main }));
        out.push(G.base({ type: 'line', name: 'Тонкая вертикаль', role: 'decor', x: z.x + z.w - d * 0.5 - z.w * 0.1 - z.h * 0.3, y: z.y + z.h * 0.35, w: z.h * 0.6, h: 1, rot: 90, stroke: '#000', strokeRole: 'text', strokeW: 0.25 }));
        break;
      }
      case 'bauhaus': {
        const d = d0 * 0.5;
        out.push(G.base({ type: 'ellipse', name: 'Круг', role: 'decor', x: z.x + z.w - d * 1.9, y: z.y + z.h * 0.08, w: d, h: d, fillRole: main }));
        out.push(G.base({ name: 'Квадрат', role: 'decor', x: z.x + z.w - d, y: z.y + z.h * 0.08 + d * 0.5, w: d, h: d, fillRole: 'extra' }));
        out.push(G.base({ type: 'star', name: 'Треугольник', role: 'decor', points: 3, inner: 0.5, x: z.x + z.w - d * 1.6, y: z.y + z.h * 0.08 + d * 0.95, w: d * 1.1, h: d * 1.1, fillRole: second }));
        break;
      }
      case 'glow': {
        // мягкое свечение-прожектор из нескольких полупрозрачных кругов
        const d = d0 * 1.1, cx = z.x + z.w / 2, cy = z.y + z.h / 2;
        for (const [k, a] of [[1, 0.12], [0.72, 0.16], [0.46, 0.22]]) out.push(G.base({ type: 'ellipse', name: 'Свечение', role: 'decor', x: cx - d * k / 2, y: cy - d * k / 2, w: d * k, h: d * k, fillRole: 'accent', opacity: a }));
        break;
      }
      case 'squircle': {
        const d = d0 * 0.8;
        out.push(G.base({ name: 'Сквиркл', role: 'decor', x: z.x + z.w - d, y: z.y + (z.h - d) / 2, w: d, h: d, radius: d * 0.3, fillRole: main }));
        out.push(G.base({ name: 'Малый сквиркл', role: 'decor', x: z.x + z.w - d * 1.2, y: z.y + (z.h + d) / 2 - d * 0.32, w: d * 0.34, h: d * 0.34, radius: d * 0.1, fillRole: second }));
        break;
      }
      case 'orbit': {
        const d = d0 * 1.05, cx = z.x + z.w - d / 2, cy = z.y + z.h / 2, sw = Math.max(0.4, d * 0.012);
        out.push(G.base({ type: 'ellipse', name: 'Орбита', role: 'decor', x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: 'none', stroke: '#000', strokeRole: main, strokeW: sw }));
        out.push(G.base({ type: 'ellipse', name: 'Орбита малая', role: 'decor', x: cx - d * 0.33, y: cy - d * 0.33, w: d * 0.66, h: d * 0.66, fill: 'none', stroke: '#000', strokeRole: second, strokeW: sw }));
        out.push(G.base({ type: 'ellipse', name: 'Спутник', role: 'decor', x: cx + d * 0.35 - d * 0.06, y: cy - d * 0.35 - d * 0.06, w: d * 0.12, h: d * 0.12, fillRole: main }));
        break;
      }
      case 'dotmatrix': {
        const d = d0 * 0.95;
        out.push(G.base({ type: 'pattern', name: 'Точечная матрица', role: 'decor', kind: 'dotring', cell: u.round(d / 16, 2), x: z.x + z.w - d, y: z.y + (z.h - d) / 2, w: d, h: d, fillRole: 'text', fill2Role: 'accent' }));
        break;
      }
      case 'pills': {
        const pw = d0 * 1.0, ph = d0 * 0.28, x0 = z.x + z.w - pw * 0.9;
        [['primary', 0], ['accent', 1], ['extra', 2]].forEach(([role, i]) => out.push(G.base({ name: 'Пилюля', role: 'decor', x: x0 - i * ph * 0.35, y: z.y + z.h * 0.1 + i * ph * 1.15, w: pw * (1 - i * 0.15), h: ph, radius: ph / 2, rot: -18, fillRole: role })));
        break;
      }
      case 'ring': {
        const d = d0 * 0.95, sw = d * 0.13;
        const r = G.base({ type: 'ellipse', name: 'Кольцо', role: 'decor', x: z.x + z.w - d, y: z.y + (z.h - d) / 2, w: d, h: d, fillRole: main });
        r.gradType = 'mesh'; r.gradSeed = 5;
        const hole = G.base({ type: 'ellipse', name: 'Кольцо (внутри)', role: 'decor', x: r.x + sw, y: r.y + sw, w: d - sw * 2, h: d - sw * 2, fillRole: 'bg' });
        out.push(r, hole);
        break;
      }
      case 'tags': {
        const tw = d0 * 0.75, th = d0 * 0.42;
        [['primary', -14, 0], ['accent', 9, 1]].forEach(([role, rot, i]) => {
          const x = z.x + z.w - tw - i * tw * 0.35, y = z.y + z.h * 0.12 + i * th * 0.9;
          out.push(G.base({ name: 'Ценник', role: 'decor', x, y, w: tw, h: th, radius: th * 0.18, rot, fillRole: role }));
          out.push(G.base({ type: 'ellipse', name: 'Дырочка ценника', role: 'decor', x: x + tw * 0.08, y: y + th / 2 - th * 0.08, w: th * 0.16, h: th * 0.16, rot, fillRole: 'bg' }));
        });
        break;
      }
      case 'fullgrad': {
        const g = G.base({ name: 'Градиентная шапка', role: 'decor', x: z.x, y: z.y, w: z.w, h: z.h, radius: Math.min(z.w, z.h) * 0.08, fillRole: main });
        g.gradType = 'mesh'; g.gradSeed = 9;
        out.push(g);
        break;
      }
      case 'bigprice': {
        const bw = Math.min(z.w, d0 * 1.4), bh = Math.min(z.h, bw * 0.55);
        out.push(G.base({ name: 'Жёлтый блок', role: 'decor', x: z.x + z.w - bw, y: z.y + (z.h - bh) / 2, w: bw, h: bh, rot: -3, fillRole: second === 'accent' ? 'accent' : second }));
        break;
      }
    }
    return out;
  }

  // Полоса-маркер под первой строкой заголовка (приём «Полосатого» стиля).
  function marker(ctx, title) {
    const L = SD.render.layoutText(title);
    const lw = L.widths[0] || title.w * 0.6;
    const hh = L.lineH * 0.42;
    const x = title.align === 'center' ? title.x + (title.w - lw) / 2 - 2 : title.align === 'right' ? title.x + title.w - lw - 2 : -3;
    const w = title.align === 'left' ? title.x + lw + 3 - x : lw + 4;
    // маркер должен быть светлее/темнее текста, иначе текст на нём пропадёт
    const tc = ctx.pal[title.fillRole] || ctx.pal.text;
    const role = ['primary', 'accent', 'extra', 'soft'].filter(r => ctx.pal[r]).sort((a, b) => u.contrast(tc, ctx.pal[b]) - u.contrast(tc, ctx.pal[a]))[0];
    return G.base({ name: 'Маркер', role: 'decor', x, y: title.y + L.lineH * 0.52, w, h: hh, fillRole: u.contrast(tc, ctx.pal.primary) >= 3 ? 'primary' : role, cons: { h: 'scale', v: 'scale' } });
  }
  // Цветная плашка за заголовком (приём «Поездочного» стиля).
  function headPanel(ctx, items, pad) {
    const b = u.unionBox(items.map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h })));
    items.forEach(e => { if (!e.keepColor) e.fillRole = 'onPrimary'; });
    return G.base({ name: 'Плашка заголовка', role: 'panel', panelFor: items.filter(e => !e.keepColor).map(e => e.id), x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2, radius: ctx.st.radiusK * 90, fillRole: 'primary' });
  }

  Object.assign(G, { motif, marker, headPanel });
})(SD._gen = SD._gen || {});
