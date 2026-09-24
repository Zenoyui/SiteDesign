// Тесты текста: читаемость, кегль, контраст, выход за лист и поля обреза,
// переносы, висячие предлоги, тире, перекрытия, стресс-тексты, живая проверка в редакторе.
// Запуск: python3 -m http.server 8765 & node tests/text.test.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  let failed = 0;
  const report = (title, r) => {
    const bad = r.fails.length;
    failed += bad;
    console.log(`\n${bad ? '✗' : '✓'} ${title}: проверено ${r.total}${bad ? ', ошибок ' + bad : ''}`);
    if (r.stats) console.log('  ' + Object.entries(r.stats).map(([k, v]) => `${k}: ${v}`).join(', '));
    r.fails.slice(0, 12).forEach(f => console.log('  - ' + f));
    if (bad > 12) console.log(`  … и ещё ${bad - 12}`);
  };

  // 1. Типографика и переносы на уровне строк
  report('Типографика и переносы', await p.evaluate(() => {
    const fails = []; let total = 0, relaxedN = 0;
    const mk = (text, w, size = 14, extra = {}) => Object.assign({ type: 'text', text, font: 'Onest', weight: 400, size, w, lh: 1.2, align: 'left' }, extra);
    const phrases = ['Первая поездка — за 1 ₽', 'Самокат в 2 минутах от дома', 'Скидка 30% до воскресенья и подарок к заказу', 'Горячее за 5 минут и с доставкой на дом',
      'Как это работает — за 3 шага', 'Не понравится — вернём деньги', 'Приходите в субботу к 10 утра', '8 800 000-00-00 · пример.рф'];
    const SHORT = /(^|[\s ])(в|во|и|а|к|ко|с|со|у|о|об|от|до|на|по|за|из|не|но|ни|же|ли)$/i;
    for (const ph of phrases) for (let w = 18; w <= 120; w += 3) for (const up of [false, true]) {
      total++;
      const el = mk(ph, w, 14, { upper: up });
      const L = SD.render.layoutText(el);
      if (L.relaxed || L.broken) { relaxedN++; continue; }
      L.lines.forEach((l, i) => {
        if (i > 0 && /^[—–]/.test(l.trim())) fails.push(`«${ph}» w=${w}: строка начинается с тире`);
        if (i < L.lines.length - 1 && SHORT.test(l.trim())) fails.push(`«${ph}» w=${w}: висячее «${l.trim().split(/\s| /).pop()}»`);
        if (L.widths[i] > w + 0.3) fails.push(`«${ph}» w=${w}: строка шире блока`);
        if (/\d$/.test(l.trim()) && i < L.lines.length - 1 && /^[₽%]/.test(L.lines[i + 1].trim())) fails.push(`«${ph}» w=${w}: число оторвано от знака`);
      });
      if (L.lines.join('').replace(/[\s -]/g, '') !== (up ? ph.toUpperCase() : ph).replace(/[\s-]/g, '')) fails.push(`«${ph}» w=${w}: потерян или добавлен текст`);
    }
    // длинное слово: рвётся с дефисом и не вылезает
    for (let w = 10; w <= 60; w += 5) {
      total++;
      const L = SD.render.layoutText(mk('Сверхскоростнойэлектросамокатище', w, 20));
      if (!L.broken) fails.push(`длинное слово w=${w}: не отмечено как разорванное`);
      L.lines.forEach((l, i) => { if (L.widths[i] > w + 0.3) fails.push(`длинное слово w=${w}: строка шире блока`); if (i < L.lines.length - 1 && !l.endsWith('-')) fails.push(`длинное слово w=${w}: разрыв без дефиса`); });
    }
    // длинное слово в середине фразы тоже переносится
    total++;
    const L2 = SD.render.layoutText(mk('Акция Сверхскоростнойэлектросамокатище сегодня', 30, 20));
    if (L2.widths.some(x => x > 30.3)) fails.push('длинное слово в середине фразы вылезает за блок');
    // перевод строки сохраняется, пустой текст не ломает
    total++;
    if (SD.render.layoutText(mk('Раз\nДва\n\nТри', 80)).lines.length !== 4) fails.push('ручные переводы строк не сохраняются');
    total++;
    if (SD.render.layoutText(mk('', 50)).lines.length !== 1) fails.push('пустой текст');
    // смягчение правил допустимо только когда блок уже самой короткой неразрывной связки
    total++;
    if (relaxedN > total * 0.15) fails.push(`слишком часто нарушаются правила переноса: ${relaxedN} раз`);
    return { fails, total, stats: { 'узкие блоки, где правила смягчены': relaxedN } };
  }));

  // 2. Реальные макеты: все форматы × раскладки × стили, разные цели и приёмы
  report('Реальные макеты (без ошибок и замечаний)', await p.evaluate(() => {
    const fails = [], stats = {}; let total = 0, dropped = 0;
    const base = JSON.parse(JSON.stringify(SD.app.S.answers));
    const goals = Object.keys(SD.GOALS), inds = Object.keys(SD.INDUSTRIES);
    const mkSets = [{}, { urgency: true, proof: true, arrow: true }, { benefits: true, price: true }, { urgency: true, benefits: true, price: true, proof: true, guarantee: true, arrow: true, contrastCta: true }];
    const kits = SD.STYLE_ORDER.map(id => Object.assign({ auto: false }, SD.KITS[id]));
    let n = 0;
    for (const f of Object.keys(SD.FORMATS)) for (const lay of Object.keys(SD.LAYOUTS)) for (const st of SD.STYLE_ORDER) for (const inv of [false, true]) {
      n++;
      const a = JSON.parse(JSON.stringify(base));
      const goal = goals[n % goals.length], ind = inds[n % inds.length];
      Object.assign(a, { format: f, layout: lay, styles: [st], palette: null, goal, industry: ind, orient: n % 3 === 0 && f !== 'SQ' ? 'landscape' : 'portrait', pages: n % 4 === 0 ? 2 : 1 });
      a.texts = Object.assign({ qr: 'https://example.com' }, SD.EXAMPLES[goal], SD.app.benefitTexts(ind));
      a.mk = Object.assign({ urgency: false, benefits: false, price: false, proof: false, guarantee: false, arrow: false, contrastCta: false }, mkSets[n % mkSets.length]);
      a.fx = n % 2 ? kits[n % 6] : { auto: true };
      a.opts.qr = n % 5 === 0;
      a.variant = inv ? SD.gen.variants(a.styles).findIndex(v => v.invert) : 0;
      const d = SD.gen.build(a);
      total++;
      if (d.notes && d.notes.length) dropped++;
      for (const i of SD.lint.check(d)) {
        if (i.code === 'note') continue;
        stats[i.code] = (stats[i.code] || 0) + 1;
        fails.push(`${f} ${a.orient} ${lay} ${st}${inv ? ' (цветной фон)' : ''} стр.${i.page + 1} «${i.name}»: ${i.msg}`);
      }
    }
    stats['макетов с убранными блоками'] = dropped;
    return { fails, total, stats };
  }));

  // 3. Смеси стилей и все эффекты
  report('Смеси стилей и эффекты', await p.evaluate(() => {
    const fails = []; let total = 0;
    const base = JSON.parse(JSON.stringify(SD.app.S.answers));
    const sets = [['yandex', 'go'], ['whoosh', 'bk'], ['urent', 'vit'], ['go', 'whoosh', 'urent'], SD.STYLE_ORDER.slice()];
    for (const styles of sets) for (const lay of Object.keys(SD.LAYOUTS)) for (const eff of [[], Object.keys(SD.EFFECTS)]) for (const pat of ['none', 'checker', 'halftone', 'confetti']) {
      const a = JSON.parse(JSON.stringify(base));
      Object.assign(a, { styles, layout: lay, format: 'A5', variant: 0, palette: null });
      a.fx = { auto: false, effects: eff, icons: 'badge', pattern: pat, display: 'phone' };
      a.mk = { urgency: true, benefits: true, price: false, proof: true, guarantee: false, arrow: true, contrastCta: false };
      total++;
      for (const i of SD.lint.check(SD.gen.build(a))) if (i.code !== 'note') fails.push(`${styles.join('+')} ${lay} эффекты:${eff.length} узор:${pat} «${i.name}»: ${i.msg}`);
    }
    return { fails, total };
  }));

  // 4. Стресс: очень длинные и странные тексты — ни одного вылета за лист и перекрытия; если не влезло — страница сообщает
  report('Стресс-тексты', await p.evaluate(() => {
    const fails = []; let total = 0;
    const base = JSON.parse(JSON.stringify(SD.app.S.answers));
    const long = 'Очень длинный текст о том, как удобно пользоваться сервисом каждый день, и почему это выгодно. ';
    const cases = {
      'длинный заголовок': { title: 'Самая большая осенняя распродажа года для всех жителей нашего замечательного города и области' },
      'длинное слово': { title: 'Сверхскоростнойэлектросамокатище' },
      'длинный текст': { body: long.repeat(8) },
      'длинные выгоды': { benefit1: long, benefit2: long, benefit3: long },
      'длинный адрес': { contacts: 'https://very-long-domain-name-for-testing.example.com/path/to/page?utm=flyer · +7 (999) 000-00-00' },
      'пусто': { title: '', subtitle: '', body: '', cta: '', promo: '', contacts: '' },
      'одни пробелы': { title: '   ', body: '  ' },
      'переводы строк': { title: 'Раз\nДва\nТри\nЧетыре\nПять\nШесть' },
      'длинная кнопка': { cta: 'Нажмите сюда, чтобы получить подарок прямо сейчас' },
      'длинный бейдж': { promo: 'Бесплатно навсегда' }
    };
    for (const [name, patch] of Object.entries(cases)) for (const f of ['A6', 'A4', 'DL', 'SLIDE']) for (const lay of Object.keys(SD.LAYOUTS)) {
      const a = JSON.parse(JSON.stringify(base));
      Object.assign(a, { format: f, layout: lay, pages: 2 });
      Object.assign(a.texts, patch);
      a.mk = { urgency: true, benefits: true, price: true, proof: true, guarantee: true, arrow: true, contrastCta: true };
      let d;
      try { d = SD.gen.build(a); } catch (e) { fails.push(`${name} ${f} ${lay}: падение ${e.message}`); continue; }
      total++;
      const bad = SD.lint.check(d, { contrast: false }).filter(i => ['offpage', 'overlap', 'covered', 'overflow', 'size'].includes(i.code));
      const told = (d.notes || []).some(n => /не помещается/.test(n));
      if (bad.length && !told) bad.forEach(i => fails.push(`${name} ${f} ${lay} стр.${i.page + 1} «${i.name}»: ${i.msg}`));
    }
    return { fails, total };
  }));

  // 5. Живая проверка в редакторе
  const ui = { fails: [], total: 0 };
  const stepOf = id => p.evaluate(id => SD.wizard.STEPS.findIndex(s => s.id === id), id);
  await p.evaluate(i => SD.wizard.go(i), await stepOf('editor')); await p.waitForTimeout(400);
  const lintText = () => p.locator('#lintBox').innerText().catch(() => '');
  ui.total++;
  if (!/Проверка пройдена/.test(await lintText())) ui.fails.push('исходный макет: живая проверка не «пройдена»: ' + (await lintText()).slice(0, 200));
  // пишем огромный заголовок через панель
  await p.evaluate(() => { const t = SD.app.page().elements.find(e => e.role === 'title'); SD.app.setSel([t.id]); });
  await p.waitForTimeout(200);
  await p.locator('textarea[data-k="text"]').fill('Очень очень очень длинный заголовок, который точно не поместится на маленьком флаере формата А6');
  await p.locator('textarea[data-k="text"]').dispatchEvent('change');
  await p.waitForTimeout(400);
  await p.evaluate(() => SD.app.setSel([])); await p.waitForTimeout(300);
  ui.total++;
  if (!/Ошибка/.test(await lintText())) ui.fails.push('длинный заголовок: живая проверка не нашла ошибку');
  // тащим текст за край листа
  await p.evaluate(() => { const t = SD.app.page().elements.find(e => e.role === 'body'); t.x = SD.app.S.doc.w - 10; SD.app.commit(); SD.app.setSel([]); });
  await p.waitForTimeout(300);
  ui.total++;
  if (!/выходит за край/.test(await lintText())) ui.fails.push('текст за краем: проверка не заметила');
  // делаем текст почти белым на белом
  await p.evaluate(() => { const t = SD.app.page().elements.find(e => e.role === 'contacts'); t.fill = '#F4F4F4'; t.fillRole = null; SD.app.commit(); SD.app.setSel([]); });
  await p.waitForTimeout(300);
  ui.total++;
  if (!/контраст/i.test(await lintText())) ui.fails.push('светлый текст на светлом: контраст не проверен');
  // кнопка «Показать» выделяет элемент
  const before = await p.evaluate(() => SD.app.S.sel.length);
  if (await p.locator('#lintBox button').count()) { await p.locator('#lintBox button').first().click(); await p.waitForTimeout(300); }
  ui.total++;
  if (await p.evaluate(() => SD.app.S.sel.length) === before && before === 0) ui.fails.push('«Показать» не выделяет элемент');
  // отмена возвращает чистый макет
  for (let i = 0; i < 4; i++) await p.evaluate(() => SD.app.undo());
  await p.evaluate(() => SD.app.setSel([])); await p.waitForTimeout(400);
  ui.total++;
  if (!/Проверка пройдена/.test(await lintText())) ui.fails.push('после отмены проверка не вернулась в «пройдена»: ' + (await lintText()).slice(0, 200));
  // шаг «Результат» тоже показывает проверку
  await p.evaluate(i => SD.wizard.go(i), await stepOf('result')); await p.waitForTimeout(400);
  ui.total++;
  if (!(await lintText())) ui.fails.push('на шаге «Результат» нет проверки');
  report('Живая проверка в редакторе', ui);

  if (errs.length) { console.log('\nОшибки JS:', errs); failed += errs.length; }
  console.log(failed ? `\nИТОГО: ${failed} проблем` : '\nИТОГО: всё чисто');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
