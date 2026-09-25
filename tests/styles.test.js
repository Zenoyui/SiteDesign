// Проверка комбинирования стилей: node tests/styles.test.js (нужен сервер на :8765 и playwright).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);

  // 1. Логика: для каждого из 63 наборов стилей
  const r = await p.evaluate(() => {
    const ids = SD.STYLE_ORDER, fails = [], sigs = {};
    const sig = styles => {
      const a = JSON.parse(JSON.stringify(SD.app.S.answers));
      Object.assign(a, { styles, variant: 0, palette: null, font: null });
      const v = SD.gen.variants(styles)[0], pal = SD.gen.palette(v), st = SD.gen.styleProps(a, v);
      const doc = SD.gen.build(a);
      return { v, pal, st, key: JSON.stringify([pal.bg, pal.primary, pal.accent, pal.text, pal.extra, st.font, v.motifs, doc.pages[0].elements.map(e => e.type + e.fill).join()]) };
    };
    // все одиночные, все пары и 150 случайных смесей из 3–15 стилей
    const sets = ids.map(x => [x]);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) sets.push([ids[i], ids[j]]);
    let seed = 42; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 150; k++) { const n = 3 + Math.floor(R() * (ids.length - 2)); const S2 = ids.slice().sort(() => R() - 0.5).slice(0, n); sets.push(ids.filter(x => S2.includes(x))); }
    for (const S of sets) {
      const s = sig(S); sigs[S.slice(0, 7).join('+')] = s.key; // смеси с одинаковыми первыми 7 стилями совпадают по замыслу
      if (S.length < 2) continue;
      // превью должно отличаться от превью каждого стиля по отдельности
      for (const one of S) if (s.key === sig([one]).key) fails.push(`${S.join('+')}: превью = только «${one}»`);
      // каждый выбранный стиль должен что-то привнести
      const v = s.v, contrib = new Set([v.colorsFrom, v.accentFrom, v.extraFrom, v.fontFrom, ...(v.motifFrom || [])]);
      // в одной смеси заметны максимум 7 стилей (цвета, акцент, доп. цвет, шрифт, три мотива)
      const need = S.length <= 7 ? S : S.slice(0, 7);
      for (const one of need) if (!contrib.has(one)) fails.push(`${S.join('+')}: стиль «${one}» не участвует`);
      if (S.length > 7 && [...contrib].filter(x => S.includes(x)).length < 7) fails.push(`${S.join('+')}: участвует меньше 7 стилей`);
    }
    const uniq = new Set(Object.values(sigs)).size;
    return { fails, total: Object.keys(sigs).length, uniq };
  });
  console.log(`Наборов: ${r.total}, уникальных превью: ${r.uniq}`);
  if (r.uniq < r.total) r.fails.push(`одинаковых превью: ${r.total - r.uniq}`);
  console.log(r.fails.length ? 'ОШИБКИ (' + r.fails.length + '):\n' + r.fails.slice(0, 15).join('\n') : 'Логика: OK');

  // 2. Интерфейс: клики по галочкам на шаге 3 меняют картинку справа
  await p.evaluate(() => SD.wizard.go(2)); await p.waitForTimeout(300);
  const px = () => p.evaluate(() => document.getElementById('canvas').toDataURL());
  const rows = p.locator('#step table.doc').first().locator('tr.pick');
  let prev = await px(), uiFails = [];
  const seq = [0, 3, 4, 5, 2]; // добавляем стили по одному (go уже выбран)
  for (const i of seq) {
    const name = await rows.nth(i).locator('b').textContent();
    await rows.nth(i).click(); await p.waitForTimeout(400);
    const now = await px();
    const st = await p.evaluate(() => SD.app.S.answers.styles.join('+'));
    if (now === prev) uiFails.push(`клик «${name}» → ${st}: превью не изменилось`);
    else console.log(`клик «${name}» → ${st}: превью изменилось`);
    prev = now;
  }
  console.log(uiFails.length ? 'ОШИБКИ UI:\n' + uiFails.join('\n') : 'Интерфейс: OK');
  if (errs.length) console.log('Ошибки JS:', errs);
  await b.close();
  process.exit(r.fails.length || uiFails.length || errs.length ? 1 : 0);
})();
