// Рецепты арт-дирекции: как построил бы макет сам бренд (если бы делал его ещё раз).
// Это не копия и не логотипы — это манера: композиция, фон, типографика, форма кнопки
// и бейджа, поля, фирменный декор, эффекты, способ показать продукт.
//
// Поля образа (look):
//   layout, align, titleScale — композиция; invert — работа на фирменном цвете; pal — своя палитра
//   tw, tls, tlh, upper — насыщенность, плотность (трекинг), интерлиньяж и регистр заголовка
//   sw, muted — насыщенность и приглушённость подзаголовка
//   cta — 'pill' | 'rect' | 'link' | 'outline'; ctaRole — чем залита кнопка
//   promo — 'star' | 'circle' | 'pill' | 'tag' | 'block' | 'none'; promoRole — цвет бейджа
//   motifs — фирменный декор; fx — эффекты, значки, узор, показ, градиент; margin — поля; plate — фон-градиент

SD.RECIPES = {
  yandex: { looks: [
    { name: 'сервис на белом', desc: 'Белый лист, чёткий левый край, красный круг-акцент, карточка сервиса с мягкой тенью',
      layout: 'top', align: 'left', titleScale: 1.1, tw: 700, tls: -0.01, muted: true, cta: 'rect', ctaRole: 'primary', promo: 'pill', motifs: ['dot'],
      fx: { effects: ['shadow'], icons: 'soft', pattern: 'none', display: 'card', gradient: 'none' } },
    { name: 'серая подложка', desc: 'Светло-серый фон и белые карточки — как лента сервисов',
      layout: 'left', align: 'left', titleScale: 1.1, pal: { bg: '#F1F2F5', soft: '#FFFFFF' }, tw: 700, tls: -0.01, muted: true, cta: 'rect', promo: 'pill', motifs: ['dot'],
      fx: { effects: ['shadow'], icons: 'soft', pattern: 'none', display: 'phone', gradient: 'none' } }
  ] },
  go: { looks: [
    { name: 'жёлтый плакат', desc: 'Весь лист фирменного жёлтого, чёрный жирный заголовок, чёрная таблетка-кнопка',
      layout: 'top', align: 'left', titleScale: 1.25, invert: true, tw: 800, tls: -0.02, tlh: 1.0, cta: 'pill', ctaRole: 'primary', promo: 'circle', promoRole: 'primary', motifs: [],
      fx: { effects: ['shadow'], icons: 'badge', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'белый со сплит-блоками', desc: 'Белый лист, жёлтая скруглённая плашка под заголовком, карточки с тенью',
      layout: 'top', align: 'left', titleScale: 1.15, tw: 800, tls: -0.02, cta: 'pill', ctaRole: 'accent', promo: 'circle', motifs: ['block'],
      fx: { effects: ['shadow'], icons: 'badge', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  whoosh: { looks: [
    { name: 'полоса на светлом', desc: 'Тёплый светлый фон, широкий шрифт, жёлтая полоса-маркер, строгие плашки',
      layout: 'left', align: 'left', titleScale: 1.1, tw: 700, tls: 0, cta: 'rect', ctaRole: 'primary', promo: 'tag', motifs: ['stripe'],
      fx: { effects: [], icons: 'square', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'графит', desc: 'Графитовый фон, мягкий жёлтый и светлый текст — ночной город',
      layout: 'top', align: 'left', titleScale: 1.15, pal: { bg: '#2B2B30', text: '#F7F5EF', primary: '#FFE14F', accent: '#F7F5EF', soft: '#3A3A40' }, tw: 700, cta: 'rect', ctaRole: 'primary', promo: 'tag', motifs: ['stripe'],
      fx: { effects: [], icons: 'square', pattern: 'none', display: 'phone', gradient: 'none' } }
  ] },
  urent: { looks: [
    { name: 'фиолетовый фон', desc: 'Лист фирменного фиолетового, белый текст, сиреневые пятна',
      layout: 'top', align: 'left', titleScale: 1.2, invert: true, tw: 700, cta: 'pill', ctaRole: 'primary', promo: 'circle', promoRole: 'accent', motifs: ['blobs'],
      fx: { effects: ['glow'], icons: 'soft', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'белый с пятнами', desc: 'Белый лист, градиентные пятна, фиолетовая кнопка-таблетка',
      layout: 'left', align: 'left', titleScale: 1.1, tw: 700, cta: 'pill', promo: 'circle', motifs: ['blobs'],
      fx: { effects: ['glow'], icons: 'soft', pattern: 'none', display: 'phone', gradient: 'mesh' } }
  ] },
  bk: { looks: [
    { name: 'крем и огонь', desc: 'Кремовый фон, огромный пухлый заголовок капсом, волна соуса, наклонённые наклейки',
      layout: 'top', align: 'left', titleScale: 1.35, tw: 900, tls: -0.01, tlh: 0.95, upper: true, cta: 'pill', ctaRole: 'primary', promo: 'star', motifs: ['wave'],
      fx: { effects: ['sticker', 'tilt', 'grain'], icons: 'bold', pattern: 'none', display: 'hero', gradient: 'none' } },
    { name: 'красный плакат', desc: 'Весь лист красный, кремовые буквы капсом, еда-наклейка',
      layout: 'center', align: 'center', titleScale: 1.4, invert: true, tw: 900, tlh: 0.95, upper: true, cta: 'pill', ctaRole: 'primary', promo: 'star', motifs: [],
      fx: { effects: ['sticker', 'grain'], icons: 'bold', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  vit: { looks: [
    { name: 'зелёный фон', desc: 'Тёмно-зелёный лист, белый текст, оранжевая точка, еда в круге',
      layout: 'left', align: 'left', titleScale: 1.15, invert: true, tw: 800, cta: 'rect', ctaRole: 'primary', promo: 'circle', promoRole: 'primary', motifs: ['bigdot'],
      fx: { effects: [], icons: 'ring', pattern: 'none', display: 'circle', gradient: 'none' } },
    { name: 'белый', desc: 'Белый лист, зелёный текст, оранжевые акценты, спокойная сетка',
      layout: 'top', align: 'left', titleScale: 1.1, tw: 800, cta: 'rect', promo: 'circle', motifs: ['bigdot'],
      fx: { effects: [], icons: 'ring', pattern: 'none', display: 'circle', gradient: 'none' } }
  ] },
  apple: { looks: [
    { name: 'светлая витрина', desc: 'Всё по центру, огромные поля, продукт — главный, серый подзаголовок, ссылка «›» вместо кнопки, никаких наклеек',
      layout: 'center', align: 'center', titleScale: 1.3, tw: 700, tls: -0.025, tlh: 1.02, muted: true, sw: 400, cta: 'link', promo: 'none', motifs: ['glow'], margin: 1.35,
      fx: { effects: [], icons: 'line', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'тёмная витрина', desc: 'Чёрный лист, светлый текст, голубая ссылка, свечение вокруг продукта',
      layout: 'center', align: 'center', titleScale: 1.3, pal: { bg: '#000000', text: '#F5F5F7', primary: '#F5F5F7', accent: '#2E9BFF', soft: '#1D1D1F' }, tw: 700, tls: -0.025, tlh: 1.02, muted: true, sw: 400, cta: 'link', promo: 'none', motifs: ['glow'], margin: 1.35,
      fx: { effects: [], icons: 'line', pattern: 'none', display: 'phone', gradient: 'none' } }
  ] },
  xiaomi: { looks: [
    { name: 'оранжевый акцент', desc: 'Белый лист, телефон крупно, оранжевые сквирклы и кнопка, короткие характеристики',
      layout: 'left', align: 'left', titleScale: 1.15, tw: 700, tls: -0.015, muted: true, cta: 'pill', ctaRole: 'primary', promo: 'pill', motifs: ['squircle'],
      fx: { effects: ['shadow'], icons: 'square', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'тёмная презентация', desc: 'Почти чёрный фон, белый текст, оранжевая кнопка — как на презентации смартфона',
      layout: 'center', align: 'center', titleScale: 1.25, pal: { bg: '#111111', text: '#F4F4F4', primary: '#FF6B14', accent: '#F4F4F4', soft: '#222222' }, tw: 700, tls: -0.015, muted: true, cta: 'pill', ctaRole: 'primary', promo: 'none', motifs: ['squircle'], margin: 1.2,
      fx: { effects: [], icons: 'square', pattern: 'none', display: 'phone', gradient: 'none' } }
  ] },
  samsung: { looks: [
    { name: 'Galaxy тёмный', desc: 'Глубокий тёмно-синий, светящийся продукт, тонкие орбиты, голубая таблетка',
      layout: 'center', align: 'center', titleScale: 1.25, pal: { bg: '#060B24', text: '#F2F5FF', primary: '#8FB2FF', accent: '#1934A6', soft: '#111A3D' }, tw: 700, tls: -0.02, muted: true, cta: 'pill', ctaRole: 'primary', promo: 'none', motifs: ['orbit'], margin: 1.2,
      fx: { effects: ['glow'], icons: 'soft', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'светлый One UI', desc: 'Белый лист, большие скруглённые карточки, синяя таблетка',
      layout: 'top', align: 'left', titleScale: 1.15, tw: 700, tls: -0.02, muted: true, cta: 'pill', promo: 'pill', motifs: ['orbit'],
      fx: { effects: ['shadow'], icons: 'soft', pattern: 'none', display: 'card', gradient: 'none' } }
  ] },
  nothing: { looks: [
    { name: 'белый монохром', desc: 'Светлый лист, моноширинные прописные, круг из точек, красная точка, контурная кнопка',
      layout: 'left', align: 'left', titleScale: 1.1, tw: 600, tls: 0.02, upper: true, cta: 'outline', promo: 'none', motifs: ['dotmatrix'],
      fx: { effects: [], icons: 'ring', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'чёрный', desc: 'Чёрный лист, белые точки и моноширинный шрифт, один красный акцент',
      layout: 'left', align: 'left', titleScale: 1.1, pal: { bg: '#0B0B0B', text: '#F2F2F2', primary: '#F2F2F2', accent: '#FF3B30', soft: '#1A1A1A' }, tw: 600, tls: 0.02, upper: true, cta: 'outline', promo: 'none', motifs: ['dotmatrix'],
      fx: { effects: [], icons: 'ring', pattern: 'none', display: 'phone', gradient: 'none' } }
  ] },
  pixel: { looks: [
    { name: 'пастель', desc: 'Персиковый пастельный фон, цветные пилюли, округлые формы, синяя таблетка',
      layout: 'left', align: 'left', titleScale: 1.15, pal: { bg: '#FFF1E6', soft: '#FFFFFF' }, tw: 600, tls: -0.01, cta: 'pill', promo: 'circle', motifs: ['pills'],
      fx: { effects: ['shadow'], icons: 'badge', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'белый Material', desc: 'Белый лист, большие скругления, пастельные акценты',
      layout: 'top', align: 'left', titleScale: 1.1, tw: 600, cta: 'pill', promo: 'circle', motifs: ['pills'],
      fx: { effects: ['shadow'], icons: 'badge', pattern: 'none', display: 'card', gradient: 'none' } }
  ] },
  sber: { looks: [
    { name: 'зелёный градиент', desc: 'Весь лист — объёмный зелёный градиент, белый текст, белая кнопка',
      layout: 'left', align: 'left', titleScale: 1.2, invert: true, plate: 'mesh', tw: 700, tls: -0.01, cta: 'pill', ctaRole: 'primary', promo: 'pill', promoRole: 'primary', motifs: [],
      fx: { effects: ['shadow'], icons: 'soft', pattern: 'none', display: 'card', gradient: 'none' } },
    { name: 'белый с кольцом', desc: 'Белый лист, градиентное кольцо, зелёная кнопка',
      layout: 'top', align: 'left', titleScale: 1.1, tw: 700, cta: 'pill', promo: 'pill', motifs: ['ring'],
      fx: { effects: ['shadow'], icons: 'soft', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  ozon: { looks: [
    { name: 'синяя распродажа', desc: 'Лист фирменного синего, белые буквы, розовые ценники со скидкой',
      layout: 'top', align: 'left', titleScale: 1.25, invert: true, tw: 700, cta: 'pill', ctaRole: 'primary', promo: 'tag', promoRole: 'accent', motifs: ['tags'],
      fx: { effects: ['tilt'], icons: 'badge', pattern: 'none', display: 'none', gradient: 'none' } },
    { name: 'белая витрина', desc: 'Белый лист, синяя кнопка, розовые ценники-наклейки, конфетти',
      layout: 'left', align: 'left', titleScale: 1.1, tw: 700, cta: 'pill', promo: 'tag', motifs: ['tags'],
      fx: { effects: ['sticker', 'tilt'], icons: 'badge', pattern: 'confetti', display: 'card', gradient: 'none' } }
  ] },
  wb: { looks: [
    { name: 'градиент во весь лист', desc: 'Весь лист — градиент фуксии в фиолетовый, белый жирный текст, белая таблетка',
      layout: 'top', align: 'left', titleScale: 1.25, invert: true, plate: 'mesh', tw: 800, tls: -0.02, cta: 'pill', ctaRole: 'primary', promo: 'pill', promoRole: 'primary', motifs: [],
      fx: { effects: ['glow'], icons: 'soft', pattern: 'none', display: 'card', gradient: 'none' } },
    { name: 'белая витрина с шапкой', desc: 'Белый лист, градиентная шапка, карточки товаров',
      layout: 'bottom', align: 'left', titleScale: 1.1, tw: 800, cta: 'pill', promo: 'pill', motifs: ['fullgrad'],
      fx: { effects: ['glow'], icons: 'soft', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  ikea: { looks: [
    { name: 'цена на жёлтом', desc: 'Белый лист, строгий жирный заголовок, огромный жёлтый блок с ценой, синяя плашка-кнопка',
      layout: 'top', align: 'left', titleScale: 1.15, tw: 700, tls: -0.01, cta: 'rect', ctaRole: 'primary', promo: 'block', promoRole: 'accent', motifs: [],
      fx: { effects: [], icons: 'bold', pattern: 'none', display: 'none', gradient: 'none' } },
    { name: 'синий плакат', desc: 'Весь лист синий, белый текст, жёлтый блок цены',
      layout: 'top', align: 'left', titleScale: 1.2, invert: true, tw: 700, cta: 'rect', ctaRole: 'accent', promo: 'block', promoRole: 'accent', motifs: [],
      fx: { effects: [], icons: 'bold', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  swiss: { looks: [
    { name: 'сетка', desc: 'Белый лист, асимметрия, крупный гротеск, красный блок и линейки, никаких наклеек',
      layout: 'left', align: 'left', titleScale: 1.35, tw: 800, tls: -0.03, tlh: 0.95, cta: 'rect', ctaRole: 'primary', promo: 'block', promoRole: 'primary', motifs: ['swissgrid'],
      fx: { effects: [], icons: 'line', pattern: 'none', display: 'none', gradient: 'none' } },
    { name: 'красный плакат', desc: 'Весь лист красный, белый гротеск, строгая сетка',
      layout: 'top', align: 'left', titleScale: 1.4, invert: true, tw: 800, tls: -0.03, tlh: 0.95, cta: 'rect', ctaRole: 'primary', promo: 'none', motifs: [],
      fx: { effects: [], icons: 'line', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  brutal: { looks: [
    { name: 'рамки', desc: 'Кремовый фон, толстые рамки, жёсткая тень, кислотные плашки, моноширинный капс',
      layout: 'top', align: 'left', titleScale: 1.2, tw: 600, upper: true, cta: 'rect', ctaRole: 'primary', promo: 'tag', motifs: ['brutal'],
      fx: { effects: ['hardShadow'], icons: 'square', pattern: 'none', display: 'none', gradient: 'none' } },
    { name: 'розовый', desc: 'Кислотно-розовый фон, чёрные рамки и тени',
      layout: 'left', align: 'left', titleScale: 1.2, pal: { bg: '#FF9EC2', soft: '#FFD6E6' }, tw: 600, upper: true, cta: 'rect', ctaRole: 'primary', promo: 'tag', motifs: ['brutal'],
      fx: { effects: ['hardShadow'], icons: 'square', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  retro70: { looks: [
    { name: 'кремовый', desc: 'Кремовый фон, радужные дуги, пухлые буквы, зерно',
      layout: 'top', align: 'left', titleScale: 1.3, tw: 900, tlh: 0.95, cta: 'pill', promo: 'circle', motifs: ['rainbow'],
      fx: { effects: ['grain'], icons: 'bold', pattern: 'none', display: 'none', gradient: 'none' } },
    { name: 'шоколад', desc: 'Тёмно-коричневый фон, кремовые буквы, горчичные дуги',
      layout: 'left', align: 'left', titleScale: 1.3, pal: { bg: '#3E2415', text: '#F7EBD5', primary: '#E9B23E', accent: '#E0702A', soft: '#5A3520', extra: '#F7EBD5' }, tw: 900, tlh: 0.95, cta: 'pill', ctaRole: 'primary', promo: 'circle', motifs: ['rainbow'],
      fx: { effects: ['grain'], icons: 'bold', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  y2k: { looks: [
    { name: 'сиреневый глянец', desc: 'Светло-сиреневый фон, перламутровая пилюля, блёстки',
      layout: 'top', align: 'left', titleScale: 1.2, tw: 800, cta: 'pill', promo: 'pill', motifs: ['y2k'],
      fx: { effects: ['glow'], icons: 'badge', pattern: 'none', display: 'phone', gradient: 'none' } },
    { name: 'ночная аврора', desc: 'Тёмный фиолетовый фон, аврора, светящиеся кнопки',
      layout: 'center', align: 'center', titleScale: 1.25, pal: { bg: '#140D2E', text: '#F4F0FF', primary: '#56D8F5', accent: '#FF8AD8', soft: '#241A4A', extra: '#8A5CF6' }, plate: 'aurora', tw: 800, cta: 'pill', ctaRole: 'primary', promo: 'pill', motifs: ['y2k'],
      fx: { effects: ['glow'], icons: 'badge', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  japan: { looks: [
    { name: 'бумага и печать', desc: 'Бумажный фон, огромная пустота, антиква, одна красная печать, ссылка вместо кнопки',
      layout: 'left', align: 'left', titleScale: 1.0, tw: 700, tls: 0.02, tlh: 1.25, muted: true, cta: 'link', promo: 'none', motifs: ['hanko'], margin: 1.4,
      fx: { effects: [], icons: 'line', pattern: 'none', display: 'none', gradient: 'none' } },
    { name: 'тушь', desc: 'Тёмный фон цвета туши, светлая антиква, красная печать',
      layout: 'center', align: 'center', titleScale: 1.0, pal: { bg: '#1E1E1E', text: '#EDE7DA', primary: '#C8372D', accent: '#EDE7DA', soft: '#2A2A2A' }, tw: 700, tls: 0.02, tlh: 1.25, muted: true, cta: 'link', promo: 'none', motifs: ['hanko'], margin: 1.4,
      fx: { effects: [], icons: 'line', pattern: 'none', display: 'none', gradient: 'none' } }
  ] },
  bauhaus: { looks: [
    { name: 'кремовый', desc: 'Кремовый фон, круг-квадрат-треугольник, геометричный капс',
      layout: 'left', align: 'left', titleScale: 1.25, tw: 800, upper: true, cta: 'rect', promo: 'circle', motifs: ['bauhaus'],
      fx: { effects: [], icons: 'bold', pattern: 'none', display: 'none', gradient: 'none' } },
    { name: 'синий', desc: 'Синий лист, белый капс, красные и жёлтые фигуры',
      layout: 'top', align: 'left', titleScale: 1.3, pal: { bg: '#1F4FA8', text: '#FFFFFF', primary: '#F2BE22', accent: '#D6392B', soft: '#2A5CB8', extra: '#F5F0E6' }, tw: 800, upper: true, cta: 'rect', ctaRole: 'primary', promo: 'circle', motifs: ['bauhaus'],
      fx: { effects: [], icons: 'bold', pattern: 'none', display: 'none', gradient: 'none' } }
  ] }
};

// Применить образ к ответам: композиция и «штучки» берутся из рецепта
SD.applyLook = function (ans) {
  const vs = SD.gen.variants(ans.styles, ans.fidelity);
  const v = vs[ans.variant] || vs[0];
  if (!v || !v.look) return false;
  const L = v.look;
  ans.layout = L.layout; ans.align = L.align || 'left'; ans.titleScale = L.titleScale || 1;
  if (L.fx) ans.fx = Object.assign({ auto: false }, JSON.parse(JSON.stringify(L.fx)));
  ans.opts.motif = true;
  return true;
};
