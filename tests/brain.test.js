// Тесты «дизайн-мозга», современных градиентов, автопилота и готовности к выпуску.
// Запуск: python3 -m http.server 8765 & node tests/brain.test.js
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
    failed += r.fails.length;
    console.log(`\n${r.fails.length ? '✗' : '✓'} ${title}: проверок ${r.total}${r.fails.length ? ', ошибок ' + r.fails.length : ''}`);
    (r.info || []).forEach(i => console.log('  · ' + i));
    r.fails.slice(0, 12).forEach(f => console.log('  - ' + f));
  };

  // 1. Цвет в OKLCH
  report('Цвет OKLCH и градиенты без «грязной середины»', await p.evaluate(() => {
    const fails = [], info = []; let total = 0;
    const C = SD.color, u = SD.u;
    for (let i = 0; i < 400; i++) {
      total++;
      const hex = u.rgbToHex(Math.random() * 255, Math.random() * 255, Math.random() * 255);
      const back = C.fromOklab(C.toOklab(hex));
      const d = u.hexToRgb(hex).map((v, k) => Math.abs(v - u.hexToRgb(back)[k]));
      if (Math.max(...d) > 1) fails.push(`${hex} → ${back}: потеря точности`);
    }
    for (const [a, c] of [['#1F63E0', '#FFD83D'], ['#E3261B', '#2E9E4F'], ['#7A43EE', '#FF8A1E'], ['#FF3EA5', '#3EF2E1']]) {
      total++;
      const ramp = C.ramp([a, c], 10).map(s => C.chroma(s.c));
      const minEnd = Math.min(C.chroma(a), C.chroma(c));
      const srgbMid = C.chroma(u.mix(a, c, 0.5));
      const okMid = Math.min(...ramp);
      info.push(`${a}→${c}: насыщенность в середине sRGB ${srgbMid.toFixed(3)}, OKLCH ${okMid.toFixed(3)}`);
      if (okMid < minEnd * 0.6) fails.push(`${a}→${c}: середина градиента серая`);
      if (okMid < srgbMid) fails.push(`${a}→${c}: OKLCH не лучше sRGB`);
    }
    return { fails, total, info };
  }));

  // 2. Решение «нужен ли градиент»
  report('Правила градиента', await p.evaluate(() => {
    const fails = []; let total = 0;
    const base = JSON.parse(JSON.stringify(SD.app.S.answers));
    const dec = patch => { const a = JSON.parse(JSON.stringify(base)); Object.assign(a, { layout: 'split', format: 'A5' }, patch); a.fx = Object.assign({ auto: false, effects: [], icons: 'soft', pattern: 'none', display: 'none', gradient: 'auto' }, patch.fx || {}); const d = SD.gen.build(a); return d.decisions.find(x => x.topic === 'Градиент'); };
    const t = (name, cond) => { total++; if (!cond) fails.push(name); };
    const fin = dec({ styles: ['urent'], industry: 'finance' });
    t('финансы + фиолетовый стиль → градиент', fin.choice !== 'без градиента');
    t('у решения есть объяснение', fin.reasons.length >= 4);
    const eco = dec({ styles: ['vit'], industry: 'eco' });
    t('эко + точечный стиль → без градиента', eco.choice === 'без градиента');
    const busy = dec({ styles: ['urent'], industry: 'finance', fx: { pattern: 'confetti' } });
    t('узор снижает оценку градиента на 1', busy.score === fin.score - 1);
    const man = dec({ styles: ['vit'], industry: 'eco', fx: { gradient: 'mesh' } });
    t('ручной выбор градиента соблюдается', man.choice === SD.gen.GRAD_TYPES.mesh);
    const off = dec({ styles: ['urent'], industry: 'finance', fx: { gradient: 'none' } });
    t('ручное «без градиента» соблюдается', off.choice === 'без градиента');
    return { fails, total };
  }));

  // 3. Любой градиент не портит читаемость (контраст по пикселям)
  report('Градиенты и читаемость текста', await p.evaluate(() => {
    const fails = []; let total = 0;
    const base = JSON.parse(JSON.stringify(SD.app.S.answers));
    for (const st of SD.STYLE_ORDER) for (const lay of Object.keys(SD.LAYOUTS)) for (const g of ['linear', 'radial', 'mesh', 'aurora']) for (const inv of [false, true]) {
      const a = JSON.parse(JSON.stringify(base));
      Object.assign(a, { styles: [st], layout: lay, format: 'A5', palette: null });
      a.variant = inv ? SD.gen.variants(a.styles).findIndex(v => v.invert) : 0;
      a.fx = { auto: false, effects: ['shadow'], icons: 'badge', pattern: 'none', display: 'none', gradient: g };
      a.mk = { urgency: true, benefits: false, price: false, proof: true, guarantee: false, arrow: false, contrastCta: false };
      total++;
      for (const i of SD.lint.check(SD.gen.build(a))) if (i.level === 'error' || i.code === 'contrast') fails.push(`${st}${inv ? '!' : ''} ${lay} ${g} «${i.name}»: ${i.msg}`);
    }
    return { fails, total };
  }));

  // 4. «Мозг» реагирует на то, на что должен
  report('Чувствительность оценки', await p.evaluate(() => {
    const fails = [], info = []; let total = 0;
    const base = JSON.parse(JSON.stringify(SD.app.S.answers));
    base.format = 'A5'; base.layout = 'top';
    const mk = (patch, mut) => { const a = JSON.parse(JSON.stringify(base)); Object.assign(a, patch); const d = SD.gen.build(a); if (mut) mut(d); return SD.brain.score(d, a); };
    const t = (name, cond, extra) => { total++; if (!cond) fails.push(name + (extra ? ' ' + extra : '')); };
    const plain = mk({});
    const broken = mk({}, d => { const tl = d.pages[0].elements.find(e => e.role === 'title'); tl.x = d.w - 5; });
    t('текст за краем → итог не выше 55', broken.total <= 55, broken.total);
    const noCta = mk({ opts: Object.assign({}, base.opts, { cta: false }) });
    t('без кнопки при цели «продать» → хуже заметность призыва', noCta.parts.cta < plain.parts.cta);
    const busy = mk({ fx: { auto: false, effects: ['shadow', 'hardShadow', 'sticker', 'tilt', 'grain'], icons: 'badge', pattern: 'confetti', display: 'phone', gradient: 'aurora' } });
    t('узор + все эффекты → ниже «Простота»', busy.parts.complexity < plain.parts.complexity, `${busy.parts.complexity} vs ${plain.parts.complexity}`);
    const all = mk({ format: 'A6', mk: { urgency: true, benefits: true, price: true, proof: true, guarantee: true, arrow: true, contrastCta: true } });
    const none = mk({ format: 'A6' });
    t('все 7 приёмов на A6 → выше нагрузка', all.parts.load < none.parts.load, `${all.parts.load} vs ${none.parts.load}`);
    const flat = mk({}, d => { const tl = d.pages[0].elements.find(e => e.role === 'title'); tl.size = 9; SD.render.fitHeight(tl); });
    t('заголовок размером с текст → ниже иерархия', flat.parts.hierarchy < plain.parts.hierarchy);
    const mixed = mk({}, d => { const bd = d.pages[0].elements.find(e => e.role === 'body'); bd.align = 'center'; });
    t('смешанная выключка → ниже порядок', mixed.parts.order < plain.parts.order);
    const rainbow = mk({}, d => { ['#E3261B', '#1F63E0', '#2E9E4F', '#FF8A1E', '#7A43EE'].forEach((c, i) => d.pages[0].elements.unshift(SD.gen.base({ x: i * d.w / 5, y: 0, w: d.w / 5, h: d.h * 0.15, fill: c }))); });
    t('радуга из 5 цветов → ниже гармония', rainbow.parts.harmony < plain.parts.harmony, `${rainbow.parts.harmony} vs ${plain.parts.harmony}`);
    info.push(`обычный ${plain.total}, пёстрый ${busy.total}, перегруженный A6 ${all.total}, радуга ${rainbow.total}, сломанный ${broken.total}`);
    return { fails, total, info };
  }));

  // 5. Автопилот: лучше исходного и готовность от 90% на случайных заданиях
  report('Автопилот и готовность к выпуску', await p.evaluate(async () => {
    const fails = [], info = []; let total = 0, ok90 = 0;
    let seed = 20260924;
    const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const P = arr => arr[Math.floor(R() * arr.length)];
    const briefs = 40;
    const readyList = [];
    for (let i = 0; i < briefs; i++) {
      const a = SD.app.defaultAnswers();
      const kind = P(Object.keys(SD.KINDS)), K = SD.KINDS[kind];
      Object.assign(a, { kind, goal: P(Object.keys(SD.GOALS)), industry: P(Object.keys(SD.INDUSTRIES)), format: K.format, orient: K.orient, pages: K.pages });
      a.styles = SD.STYLE_ORDER.filter(() => R() < 0.4); if (!a.styles.length) a.styles = [P(SD.STYLE_ORDER)];
      a.texts = Object.assign({}, SD.EXAMPLES[a.goal], SD.app.benefitTexts(a.industry), { contacts: 'studio-lana.ru · +7 912 345-67-89', qr: 'https://studio-lana.ru/promo' });
      for (const k in a.mk) a.mk[k] = R() < 0.35;
      a.opts.qr = R() < 0.4;
      const cur = SD.brain.score(SD.gen.build(a), a);
      const res = await SD.brain.search(a, { n: 200, seed: 11 + i, deep: 16 });
      const best = res.best[0];
      total++;
      if (!best) { fails.push(`задание ${i + 1}: нет вариантов`); continue; }
      if (best.score.total < cur.total) fails.push(`задание ${i + 1} (${kind}): автопилот ${best.score.total} хуже исходного ${cur.total}`);
      if (best.score.errs) fails.push(`задание ${i + 1}: у лучшего варианта ошибки текста`);
      const r = SD.ready.check(best.doc, best.ans, { dpi: 300, bleed: true, marks: true }, best.score.total);
      readyList.push(r.percent);
      if (r.percent >= 90) ok90++;
      else info.push(`задание ${i + 1} (${SD.KINDS[kind].name}, ${best.ans.format}): готовность ${r.percent}% — ${r.items.filter(x => x.ok < 1).map(x => x.name).join('; ')}`);
    }
    total++;
    info.unshift(`готовность: ${readyList.join(', ')}; от 90% — ${ok90} из ${briefs}`);
    if (ok90 < briefs * 0.9) fails.push(`готовность от 90% только в ${ok90} из ${briefs} заданий (нужно от 90%)`);
    return { fails, total, info };
  }));

  // 6. Интерфейс
  const ui = { fails: [], total: 0 };
  const go = id => p.evaluate(id => SD.wizard.go(SD.wizard.STEPS.findIndex(s => s.id === id)), id);
  await go('auto'); await p.waitForTimeout(400);
  ui.total++;
  await p.locator('#step button', { hasText: 'Подобрать' }).click();
  try { await p.waitForSelector('#step .thumb', { timeout: 60000 }); } catch (e) { ui.fails.push('автопилот не показал варианты'); }
  const scores = await p.evaluate(() => [...document.querySelectorAll('#step .thumb b')].map(x => parseInt(x.textContent)));
  ui.total++;
  if (scores.length < 3) ui.fails.push('меньше трёх вариантов');
  ui.total++;
  if (scores.some((s, i) => i && s > scores[i - 1])) ui.fails.push('варианты не отсортированы по оценке');
  const before = await p.evaluate(() => JSON.stringify(SD.app.S.doc.pages[0].elements.map(e => e.fill)));
  await p.locator('#step button', { hasText: 'Применить' }).click(); await p.waitForTimeout(500);
  ui.total++;
  if (await p.evaluate(() => SD.app.S.answers.texts.title) === '') ui.fails.push('применение потеряло тексты');
  const after = await p.evaluate(() => JSON.stringify(SD.app.S.doc.pages[0].elements.map(e => e.fill)));
  ui.total++;
  if (after === before && scores[0] > (await p.evaluate(() => SD.brain.score(SD.app.S.doc, SD.app.S.answers).total)) + 3) ui.fails.push('применение не изменило макет');
  await go('effects'); await p.waitForTimeout(400);
  ui.total++;
  if (!(await p.locator('#step', { hasText: 'Почему так решено' }).count())) ui.fails.push('нет объяснения решения по градиенту');
  await go('result'); await p.waitForTimeout(500);
  ui.total++;
  if (!/Готовность к выпуску: \d+%/.test(await p.locator('#readyBox').innerText().catch(() => ''))) ui.fails.push('нет процента готовности');
  report('Интерфейс', ui);

  if (errs.length) { console.log('\nОшибки JS:', errs); failed += errs.length; }
  console.log(failed ? `\nИТОГО: ${failed} проблем` : '\nИТОГО: всё чисто');
  await b.close();
  process.exit(failed ? 1 : 0);
})();
