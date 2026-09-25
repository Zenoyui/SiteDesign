// Маркетинг, внимание, эффекты: «фирменные штучки» стилей, эффекты, значки, узоры, показ продукта.

// «Фирменные штучки» каждого стиля: эффекты, значки, узоры, способ показа.
SD.KITS = {
  yandex: { effects: ['shadow', 'glass'], icons: 'soft', pattern: 'grid', display: 'card', note: 'Карточки с мягкой тенью, «стеклянные» плашки, сетка как у карт, значки в светлых кружках' },
  go:     { effects: ['shadow'], icons: 'badge', pattern: 'checker', display: 'phone', note: 'Скруглённые сплит-блоки с тенями, шашечки такси, значки в залитых кругах, экран приложения' },
  whoosh: { effects: ['hardShadow'], icons: 'square', pattern: 'stripes', display: 'phone', note: 'Плоская графика, жёсткая тень-сдвиг, диагональные полосы, значки в квадратах, телефон' },
  urent:  { effects: ['gradient', 'glow'], icons: 'soft', pattern: 'confetti', display: 'phone', note: 'Градиенты фиолетового, свечение кнопок, конфетти, мягкие значки' },
  bk:     { effects: ['sticker', 'tilt', 'grain'], icons: 'bold', pattern: 'halftone', display: 'hero', note: 'Наклейки с белой обводкой, наклонённые плашки, зерно печати, растровые точки, жирные значки' },
  vit:    { effects: [], icons: 'ring', pattern: 'dots', display: 'circle', note: 'Плоско и спокойно, точечный узор, еда в круге, тонкие значки в кольце' },
  apple:  { effects: ['shadow'], icons: 'line', pattern: 'none', display: 'phone', gradient: 'radial', note: 'Продукт в центре с мягким свечением, тонкие значки, много воздуха' },
  xiaomi: { effects: ['shadow'], icons: 'square', pattern: 'none', display: 'phone', note: 'Сквирклы, значки в скруглённых квадратах, телефон крупно' },
  samsung:{ effects: ['shadow', 'glow'], icons: 'soft', pattern: 'none', display: 'phone', gradient: 'aurora', note: 'Орбиты, мягкое голубое свечение, большие карточки' },
  nothing:{ effects: [], icons: 'ring', pattern: 'dots', display: 'phone', gradient: 'none', note: 'Монохром, точечная матрица, моноширинный шрифт, красная точка' },
  pixel:  { effects: ['shadow'], icons: 'badge', pattern: 'none', display: 'phone', note: 'Пастельные пилюли, значки в цветных кругах, мягкие тени' },
  sber:   { effects: ['gradient', 'shadow'], icons: 'soft', pattern: 'none', display: 'card', gradient: 'mesh', note: 'Градиентное кольцо, объёмные карточки, мягкие значки' },
  ozon:   { effects: ['sticker', 'tilt'], icons: 'badge', pattern: 'confetti', display: 'card', note: 'Наклонённые ценники-наклейки, конфетти, карточка со скидкой' },
  wb:     { effects: ['gradient', 'glow'], icons: 'soft', pattern: 'none', display: 'card', gradient: 'mesh', note: 'Градиентная шапка во всю ширину, светящиеся кнопки, карточки' },
  ikea:   { effects: [], icons: 'bold', pattern: 'none', display: 'hero', gradient: 'none', note: 'Плоские цвета, жёлтый блок с ценой, жирные значки' },
  swiss:  { effects: [], icons: 'line', pattern: 'grid', display: 'none', gradient: 'none', note: 'Модульная сетка, тонкие линейки, никаких теней и градиентов' },
  brutal: { effects: ['hardShadow'], icons: 'square', pattern: 'none', display: 'card', gradient: 'none', note: 'Толстые рамки, жёсткая тень-сдвиг, значки в квадратах' },
  retro70:{ effects: ['grain'], icons: 'bold', pattern: 'none', display: 'hero', gradient: 'none', note: 'Радужные дуги, зерно старой печати, пухлые значки' },
  y2k:    { effects: ['glow'], icons: 'badge', pattern: 'confetti', display: 'phone', gradient: 'aurora', note: 'Перламутровая аврора, свечение, блёстки' },
  japan:  { effects: [], icons: 'line', pattern: 'none', display: 'none', gradient: 'none', note: 'Пустота, тонкие линии, только одна красная печать' },
  bauhaus:{ effects: [], icons: 'bold', pattern: 'none', display: 'none', gradient: 'none', note: 'Геометрия основных фигур, плоские основные цвета' }
};

SD.EFFECTS = {
  shadow:     { name: 'Мягкая тень', like: ['yandex', 'go'], desc: 'Карточки и кнопки «приподняты» над листом' },
  glass:      { name: 'Матовое стекло', like: ['yandex'], desc: 'Полупрозрачные белые плашки поверх цвета и узора' },
  hardShadow: { name: 'Жёсткая тень-сдвиг', like: ['whoosh'], desc: 'Плоская тень без размытия, плакатный вид' },
  gradient:   { name: 'Градиент всегда', like: ['urent'], desc: 'Включить градиент, даже если правила считают его лишним' },
  glow:       { name: 'Свечение', like: ['urent'], desc: 'Цветной ореол вокруг кнопки и бейджа' },
  sticker:    { name: 'Наклейка', like: ['bk'], desc: 'Белая обводка у бейджа, кнопки и картинки' },
  tilt:       { name: 'Наклон плашек', like: ['bk'], desc: 'Кнопка и плашки слегка повёрнуты, живой вид' },
  grain:      { name: 'Зерно печати', like: ['bk'], desc: 'Лёгкий шум, как у ретро-плаката' }
};

SD.ICON_STYLES = {
  line:   { name: 'Тонкая линия', like: ['yandex'] },
  soft:   { name: 'В светлом кружке', like: ['yandex', 'urent'] },
  badge:  { name: 'В залитом круге', like: ['go'] },
  square: { name: 'В квадрате', like: ['whoosh'] },
  bold:   { name: 'Жирные округлые', like: ['bk'] },
  ring:   { name: 'В кольце', like: ['vit'] }
};

SD.PATTERNS = {
  none:     { name: 'Без узора', like: [] },
  grid:     { name: 'Сетка, как на карте', like: ['yandex'] },
  checker:  { name: 'Шашечки', like: ['go'] },
  stripes:  { name: 'Диагональные полосы', like: ['whoosh'] },
  confetti: { name: 'Конфетти', like: ['urent'] },
  halftone: { name: 'Растровые точки', like: ['bk'] },
  dots:     { name: 'Ровные точки', like: ['vit'] }
};

SD.DISPLAYS = {
  none:   { name: 'Без показа', like: [], desc: 'Только текст и декор' },
  phone:  { name: 'Экран приложения', like: ['go', 'whoosh', 'urent'], desc: 'Телефон с интерфейсом — для сервисов и приложений' },
  circle: { name: 'Фото или значок в круге', like: ['vit', 'yandex'], desc: 'Продукт крупно в круге — для еды и товаров' },
  card:   { name: 'Карточка-предложение', like: ['yandex'], desc: 'Карточка со значком и выгодой' },
  hero:   { name: 'Большой значок-наклейка', like: ['bk'], desc: 'Крупная иллюстрация-стикер' }
};

