// Стили: смартфоны и техника, банки, маркетплейсы и ретейл (принципы, не копия).

Object.assign(SD.STYLES, {
  apple: {
    id: 'apple', name: 'Минималистичный', like: 'Apple', group: 'tech',
    about: 'Продукт — главный герой: много воздуха, крупный спокойный заголовок по центру, одна синяя ссылка-кнопка, мягкое свечение вокруг товара.',
    colors: { primary: '#1D1D1F', accent: '#0862C4', bg: '#FBFBFD', text: '#1D1D1F', soft: '#F0F0F4' },
    original: 'почти чёрный, белый, фирменный синий для ссылок',
    font: 'Inter', fontNote: 'Inter вместо фирменного SF Pro',
    titleWeight: 700, bodyWeight: 400, radius: 0.07, upper: false, ctaRole: 'accent', pill: true,
    motif: 'glow', shapes: 'Свечение-прожектор за продуктом, центрированная композиция, кнопки-таблетки',
    mood: 'Премиально, тихо, уверенно'
  },
  xiaomi: {
    id: 'xiaomi', name: 'Сквиркл', like: 'Xiaomi', group: 'tech',
    about: 'Яркий оранжевый и «сквиркл» — квадрат с плавно скруглёнными углами; технологично, но дружелюбно и доступно.',
    colors: { primary: '#FF6B14', accent: '#1F1F1F', bg: '#FFFFFF', text: '#1F1F1F', soft: '#F4F4F4' },
    original: 'оранжевый #FF6900, чёрный, белый',
    font: 'Onest', fontNote: 'Onest вместо фирменного MiSans',
    titleWeight: 700, bodyWeight: 400, radius: 0.12, upper: false,
    motif: 'squircle', shapes: 'Сквирклы, плотные оранжевые плашки, крупные цифры характеристик',
    mood: 'Технологично, бодро, выгодно'
  },
  samsung: {
    id: 'samsung', name: 'Орбитальный', like: 'Samsung', group: 'tech',
    about: 'Глубокий синий, тонкие орбиты и дуги, крупные скруглённые карточки как в One UI, чистая типографика.',
    colors: { primary: '#1934A6', accent: '#8FB2FF', bg: '#FFFFFF', text: '#0B1233', soft: '#EDF1FC' },
    original: 'тёмно-синий #1428A0, белый, голубые акценты',
    font: 'Golos Text', fontNote: 'Golos Text вместо SamsungOne',
    titleWeight: 700, bodyWeight: 400, radius: 0.1, upper: false,
    motif: 'orbit', shapes: 'Тонкие орбиты-кольца, большие карточки, голубое свечение',
    mood: 'Надёжно, инженерно, современно'
  },
  nothing: {
    id: 'nothing', name: 'Точечно-матричный', like: 'Nothing', group: 'tech',
    about: 'Монохром: белое, чёрное и один красный акцент; точечно-матричная графика, моноширинный шрифт, всё в духе прозрачной техники.',
    colors: { primary: '#111111', accent: '#D2231F', bg: '#F3F3F1', text: '#111111', soft: '#E4E4E1' },
    original: 'чёрный, белый, красный, точки-матрица',
    font: 'IBM Plex Mono', fontNote: 'IBM Plex Mono вместо фирменного точечного шрифта',
    titleWeight: 600, bodyWeight: 400, radius: 0.02, upper: true,
    motif: 'dotmatrix', shapes: 'Круги из точек, тонкие линии, красная точка-акцент',
    mood: 'Дерзко, по-инженерски, «не как все»'
  },
  pixel: {
    id: 'pixel', name: 'Пастельный', like: 'Google Pixel', group: 'tech',
    about: 'Material You: мягкие пастельные цвета, подобранные друг к другу, пилюли и круглые формы, дружелюбная округлая типографика.',
    colors: { primary: '#4466D4', accent: '#FFC7A6', bg: '#FFFBF6', text: '#1F1B16', soft: '#E9E6F7', extra: '#B7DEC6' },
    original: 'пастельная палитра из обоев, синий, персиковый, мятный',
    font: 'Rubik', fontNote: 'Rubik вместо Google Sans',
    titleWeight: 600, bodyWeight: 400, radius: 0.16, upper: false, pill: true,
    motif: 'pills', shapes: 'Цветные пилюли, большие скругления, пастельные плашки',
    mood: 'Мягко, по-человечески, заботливо'
  },
  // Банки, маркетплейсы, ретейл
  sber: {
    id: 'sber', name: 'Кольцевой', like: 'Сбер', group: 'retail',
    about: 'Зелёный с переходом в бирюзовый, крупные кольца и дуги, объёмные градиенты, спокойная уверенная типографика.',
    colors: { primary: '#1A9A3E', accent: '#23C9B8', bg: '#FFFFFF', text: '#10261A', soft: '#E8F5EC' },
    original: 'зелёный #21A038 с градиентом в бирюзовый и голубой',
    font: 'Onest', fontNote: 'Onest вместо SB Sans',
    titleWeight: 700, bodyWeight: 400, radius: 0.1, upper: false,
    motif: 'ring', shapes: 'Кольцо-градиент, мягкие карточки, дуги',
    mood: 'Надёжно, масштабно, «экосистема»'
  },
  ozon: {
    id: 'ozon', name: 'Ценники', like: 'Ozon', group: 'retail',
    about: 'Насыщенный синий и яркий розовый акцент, наклонённые ценники и плашки со скидкой, энергия распродажи.',
    colors: { primary: '#0A5CF5', accent: '#F5185C', bg: '#FFFFFF', text: '#0B1733', soft: '#ECF2FF' },
    original: 'синий #005BFF, розовый, белый',
    font: 'Rubik', fontNote: 'Rubik — округлый гротеск',
    titleWeight: 700, bodyWeight: 400, radius: 0.08, upper: false, pill: true,
    motif: 'tags', shapes: 'Наклонённые ценники, плашки скидок, конфетти',
    mood: 'Быстро, выгодно, празднично'
  },
  wb: {
    id: 'wb', name: 'Фуксия', like: 'Wildberries', group: 'retail',
    about: 'Градиент фуксии в глубокий фиолетовый на всю плашку, белый текст, яркие бейджи — «витрина» маркетплейса.',
    colors: { primary: '#A8179F', accent: '#4C1579', bg: '#FFFFFF', text: '#24102E', soft: '#F6EBF6' },
    original: 'фуксия #CB11AB → фиолетовый #481173',
    font: 'Montserrat', fontNote: 'Montserrat ExtraBold',
    titleWeight: 800, bodyWeight: 400, radius: 0.08, upper: false, pill: true,
    motif: 'fullgrad', shapes: 'Большая градиентная шапка, белые карточки, бейджи',
    mood: 'Ярко, модно, много выбора'
  },
  ikea: {
    id: 'ikea', name: 'Шведский', like: 'IKEA', group: 'retail',
    about: 'Синий и жёлтый, огромная цена или слово на жёлтом блоке, простые шрифты без украшений, функциональная ясность.',
    colors: { primary: '#0E5AA2', accent: '#FFD80F', bg: '#FFFFFF', text: '#111111', soft: '#EDF2F8' },
    original: 'синий #0058A3 и жёлтый #FFDB00',
    font: 'PT Sans', fontNote: 'PT Sans вместо Noto IKEA',
    titleWeight: 700, bodyWeight: 400, radius: 0.015, upper: false,
    motif: 'bigprice', shapes: 'Крупный жёлтый блок с ценой, строгая сетка, плоские цвета',
    mood: 'Практично, честно, по-домашнему'
  }
});
