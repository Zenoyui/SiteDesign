// Серия в одном стиле: из текущих ответов собираем флаер, пост, сторис, баннер и визитку.
SD.series = (function () {
  const ITEMS = [
    { key: 'flyer', name: 'Флаер', format: 'A6' },
    { key: 'post', name: 'Пост 1:1', format: 'SQ' },
    { key: 'story', name: 'Сторис 9:16', format: 'STORY' },
    { key: 'banner', name: 'Баннер 1.91:1', format: 'WIDE' },
    { key: 'biz', name: 'Визитка', format: 'BIZ' }
  ];
  function answersFor(ans, item) {
    const a = JSON.parse(JSON.stringify(ans));
    Object.assign(a, { format: item.format, orient: 'portrait', pages: 1 });
    if (item.key === 'flyer' && ans.format === 'A6') a.format = 'A5';
    if (item.key === 'banner' && ['top', 'bottom', 'diagonal'].includes(a.layout)) a.layout = 'left';
    if (item.key === 'biz') {
      // визитка — только имя, подзаголовок и контакты, никаких акций
      a.layout = 'top'; a.titleScale = 1;
      for (const k in a.mk) a.mk[k] = false;
      a.opts = Object.assign({}, a.opts, { cta: false, promo: false, qr: false, image: null });
      a.texts = Object.assign({}, a.texts, { body: '' });
      a.fx = Object.assign({}, SD.gen.fxFor(ans), { auto: false, display: 'none', pattern: 'none' });
    }
    return a;
  }
  function build(ans) {
    return ITEMS.map(it => {
      const a = answersFor(ans, it);
      if (it.key === 'flyer' && ans.format === 'A6') it = Object.assign({}, it, { name: 'Флаер A5' });
      const doc = SD.gen.build(a);
      return { key: it.key, name: it.name, ans: a, doc };
    });
  }
  return { ITEMS, build, answersFor };
})();
