// Запуск приложения.
(function () {
  const A = SD.app, S = SD.app.S;
  SD.editor.init();
  SD.views.init();
  SD.wizard.init();

  A.on(what => {
    if (what === 'doc' || what === 'sel' || what === 'page') {
      if (what === 'doc' && SD.editor.isFit()) SD.editor.fit(); else if (what === 'doc') SD.editor.layout(); else SD.editor.render();
      document.getElementById('undoBtn').disabled = !A.canUndo();
      document.getElementById('redoBtn').disabled = !A.canRedo();
    }
  });

  document.getElementById('projectInput').addEventListener('change', e => {
    const f = e.target.files[0]; e.target.value = '';
    if (f) SD.exporter.openProject(f);
  });

  const restored = A.load();
  if (restored && S.doc) {
    A.resetHistory();
    SD.views.tabs();
    SD.editor.fit();
    SD.render.assetsReady(S.doc).then(() => SD.editor.render());
  } else {
    A.regenerate(true);
  }
  SD.wizard.render();
  // шрифты грузятся асинхронно — когда будут готовы, пересоберём макет и миниатюры
  SD.render.preloadAll().then(() => {
    if (S.doc && !S.doc.dirty) A.regenerate(true); else SD.editor.render();
    SD.wizard.render();
  });
})();
