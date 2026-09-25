// Отрисовка на canvas: картинки, QR-коды и шрифты — загрузка и ожидание готовности.
// Общее для модулей отрисовки лежит в SD._render (RD), наружу смотрит SD.render (js/render/draw.js).

(function (RD) {
  const imgCache = {};
  const qrCache = {};
  let qrLoading = null;

  function assetReady() { if (SD.render.onAsset) SD.render.onAsset(); }

  function getImg(src) {
    if (!src) return null;
    let im = imgCache[src];
    if (!im) { im = new Image(); im.onload = assetReady; im.src = src; imgCache[src] = im; }
    return im.complete && im.naturalWidth ? im : null;
  }
  function imagesReady(doc) {
    const list = [];
    for (const p of doc.pages) for (const el of p.elements) if (el.type === 'image' && el.src) {
      getImg(el.src);
      const im = imgCache[el.src];
      if (!(im.complete && im.naturalWidth)) list.push(new Promise(ok => { im.addEventListener('load', ok); im.addEventListener('error', ok); }));
    }
    return Promise.all(list);
  }

  function loadQrLib() {
    if (window.qrcode) return Promise.resolve();
    if (!qrLoading) qrLoading = SD.u.loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js').then(assetReady).catch(() => { qrLoading = null; });
    return qrLoading;
  }
  function qrMatrix(data) {
    data = data || ' ';
    if (qrCache[data]) return qrCache[data];
    if (!window.qrcode) { loadQrLib(); return null; }
    try {
      const q = window.qrcode(0, 'M');
      q.addData(unescape(encodeURIComponent(data)));
      q.make();
      const n = q.getModuleCount(), m = [];
      for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); m.push(row); }
      return (qrCache[data] = m);
    } catch (e) { return null; }
  }

  // Шрифты, которые реально использует документ, подгружаем заранее.
  function fontsReady(doc) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const set = new Set();
    for (const p of doc.pages) for (const el of p.elements) if (el.type === 'text') set.add(`${el.italic ? 'italic ' : ''}${el.weight || 400} 20px "${el.font}"`);
    return Promise.all([...set].map(f => document.fonts.load(f, 'АаЯяZz0₽—№').catch(() => null)));
  }
  // Все шрифты каталога (для миниатюр других стилей)
  function preloadAll() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const list = [];
    for (const f of SD.FONTS) for (const w of SD.FONT_WEIGHTS[f] || [400]) list.push(document.fonts.load(`${w} 20px "${f}"`, 'АаЯяZz0₽—№').catch(() => null));
    return Promise.all(list);
  }
  function assetsReady(doc) {
    const needQr = doc.pages.some(p => p.elements.some(e => e.type === 'qr'));
    return Promise.all([fontsReady(doc), imagesReady(doc), needQr ? loadQrLib() : null]);
  }

  Object.assign(RD, { getImg, qrMatrix, fontsReady, preloadAll, assetsReady });
})(SD._render = SD._render || {});
