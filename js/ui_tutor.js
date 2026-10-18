/* LearnEase AI — Tutor Agent UI wiring */
(function () {
  const U = LEAREASE.util, T = LEAREASE.tutor;

  let currentMode = 'standard';
  let reader = null;
  let lastOutput = '';   // text currently displayed (for read-aloud)
  let simplifiedDone = false;

  function init() {
    const input = U.el('lesson-input');
    input.value = LEAREASE.data.sampleLesson;

    // populate readability pills for the raw lesson
    showReadabilityBefore(T.flesch(input.value));

    U.el('btn-load-sample').addEventListener('click', () => {
      input.value = LEAREASE.data.sampleLesson;
      simplifiedDone = false;
      U.el('lesson-output').innerHTML = 'Sample lesson loaded — press <b>✨ Simplify lesson</b>.';
      U.el('lesson-steps').innerHTML = '';
      U.el('kw-list').innerHTML = '<span class="muted small">Key words appear here after simplifying a lesson.</span>';
      showReadabilityBefore(T.flesch(input.value));
      LEAREASE.agents.log('tutor', 'Sample lesson loaded', 'Photosynthesis lesson ready for simplification.');
    });
    U.el('btn-clear-lesson').addEventListener('click', () => {
      input.value = '';
      U.el('lesson-output').innerHTML = 'Paste a lesson and press <b>✨ Simplify lesson</b>.';
      U.el('lesson-steps').innerHTML = '';
      U.el('kw-list').innerHTML = '';
      U.el('readability-pills').innerHTML = '';
      simplifiedDone = false;
    });
    U.el('btn-simplify').addEventListener('click', doSimplify);

    // support mode segmented control
    document.querySelectorAll('#tab-tutor .seg button').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#tab-tutor .seg button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        currentMode = b.dataset.mode;
        applyModeNote();
        if (simplifiedDone) doSimplify(true);
      });
    });

    // font size / line spacing
    U.el('fs-range').addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--fs', e.target.value + 'px');
      U.el('fs-val').textContent = e.target.value + 'px';
    });
    U.el('ls-range').addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--lh', e.target.value);
      U.el('ls-val').textContent = e.target.value;
    });

    // contrast & dyslexia spacing toggles
    U.el('btn-contrast').addEventListener('click', () => {
      document.body.classList.toggle('hc');
      const on = document.body.classList.contains('hc');
      U.el('btn-contrast').textContent = '🌓 High contrast: ' + (on ? 'on' : 'off');
      redrawAllCharts();
    });
    U.el('btn-dysfont').addEventListener('click', () => {
      document.body.classList.toggle('dyslexia');
      const on = document.body.classList.contains('dyslexia');
      U.el('btn-dysfont').textContent = '🔤 Dyslexia-friendly spacing: ' + (on ? 'on' : 'off');
    });

    // translation select
    U.el('lang-select').addEventListener('change', () => {
      if (!simplifiedDone) return;
      renderOutput();   // re-render in chosen language
    });

    // read aloud
    reader = T.Reader(U.el('lesson-output'), U.el('read-status'));
    U.el('btn-readaloud').addEventListener('click', () => {
      if (!lastOutput) { U.toast('Simplify a lesson first'); return; }
      reader.toggle(lastOutput);
    });
  }

  function applyModeNote() {
    const notes = {
      standard: '',
      dyslexia: 'Dyslexia mode: extra letter spacing, taller lines, key words bolded.',
      adhd: 'ADHD mode: bullet steps, short chunks, one idea per step.',
      dyscalculia: 'Dyscalculia mode: numbers kept concrete, key words shown with plain meanings.'
    };
    U.el('read-status').textContent = notes[currentMode] || '';
  }

  function showReadabilityBefore(score) {
    U.el('readability-pills').innerHTML =
      '<span class="readability-pill rp-before">Original: ' + score + ' · ' + T.fleschBand(score) + '</span>';
  }

  function doSimplify(silent) {
    const text = U.el('lesson-input').value.trim();
    if (!text) { U.toast('Paste some lesson text first'); return; }
    const before = T.flesch(text);
    const simp = T.simplifyPass(text, currentMode);
    const after = T.flesch(simp);
    const gain = after - before;
    U.el('readability-pills').innerHTML =
      '<span class="readability-pill rp-before">Original: ' + before + ' · ' + T.fleschBand(before) + '</span>' +
      '<span class="readability-pill rp-after">Simplified: ' + after + ' · ' + T.fleschBand(after) + ' (+' + gain + ')</span>';
    simplifiedDone = true;
    renderOutput();
    LEAREASE.agents.log('tutor', 'Lesson simplified', 'Readability ' + before + ' → ' + after + ' (Flesch) in ' + currentMode + ' mode.');
    if (!silent) U.toast('Simplified! Readability +' + gain + ' points');
  }

  function renderOutput() {
    const lang = U.el('lang-select').value;
    const raw = U.el('lesson-input').value.trim();
    const simp = T.simplifyPass(raw, currentMode);
    const text = lang === 'none' ? simp : T.translate(simp, lang);

    // word-by-word spans for read-aloud highlighting (English only)
    if (lang === 'none') {
      U.el('lesson-output').innerHTML = text
        .split(/(\s+)/)
        .map((t) => (/\S/.test(t) ? '<span class="lr-word">' + U.esc(t) + '</span>' : t))
        .join('');
    } else {
      U.el('lesson-output').textContent = text + '\n\n(Translated with the demo glossary — mock LLM mode.)';
    }
    lastOutput = U.el('lesson-output').textContent;

    // steps
    const steps = T.stepsFrom(simp);
    U.el('lesson-steps').innerHTML =
      '<h3 class="small" style="margin-top:12px">Step-by-step version</h3>' +
      steps.map((s, i) => '<div class="step-item"><b>Step ' + (i + 1) + ': ' + U.esc(s.head) + '</b><br/>' + U.esc(lang === 'none' ? s.body : T.translate(s.body, lang)) + '</div>').join('');

    // key words (English meanings)
    const kws = T.keywords(raw);
    U.el('kw-list').innerHTML = kws.length
      ? kws.map((k) => '<span class="kw-chip"><b>' + U.esc(k.word) + '</b> = ' + U.esc(k.meaning) + '</span>').join('')
      : '<span class="muted small">No dictionary key words found in this lesson.</span>';
  }

  function redrawAllCharts() {
    if (LEAREASE.ui && LEAREASE.ui.redrawAll) LEAREASE.ui.redrawAll();
  }

  LEAREASE.ui = LEAREASE.ui || {};
  LEAREASE.ui.tutorInit = init;
})();
