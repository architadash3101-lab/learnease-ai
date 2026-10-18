/* LearnEase AI — Teacher dashboard UI: summary, sortable/filterable table, detail panel, CSV */
(function () {
  const U = LEAREASE.util, D = LEAREASE.data;
  let sortKey = 'risk', sortDir = -1;
  let selectedId = null;
  let risks = {};   // id -> risk probability

  function computeRisks() {
    D.sampleClass.forEach((s) => {
      risks[s.id] = LEAREASE.data.latentRisk(s.features, s.group);
    });
  }

  // risk via trained model if available (models live in ui_models scope — recompute via latent + flag)
  function riskOf(s) {
    if (risks[s.id] != null) return risks[s.id];
    return D.latentRisk(s.features, s.group);
  }

  function init() {
    computeRisks();
    ['filter-status', 'filter-group'].forEach((id) => U.el(id).addEventListener('change', renderTable));
    U.el('search-name').addEventListener('input', renderTable);
    U.el('btn-csv').addEventListener('click', downloadCsv);
    document.querySelectorAll('#class-table th[data-sort]').forEach((th) =>
      th.addEventListener('click', () => {
        const k = th.dataset.sort;
        if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = -1; }
        renderTable();
      })
    );
    renderSummary();
    renderTable();
  }

  function filtered() {
    const fs = U.el('filter-status').value, fg = U.el('filter-group').value;
    const q = U.el('search-name').value.trim().toLowerCase();
    return D.sampleClass
      .map((s) => ({ s, p: riskOf(s), st: D.statusFor(riskOf(s)) }))
      .filter((o) => (fs === 'all' || (fs === 'high' && o.p >= 0.66) || (fs === 'mid' && o.p >= 0.33 && o.p < 0.66) || (fs === 'low' && o.p < 0.33)))
      .filter((o) => fg === 'all' || o.s.group === fg)
      .filter((o) => !q || o.s.name.toLowerCase().includes(q));
  }

  // sort rows by current key/direction
  function sortedRows(rows) {
    const k = sortKey;
    const dir = sortDir; // -1 desc, 1 asc
    const val = (o) => {
      switch (k) {
        case 'name': return o.s.name.toLowerCase();
        case 'grade': return o.s.grade;
        case 'group': return o.s.group;
        case 'avg': return o.s.features.avgScore;
        case 'trend': return o.s.features.trend;
        case 'completion': return o.s.features.completion;
        case 'inactive': return o.s.features.daysInactive;
        default: return o.p;
      }
    };
    return rows.slice().sort((a, b) => {
      const va = val(a), vb = val(b);
      const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return c * dir;
    });
  }

  function renderSummary() {
    const all = D.sampleClass.map((s) => ({ p: riskOf(s), st: D.statusFor(riskOf(s)) }));
    const n = all.length;
    const high = all.filter((o) => o.st.cls === 'risk-high').length;
    const mid = all.filter((o) => o.st.cls === 'risk-mid').length;
    const low = all.filter((o) => o.st.cls === 'risk-low').length;
    const avgScore = Math.round(D.sampleClass.reduce((a, s) => a + s.features.avgScore, 0) / n);
    const avgInactive = (D.sampleClass.reduce((a, s) => a + s.features.daysInactive, 0) / n).toFixed(1);
    U.el('class-summary').innerHTML = [
      { num: n, lbl: '👩‍🎓 Students (synthetic)', color: 'var(--ink)' },
      { num: low, lbl: '🟢 On track', color: 'var(--ok)' },
      { num: mid, lbl: '🟠 Watch', color: 'var(--warn)' },
      { num: high, lbl: '🔴 Needs support', color: 'var(--bad)' },
      { num: avgScore + '%', lbl: '📊 Class avg score', color: 'var(--accent)' },
      { num: avgInactive, lbl: '📅 Avg days inactive', color: 'var(--purple)' }
    ].map((k) => '<div class="kpi"><span class="num" style="color:' + k.color + '">' + k.num + '</span><span class="lbl">' + k.lbl + '</span></div>').join('');
  }

  function renderTable() {
    const rows = sortedRows(filtered());
    const tbody = U.el('class-table').querySelector('tbody');
    tbody.innerHTML = rows.length
      ? rows.map((o) => {
          const s = o.s;
          const sel = selectedId === s.id ? ' class="sel"' : '';
          const arrow = o.s.features.trend >= 0 ? '▲' : '▼';
          const trendColor = o.s.features.trend >= 0 ? 'var(--ok)' : 'var(--bad)';
          return '<tr data-id="' + s.id + '"' + sel + '>' +
            '<td><b>' + U.esc(s.name) + '</b></td>' +
            '<td>' + s.grade + '</td>' +
            '<td>' + s.group + '</td>' +
            '<td>' + Math.round(s.features.avgScore) + '%</td>' +
            '<td style="color:' + trendColor + '">' + arrow + ' ' + s.features.trend.toFixed(1) + '</td>' +
            '<td>' + Math.round(s.features.completion * 100) + '%</td>' +
            '<td>' + s.features.daysInactive + '</td>' +
            '<td>' + Math.round(o.p * 100) + '%</td>' +
            '<td><span class="chip ' + o.st.cls + '">' + o.st.label + '</span></td>' +
            '<td><canvas class="spark" data-spark="' + s.id + '"></canvas></td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="10" class="muted">No students match the filters.</td></tr>';

    tbody.querySelectorAll('tr[data-id]').forEach((tr) =>
      tr.addEventListener('click', () => {
        selectedId = tr.dataset.id;
        renderTable();
        renderDetail();
      })
    );
    // sparklines
    tbody.querySelectorAll('canvas[data-spark]').forEach((cv) => {
      const s = D.sampleClass.find((x) => x.id === cv.dataset.spark);
      LEAREASE.charts.sparkline(cv, s.quizScores, s.features.trend >= 0 ? 'var(--ok)' : 'var(--bad)');
    });
    // header sort arrows
    document.querySelectorAll('#class-table th[data-sort]').forEach((th) => {
      const base = th.textContent.replace(/[▲▼]\s*$/, '').trim();
      th.textContent = base + (th.dataset.sort === sortKey ? (sortDir === -1 ? ' ▼' : ' ▲') : '');
    });
  }

  function renderDetail() {
    if (!selectedId) return;
    const s = D.sampleClass.find((x) => x.id === selectedId);
    const p = riskOf(s), st = D.statusFor(p);
    const ta = D.TOPICS.map((t) => ({ t, v: s.topicAcc[t] }));
    U.el('student-detail').innerHTML =
      '<div class="row" style="justify-content:space-between;margin-bottom:8px">' +
        '<div><b style="font-size:1.05rem">' + U.esc(s.name) + '</b> <span class="muted small">Grade ' + s.grade + ' · ' + s.group + ' · id ' + s.id + ' (synthetic)</span></div>' +
        '<span class="chip ' + st.cls + '">' + st.label + ' · risk ' + Math.round(p * 100) + '%</span>' +
      '</div>' +
      '<div class="grid g2">' +
        '<div><h3 class="small" style="text-align:center">Quiz scores (last 8)</h3><canvas id="det-scores"></canvas></div>' +
        '<div><h3 class="small" style="text-align:center">Accuracy by topic</h3><canvas id="det-topics"></canvas></div>' +
      '</div>' +
      '<div class="stat-line" style="margin-top:10px">' +
        '<span>Avg score: <b>' + Math.round(s.features.avgScore) + '%</b></span>' +
        '<span>Trend: <b>' + s.features.trend.toFixed(1) + ' pts/wk</b></span>' +
        '<span>Time/question: <b>' + Math.round(s.features.timePerQ) + 's</b></span>' +
        '<span>Retries: <b>' + s.features.retries + '</b></span>' +
        '<span>Completion: <b>' + Math.round(s.features.completion * 100) + '%</b></span>' +
        '<span>Days inactive: <b>' + s.features.daysInactive + '</b></span>' +
      '</div>' +
      '<p class="muted small" style="margin-top:8px">Open the <b>🤖 Agents &amp; Alerts</b> tab to generate a Reminder message or a Teacher Alert for this student.</p>';

    LEAREASE.charts.line(U.el('det-scores'), [{ data: s.quizScores, color: 'var(--accent)', fill: true }], { ymin: 0, ymax: 100, xLabels: s.quizScores.map((_, i) => 'Q' + (i + 1)) });
    LEAREASE.charts.bars(U.el('det-topics'), ta.map((x) => ({ label: x.t.slice(0, 8), value: Math.round(x.v), color: 'var(--purple)' })), { ymax: 100 });
  }

  function downloadCsv() {
    const rows = sortedRows(filtered());
    const head = ['Student ID', 'Name', 'Grade', 'Group', 'Avg score %', 'Trend pts/week', 'Time per question s', 'Retries', 'Completion', 'Days inactive', 'Risk %', 'Status', 'Last 8 quiz scores'];
    const lines = [head.join(',')];
    rows.forEach((o) => {
      const s = o.s;
      lines.push([
        s.id, '"' + s.name + '"', s.grade, s.group, Math.round(s.features.avgScore),
        s.features.trend.toFixed(1), Math.round(s.features.timePerQ), s.features.retries,
        Math.round(s.features.completion * 100), s.features.daysInactive,
        Math.round(o.p * 100), '"' + o.st.label + '"', '"' + s.quizScores.map((v) => Math.round(v)).join('; ') + '"'
      ].join(','));
    });
    lines.push('');
    lines.push('# LearnEase AI class report — SYNTHETIC demo data, generated ' + new Date().toISOString().slice(0, 10));
    lines.push('# Risk scores are screening estimates, not diagnoses.');
    U.downloadText('learease-class-report.csv', lines.join('\n'));
    LEAREASE.agents.log('teacherAlert', 'Class report downloaded', rows.length + ' students exported as CSV (synthetic data).');
    U.toast('CSV downloaded ⬇️');
  }

  LEAREASE.ui = LEAREASE.ui || {};
  LEAREASE.ui.teacherInit = init;
  LEAREASE.ui.teacherRefresh = function () {
    renderSummary();
    renderTable();
    if (selectedId) renderDetail();
  };
})();
