// Разбор стилей брендов: сервисы и еда. Остальные группы — в styles-tech.js и styles-directions.js.
// Важно: здесь описаны ПРИНЦИПЫ стиля, а не копия. Цвета сдвинуты на несколько
// градусов оттенка, фирменные шрифты заменены свободными (Google Fonts),
// логотипы и фирменные знаки не используются вообще.

SD.STYLES = {
  yandex: {
    id: 'yandex', name: 'Поисковый', like: 'Яндекс',
    about: 'Экосистема сервисов: много белого воздуха, спокойная типографика, один яркий акцент.',
    colors: { primary: '#F4452B', accent: '#FFD03A', bg: '#FFFFFF', text: '#1C1C21', soft: '#F1F2F5' },
    original: 'красный #FC3F1D, жёлтый, чёрный, белый',
    font: 'Onest', fontNote: 'Onest вместо фирменного YS Text / YS Display',
    titleWeight: 700, bodyWeight: 400, radius: 0.06, upper: false,
    motif: 'dot', shapes: 'Скруглённые карточки, круг-акцент, чистая сетка',
    mood: 'Надёжно, спокойно, «по-взрослому»'
  },
  go: {
    id: 'go', name: 'Поездочный', like: 'Яндекс Go',
    about: 'Супераппа такси и доставки: жёлтые плашки, чёрные кнопки-таблетки, крупные жирные заголовки.',
    colors: { primary: '#FFD83D', accent: '#16161A', bg: '#FFFFFF', text: '#16161A', soft: '#F3F3EF' },
    original: 'жёлтый #FCE000, чёрный, белый',
    font: 'Manrope', fontNote: 'Manrope ExtraBold вместо фирменного гротеска',
    titleWeight: 800, bodyWeight: 400, radius: 0.1, upper: false,
    motif: 'block', shapes: 'Большая жёлтая плашка, кнопки-«таблетки», крупные радиусы',
    mood: 'Быстро, бодро, дружелюбно'
  },
  whoosh: {
    id: 'whoosh', name: 'Полосатый', like: 'Whoosh',
    about: 'Кикшеринг после рестайлинга 2023: мягкая жёлтая полоса-лейтмотив, пониженный контраст, графитовый вместо чёрного.',
    colors: { primary: '#FFE14F', accent: '#2E2E35', bg: '#F7F5EF', text: '#27272D', soft: '#E9E6DC' },
    original: 'жёлтый, графит, светлые мягкие фоны',
    font: 'Unbounded', fontNote: 'Unbounded — широкий геометричный гротеск',
    titleWeight: 700, bodyWeight: 400, radius: 0.025, upper: false,
    motif: 'stripe', shapes: 'Непрозрачная полоса-маркер под заголовком, строгие прямоугольники',
    mood: 'Городской драйв, но спокойнее'
  },
  urent: {
    id: 'urent', name: 'Фиолетовый', like: 'Юрент',
    about: 'Кикшеринг с узнаваемым фиолетовым кодом: насыщенный фиолетовый, сиреневые градиенты, мягкие пятна.',
    colors: { primary: '#7A43EE', accent: '#C9B5FF', bg: '#FFFFFF', text: '#1F1438', soft: '#F2EDFF' },
    original: 'ярко-фиолетовый и сиреневый',
    font: 'Rubik', fontNote: 'Rubik — округлый гротеск',
    titleWeight: 700, bodyWeight: 400, radius: 0.08, upper: false,
    motif: 'blobs', shapes: 'Градиентные пятна-круги, мягкие скругления',
    mood: 'Молодо, технологично, ярко'
  },
  bk: {
    id: 'bk', name: 'Пламенный', like: 'Burger King',
    about: 'Фастфуд после ребрендинга 2021: сочный красно-оранжевый, кремовый фон, коричневый текст, пухлые округлые буквы.',
    colors: { primary: '#D63B20', accent: '#FF8D3F', bg: '#F5EADA', text: '#4A2717', soft: '#EBD8C0' },
    original: 'огненно-красный, оранжевый, «майонезный» крем, коричневый',
    font: 'Nunito', fontNote: 'Nunito Black вместо фирменного Flame',
    titleWeight: 900, bodyWeight: 700, radius: 0.12, upper: true,
    motif: 'wave', shapes: 'Волна-«соус» снизу, пухлые формы, заголовки капсом',
    mood: 'Аппетитно, громко, с юмором'
  },
  vit: {
    id: 'vit', name: 'Точечный', like: 'Вкусно — и точка',
    about: 'Фастфуд с тёмно-зелёной базой, оранжевой «точкой» и лаконичной типографикой без лишних символов.',
    colors: { primary: '#1F4C37', accent: '#FF8A1E', bg: '#FFFFFF', text: '#1D2B24', soft: '#EAF1EC', extra: '#E7472D' },
    original: 'тёмно-зелёный, оранжевый, красный акцент',
    font: 'Montserrat', fontNote: 'Montserrat ExtraBold — простой геометричный шрифт',
    titleWeight: 800, bodyWeight: 400, radius: 0.04, upper: false,
    motif: 'bigdot', shapes: 'Крупная точка и тире как знак препинания, спокойные плашки',
    mood: 'Просто, по-домашнему, уверенно'
  }
};
