/* LearnEase AI — multi-agent system: Tutor, Quiz Master, Gap Detector, Reminder,
   Teacher Alert. Shared activity timeline + messaging helpers. */
(function () {
  const U = LEAREASE.util;
  const A = (LEAREASE.agents = {});

  const AGENTS = {
    tutor:        { name: 'Tutor Agent',       color: 'var(--accent)',  icon: '📚', role: 'Simplifies lessons, key words, read-aloud, translation' },
    quiz:         { name: 'Quiz Master Agent', color: 'var(--purple)',  icon: '🎯', role: 'Adaptive quizzes, ability estimate, question selection' },
    gap:          { name: 'Gap Detector Agent',color: 'var(--bad)',     icon: '🧠', role: 'Trains models, scores risk, explains predictions' },
    reminder:     { name: 'Reminder Agent',    color: 'var(--warn)',    icon: '⏰', role: 'Personalised study plans and gentle reminders' },
    teacherAlert: { name: 'Teacher Alert Agent',color: 'var(--ok)',     icon: '🔔', role: 'Short, kind, actionable alerts for teachers and parents' }
  };
  A.AGENTS = AGENTS;

  /* ---------- Activity timeline ---------- */
  let events = [];
  A.log = function (agentKey, title, detail) {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    events.unshift({ agentKey, title, detail, time });
    if (events.length > 60) events.pop();
    renderTimeline();
  };
  function renderTimeline() {
    const box = U.el('timeline');
    if (!box) return;
    box.innerHTML = events.length
      ? events
          .map(
            (e) =>
              '<div class="tl-item">' +
                '<div class="tl-agent" style="color:' + AGENTS[e.agentKey].color + '">' + AGENTS[e.agentKey].icon + ' ' + AGENTS[e.agentKey].name + ' <span class="tl-time">' + e.time + '</span></div>' +
                '<div class="tl-title">' + U.esc(e.title) + '</div>' +
                (e.detail ? '<div class="tl-detail">' + U.esc(e.detail) + '</div>' : '') +
              '</div>'
          )
          .join('')
      : '<p class="muted">Agent activity will appear here as you use LearnEase.</p>';
  }
  A.renderTimeline = renderTimeline;
  A.seedTimeline = function () {
    events = [
      { agentKey: 'gap', title: 'Dataset ready', detail: 'Synthetic dataset of 3,200 students loaded (labelled synthetic).', time: '09:00' },
      { agentKey: 'tutor', title: 'Sample lesson loaded', detail: 'Photosynthesis lesson ready for simplification.', time: '09:00' },
      { agentKey: 'quiz', title: 'Question bank ready', detail: '54 questions across 7 topics and 3 difficulty levels.', time: '09:00' }
    ];
    renderTimeline();
  };

  /* ---------- Reminder Agent ---------- */
  A.reminderPlan = function (student, riskP) {
    const f = student.features;
    const plan = [];
    if (f.completion < 0.75) plan.push('Two 10-minute tasks per day instead of one long session (short sessions raise completion).');
    if (f.avgScore < 45) plan.push('Revisit the last two quiz topics with Tutor-mode simplified notes before new material.');
    if (f.retries >= 3) plan.push('Try each question once with a hint before retrying — hints are free and do not lower your score.');
    if (f.daysInactive >= 4) plan.push('A gentle 5-minute starter quiz today to rebuild the daily habit.');
    if (f.timePerQ > 55) plan.push('Use dyslexia/ADHD display mode (larger text, more spacing) to make reading faster.');
    if (!plan.length) plan.push('Keep the current routine — one 15-minute quiz every second day is working well.');
    plan.push('Daily 15-minute practice at ' + (f.avgScore < 45 ? 'Level 1–2' : 'Level 2–3') + ' difficulty, best time: after school snack break.');
    const msg =
      'Hi ' + student.name.split(' ')[0] + '! 🌟\n' +
      "Here is your study plan for today (it adapts as you learn):\n" +
      plan.map((p, i) => (i + 1) + '. ' + p).join('\n') +
      '\n\nYou have completed ' + Math.round(f.completion * 100) + '% of your tasks so far — small steps every day count. You have got this! 💪\n— LearnEase AI Reminder Agent (demo, synthetic data)';
    return { plan, msg, channel: 'WhatsApp-style (demo)' };
  };

  /* ---------- Teacher Alert Agent ---------- */
  A.teacherAlert = function (student, p, topFactors, model) {
    const status = LEAREASE.data.statusFor(p);
    const f = student.features;
    const dir = f.trend >= 0 ? 'improving' : 'slipping';
    const factors = topFactors.length
      ? topFactors.map((t) => t.label.toLowerCase()).join(', ')
      : 'overall engagement';
    const action = [];
    if (f.avgScore < 45) action.push('re-teach the last two topics in small-group time');
    if (f.completion < 0.75) action.push('shorten tasks and check in after each one');
    if (f.daysInactive >= 4) action.push('a quick welcome-back check-in today');
    if (f.retries >= 3) action.push('enable hints before retries in class mode');
    if (!action.length) action.push('keep current support in place and review next week');
    const text =
      'ALERT — ' + student.name + ' (Grade ' + student.grade + ', ' + student.group + ')\n' +
      'Status: ' + status.label + '  |  Risk score: ' + Math.round(p * 100) + '% (model: ' + model + ', demo data)\n' +
      'What the model noticed: quiz scores are ' + dir + ' (trend ' + (f.trend >= 0 ? '+' : '') + f.trend.toFixed(1) + ' pts/week), ' +
      'main signals: ' + factors + '.\n' +
      'Suggested next steps: ' + action.map((a, i) => (i + 1) + ') ' + a).join('  ') + '.\n' +
      'This is an early-warning assist, not a diagnosis — please pair it with your own judgement.\n' +
      '— LearnEase AI Teacher Alert Agent';
    return { text, status };
  };
})();
