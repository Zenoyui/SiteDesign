// Стили-направления дизайна без брендов.

Object.assign(SD.STYLES, {
  swiss: {
    id: 'swiss', name: 'Швейцарский', like: 'Международный типографский стиль', group: 'direction',
    about: '1950–60-е, Цюрих и Базель: модульная сетка, асимметрия, гротеск, красный-чёрный-белый, текст как главный образ.',
    colors: { primary: '#E1251B', accent: '#111111', bg: '#FFFFFF', text: '#111111', soft: '#F0F0F0' },
    original: 'красный, чёрный, белый; Helvetica, Akzidenz-Grotesk',
    font: 'Inter', fontNote: 'Inter — наследник швейцарских гротесков',
    titleWeight: 800, bodyWeight: 400, radius: 0, upper: false,
    motif: 'swissgrid', shapes: 'Сетка и тонкие линейки, красный прямоугольник, асимметрия',
    mood: 'Ясно, строго, по-взрослому'
  },
  brutal: {
    id: 'brutal', name: 'Брутализм', like: 'Необрутализм в вебе', group: 'direction',
    about: 'Нарочно «сырой» дизайн: толстые чёрные рамки, жёсткие тени без размытия, кислотные плоские цвета, моноширинный шрифт.',
    colors: { primary: '#FFE14A', accent: '#FF6B9E', bg: '#F6F1E6', text: '#111111', soft: '#E9E3D3', extra: '#7EE0A8' },
    original: 'кислотные цвета, чёрные рамки',
    font: 'IBM Plex Mono', fontNote: 'Моноширинный IBM Plex Mono',
    titleWeight: 600, bodyWeight: 400, radius: 0.01, upper: true,
    motif: 'brutal', shapes: 'Карточки в толстых чёрных рамках, тень-сдвиг',
    mood: 'Дерзко, честно, заметно'
  },
  retro70: {
    id: 'retro70', name: 'Ретро-70-е', like: 'Семидесятые', group: 'direction',
    about: 'Тёплые горчичный, оранжевый и коричневый, радужные дуги-полосы, пухлые округлые буквы.',
    colors: { primary: '#E0702A', accent: '#E9B23E', bg: '#F7EBD5', text: '#4A2A17', soft: '#EEDCBC', extra: '#9A4A26' },
    original: 'горчичный, оранжевый, коричневый, кремовый',
    font: 'Nunito', fontNote: 'Nunito Black — пухлый и округлый',
    titleWeight: 900, bodyWeight: 700, radius: 0.14, upper: false,
    motif: 'rainbow', shapes: 'Радужные дуги, скругления, тёплые полосы',
    mood: 'Уютно, ностальгично, тепло'
  },
  y2k: {
    id: 'y2k', name: 'Y2K', like: 'Эстетика 2000-х', group: 'direction',
    about: 'Хром и глянец рубежа тысячелетий: сиреневый и голубой, блёстки-звёздочки, пилюли, переливы.',
    colors: { primary: '#8A5CF6', accent: '#56D8F5', bg: '#F4F0FF', text: '#1B1340', soft: '#E6DEFF', extra: '#FF8AD8' },
    original: 'хром, сиреневый, голубой, розовый',
    font: 'Unbounded', fontNote: 'Unbounded — широкий «футуристичный» гротеск',
    titleWeight: 800, bodyWeight: 400, radius: 0.16, upper: false, pill: true,
    motif: 'y2k', shapes: 'Звёздочки-блёстки, пилюли, перламутровые градиенты',
    mood: 'Игриво, модно, чуть наивно'
  },
  japan: {
    id: 'japan', name: 'Японский минимализм', like: 'Ма — искусство пустоты', group: 'direction',
    about: 'Много пустого пространства, тонкая вертикаль, маленькая красная печать, спокойный антиквенный шрифт.',
    colors: { primary: '#C8372D', accent: '#2B2B2B', bg: '#F7F4EC', text: '#2B2B2B', soft: '#ECE7DA' },
    original: 'бумага, тушь, красная печать-ханко',
    font: 'PT Serif', fontNote: 'PT Serif — спокойная антиква',
    titleWeight: 700, bodyWeight: 400, radius: 0, upper: false,
    motif: 'hanko', shapes: 'Красная печать, тонкая линия, пустота',
    mood: 'Тихо, сосредоточенно, благородно'
  },
  bauhaus: {
    id: 'bauhaus', name: 'Баухаус', like: 'Школа Баухаус, 1920-е', group: 'direction',
    about: 'Основные цвета — красный, жёлтый, синий — и основные фигуры — круг, квадрат, треугольник; функция важнее украшения.',
    colors: { primary: '#D6392B', accent: '#F2BE22', bg: '#F5F0E6', text: '#161616', soft: '#E8E1D1', extra: '#1F4FA8' },
    original: 'красный, жёлтый, синий, чёрный',
    font: 'Montserrat', fontNote: 'Montserrat — геометричный гротеск',
    titleWeight: 800, bodyWeight: 400, radius: 0, upper: true,
    motif: 'bauhaus', shapes: 'Круг, квадрат, треугольник основных цветов',
    mood: 'Смело, геометрично, по-художественному'
  }
});
