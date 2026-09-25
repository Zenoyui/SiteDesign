// Похожесть на манеру компании: сколько фирменных признаков образа есть в макете.
// Сравнивает режим «Свободно» (как раньше) и «Как если бы делала компания» и проверяет читаемость всех образов.
// Запуск: python3 -m http.server 8765 & node tests/brands.test.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  let failed = 0;

  // 1. Похожесть: признаки берутся из рецепта образа
  const r = await p.evaluate(() => {
    const MOTIF_EL = { dot: 'Круг-акцент', block: 'Плашка заголовка', stripe: 'Маркер', blobs: 'Пятно', wave: 'Волна', bigdot: 'Точка', glow: 'Свечение', squircle: 'Сквиркл', orbit: 'Орбита', dotmatrix: 'Точечная матрица', pills: 'Пилюля', ring: 'Кольцо', tags: 'Ценник', fullgrad: 'Градиентная шапка', swissgrid: 'Красный блок', brutal: 'Карточка в рамке', rainbow: 'Дуга', y2k: 'Перламутровая пилюля', hanko: 'Печать', bauhaus: 'Треугольник' };
    const C = SD.color;
    function traits(L, styleId, d, a) {
      const st = SD.STYLES[styleId], page = d.pages[0], els = page.elements;
      const title = els.find(e => e.role === 'title'), cta = els.find(e => e.role === 'cta'), promo = els.find(e => e.role === 'promo');
      const sub = els.find(e => e.role === 'subtitle');
      const pal = (() => { let v = SD.gen.variants([styleId], 'brand').find(x => x.look === L); let pl = SD.gen.palette(v); if (L.pal) pl = SD.gen.withDerived(Object.assign({}, pl, L.pal)); return pl; })();
      const t = [];
      // фон
      if (L.plate) t.push(['фон-градиент во весь лист', els.some(e => e.role === 'bgplate')]);
      else t.push(['фон образа', C.deltaE(page.bg, pal.bg) < 0.03]);
      t.push(['шрифт стиля', title && title.font === st.font]);
      const up = L.upper != null ? L.upper : st.upper;
      t.push([up ? 'заголовок прописными' : 'заголовок строчными', title && !!title.upper === !!up]);
      if (L.tw) t.push(['насыщенность заголовка', title && title.weight === SD.nearWeight(st.font, L.tw)]);
      if (L.tls) t.push(['плотность букв заголовка', title && Math.abs((title.ls || 0) - L.tls) < 0.001]);
      t.push(['выравнивание', title && title.align === (['center', 'diagonal'].includes(L.layout) ? 'center' : L.align)]);
      t.push(['вид кнопки: ' + L.cta, cta && cta.ctaKind === L.cta]);
      if (L.promo === 'none') t.push(['без бейджа', !promo]);
      else t.push(['вид бейджа: ' + L.promo, promo && promo.promoKind === L.promo]);
      for (const m of L.motifs || []) t.push(['приём: ' + m, els.some(e => (e.name || '').startsWith(MOTIF_EL[m]))]);
      if (L.muted) t.push(['приглушённый подзаголовок', sub && C.deltaE(sub.fill, pal.muted) < 0.02]);
      if (L.fx && L.fx.display && L.fx.display !== 'none') t.push(['показ продукта: ' + L.fx.display, els.some(e => e.role === 'display')]);
      return t;
    }
    const rows = [], fails = [];
    let okB = 0, allB = 0, okF = 0, allF = 0;
    for (const id of SD.STYLE_ORDER) {
      SD.RECIPES[id].looks.forEach((L, li) => {
        // «как компания»
        const a = SD.app.defaultAnswers(); a.styles = [id]; a.fidelity = 'brand'; a.variant = li; a.format = 'A5'; SD.applyLook(a);
        const tb = traits(L, id, SD.gen.build(a), a);
        // «свободно» — как было раньше: общая раскладка, авто-эффекты
        const f = SD.app.defaultAnswers(); f.styles = [id]; f.fidelity = 'free'; f.variant = 0; f.format = 'A5'; f.layout = 'top'; f.align = 'left'; f.titleScale = 1; f.fx = { auto: true };
        const tf = traits(L, id, SD.gen.build(f), f);
        const sb = tb.filter(x => x[1]).length, sf = tf.filter(x => x[1]).length;
        okB += sb; allB += tb.length; okF += sf; allF += tf.length;
        rows.push(`${SD.STYLES[id].name}: ${L.name} — свободно ${Math.round(sf / tf.length * 100)}%, как компания ${Math.round(sb / tb.length * 100)}%`);
        for (const [n, ok] of tb) if (!ok) fails.push(`${SD.STYLES[id].name} «${L.name}»: нет признака «${n}»`);
      });
    }
    return { rows, fails, brand: Math.round(okB / allB * 100), free: Math.round(okF / allF * 100) };
  });
  console.log(`\nСредняя похожесть: свободно ${r.free}% → как если бы делала компания ${r.brand}%`);
  r.rows.forEach(x => console.log('  · ' + x));
  const bad1 = r.fails.length + (r.brand < 95 ? 1 : 0);
  failed += bad1;
  console.log(`${bad1 ? '✗' : '✓'} Фирменные признаки образов${bad1 ? ': ' + r.fails.length + ' не хватает' : ''}`);
  r.fails.slice(0, 15).forEach(f => console.log('  - ' + f));

  // 2. Читаемость всех образов на всех форматах
  const lint = await p.evaluate(() => {
    const fails = []; let total = 0;
    for (const id of SD.STYLE_ORDER) SD.RECIPES[id].looks.forEach((L, li) => {
      for (const fmt of ['A6', 'A5', 'A4', 'DL', 'SQ', 'SLIDE', 'STORY', 'WIDE']) for (const pages of [1, 2]) {
        const a = SD.app.defaultAnswers(); a.styles = [id]; a.variant = li; a.format = fmt; a.pages = pages; SD.applyLook(a);
        a.mk.urgency = true; a.mk.proof = true;
        total++;
        for (const i of SD.lint.check(SD.gen.build(a))) if (i.level === 'error' || i.code === 'contrast' || i.code === 'safe' || i.code === 'overlap') fails.push(`${SD.STYLES[id].name} «${L.name}» ${fmt} стр.${i.page + 1} «${i.name}»: ${i.msg}`);
      }
    });
    return { fails, total };
  });
  failed += lint.fails.length;
  console.log(`\n${lint.fails.length ? '✗' : '✓'} Читаемость образов: проверено ${lint.total}${lint.fails.length ? ', ошибок ' + lint.fails.length : ''}`);
  lint.fails.slice(0, 15).forEach(f => console.log('  - ' + f));

  // 3. Интерфейс: переключатель похожести и образы на шаге «Сочетание»
  const ui = [];
  await p.evaluate(() => { SD.app.S.answers.styles = ['apple']; SD.app.S.answers.variant = 0; SD.applyLook(SD.app.S.answers); SD.app.regenerate(true); SD.wizard.go(SD.wizard.STEPS.findIndex(s => s.id === 'mix')); });
  await p.waitForTimeout(500);
  const titles = await p.evaluate(() => [...document.querySelectorAll('#step .thumb')].map(t => t.textContent));
  if (!titles.some(t => /светлая витрина/.test(t)) || !titles.some(t => /тёмная витрина/.test(t))) ui.push('на шаге «Сочетание» нет образов стиля');
  await p.locator('#step .thumb').nth(1).click(); await p.waitForTimeout(500);
  const bg = await p.evaluate(() => SD.app.S.doc.pages[0].bg);
  if (bg !== '#000000') ui.push('выбор образа «тёмная витрина» не сделал фон чёрным: ' + bg);
  const lay = await p.evaluate(() => SD.app.S.answers.layout);
  if (lay !== 'center') ui.push('образ не применил свою композицию');
  await p.evaluate(() => SD.wizard.go(SD.wizard.STEPS.findIndex(s => s.id === 'style'))); await p.waitForTimeout(400);
  await p.locator('#step tr.pick', { hasText: 'Свободно' }).click(); await p.waitForTimeout(400);
  const free = await p.evaluate(() => [SD.app.S.answers.fidelity, SD.app.variant().look ? 'look' : 'generic']);
  if (free[0] !== 'free' || free[1] !== 'generic') ui.push('режим «Свободно» не переключился');
  failed += ui.length;
  console.log(`\n${ui.length ? '✗' : '✓'} Интерфейс`);
  ui.forEach(f => console.log('  - ' + f));

  if (errs.length) { console.log('\nОшибки JS:', errs); failed += errs.length; }
  console.log(failed ? `\nИТОГО: ${failed} проблем` : '\nИТОГО: всё чисто');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
