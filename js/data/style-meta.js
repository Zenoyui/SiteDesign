// Группы и порядок стилей, свободные шрифты и их насыщенности.

for (const id of ['yandex', 'go', 'whoosh', 'urent', 'bk', 'vit']) SD.STYLES[id].group = 'service';
SD.STYLE_GROUPS = { service: 'Сервисы и еда', tech: 'Смартфоны и техника', retail: 'Банки, маркетплейсы, ретейл', direction: 'Направления дизайна (без брендов)' };
SD.STYLE_ORDER = ['yandex', 'go', 'whoosh', 'urent', 'bk', 'vit', 'apple', 'xiaomi', 'samsung', 'nothing', 'pixel', 'sber', 'ozon', 'wb', 'ikea', 'swiss', 'brutal', 'retro70', 'y2k', 'japan', 'bauhaus'];

SD.FONTS = ['Onest', 'Manrope', 'Unbounded', 'Rubik', 'Nunito', 'Montserrat', 'Golos Text', 'Inter', 'IBM Plex Mono', 'PT Sans', 'PT Serif', 'Comfortaa', 'Russo One', 'Tinos'];
SD.FONT_WEIGHTS = {
  'Onest': [400, 500, 700, 800], 'Manrope': [400, 600, 800], 'Unbounded': [400, 600, 800], 'Rubik': [400, 500, 700, 900],
  'Nunito': [400, 700, 900], 'Montserrat': [400, 600, 800], 'Golos Text': [400, 600, 800], 'PT Serif': [400, 700],
  'Comfortaa': [400, 700], 'Russo One': [400], 'Tinos': [400, 700], 'Inter': [400, 600, 700, 800], 'IBM Plex Mono': [400, 600], 'PT Sans': [400, 700]
};
SD.nearWeight = function (font, w) {
  const list = SD.FONT_WEIGHTS[font] || [400, 700];
  return list.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a);
};

