// Правая половина: вкладки страниц и три вида — редактор, все стороны, «как в жизни».

SD.views = (function () {
  const A = SD.app, S = SD.app.S, h = SD.u.h;
  let flipped = false;

  function init() {
    document.querySelectorAll('#viewSwitch button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    document.getElementById('goExport').addEventListener('click', () => SD.wizard.go(SD.wizard.STEPS.length - 1));
    A.on(what => {
      if (what === 'doc' || what === 'page') tabs();
      if (what === 'doc') refreshIfVisible();
    });
  }

  function tabs() {
    const box = document.getElementById('pageTabs');
    box.innerHTML = '';
    S.doc.pages.forEach((p, i) => {
      box.append(h('button', { class: i === S.page ? 'on' : '', title: 'Двойной клик — переименовать', onclick: () => { A.setPage(i); if (S.view === 'mock') renderMock(); SD.editor.render(); }, ondblclick: () => { const n = prompt('Название страницы', p.name); if (n) { p.name = n; A.commit(); } } }, p.name));
    });
    box.append(h('button', { class: 'add', title: 'Добавить пустую страницу', onclick: () => A.addPage() }, '+'));
  }

  function setView(v) {
    S.view = v;
    document.querySelectorAll('#viewSwitch button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    document.getElementById('stage').classList.toggle('hidden', v !== 'edit');
    document.getElementById('toolbar').classList.toggle('hidden', v !== 'edit');
    document.getElementById('allView').classList.toggle('hidden', v !== 'all');
    document.getElementById('mockView').classList.toggle('hidden', v !== 'mock');
    document.querySelector('.zoom').classList.toggle('hidden', v !== 'edit');
    SD.editor.finishText();
    if (v === 'edit') SD.editor.fit();
    refreshIfVisible();
  }

  let t = null;
  function refreshIfVisible() {
    clearTimeout(t);
    t = setTimeout(() => { if (S.view === 'all') renderAll(); else if (S.view === 'mock') renderMock(); }, 50);
  }

  function img(page, maxW, maxH) {
    const k = Math.min(maxW / S.doc.w, maxH / S.doc.h);
    const c = SD.render.pageCanvas(S.doc, page, k * Math.min(2, (window.devicePixelRatio || 1) * 1.2));
    const im = h('img', { src: c.toDataURL('image/png'), alt: page.name });
    im.style.width = S.doc.w * k + 'px'; im.style.height = S.doc.h * k + 'px';
    return im;
  }

  function renderAll() {
    const box = document.getElementById('allView');
    const r = box.getBoundingClientRect();
    const n = S.doc.pages.length;
    const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
    const maxW = (r.width - 48 - (cols - 1) * 28) / cols, maxH = n <= 2 ? r.height - 110 : (r.height - 110) / Math.ceil(n / cols);
    box.innerHTML = '';
    const g = h('div', { class: 'all-grid' });
    S.doc.pages.forEach((p, i) => g.append(h('figure', { onclick: () => { A.setPage(i); setView('edit'); } }, img(p, Math.max(120, maxW), Math.max(140, maxH)), h('figcaption', null, `Рисунок ${i + 1}. ${p.name}`))));
    box.append(g);
    box.append(h('p', { class: 'note', style: { textAlign: 'center' } }, 'Нажмите на страницу, чтобы открыть её в редакторе.'));
  }

  function renderMock() {
    const box = document.getElementById('mockView');
    const r = box.getBoundingClientRect();
    box.innerHTML = '';
    const wrap = h('div', { class: 'mock-wrap' });
    const n = S.doc.pages.length;
    const maxW = Math.min(r.width - 80, 900), maxH = r.height - 140;
    if (n === 2) {
      const k = Math.min(maxW * 0.8 / S.doc.w, maxH / S.doc.h);
      const w = S.doc.w * k, hh = S.doc.h * k;
      const card = h('div', { class: 'mock-card' + (flipped ? ' flip' : ''), style: { width: w + 'px', height: hh + 'px', transform: `rotateX(8deg) rotateZ(-2deg) ${flipped ? 'rotateY(180deg)' : ''}` } },
        h('div', { class: 'mock-face' }, img(S.doc.pages[0], w, hh)),
        h('div', { class: 'mock-face back' }, img(S.doc.pages[1], w, hh)));
      card.addEventListener('click', () => { flipped = !flipped; card.classList.toggle('flip', flipped); card.style.transform = `rotateX(8deg) rotateZ(-2deg) ${flipped ? 'rotateY(180deg)' : ''}`; });
      wrap.append(h('div', { class: 'mock-scene' }, card));
      wrap.append(h('p', { class: 'note' }, 'Нажмите на лист, чтобы перевернуть его.'));
    } else {
      const cols = Math.min(n, 3);
      const k = Math.min((maxW - (cols - 1) * 30) / cols / S.doc.w, (n > 3 ? maxH / 2 - 20 : maxH) / S.doc.h);
      const fan = h('div', { class: 'mock-fan' });
      S.doc.pages.forEach((p, i) => {
        const rot = n === 1 ? -2 : (i - (n - 1) / 2) * 3;
        fan.append(h('div', { class: 'mock-face', style: { width: S.doc.w * k + 'px', height: S.doc.h * k + 'px', transform: `rotate(${rot}deg)` } }, img(p, S.doc.w * k, S.doc.h * k)));
      });
      wrap.append(h('div', { class: 'mock-scene' }, fan));
      wrap.append(h('p', { class: 'note' }, `${(SD.FORMATS[S.doc.format] || {}).name || ''}, ${Math.round(S.doc.w)} × ${Math.round(S.doc.h)} мм — примерно так макет будет выглядеть в руках.`));
    }
    box.append(wrap);
  }

  return { init, setView, tabs, refreshIfVisible };
})();
