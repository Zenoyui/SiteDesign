// Цвет в перцептивном пространстве OKLab / OKLCH (Björn Ottosson, 2020).
// В sRGB переход синий→жёлтый проходит через серую «мёртвую зону»;
// в OKLCH яркость и насыщенность по пути сохраняются — градиент чистый.

SD.color = (function () {
  const u = SD.u;
  const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const toSrgb = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(u.clamp(v, 0, 1) * 255); };

  function toOklab(hex) {
    const [R, G, B] = u.hexToRgb(hex).map(toLin);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function fromOklab([L, a, b]) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return u.rgbToHex(
      toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s));
  }
  function toOklch(hex) { const [L, a, b] = toOklab(hex); return [L, Math.hypot(a, b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360]; }
  // Из OKLCH в hex; если цвет не помещается в sRGB — уменьшаем насыщенность, сохраняя оттенок и яркость
  function fromOklch([L, C, h]) {
    L = u.clamp(L, 0, 1);
    for (let i = 0; i < 24; i++) {
      const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
      if (inGamut([L, a, b]) || C < 0.001) return fromOklab([L, a, b]);
      C *= 0.9;
    }
    return fromOklab([L, 0, 0]);
  }
  function inGamut([L, a, b]) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
    return rgb.every(v => v >= -0.001 && v <= 1.001);
  }
  // Смешивание по короткой дуге оттенка
  function mixOklch(c1, c2, t) {
    const A = toOklch(c1), B = toOklch(c2);
    let dh = B[2] - A[2];
    if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
    // у почти серых цветов оттенок не определён — берём оттенок другого
    const hA = A[1] < 0.02 ? B[2] : A[2], hB = B[1] < 0.02 ? A[2] : B[2];
    let d2 = hB - hA; if (d2 > 180) d2 -= 360; if (d2 < -180) d2 += 360;
    return fromOklch([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, (hA + d2 * t + 360) % 360]);
  }
  // Равномерные остановки градиента в OKLCH (canvas сам интерполирует в sRGB — даём ему частые точки)
  function ramp(colors, steps = 10) {
    const out = [];
    const n = colors.length - 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, seg = Math.min(n - 1, Math.floor(t * n)), lt = t * n - seg;
      out.push({ t, c: n ? mixOklch(colors[seg], colors[seg + 1], lt) : colors[0] });
    }
    return out;
  }
  // Сдвиг в OKLCH: оттенок (градусы), яркость, насыщенность
  function shift(hex, dh = 0, dL = 0, dC = 0) { const [L, C, h] = toOklch(hex); return fromOklch([L + dL, Math.max(0, C + dC), (h + dh + 360) % 360]); }
  function chroma(hex) { return toOklch(hex)[1]; }
  function hue(hex) { return toOklch(hex)[2]; }
  function lightness(hex) { return toOklch(hex)[0]; }
  function deltaE(c1, c2) { const A = toOklab(c1), B = toOklab(c2); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
  function hueDist(h1, h2) { const d = Math.abs(h1 - h2) % 360; return d > 180 ? 360 - d : d; }

  // Риск для печати: очень насыщенные RGB-цвета (кислотные фиолетовые, синие, зелёные)
  // не помещаются в CMYK и в типографии выйдут тусклее
  function cmykRisk(hex) {
    const [L, C, h] = toOklch(hex);
    const limit = (h > 250 && h < 320) ? 0.17 : (h > 130 && h < 170) ? 0.16 : (h > 200 && h <= 250) ? 0.15 : 0.22;
    return C > limit && L > 0.35;
  }

  return { toOklab, fromOklab, toOklch, fromOklch, mixOklch, ramp, shift, chroma, hue, lightness, deltaE, hueDist, cmykRisk };
})();
