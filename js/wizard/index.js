// Список шагов мастера и публичный SD.wizard.

SD.wizard = (function (W) {
  const STEPS = [
    { id: 'idea', title: 'Идея', render: W.stepIdea },
    { id: 'format', title: 'Формат', render: W.stepFormat },
    { id: 'style', title: 'Стиль', render: W.stepStyle },
    { id: 'mix', title: 'Сочетание', render: W.stepMix, live: true },
    { id: 'colors', title: 'Цвета', render: W.stepColors },
    { id: 'text', title: 'Текст', render: W.stepText },
    { id: 'attention', title: 'Внимание', render: W.stepAttention },
    { id: 'layout', title: 'Расположение', render: W.stepLayout, live: true },
    { id: 'details', title: 'Детали', render: W.stepDetails },
    { id: 'effects', title: 'Эффекты и значки', render: W.stepEffects, live: true },
    { id: 'auto', title: 'Автопилот', render: W.stepAuto },
    { id: 'editor', title: 'Редактор', render: W.stepEditor },
    { id: 'result', title: 'Результат', render: W.stepResult, live: true }
  ];

  Object.assign(W, { STEPS });

  return { init: W.init, render: W.render, go: W.go, renumber: W.renumber, STEPS };
})(SD._wiz);
