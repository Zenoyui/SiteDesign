// Редактор: горячие клавиши, колесо мыши, инструменты и публичный SD.editor.

SD.editor = (function (E) {
  const A = SD.app, S = SD.app.S;

  // ---------- Клавиатура ----------
  E.spaceDown = false;
  function isTyping(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  function onKey(e) {
    if (e.type === 'keydown' && e.code === 'Space' && !isTyping(e.target)) { E.spaceDown = true; }
    if (isTyping(e.target) || S.view !== 'edit' || !S.doc) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    const step = e.shiftKey ? 10 : 1;
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); A.undo(); }
    else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); A.redo(); }
    else if (mod && k === 'd') { e.preventDefault(); E.duplicateSel(); }
    else if (mod && k === 'c') { E.copySel(); }
    else if (mod && k === 'x') { E.copySel(); E.deleteSel(); }
    else if (mod && k === 'a') { e.preventDefault(); A.setSel(A.page().elements.filter(x => x.visible !== false && !x.locked).map(x => x.id)); E.render(); }
    else if (mod && e.key === ']') { e.preventDefault(); E.reorder(e.altKey ? 'front' : 1); }
    else if (mod && e.key === '[') { e.preventDefault(); E.reorder(e.altKey ? 'back' : -1); }
    else if (mod && (k === '=' || k === '+')) { e.preventDefault(); E.setZoom(E.zoom * 1.25); }
    else if (mod && k === '-') { e.preventDefault(); E.setZoom(E.zoom / 1.25); }
    else if (mod && k === '0') { e.preventDefault(); E.setZoom(1); }
    else if (e.shiftKey && (k === '1' || e.code === 'Digit1')) { E.fit(); }
    else if (mod) return;
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); E.deleteSel(); }
    else if (k === 'escape') { if (S.sel.length) { const one = A.selected()[0]; A.setSel(one && one.pin ? [one.pin.id] : []); } setTool('move'); E.render(); }
    else if (k === 'enter') { const el = A.selected()[0]; if (el && el.type === 'text') { e.preventDefault(); E.startText(el); } }
    else if (k === 'arrowleft') { e.preventDefault(); E.nudge(-step, 0); }
    else if (k === 'arrowright') { e.preventDefault(); E.nudge(step, 0); }
    else if (k === 'arrowup') { e.preventDefault(); E.nudge(0, -step); }
    else if (k === 'arrowdown') { e.preventDefault(); E.nudge(0, step); }
    else if (k === 'v') setTool('move');
    else if (k === 'r') setTool('rect');
    else if (k === 'o') setTool('ellipse');
    else if (k === 'l') setTool('line');
    else if (k === 's') setTool('star');
    else if (k === 't') setTool('text');
    else if (k === 'i') setTool('image');
    else if (k === 'k') setTool('icon');
  }
  window.addEventListener('keyup', e => { if (e.code === 'Space') { E.spaceDown = false; if (E.stage) E.stage.style.cursor = ''; } });

  function onWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      E.setZoom(E.zoom * Math.pow(1.0018, -e.deltaY), e);
    }
  }

  function setTool(t) {
    if (t === 'image') { document.getElementById('imageInput').click(); t = 'move'; }
    E.tool = t;
    document.querySelectorAll('#toolbar [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
    E.stage.classList.toggle('tool-add', t !== 'move');
  }

  Object.assign(E, { isTyping, onKey, onWheel, setTool });

  return {
    init: E.init, render: E.render, layout: E.layout, fit: E.fit, setZoom: E.setZoom, setTool, duplicateSel: E.duplicateSel, deleteSel: E.deleteSel, reorder: E.reorder, align: E.align, distribute: E.distribute, startText: E.startText, finishText: E.finishText,
    isFit: () => E.fitMode, copySel: E.copySel, pasteInternal: E.pasteInternal, addImage: E.addImage
  };
})(SD._editor);
