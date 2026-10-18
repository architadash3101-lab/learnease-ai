/* LearnEase AI — Quiz Master UI wiring */
(function () {
  const U = LEAREASE.util, Q = LEAREASE.quiz;
  let session = null;
  let currentQ = null;
  let lastWrong = null;
  let hinted = false;

  function init() {
    // topic filters
    const box = U.el('topic-filters');
    box.innerHTML = LEAREASE.data.TOPICS.map(
      (t) => '<label style="display:inline-flex;align-items:center;gap:4px;font-weight:500;color:var(--ink)">' +
        '<input type="checkbox" checked data-topic="' + t + '" /> ' + t + '</label>'
    ).join('');
    box.querySelectorAll('input').forEach((cb) =>
      cb.addEventListener('change', () => {
        const active = [...box.querySelectorAll('input:checked')].map((x) => x.dataset.topic);
        if (!active.length) { cb.checked = true; U.toast('Keep at least one topic'); return; }
        resetSession(false);
      })
    );

    U.el('btn-hint').addEventListener('click', () => {
      if (!currentQ) return;
      hinted = true;
      const hb = U.el('q-hint');
      hb.hidden = false;
      hb.textContent = '💡 Hint: ' + currentQ.hint;
      LEAREASE.agents.log('quiz', 'Hint shown', 'For question "' + currentQ.q.slice(0, 48) + '…" — hints do not lower the score.');
    });
    U.el('btn-next').addEventListener('click', nextQuestion);
    U.el('btn-retry').addEventListener('click', () => {
      if (!lastWrong) return;
      U.el('q-feedback').innerHTML = '';
      U.el('btn-retry').hidden = true;
      renderOptions(lastWrong, true);
    });
    U.el('btn-quiz-reset').addEventListener('click', () => resetSession(true));
    resetSession(false);
  }

  function resetSession(log) {
    const topics = [...document.querySelectorAll('#topic-filters input:checked')].map((x) => x.dataset.topic);
    session = Q.newSession(topics);
    currentQ = null; lastWrong = null; hinted = false;
    U.el('quiz-summary').innerHTML = '<span class="muted">Answer a few questions to see your summary, ability trajectory and per-topic accuracy.</span>';
    updateStats();
    nextQuestion();
    if (log) LEAREASE.agents.log('quiz', 'Quiz session reset', 'Ability estimate back to start; topics: ' + topics.join(', ') + '.');
  }

  function nextQuestion() {
    hinted = false; lastWrong = null;
    U.el('q-feedback').innerHTML = '';
    U.el('btn-retry').hidden = true;
    U.el('btn-next').hidden = true;
    U.el('q-hint').hidden = true;
    currentQ = Q.chooseQuestion(session);
    if (!currentQ) {
      U.el('q-text').textContent = '🎉 You have answered every question in the selected topics! Reset the session or add more topics.';
      U.el('q-options').innerHTML = '';
      U.el('q-reason').textContent = '';
      return;
    }
    U.el('q-topic-level').textContent = 'Topic: ' + currentQ.topic + '  ·  Difficulty: ' + ['Easy', 'Medium', 'Challenge'][currentQ.level - 1];
    U.el('q-text').textContent = currentQ.q;
    U.el('q-progress').textContent = 'Question #' + (session.answered + 1);
    renderOptions(currentQ, false);
    U.el('q-reason').textContent = '🤖 ' + Q.reason(session, currentQ);
    updateStats();
  }

  function renderOptions(q, isRetry) {
    const letters = ['A', 'B', 'C', 'D'];
    U.el('q-options').innerHTML = '';
    q.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'opt-btn';
      b.innerHTML = '<b>' + letters[i] + '.</b> ' + U.esc(opt);
      b.addEventListener('click', () => (isRetry ? answerRetry(q, i, b) : answer(q, i, b)));
      U.el('q-options').appendChild(b);
    });
  }

  // retry the same question without re-recording (retries are free, ability unchanged)
  function answerRetry(q, idx, btn) {
    const correct = idx === q.correct;
    const buttons = U.el('q-options').querySelectorAll('.opt-btn');
    buttons.forEach((b, i) => { if (i === q.correct) b.classList.add('correct'); });
    if (!correct) {
      btn.classList.add('wrong');
      U.el('btn-retry').hidden = false;
    } else {
      U.el('btn-retry').hidden = true;
    }
    U.el('q-feedback').innerHTML = correct
      ? '<p style="color:var(--ok);font-weight:700;margin:8px 0 0">✅ Correct on retry — nice recovery!</p>'
      : '<p style="color:var(--bad);font-weight:700;margin:8px 0 0">❌ Not quite — try once more, or move on.</p>';
    LEAREASE.agents.log('quiz', 'Retry attempt', 'Retry on "' + q.q.slice(0, 40) + '…" — retries are free and do not change the ability estimate.');
  }

  function answer(q, idx, btn) {
    const correct = Q.recordAnswer(session, q, idx);
    const buttons = U.el('q-options').querySelectorAll('.opt-btn');
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add('correct');
    });
    if (!correct) {
      btn.classList.add('wrong');
      lastWrong = q;
      U.el('btn-retry').hidden = false;
    }
    U.el('q-feedback').innerHTML = correct
      ? '<p style="color:var(--ok);font-weight:700;margin:8px 0 0">✅ Correct! Well done.</p>'
      : '<p style="color:var(--bad);font-weight:700;margin:8px 0 0">❌ Not quite — the right answer is <b>' + U.esc(q.options[q.correct]) + '</b>. You can try again or move on.</p>';
    U.el('btn-next').hidden = false;
    updateStats();
    LEAREASE.agents.log('quiz', (correct ? 'Correct answer' : 'Answer with feedback'), 'Q' + session.answered + ' (' + q.topic + ', level ' + q.level + ') → ability now ≈' + Math.round(session.ability) + ' ± ' + session.ci.toFixed(1) + '.');
    if (session.answered % 5 === 0) renderSummary();
  }

  function updateStats() {
    const s = Q.summary(session);
    U.el('ability-val').textContent = session.answered ? s.ability : '–';
    U.el('ci-val').textContent = session.answered ? '± ' + s.ci.toFixed(1) + ' confidence band (90%: ' + s.lo + '–' + s.hi + ')' : 'answer to start estimating';
    U.el('q-answered').textContent = s.answered;
    U.el('q-correct').textContent = s.correct;
    U.el('q-acc').textContent = session.answered ? s.acc + '%' : '–';
    drawCharts();
    if (session.answered && session.answered % 5 !== 0) renderSummary();
  }

  function drawCharts() {
    const hist = session.history;
    LEAREASE.charts.line(
      U.el('chart-ability'),
      [{ data: hist.map((h) => h.ability), color: getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#4361ee', fill: true }],
      { ymin: 0, ymax: 100, xLabels: hist.map((h) => 'Q' + h.n) }
    );
    const ta = Q.topicAccuracy(session);
    LEAREASE.charts.bars(
      U.el('chart-topicacc'),
      ta.map((t) => ({ label: t.topic.slice(0, 8), value: t.pct, color: 'var(--purple)' })),
      { ymax: 100 }
    );
  }

  function renderSummary() {
    const s = Q.summary(session);
    if (!s.answered) return;
    const byTopic = Q.topicAccuracy(session).filter((t) => t.total);
    const best = byTopic.slice().sort((a, b) => b.pct - a.pct)[0];
    const worst = byTopic.slice().sort((a, b) => a.pct - b.pct)[0];
    U.el('quiz-summary').innerHTML =
      '<div class="stat-line" style="margin-bottom:8px">' +
        '<span>Ability: <b>' + s.ability + '</b> (90% band ' + s.lo + '–' + s.hi + ')</span>' +
        '<span>Answered: <b>' + s.answered + '</b></span>' +
        '<span>Correct: <b>' + s.correct + '</b></span>' +
        '<span>Accuracy: <b>' + s.acc + '%</b></span>' +
      '</div>' +
      '<p class="small">Strongest topic so far: <b>' + (best ? best.topic : '—') + (best ? ' (' + best.pct + '%)' : '') + '</b>' +
      (worst && best !== worst ? ' · needs more practice: <b>' + worst.topic + ' (' + worst.pct + '%)</b>' : '') + '.' +
      ' The Tutor Agent suggests revising <b>' + (worst ? worst.topic : 'recent topics') + '</b> with simplified notes before the next quiz.</p>' +
      '<p class="muted small">Ability estimate: Elo/IRT-style update after every answer; the confidence band narrows as you answer more. ' +
      'Next-question choice: Upper-Confidence-Band rule (exploit difficulty fit + explore while uncertain).</p>';
  }

  LEAREASE.ui = LEAREASE.ui || {};
  LEAREASE.ui.quizInit = init;
  LEAREASE.ui.redrawQuiz = function () {
    if (session) { drawCharts(); renderSummary(); }
  };
})();
