// Тесты: обучение вкусу («какой лучше»), серия в одном стиле, стили-направления.
// Запуск: python3 -m http.server 8765 & node tests/extra.test.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  // в закрытой среде интернет (CDN с jsPDF) доступен только через прокси
  const px = process.env.HTTPS_PROXY;
  const b = await chromium.launch(px ? { args: ['--proxy-server=' + px, '--proxy-bypass-list=127.0.0.1;localhost'] } : {});
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(2500);
  let failed = 0;
  const report = (title, r) => {
    failed += r.fails.length;
    console.log(`\n${r.fails.length ? '✗' : '✓'} ${title}: проверок ${r.total}${r.fails.length ? ', ошибок ' + r.fails.length : ''}`);
    (r.info || []).forEach(i => console.log('  · ' + i));
    r.fails.slice(0, 12).forEach(f => console.log('  - ' + f));
  };

  // 1. Вкус: «пользователь», который всегда выбирает определённое, получает это наверху
  report('Обучение вкусу', await p.evaluate(async () => {
    const fails = [], info = []; let total = 0;
    const base = SD.app.defaultAnswers();
    base.styles = ['yandex', 'urent', 'bk', 'swiss'];
    const prefs = {
      'тёмный фон': (x, d) => SD.u.lum(d.pages[0].bg) < 0.35,
      'колонка слева': x => x.layout === 'left',
      'без градиента': (x, d) => ((d.decisions || []).find(q => q.topic === 'Градиент') || {}).choice === 'без градиента'
    };
    for (const [name, like] of Object.entries(prefs)) {
      SD.taste.reset();
      const pool = SD.brain.candidates(base, {}, 120, 5).map(a => ({ a, d: SD.gen.build(a) }));
      const before = (await SD.brain.search(base, { n: 150, seed: 3, deep: 12 })).best.filter(r => like(r.ans, r.doc)).length;
      let made = 0;
      for (let i = 0; i < pool.length - 1 && made < 14; i += 2) {
        const A = pool[i], B = pool[i + 1];
        const la = like(A.a, A.d), lb = like(B.a, B.d);
        if (la === lb) continue;
        const [win, lose] = la ? [A, B] : [B, A];
        SD.taste.update(SD.taste.features(win.a, win.d), SD.taste.features(lose.a, lose.d));
        made++;
      }
      const res = await SD.brain.search(base, { n: 150, seed: 3, deep: 12 });
      const after = res.best.filter(r => like(r.ans, r.doc)).length;
      total++;
      info.push(`«${name}»: ${made} выборов; в шестёрке лучших до обучения ${before}, после ${after}; итоги выбранных: ${res.best.map(r => r.score.total).join(', ')}`);
      // вкус должен поднять нужное до 4+ из 6; если его и так было много — не уронить
      if ((before < 4 && after < 4) || after < before) fails.push(`«${name}»: вкус не поднял нужные варианты (${before} → ${after})`);
      if (res.best.some(r => r.score.errs)) fails.push(`«${name}»: вкус пропустил вариант с ошибками текста`);
      const sum = SD.taste.summary();
      total++;
      const key = { 'тёмный фон': 'тёмный', 'колонка слева': 'Колонка слева', 'без градиента': 'без градиента' }[name];
      if (!sum.likes.join(' ').includes(key)) fails.push(`«${name}»: в описании вкуса нет «${key}» (${sum.likes.join(', ')})`);
    }
    total++;
    SD.taste.reset();
    if (SD.taste.count() !== 0 || SD.taste.bonus(base, SD.gen.build(base)) !== 0) fails.push('«Забыть мой вкус» не сбрасывает');
    return { fails, total, info };
  }));

  // 2. Серия в одном стиле: 5 форматов, без ошибок текста, одни и те же цвета и шрифт
  report('Серия в одном стиле', await p.evaluate(() => {
    const fails = []; let total = 0;
    let seed = 99; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const P = a => a[Math.floor(R() * a.length)];
    for (let i = 0; i < 24; i++) {
      const a = SD.app.defaultAnswers();
      Object.assign(a, { goal: P(Object.keys(SD.GOALS)), industry: P(Object.keys(SD.INDUSTRIES)), layout: P(Object.keys(SD.LAYOUTS)), styles: [P(SD.STYLE_ORDER)] });
      a.texts = Object.assign({}, SD.EXAMPLES[a.goal], SD.app.benefitTexts(a.industry), { contacts: 'studio-lana.ru · +7 912 345-67-89' });
      for (const k in a.mk) a.mk[k] = R() < 0.3;
      const ser = SD.series.build(a);
      total++;
      if (ser.length !== 5) fails.push(`серия ${i + 1}: форматов ${ser.length}`);
      const fonts = new Set(ser.map(s => (s.doc.pages[0].elements.find(e => e.role === 'title') || {}).font));
      if (fonts.size !== 1) fails.push(`серия ${i + 1}: разные шрифты заголовка ${[...fonts].join(', ')}`);
      const bgs = new Set(ser.map(s => s.doc.pages[0].bg));
      if (bgs.size !== 1) fails.push(`серия ${i + 1}: разный фон`);
      for (const s of ser) {
        total++;
        const errsL = SD.lint.check(s.doc).filter(x => x.level === 'error');
        if (errsL.length) fails.push(`серия ${i + 1} ${a.styles[0]} ${s.name}: ${errsL[0].name}: ${errsL[0].msg}`);
        if (s.key === 'biz' && s.doc.pages[0].elements.some(e => ['cta', 'promo', 'body', 'urgency', 'benefit', 'price'].includes(e.role))) fails.push(`серия ${i + 1}: на визитке лишние блоки`);
      }
    }
    return { fails, total };
  }));

  // 3. Направления без брендов: узнаваемы и читаемы
  report('Стили-направления', await p.evaluate(() => {
    const fails = []; let total = 0;
    const dirs = SD.STYLE_ORDER.filter(s => SD.STYLES[s].group === 'direction');
    const sigs = new Set();
    for (const st of dirs) for (const lay of Object.keys(SD.LAYOUTS)) for (const f of ['A6', 'A4', 'SQ', 'STORY', 'WIDE']) {
      const a = SD.app.defaultAnswers();
      Object.assign(a, { styles: [st], layout: lay, format: f });
      const d = SD.gen.build(a);
      total++;
      for (const i of SD.lint.check(d).filter(x => x.level === 'error' || x.code === 'contrast')) fails.push(`${st} ${lay} ${f} «${i.name}»: ${i.msg}`);
      if (lay === 'top' && f === 'A4') sigs.add(JSON.stringify(d.pages[0].elements.filter(e => e.role === 'decor').map(e => [e.type, e.name])));
    }
    total++;
    if (sigs.size !== dirs.length) fails.push(`приёмы направлений не различаются (${sigs.size} из ${dirs.length})`);
    return { fails, total };
  }));

  // 4. Интерфейс: пара, серия, скачивание серии
  const ui = { fails: [], total: 0 };
  const go = id => p.evaluate(id => SD.wizard.go(SD.wizard.STEPS.findIndex(s => s.id === id)), id);
  await go('auto'); await p.waitForTimeout(500);
  ui.total++;
  if (await p.locator('.pairpick').count() !== 2) ui.fails.push('нет пары для сравнения');
  await p.locator('.pairpick').nth(1).click(); await p.waitForTimeout(400);
  ui.total++;
  if (!/Сделано выборов: 1/.test(await p.locator('#tasteBox').innerText())) ui.fails.push('выбор не засчитан');
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(2500); await go('auto'); await p.waitForTimeout(400);
  ui.total++;
  if (!/Сделано выборов: 1/.test(await p.locator('#tasteBox').innerText())) ui.fails.push('вкус не сохранился после перезагрузки');
  await go('result'); await p.waitForTimeout(700);
  ui.total++;
  const serThumbs = await p.locator('#step .cap', { hasText: 'Серия' }).count();
  if (!serThumbs) ui.fails.push('нет серии на шаге «Результат»');
  ui.total++;
  try {
    const dl = p.waitForEvent('download', { timeout: 90000 });
    await p.locator('#step button', { hasText: 'Скачать серию одним PDF' }).click();
    const d = await dl; const path = '/tmp/claude-0/-home-user-SiteDesign/2a22ad88-3654-5359-8fe3-715421a2bad2/scratchpad/series-test.pdf';
    await d.saveAs(path);
    const pdf = require('fs').readFileSync(path, 'latin1');
    const boxes = [...pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map(m => [Math.round(+m[1] / 72 * 25.4), Math.round(+m[2] / 72 * 25.4)]);
    const want = [[148, 210], [150, 150], [108, 192], [240, 126], [90, 50]];
    if (JSON.stringify(boxes) !== JSON.stringify(want)) ui.fails.push('размеры страниц PDF: ' + JSON.stringify(boxes));
  } catch (e) { ui.fails.push('PDF серии не скачался: ' + e.message.slice(0, 80)); }
  report('Интерфейс', ui);

  if (errs.length) { console.log('\nОшибки JS:', errs); failed += errs.length; }
  console.log(failed ? `\nИТОГО: ${failed} проблем` : '\nИТОГО: всё чисто');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
