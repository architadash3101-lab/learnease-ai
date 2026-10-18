/* LearnEase AI — app bootstrap: tabs, section init */
(function () {
  const U = LEAREASE.util;

  function initTabs() {
    const tabs = document.querySelectorAll('.tabs button');
    function activate(tab) {
      tabs.forEach((x) => x.classList.toggle('on', x.dataset.tab === tab));
      document.querySelectorAll('main > section[id^="tab-"]').forEach((s) => (s.hidden = s.id !== 'tab-' + tab));
    }
    tabs.forEach((b) =>
      b.addEventListener('click', () => {
        activate(b.dataset.tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // redraw charts that were rendered while their tab was hidden (zero-width canvas)
        if (LEAREASE.ui.redrawQuiz) LEAREASE.ui.redrawQuiz();
        if (LEAREASE.ui.redrawAll) LEAREASE.ui.redrawAll();
        if (LEAREASE.ui.teacherRefresh) LEAREASE.ui.teacherRefresh();
      })
    );
    // hero links switch tabs
    document.querySelectorAll('[data-tab-link]').forEach((a) =>
      a.addEventListener('click', () => activate(a.dataset.tabLink))
    );
  }

  function boot() {
    U.el('foot-year').textContent = new Date().getFullYear();
    LEAREASE.agents.seedTimeline();
    renderAgentsOverview();
    initTabs();
    LEAREASE.ui.tutorInit();
    LEAREASE.ui.quizInit();
    LEAREASE.ui.modelsInit();
    LEAREASE.ui.teacherInit();
    // agents tab wiring
    initAgentsTab();
  }

  function renderAgentsOverview() {
    const A = LEAREASE.agents.AGENTS;
    U.el('agents-overview').innerHTML = Object.keys(A).map((k) =>
      '<div class="kpi"><span style="font-size:1.3rem">' + A[k].icon + '</span><span class="lbl" style="color:' + A[k].color + ';font-weight:700">' + A[k].name + '</span><span class="muted" style="font-size:0.74rem">' + A[k].role + '</span></div>'
    ).join('');
  }

  function initAgentsTab() {
    // student selects already populated by modelsInit (xai-student) — reuse ids for rem/alert
    const opts = LEAREASE.data.sampleClass.map((s) => '<option value="' + s.id + '">' + s.name + ' (' + s.group + ')</option>').join('');
    U.el('rem-student').innerHTML = opts;
    U.el('alert-student').innerHTML = opts;
    // preselect a higher-risk student for a meaningful demo
    const risky = LEAREASE.data.sampleClass.findIndex((s) => s.label === 1);
    if (risky >= 0) {
      U.el('rem-student').value = LEAREASE.data.sampleClass[risky].id;
      U.el('alert-student').value = LEAREASE.data.sampleClass[risky].id;
    }

    let lastMsg = '';
    U.el('btn-remind').addEventListener('click', () => {
      const s = LEAREASE.data.sampleClass[U.el('rem-student').selectedIndex];
      const p = LEAREASE.data.latentRisk(s.features, s.group);
      const r = LEAREASE.agents.reminderPlan(s, p);
      lastMsg = r.msg;
      U.el('rem-msg').textContent = r.msg;
      U.el('rem-plan').innerHTML = '<h3 class="small" style="margin-top:10px">Personalised plan (why)</h3>' +
        r.plan.map((step, i) => '<div class="step-item"><b>' + (i + 1) + '.</b> ' + U.esc(step) + '</div>').join('');
      LEAREASE.agents.log('reminder', 'Study plan generated', s.name + ': ' + r.plan.length + ' personalised actions; message preview ready (' + r.channel + ').');
    });

    U.el('ch-wa').addEventListener('click', () => {
      U.el('ch-wa').classList.add('on'); U.el('ch-mail').classList.remove('on');
      U.el('rem-msg').classList.remove('msg-mail');
    });
    U.el('ch-mail').addEventListener('click', () => {
      U.el('ch-mail').classList.add('on'); U.el('ch-wa').classList.remove('on');
      U.el('rem-msg').classList.add('msg-mail');
    });

    U.el('btn-rem-copy').addEventListener('click', () => {
      if (!lastMsg) { U.toast('Generate a message first'); return; }
      U.copyText(lastMsg).then(() => U.toast('Message copied 📋'));
    });

    let lastAlert = '';
    U.el('btn-alert').addEventListener('click', () => {
      const s = LEAREASE.data.sampleClass[U.el('alert-student').selectedIndex];
      const p = LEAREASE.data.latentRisk(s.features, s.group);
      const f = s.features;
      const contribs = [
        { label: f.avgScore < 45 ? 'low quiz scores' : null, v: f.avgScore < 45 ? 2 : 0 },
        { label: f.trend < 0 ? 'declining score trend' : null, v: f.trend < 0 ? 2 : 0 },
        { label: f.completion < 0.75 ? 'low task completion' : null, v: f.completion < 0.75 ? 1.5 : 0 },
        { label: f.daysInactive >= 4 ? 'recent inactivity' : null, v: f.daysInactive >= 4 ? 1.5 : 0 },
        { label: f.retries >= 3 ? 'frequent retries' : null, v: f.retries >= 3 ? 1 : 0 }
      ].filter((c) => c.v > 0).sort((a, b) => b.v - a.v);
      const audience = U.el('alert-audience').value;
      const st = D_statusFor(p);
      const name = s.name.split(' ')[0];
      const parentText = audience === 'parent';
      const text = parentText
        ? 'Dear ' + (s.name.split(' ')[1] || 'Parent') + ',\n\n' + name + ' has been working on ' + (f.avgScore < 45 ? 'some foundational topics' : 'their topics') + ' on LearnEase, and we noticed ' + (f.trend < 0 ? 'scores have dipped a little recently' : 'steady progress with a few areas to reinforce') + '.\n\nA short 10-minute revision of ' + weakestTopic(s) + ' together at home would help a lot. Every small step counts, and ' + name + ' is not alone in this — we are supporting them in class too.\n\n(Informational note from a demo system using synthetic data — not a diagnosis.)\n— LearnEase AI, ' + s.name + '\u2019s class'
        : 'ALERT — ' + s.name + ' (Grade ' + s.grade + ', ' + s.group + ')\n' +
          'Status: ' + st.label + '  |  Risk score: ' + Math.round(p * 100) + '% (demo model, synthetic data)\n' +
          'What the model noticed: ' + (contribs.length ? contribs.map((c) => c.label).join(', ') : 'overall engagement pattern') + '.\n' +
          'Suggested next steps: ' + nextSteps(s).map((a, i) => (i + 1) + ') ' + a).join('  ') + '.\n' +
          'This is an early-warning assist, not a diagnosis — please pair it with your own judgement.\n' +
          '— LearnEase AI Teacher Alert Agent';
      lastAlert = text;
      const box = U.el('alert-out');
      box.innerHTML = '<div class="msg-preview ' + (parentText ? 'msg-mail' : '') + '">' + U.esc(text) + '</div>';
      LEAREASE.agents.log('teacherAlert', (parentText ? 'Parent note generated' : 'Teacher alert generated'), s.name + ' — status ' + st.label + ' (' + Math.round(p * 100) + '% risk, demo).');
    });

    U.el('btn-alert-copy').addEventListener('click', () => {
      if (!lastAlert) { U.toast('Generate an alert first'); return; }
      U.copyText(lastAlert).then(() => U.toast('Alert copied 📋'));
    });

    function D_statusFor(p) { return LEAREASE.data.statusFor(p); }
    function weakestTopic(s) {
      let worst = null, wv = 101;
      LEAREASE.data.TOPICS.forEach((t) => { if (s.topicAcc[t] < wv) { wv = s.topicAcc[t]; worst = t; } });
      return worst;
    }
    function nextSteps(s) {
      const f = s.features, out = [];
      if (f.avgScore < 45) out.push('re-teach the last two topics in small-group time');
      if (f.completion < 0.75) out.push('shorten tasks and check in after each one');
      if (f.daysInactive >= 4) out.push('a quick welcome-back check-in today');
      if (f.retries >= 3) out.push('enable hints before retries in class mode');
      if (!out.length) out.push('keep current support in place and review next week');
      return out;
    }

    // Convenience: generate the reminder once so the section is never empty on first open
    U.el('btn-remind').click();
    U.el('btn-alert').click();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
