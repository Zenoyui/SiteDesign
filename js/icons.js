// Собственный набор значков (сетка 24×24, линии) и шесть стилей их оформления.

SD.ICONS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M4 12h15M13 6l6 6-6 6',
  arrowCurve: 'M20 4.5C13 4.5 8 8 7 16.5M3.5 12.5L7 17l4.2-3.4',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3.5 2',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7.2a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8z',
  star: 'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z',
  bolt: 'M13 2.5L5 13.5h6l-1 8 8-11h-6z',
  heart: 'M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z',
  gift: 'M4 9.5h16v4H4zM5.5 13.5h13v7h-13zM12 9.5v11M12 9.5C10.5 6 6.5 5.5 6.5 8S10 9.5 12 9.5zM12 9.5c1.5-3.5 5.5-4 5.5-1.5S14 9.5 12 9.5z',
  burger: 'M4.5 10.5C4.5 6.5 8 4.5 12 4.5s7.5 2 7.5 6zM3.5 13.5h17M5 16.5h14c0 1.7-1.3 3-3 3H8c-1.7 0-3-1.3-3-3z',
  cup: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M11 3v2.5M14 3.5v2',
  phone: 'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM10.5 18.5h3',
  percent: 'M18.5 5.5l-13 13M7.5 5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5zM16.5 14a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z',
  shield: 'M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6zM8.5 12l2.5 2.5 4.5-4.5',
  truck: 'M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.5v2.5h-7zM6.5 15.5a2 2 0 1 0 0 4a2 2 0 1 0 0-4zM17 15.5a2 2 0 1 0 0 4a2 2 0 1 0 0-4z',
  scooter: 'M5.5 15a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5zM18.5 15a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5zM8 17.5h8M16.3 17L13.5 4.5h3M13.5 4.5H11',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4M8 14h2M12 14h2M16 14h0',
  fire: 'M12 21c-4 0-6.5-2.8-6.5-6.3 0-3.5 2.5-5.2 3.5-8.2 1.5 1.5 2 3 2 4.5 1.5-1 2.5-3.5 2-7 3.5 2.5 5.5 6.3 5.5 10.2C18.5 18.2 16 21 12 21z',
  leaf: 'M5 19C5 10 10 5 20 4c0 10-5 15-13 15zM5 19l7-7',
  smile: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM8.5 14c1 1.5 2.2 2.2 3.5 2.2s2.5-.7 3.5-2.2M9 9.5v.8M15 9.5v.8',
  cart: 'M3 4h2.5l2 11h10.5l2-8H7M9 18.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3zM17 18.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3z',
  sparkle: 'M12 3c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7zM19 15.5c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z',
  wallet: 'M4 7h15a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 19 20H5.5A1.5 1.5 0 0 1 4 18.5zM4 7l12-3.5V7M15.5 13.5h2',
  book: 'M4 5.5C6.5 4 9.5 4 12 5.5 14.5 4 17.5 4 20 5.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0zM12 5.5V19',
  map: 'M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2zM9 4.5v13M15 6.5v13',
  users: 'M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.3c2.1.7 3.5 2.8 3.5 5.7'
};
SD.ICON_NAMES = {
  check: 'Галочка', arrow: 'Стрелка', arrowCurve: 'Стрелка-указатель', clock: 'Часы', pin: 'Метка', star: 'Звезда', bolt: 'Молния',
  heart: 'Сердце', gift: 'Подарок', burger: 'Бургер', cup: 'Чашка', phone: 'Телефон', percent: 'Процент', shield: 'Щит',
  truck: 'Доставка', scooter: 'Самокат', calendar: 'Календарь', fire: 'Огонь', leaf: 'Лист', smile: 'Улыбка', cart: 'Корзина',
  sparkle: 'Блеск', wallet: 'Кошелёк', book: 'Книга', map: 'Карта', users: 'Люди'
};

// Рисует значок в прямоугольнике 0..w × 0..h (контекст уже сдвинут в угол элемента).
SD.drawIcon = function (ctx, name, style, w, h, color, color2) {
  const path = SD.ICONS[name] || SD.ICONS.star;
  const s = Math.min(w, h) / 24;
  ctx.save();
  ctx.translate((w - 24 * s) / 2, (h - 24 * s) / 2);
  ctx.scale(s, s);
  let stroke = color, lw = 1.7, inner = 1;
  const bg = color2 || color;
  if (style === 'soft') {
    ctx.globalAlpha *= 0.18; ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(12, 12, 12, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.18;
    inner = 0.62;
  } else if (style === 'badge') {
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(12, 12, 12, 0, Math.PI * 2); ctx.fill();
    stroke = SD.u.readable(bg, [color]); inner = 0.6; lw = 2;
  } else if (style === 'square') {
    ctx.fillStyle = bg; SD.render.rrect(ctx, 0, 0, 24, 24, 3.5); ctx.fill();
    stroke = SD.u.readable(bg, [color]); inner = 0.62; lw = 1.9;
  } else if (style === 'ring') {
    ctx.strokeStyle = bg; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(12, 12, 11.3, 0, Math.PI * 2); ctx.stroke();
    inner = 0.6; lw = 1.5;
  } else if (style === 'bold') lw = 2.8;
  if (inner !== 1) { ctx.translate(12 * (1 - inner), 12 * (1 - inner)); ctx.scale(inner, inner); lw /= inner * 1.15; }
  ctx.strokeStyle = stroke; ctx.lineWidth = lw;
  ctx.lineCap = style === 'square' ? 'square' : 'round';
  ctx.lineJoin = style === 'square' ? 'miter' : 'round';
  ctx.stroke(new Path2D(path));
  ctx.restore();
};
