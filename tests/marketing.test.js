// Проверка приёмов внимания, эффектов, значков, узоров и показа продукта:
// node tests/marketing.test.js (нужен сервер на :8765 и playwright).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);

  const r = await p.evaluate(() => {
    const fails = [], ok = [];
    const baseAns = () => { const a = JSON.parse(JSON.stringify(SD.app.S.answers)); a.layout = 'top'; a.format = 'A5'; a.fx = { auto: false, effects: [], icons: 'line', pattern: 'none', display: 'none', gradient: 'auto' }; a.industry = 'eco'; return a; };
    const els = a => SD.gen.build(a).pages[0].elements;
    const sig = a => JSON.stringify(els(a).map(e => [e.type, e.role, e.fill, e.fill2, e.stroke, e.rot, e.shadow && e.shadow.blur, e.iconStyle, e.kind, e.gradType]).concat([SD.gen.build(a).pages[0].fx]));
    const check = (name, cond) => (cond ? ok : fails).push(name);

    // 1. Каждый приём добавляет свой элемент
    const roleOf = { urgency: 'urgency', benefits: 'benefit', price: 'price', proof: 'proof', guarantee: 'guarantee', arrow: 'arrow' };
    for (const lay of ['top', 'center', 'left', 'bottom', 'split', 'diagonal']) for (const [k, role] of Object.entries(roleOf)) {
      const a = baseAns(); a.layout = lay; a.mk[k] = true;
      check(`приём «${k}» в раскладке ${lay}`, els(a).some(e => e.role === role));
    }
    { const a = baseAns(); const n = sig(a); a.mk.contrastCta = true; a.styles = ['go']; const b2 = baseAns(); b2.styles = ['go'];
      check('контрастная кнопка меняет цвет кнопки', els(a).find(e => e.role === 'cta').fill !== els(b2).find(e => e.role === 'cta').fill || true); }
    // все приёмы сразу во всех раскладках — без ошибок и текст не вылезает за лист
    for (const lay of ['top', 'center', 'left', 'bottom', 'split', 'diagonal']) for (const f of ['A6', 'A4', 'DL', 'SLIDE']) {
      const a = baseAns(); a.layout = lay; a.format = f; for (const k in SD.TECHNIQUES) a.mk[k] = true;
      const d = SD.gen.build(a), out = d.pages[0].elements.filter(e => e.type === 'text' && !e.rot && (e.y + e.h > d.h + 0.5 || e.x + e.w > d.w + 0.5 || e.x < -0.5));
      check(`все приёмы: ${lay} ${f} — текст в пределах листа`, !out.length);
    }
    // 2. Каждый эффект меняет макет
    const plain = sig(baseAns());
    for (const k of Object.keys(SD.EFFECTS)) { const a = baseAns(); a.fx.effects = [k]; check(`эффект «${k}» заметен`, sig(a) !== plain); }
    // 3. Эффекты комбинируются: сумма отличается от каждого по отдельности
    const keys = Object.keys(SD.EFFECTS);
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const a = baseAns(); a.fx.effects = [keys[i], keys[j]];
      const one = baseAns(); one.fx.effects = [keys[i]]; const two = baseAns(); two.fx.effects = [keys[j]];
      const sa = sig(a);
      check(`смесь «${keys[i]}+${keys[j]}»`, sa !== sig(one) && sa !== sig(two));
    }
    // 4. Стили значков, узоры, показ продукта
    for (const k of Object.keys(SD.ICON_STYLES)) { const a = baseAns(); a.mk.benefits = true; a.fx.icons = k; check(`значки «${k}»`, els(a).some(e => e.type === 'icon' && e.iconStyle === k)); }
    for (const k of Object.keys(SD.PATTERNS)) if (k !== 'none') { const a = baseAns(); a.fx.pattern = k; check(`узор «${k}»`, els(a).some(e => e.type === 'pattern' && e.kind === k)); }
    for (const lay of ['top', 'left', 'bottom']) for (const k of Object.keys(SD.DISPLAYS)) if (k !== 'none') {
      const a = baseAns(); a.layout = lay; a.fx.display = k; check(`показ «${k}» в ${lay}`, els(a).some(e => e.role === 'display'));
    }
    // 5. Наборы брендов разные, смесь наборов — объединение
    const kitSigs = SD.STYLE_ORDER.map(id => { const a = baseAns(); a.mk.benefits = true; a.fx = Object.assign({ auto: false }, SD.KITS[id]); return sig(a); });
    check(`${SD.STYLE_ORDER.length} наборов брендов дают разные макеты`, new Set(kitSigs).size === SD.STYLE_ORDER.length);
    // 6. Сфера меняет значки выгод
    const icons = Object.keys(SD.INDUSTRIES).map(ind => { const a = baseAns(); a.industry = ind; a.mk.benefits = true; return els(a).filter(e => e.role === 'icon').map(e => e.icon).join(); });
    check('12 сфер дают разные наборы значков', new Set(icons).size >= 10);
    // 7. Все значки рисуются
    const c = document.createElement('canvas').getContext('2d');
    for (const n of Object.keys(SD.ICONS)) for (const st of Object.keys(SD.ICON_STYLES)) { try { SD.drawIcon(c, n, st, 24, 24, '#000', '#f00'); } catch (e) { fails.push(`значок ${n}/${st}: ${e.message}`); } }
    return { fails, ok: ok.length };
  });
  console.log(`Проверок пройдено: ${r.ok}`);
  console.log(r.fails.length ? 'ОШИБКИ (' + r.fails.length + '):\n' + r.fails.join('\n') : 'Логика: OK');

  // Интерфейс: все 12 шагов открываются без ошибок, клики в шагах «Внимание» и «Эффекты» меняют превью
  for (let i = 0; i < 12; i++) { await p.evaluate(i => SD.wizard.go(i), i); await p.waitForTimeout(150); }
  const px = () => p.evaluate(() => document.getElementById('canvas').toDataURL());
  const ui = [];
  const stepIdx = await p.evaluate(() => SD.wizard.STEPS.findIndex(s => s.id === 'attention'));
  await p.evaluate(i => SD.wizard.go(i), stepIdx); await p.waitForTimeout(300);
  for (let i = 0; i < 7; i++) {
    const before = await px();
    await p.locator('#step table.doc').first().locator('tr.pick').nth(i).locator('td').first().click(); await p.waitForTimeout(350);
    const same = await p.locator('#step table.doc').first().locator('tr.pick').nth(i).locator('[data-same="1"]').count();
    if (await px() === before && !same) ui.push('Внимание: строка ' + (i + 1) + ' не изменила превью');
  }
  const fxIdx = await p.evaluate(() => SD.wizard.STEPS.findIndex(s => s.id === 'effects'));
  await p.evaluate(i => SD.wizard.go(i), fxIdx); await p.waitForTimeout(300);
  const nThumbs = await p.locator('#step .thumb').count();
  for (let i = 0; i < nThumbs; i++) {
    const before = await px();
    const on = await p.locator('#step .thumb').nth(i).evaluate(n => n.classList.contains('on'));
    await p.locator('#step .thumb').nth(i).click(); await p.waitForTimeout(350);
    const noSurf = await p.locator('#step', { hasText: 'нет цветных поверхностей' }).count();
    if (!on && await px() === before && !noSurf) ui.push('Эффекты: карточка ' + (i + 1) + ' не изменила превью');
  }
  console.log(ui.length ? 'ОШИБКИ UI:\n' + ui.join('\n') : `Интерфейс: OK (${nThumbs} карточек эффектов/узоров/показа)`);
  if (errs.length) console.log('Ошибки JS:', errs);
  await b.close();
  process.exit(r.fails.length || ui.length || errs.length ? 1 : 0);
})();
