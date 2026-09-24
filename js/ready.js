// Готовность к выпуску: чек-лист печати, содержания и качества с итоговым процентом.
// Нормы печати — общепринятые требования типографий: вылеты 3 мм, безопасная зона 3–5 мм,
// 300 dpi, осторожно с кислотными RGB-цветами (в CMYK станут тусклее).

SD.ready = (function () {
  const u = SD.u;
  const BRANDS = /(яндекс|yandex|whoosh|вуш|юрент|urent|burger\s*king|бургер\s*кинг|вкусно\s*[—–-]?\s*и\s*точка)/i;

  function check(doc, ans, exportOpts, brainScore) {
    const items = [];
    const add = (group, name, ok, w, hint) => items.push({ group, name, ok: ok === true ? 1 : ok === false ? 0 : ok, w, hint });
    const lint = SD.lint.check(doc);
    const errs = lint.filter(i => i.level === 'error'), warns = lint.filter(i => i.level === 'warn' && i.code !== 'note');
    const els = doc.pages.flatMap(p => p.elements);
    const texts = els.filter(e => e.type === 'text' && String(e.text || '').trim());
    const T = ans.texts || {};

    // Текст
    add('Текст', 'Нет ошибок текста (края, кегль, контраст, перекрытия)', errs.length === 0, 20, errs.length ? `Ошибок: ${errs.length}. Откройте «Проверку текста» и нажмите «Показать».` : '');
    add('Текст', 'Нет замечаний к тексту', warns.length === 0 ? true : warns.length <= 2 ? 0.6 : 0.2, 6, warns.length ? `Замечаний: ${warns.length}` : '');
    add('Текст', 'Второстепенные блоки не пришлось убирать', !(doc.notes || []).some(n => /убран/.test(n)), 4, (doc.notes || []).join(' '));

    // Содержание
    const title = texts.find(t => t.role === 'title');
    add('Содержание', 'Есть заголовок, до 7–8 слов', !!title && String(title.text).split(/\s+/).length <= 8, 8, title ? '' : 'Добавьте заголовок');
    const needCta = ['sell', 'event', 'inform'].includes(ans.goal);
    const hasCta = els.some(e => e.role === 'cta');
    add('Содержание', 'Есть понятный призыв к действию', hasCta || !needCta, 8, hasCta || !needCta ? '' : 'Включите кнопку-призыв на шаге «Детали»');
    const contactOk = els.some(e => e.role === 'contacts' && String(e.text || '').trim()) || els.some(e => e.type === 'qr');
    add('Содержание', 'Есть контакты или QR-код — куда идти после прочтения', contactOk, 8, contactOk ? '' : 'Добавьте контакты или QR-код');
    const qrs = els.filter(e => e.type === 'qr');
    const qrOk = qrs.every(q => Math.min(q.w, q.h) >= 15 && /^(https?:\/\/|tel:|mailto:)/i.test(q.data || '') && !/example\.com/.test(q.data || ''));
    add('Содержание', 'QR-код не меньше 15 мм и ведёт на ваш адрес', qrs.length ? qrOk : true, 5, qrs.length && !qrOk ? 'QR меньше 15 мм или ведёт на example.com — впишите свою ссылку' : '');
    const demo = /пример\.рф|example\.com|000-00-00/.test(Object.values(T).join(' '));
    add('Содержание', 'Контакты заменены на настоящие', !demo, 6, demo ? 'В контактах остались примеры («пример.рф», «000-00-00»)' : '');
    const brands = BRANDS.test(texts.map(t => t.text).join(' '));
    add('Содержание', 'Нет чужих торговых марок в тексте', !brands, 5, brands ? 'В тексте упомянут бренд из разбора стилей — это чужая торговая марка' : '');

    // Печать
    const touching = els.some(e => !e.rot && ['rect', 'ellipse', 'wave', 'image', 'pattern'].includes(e.type) && (e.x <= 0.6 || e.y <= 0.6 || e.x + e.w >= doc.w - 0.6 || e.y + e.h >= doc.h - 0.6));
    add('Печать', 'Вылеты 3 мм включены (фон и плашки у края не дадут белой полоски)', !touching || !!exportOpts.bleed, 6, touching && !exportOpts.bleed ? 'Есть элементы до края листа — включите «Вылеты 3 мм» ниже' : '');
    add('Печать', 'Разрешение не ниже 300 dpi', exportOpts.dpi >= 300, 5, exportOpts.dpi < 300 ? 'Выберите 300 dpi' : '');
    const colors = new Set(els.flatMap(e => [e.fill, e.fill2, e.grad && e.grad.colors ? e.grad.colors : [], e.grad && e.grad.points ? e.grad.points.map(p => p.c) : []]).flat().filter(c => /^#/.test(c || '')));
    const risky = [...colors].filter(c => SD.color.cmykRisk(c));
    add('Печать', 'Цвета печатаются без сильной потери яркости', risky.length === 0 ? true : risky.length <= 2 ? 0.5 : 0.2, 4, risky.length ? `Очень яркие RGB-цвета (${risky.slice(0, 3).join(', ')}) в CMYK станут тусклее — это нормально, но проверьте пробный оттиск` : '');
    const imgs = els.filter(e => e.type === 'image' && e.src);
    const lowRes = imgs.filter(e => { const im = SD.render.getImg(e.src); return im && im.naturalWidth / (e.w / 25.4) < 200; });
    add('Печать', 'Фото достаточного разрешения (от 200 ppi на макете)', lowRes.length === 0, 5, lowRes.length ? 'Фото будет размытым — загрузите файл побольше' : '');

    // Качество по «дизайн-мозгу»
    if (brainScore != null) add('Качество', `Оценка дизайна ${brainScore}/100 (хорошо от 75)`, brainScore >= 75 ? true : u.clamp((brainScore - 50) / 25, 0, 1), 10, brainScore < 75 ? 'Запустите «Автопилот» — он подберёт вариант сильнее' : '');

    const W = items.reduce((a, i) => a + i.w, 0);
    const got = items.reduce((a, i) => a + i.w * i.ok, 0);
    return { percent: Math.round(got / W * 100), items };
  }

  function table(res) {
    const h = SD.u.h;
    const wrap = h('div', { id: 'readyBox' });
    wrap.append(h('p', null, h('b', null, `Готовность к выпуску: ${res.percent}%`), res.percent >= 90 ? ' — можно отправлять в печать и показывать клиентам.' : res.percent >= 75 ? ' — почти готово, поправьте отмеченное.' : ' — нужно доработать.'));
    const t = h('table', { class: 'doc compact' });
    t.append(h('tr', null, h('th', null, ''), h('th', null, 'Раздел'), h('th', null, 'Проверка'), h('th', null, 'Что сделать')));
    for (const i of res.items) t.append(h('tr', null, h('td', { class: 'c' }, i.ok >= 1 ? '✓' : i.ok > 0 ? '±' : '✗'), h('td', null, i.group), h('td', null, i.name), h('td', null, i.hint || '')));
    wrap.append(t);
    return wrap;
  }

  return { check, table };
})();
