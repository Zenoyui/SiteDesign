// Скачивание результата: PDF, печать, PNG/JPG, PPTX, HTML-презентация, проект.

SD.exporter = (function () {
  const u = SD.u, A = SD.app, S = SD.app.S;
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const PPTX = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';

  const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  // Латиница в имени файла — типографии и почта не ломают такие имена
  function baseName() {
    const t = (S.answers.texts.title || 'maket').toLowerCase().replace(/[а-яё]/g, c => TR[c]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    return (t || 'maket') + '-' + (SD.FORMATS[S.doc.format] || { name: '' }).name.replace(/\W+/g, '');
  }

  async function canvases(opts = {}) {
    SD.editor.finishText();
    await SD.render.assetsReady(S.doc);
    const ppm = (opts.dpi || S.exportOpts.dpi) / 25.4;
    return S.doc.pages.map(p => SD.render.pageCanvas(S.doc, p, ppm, { bleed: opts.bleed ? 3 : 0, marks: !!opts.marks }));
  }
  function toBlob(c, type, q) { return new Promise(ok => c.toBlob(ok, type, q)); }

  async function pdf() {
    await SD.u.loadScript(JSPDF);
    const o = S.exportOpts;
    const b = o.bleed ? 3 : 0, slug = o.marks ? 8 : 0;
    const list = await canvases({ bleed: o.bleed, marks: o.marks });
    const W = S.doc.w + 2 * (b + slug), H = S.doc.h + 2 * (b + slug);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: W > H ? 'l' : 'p', unit: 'mm', format: [W, H], compress: true });
    list.forEach((c, i) => {
      if (i) pdf.addPage([W, H], W > H ? 'l' : 'p');
      pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, W, H, undefined, 'FAST');
    });
    pdf.setProperties({ title: S.answers.texts.title || 'Макет', creator: 'Конструктор макетов' });
    pdf.save(baseName() + '.pdf');
    SD.toast('PDF готов');
  }

  async function images(type) {
    const list = await canvases({ bleed: S.exportOpts.bleed, marks: S.exportOpts.marks });
    const ext = type === 'png' ? 'png' : 'jpg';
    for (let i = 0; i < list.length; i++) {
      let c = list[i];
      const blob = await toBlob(c, 'image/' + type, S.exportOpts.jpgQ);
      u.download(blob, `${baseName()}${list.length > 1 ? '-' + (i + 1) : ''}.${ext}`);
      await new Promise(r => setTimeout(r, 250));
    }
    SD.toast(list.length > 1 ? `Скачано файлов: ${list.length}` : 'Картинка готова');
  }

  async function pptx() {
    await SD.u.loadScript(PPTX);
    const list = await canvases({ dpi: Math.min(S.exportOpts.dpi, 200) });
    const p = new window.PptxGenJS();
    const wIn = S.doc.w / 25.4, hIn = S.doc.h / 25.4;
    // PowerPoint хочет слайд не меньше 1 дюйма и не больше 56 — масштабируем при необходимости
    const k = Math.max(1, 7.5 / Math.min(wIn, hIn));
    p.defineLayout({ name: 'DOC', width: wIn * k, height: hIn * k });
    p.layout = 'DOC';
    p.title = S.answers.texts.title || 'Макет';
    list.forEach(c => { const s = p.addSlide(); s.addImage({ data: c.toDataURL('image/jpeg', 0.92), x: 0, y: 0, w: wIn * k, h: hIn * k }); });
    await p.writeFile({ fileName: baseName() + '.pptx' });
    SD.toast('Презентация готова');
  }

  async function htmlDeck() {
    const list = await canvases({ dpi: 150 });
    const imgs = list.map(c => c.toDataURL('image/jpeg', 0.9));
    const title = u.esc(S.answers.texts.title || 'Макет');
    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>html,body{margin:0;height:100%;background:#111;overflow:hidden;font-family:system-ui,sans-serif}
.s{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .4s}
.s.on{opacity:1}.s img{max-width:94vw;max-height:90vh;box-shadow:0 10px 40px rgba(0,0,0,.6)}
.n{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);color:#aaa;font-size:14px}
button{position:fixed;top:50%;transform:translateY(-50%);background:none;border:0;color:#777;font-size:48px;cursor:pointer;padding:20px}
#p{left:0}#x{right:0}</style></head><body>
${imgs.map((s, i) => `<div class="s${i ? '' : ' on'}"><img src="${s}" alt="Страница ${i + 1}"></div>`).join('\n')}
<button id="p">‹</button><button id="x">›</button><div class="n" id="n"></div>
<script>var i=0,s=document.querySelectorAll('.s'),n=document.getElementById('n');
function g(k){s[i].classList.remove('on');i=(k+s.length)%s.length;s[i].classList.add('on');n.textContent=(i+1)+' / '+s.length}
document.getElementById('p').onclick=function(){g(i-1)};document.getElementById('x').onclick=function(){g(i+1)};
document.addEventListener('keydown',function(e){if(e.key=='ArrowRight'||e.key==' ')g(i+1);if(e.key=='ArrowLeft')g(i-1);if(e.key=='f')document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()});
document.body.onclick=function(e){if(e.target.tagName!='BUTTON')g(i+1)};g(0);<\/script></body></html>`;
    u.download(new Blob([html], { type: 'text/html' }), baseName() + '-prezentaciya.html');
    SD.toast('HTML-презентация готова');
  }

  async function print() {
    const o = S.exportOpts;
    const list = await canvases({ bleed: false, marks: false, dpi: Math.min(o.dpi, 300) });
    const W = S.doc.w, H = S.doc.h;
    const f = document.createElement('iframe');
    Object.assign(f.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open();
    d.write(`<!DOCTYPE html><html><head><style>@page{size:${W}mm ${H}mm;margin:0}html,body{margin:0}img{display:block;width:${W}mm;height:${H}mm;page-break-after:always;break-after:page}</style></head><body>${list.map(c => `<img src="${c.toDataURL('image/png')}">`).join('')}</body></html>`);
    d.close();
    await new Promise(r => setTimeout(r, 400));
    try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { SD.toast('Браузер не разрешил печать — скачайте PDF'); }
    setTimeout(() => f.remove(), 60000);
  }

  function saveProject() {
    const data = { app: 'sitedesign', version: 1, answers: S.answers, doc: S.doc };
    u.download(new Blob([JSON.stringify(data)], { type: 'application/json' }), baseName() + '.json');
    SD.toast('Проект сохранён');
  }
  async function openProject(file) {
    try {
      const o = JSON.parse(await file.text());
      if (!o || !o.doc || !o.doc.pages) throw new Error('это не файл проекта');
      const d = A.defaultAnswers();
      S.answers = A.mergeAnswers(d, o.answers);
      S.doc = o.doc; S.page = 0; S.sel = [];
      A.resetHistory(); A.save(); A.emit('doc');
      await SD.render.assetsReady(S.doc);
      SD.editor.fit(); SD.wizard.render();
      SD.toast('Проект открыт');
    } catch (e) { SD.toast('Не получилось открыть: ' + e.message); }
  }

  // Серия разных форматов: один PDF, у каждой страницы свой размер
  async function seriesPdf(items) {
    await SD.u.loadScript(JSPDF);
    for (const it of items) await SD.render.assetsReady(it.doc);
    const { jsPDF } = window.jspdf;
    let pdf = null;
    for (const it of items) {
      const d = it.doc, ppm = S.exportOpts.dpi / 25.4;
      const c = SD.render.pageCanvas(d, d.pages[0], ppm);
      const o = d.w > d.h ? 'l' : 'p';
      if (!pdf) pdf = new jsPDF({ orientation: o, unit: 'mm', format: [d.w, d.h], compress: true });
      else pdf.addPage([d.w, d.h], o);
      pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, d.w, d.h, undefined, 'FAST');
    }
    pdf.setProperties({ title: (S.answers.texts.title || 'Серия') + ' — серия' });
    pdf.save(baseName() + '-seriya.pdf');
    SD.toast('Серия готова: ' + items.length + ' форматов');
  }
  async function seriesPng(items) {
    for (const it of items) {
      await SD.render.assetsReady(it.doc);
      const c = SD.render.pageCanvas(it.doc, it.doc.pages[0], S.exportOpts.dpi / 25.4);
      u.download(await toBlob(c, 'image/png'), `${baseName()}-${it.key}.png`);
      await new Promise(r => setTimeout(r, 250));
    }
  }

  return { pdf, images, pptx, htmlDeck, print, saveProject, openProject, seriesPdf, seriesPng };
})();
