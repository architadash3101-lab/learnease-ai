/* LearnEase AI — Gap Detector UI: training, model comparison, XAI, k-means, forecasting */
(function () {
  const U = LEAREASE.util, ML = LEAREASE.ml, D = LEAREASE.data;
  let models = {};          // {logreg, mlp, tree}
  let trained = false;
  let whatif = null;        // live feature overrides
  let sampleIdx = 0;        // sample student for gauge + contributions

  const accent = () => getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#4361ee';

  function init() {
    U.el('ds-size').textContent = D.students.length.toLocaleString();

    // axis selects
    const axisOpts = D.FEATURES.map((f) => '<option value="' + f.key + '">' + f.label + '</option>').join('');
    U.el('k-x').innerHTML = axisOpts;
    U.el('k-y').innerHTML = axisOpts;
    U.el('k-x').value = 'avgScore';
    U.el('k-y').value = 'timePerQ';

    // student selects (sample class for xai + forecast)
    const opts = D.sampleClass.map((s) => '<option value="' + s.id + '">' + s.name + ' (' + s.group + ')</option>').join('');
    U.el('xai-student').innerHTML = opts;
    U.el('fc-student').innerHTML = opts;
    sampleIdx = D.sampleClass.findIndex((s) => s.label === 1);
    if (sampleIdx < 0) sampleIdx = 0;
    U.el('xai-student').value = D.sampleClass[sampleIdx].id;

    U.el('btn-train-all').addEventListener('click', () => trainAll(true));
    U.el('btn-retrain').addEventListener('click', () => trainAll(true));
    U.el('xai-student').addEventListener('change', () => { whatif = null; renderXAI(); });
    U.el('xai-model').addEventListener('change', renderXAI);
    U.el('k-k').addEventListener('change', renderCluster);
    U.el('k-x').addEventListener('change', renderCluster);
    U.el('k-y').addEventListener('change', renderCluster);
    U.el('btn-cluster').addEventListener('click', renderCluster);
    U.el('fc-student').addEventListener('change', renderForecast);
    U.el('btn-whatif-reset').addEventListener('click', () => { whatif = null; renderXAI(); });
    U.el('btn-fairness').addEventListener('click', renderFairness);

    buildWhatifSliders();
    renderCluster();
    renderForecast();
    renderXAI();
    renderSdgCards();
    renderSampleRisk();
    // placeholders so nothing looks broken before training
    LEAREASE.charts.placeholder(U.el('chart-loss'), 'Loss curve appears during training');
    LEAREASE.charts.placeholder(U.el('chart-f1'), 'F1 comparison appears after training');
    LEAREASE.charts.placeholder(U.el('chart-roc'), 'ROC curve appears after training');
    LEAREASE.charts.placeholder(U.el('chart-cm'), 'Confusion matrix appears after training');
    U.el('model-table').querySelector('tbody').innerHTML =
      '<tr><td colspan="6" class="muted">Press “Train all models” to populate accuracy, precision, recall, F1 and AUC.</td></tr>';
  }

  /* ---------- training ---------- */
  function trainAll(userClick) {
    const frac = parseFloat(U.el('train-frac').value);
    const seed = Math.floor(Math.random() * 1e9);   // retrain uses a fresh split shuffle
    const X = D.students.map(D.featVec);
    const y = D.students.map((s) => s.label);
    const parts = ML.splitTrainTest(X, y, frac, seed);
    U.el('train-status').textContent = 'Training… logistic regression → neural network → decision tree (in your browser).';
    U.el('train-progress').style.width = '4%';

    let phase = 0;
    const phases = ['logistic regression', 'neural network', 'decision tree'];
    function setPhase(i) {
      phase = i;
      U.el('train-status').textContent = 'Training ' + phases[i] + '…';
    }

    let doneCount = 0;
    const total = 3;
    function finish() {
      doneCount++;
      U.el('train-progress').style.width = Math.round((doneCount / total) * 100) + '%';
    }

    // Train sequentially with async yields so the progress bar animates
    setPhase(0);
    setTimeout(() => {
      models.logreg = ML.trainLogistic(parts.Xtr, parts.ytr, {
        onProgress: (p, losses) => {
          U.el('train-progress').style.width = Math.round(((doneCount + p) / total) * 100) + '%';
          drawLoss(losses);
        }
      });
      finish();
      setPhase(1);
      setTimeout(() => {
        models.mlp = ML.trainMLP(parts.Xtr, parts.ytr, {
          onProgress: (p, losses) => {
            U.el('train-progress').style.width = Math.round(((doneCount + p) / total) * 100) + '%';
            drawLoss(losses);
          }
        });
        finish();
        setPhase(2);
        setTimeout(() => {
          models.tree = ML.trainTree(parts.Xtr, parts.ytr, { onProgress: () => {} });
          finish();
          trained = true;
          drawLoss(models.mlp.losses.slice(-120).length ? models.mlp.losses : models.logreg.losses);
          renderModelTable(parts);
          renderRocChart();
          renderSampleRisk();
          renderXAI();
          LEAREASE.agents.log('gap', 'Models trained', 'LogReg / MLP / Decision Tree trained on ' + D.students.length.toLocaleString() + ' synthetic students (' + Math.round(frac * 100) + '/' + Math.round((1 - frac) * 100) + ' split).');
          LEAREASE.agents.log('teacherAlert', 'Class risk refreshed', 'Sample class risk scores recomputed with the trained model.');
          if (LEAREASE.ui.teacherRefresh) LEAREASE.ui.teacherRefresh();
          U.toast('Models trained! 🎉');
        }, 30);
      }, 30);
    }, 30);
  }

  function drawLoss(losses) {
    if (!losses || !losses.length) return;
    const max = Math.max(...losses), min = Math.min(...losses);
    LEAREASE.charts.line(U.el('chart-loss'),
      [{ data: losses, color: accent(), fill: true }],
      { ymin: Math.max(0, min * 0.95), ymax: max * 1.02, xLabels: losses.map((_, i) => (i + 1)) }
    );
  }

  function evalModel(model, parts) {
    const probs = parts.Xte.map((x) => model.predictOne(x));
    const m = ML.metrics(parts.yte, probs);
    const roc = ML.rocAuc(parts.yte, probs);
    return { ...m, auc: roc.auc, roc, probs };
  }

  let lastEvals = null;
  function renderModelTable(parts) {
    const evals = {};
    ['logreg', 'mlp', 'tree'].forEach((k) => (evals[k] = evalModel(models[k], parts)));
    lastEvals = evals;
    const rows = ['logreg', 'mlp', 'tree'].map((k) => {
      const e = evals[k];
      return '<tr><td><b>' + models[k].name + '</b></td><td>' + (e.acc * 100).toFixed(1) + '%</td><td>' +
        (e.prec * 100).toFixed(1) + '%</td><td>' + (e.rec * 100).toFixed(1) + '%</td><td><b>' +
        (e.f1 * 100).toFixed(1) + '%</b></td><td>' + e.auc.toFixed(3) + '</td></tr>';
    }).join('');
    U.el('model-table').querySelector('tbody').innerHTML = rows;
    // F1 bar chart
    LEAREASE.charts.bars(U.el('chart-f1'),
      ['logreg', 'mlp', 'tree'].map((k) => ({ label: models[k].name.split(' ')[0], value: evals[k].f1 * 100, color: accent() })),
      { ymax: 100, fmt: (v) => v.toFixed(1) + '%' });
  }

  function renderRocChart() {
    if (!lastEvals) return;
    const rocEl = U.el('chart-roc');
    // draw best model's ROC (fallback: logistic)
    const key = lastEvals.tree && lastEvals.tree.auc >= lastEvals.logreg.auc && lastEvals.tree.auc >= lastEvals.mlp.auc ? 'tree'
      : lastEvals.mlp.auc >= lastEvals.logreg.auc ? 'mlp' : 'logreg';
    const roc = lastEvals[key].roc;
    const cm = lastEvals[key].cm;
    LEAREASE.charts.roc(rocEl, roc, accent());
    LEAREASE.charts.confusion(U.el('chart-cm'), cm);
  }

  function renderSampleRisk() {
    if (!models.logreg) return;
    const s = D.sampleClass[sampleIdx];
    const p = predictStudent(s);
    const st = D.statusFor(p);
    U.el('model-sample-note').innerHTML = s.name + ' (' + s.group + ') — prediction: <b class="' + st.cls + '">' + st.label + '</b> · model: ' + bestModel().name + ' · synthetic demo data';
    LEAREASE.charts.gauge(U.el('chart-sample-risk'), p, { label: 'risk of falling behind' });
  }

  function bestModel() {
    if (models.mlp && models.tree && lastEvals) {
      const k = lastEvals.tree.f1 >= lastEvals.mlp.f1 && lastEvals.tree.f1 >= lastEvals.logreg.f1 ? 'tree'
        : lastEvals.mlp.f1 >= lastEvals.logreg.f1 ? 'mlp' : 'logreg';
      return models[k];
    }
    return models.logreg || null;
  }

  // effective features for a student (with what-if overrides)
  function effFeatures(s) {
    return Object.assign({}, s.features, whatif || {});
  }
  function predictStudent(s) {
    if (trained && bestModel()) return bestModel().predictOne(D.featVec(effFeatures(s)));
    return D.latentRisk(effFeatures(s), s.group);
  }

  /* ---------- dataset preview (features described in intro) ---------- */

  /* ---------- XAI ---------- */
  function renderXAI() {
    const s = D.sampleClass[U.el('xai-student').selectedIndex];
    const model = bestModel();
    const f = effFeatures(s);
    const p = predictStudent(s);
    const st = D.statusFor(p);

    // contributions
    let contribs;
    if (trained && model) contribs = model.contributions(D.featVec(f));
    else contribs = D.FEATURES.map((fd) => ({ label: fd.label, value: heuristicContrib(fd, f) }));

    const maxAbs = Math.max(0.02, ...contribs.map((c) => Math.abs(c.value)));
    U.el('xai-factors').innerHTML = contribs.map((c) => {
      const w = (Math.abs(c.value) / maxAbs) * 100;
      const neg = c.value < 0;
      return '<div class="factor-row">' +
        '<div class="f-label">' + U.esc(c.label) + '</div>' +
        '<div class="factor-bar-wrap"><div class="factor-bar" style="width:' + w + '%;background:' + (neg ? 'var(--ok)' : 'var(--bad)') + '"></div></div>' +
        '<div class="factor-val">' + (neg ? '↓' : '↑') + '</div>' +
      '</div>';
    }).join('') +
    '<p class="muted small">↑ pushes risk up · ↓ pushes risk down (SHAP-style contribution bars, demo model)</p>';

    // what-if risk readout
    const live = U.el('whatif-risk');
    live.innerHTML = 'Live risk: <span class="' + st.cls + '">' + Math.round(p * 100) + '% — ' + st.label + '</span>' + (trained ? '' : ' <span class="muted small">(built-in latent model — train for ML prediction)</span>');
    updateWhatifSliderValues(f);

    // plain-language explanation
    const top = contribs.slice().sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 3)
      .filter((c) => Math.abs(c.value) > maxAbs * 0.12);
    const drivers = top.length
      ? top.map((c) => (c.value < 0 ? 'a protective factor — ' : 'a risk factor — ') + c.label.toLowerCase()).join('; ')
      : 'no single factor dominates — the risk comes from the overall pattern';
    U.el('xai-explain').innerHTML =
      '<b>Why this prediction?</b> For ' + s.name + ', the model gives a risk of <b>' + Math.round(p * 100) + '%</b> (' + st.label + '). ' +
      'The biggest drivers are: ' + drivers + '. ' +
      'This is a screening signal, not a diagnosis — please pair it with teacher judgement.';
  }

  function heuristicContrib(fd, f) {
    const v = f[fd.key];
    if (fd.key === 'avgScore') return (70 - v) * 0.008;
    if (fd.key === 'trend') return -v * 0.01;
    if (fd.key === 'timePerQ') return (v - 30) * 0.004;
    if (fd.key === 'retries') return v * 0.012;
    if (fd.key === 'completion') return (0.82 - v) * 0.12;
    if (fd.key === 'daysInactive') return v * 0.006;
    return 0;
  }

  function buildWhatifSliders() {
    const grid = U.el('whatif-sliders');
    grid.innerHTML = D.FEATURES.map((f) =>
      '<div><label for="wi-' + f.key + '">' + f.label + ': <span class="val" id="wiv-' + f.key + '">–</span></label>' +
      '<input type="range" id="wi-' + f.key + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" /></div>'
    ).join('');
    D.FEATURES.forEach((f) => {
      U.el('wi-' + f.key).addEventListener('input', (e) => {
        if (!whatif) whatif = {};
        whatif[f.key] = parseFloat(e.target.value);
        U.el('wiv-' + f.key).textContent = whatif[f.key];
        renderXAI();
      });
    });
  }
  function updateWhatifSliderValues(f) {
    D.FEATURES.forEach((fd) => {
      const v = whatif && whatif[fd.key] !== undefined ? whatif[fd.key] : f[fd.key];
      const sl = U.el('wi-' + fd.key);
      if (sl && document.activeElement !== sl) sl.value = v;
      U.el('wiv-' + fd.key).textContent = (fd.key === 'completion' ? Math.round(v * 100) + '%' : fd.key === 'trend' ? Number(v).toFixed(1) : Math.round(v));
    });
  }

  /* ---------- k-means clustering ---------- */
  function renderCluster() {
    const k = parseInt(U.el('k-k').value);
    const xk = U.el('k-x').value, yk = U.el('k-y').value;
    const X = D.sampleClass.map(D.featVec);
    const km = ML.kmeans(X, k, 12345);
    const xIdx = D.FEATURES.findIndex((f) => f.key === xk);
    const yIdx = D.FEATURES.findIndex((f) => f.key === yk);
    const points = D.sampleClass.map((s, i) => ({ x: s.features[xk], y: s.features[yk], c: km.assign[i], name: s.name }));

    LEAREASE.charts.scatter(U.el('chart-cluster'), points, { xlabel: D.FEATURES[xIdx].label, ylabel: D.FEATURES[yIdx].label });

    // named profiles + strategies
    const PROFILE_NAMES = [
      { name: '🌟 Steady All-Rounders', strat: 'Keep momentum with weekly challenge quizzes; stretch with extension tasks.' },
      { name: '🐢 Slow-but-Careful Workers', strat: 'Allow extra time and untimed practice; praise accuracy, build speed gradually.' },
      { name: '⚡ Fast-but-Erratic (likely ADHD pattern)', strat: 'Short timed bursts, movement breaks, one instruction at a time.' },
      { name: '🎯 Struggling & Disengaged', strat: 'Rebuild basics with Tutor-mode simplified lessons; small wins daily; check for learning-gap causes.' },
      { name: '📖 Support-Needed Readers', strat: 'Dyslexia display mode, read-aloud, phonics revision before new material.' }
    ];
    const groups = [];
    for (let c = 0; c < k; c++) {
      const mem = D.sampleClass.filter((_, i) => km.assign[i] === c);
      if (!mem.length) continue;
      const avg = {};
      D.FEATURES.forEach((f) => (avg[f.key] = mem.reduce((a, s) => a + s.features[f.key], 0) / mem.length));
      groups.push({ c, n: mem.length, avg });
    }
    // order clusters by avg score so names are stable across k
    groups.sort((a, b) => b.avg.avgScore - a.avg.avgScore);
    U.el('cluster-profiles').innerHTML = groups.map((g, gi) => {
      const p = PROFILE_NAMES[Math.min(gi, PROFILE_NAMES.length - 1)];
      return '<div class="step-item" style="margin-top:10px"><b>' + p.name + '</b> <span class="muted small">(' + g.n + ' of ' + D.sampleClass.length + ' students)</span><br/>' +
        '<span class="small">Avg score ' + Math.round(g.avg.avgScore) + '% · trend ' + g.avg.trend.toFixed(1) + ' pts/wk · time/question ' + Math.round(g.avg.timePerQ) + 's · completion ' + Math.round(g.avg.completion * 100) + '%</span><br/>' +
        '<b class="small" style="color:var(--accent)">Suggested strategy: </b><span class="small">' + p.strat + '</span></div>';
    }).join('');

    LEAREASE.agents.log && !U.el('tab-gap').hidden && LEAREASE.agents.log('gap', 'k-means clustering run', 'k=' + k + ' learning profiles on the sample class; axes: ' + D.FEATURES[xIdx].label + ' vs ' + D.FEATURES[yIdx].label + '.');
  }

  /* ---------- forecasting ---------- */
  function renderForecast() {
    const s = D.sampleClass[U.el('fc-student').selectedIndex];
    const hist = s.quizScores;
    // simple trend + damping forecast (estimate)
    const n = hist.length;
    const xs = Array.from({ length: n }, (_, i) => i + 1);
    const meanX = (n + 1) / 2, meanY = hist.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    hist.forEach((v, i) => { num += (xs[i] - meanX) * (v - meanY); den += (xs[i] - meanX) ** 2; });
    const slope = den ? num / den : 0;
    const damped = slope * 0.6;   // damp the trend (scores regress to the mean)
    const fc = Array.from({ length: 4 }, (_, i) => U.clamp(meanY + damped * (n + i + 1 - meanX), 5, 100));

    LEAREASE.charts.line(U.el('chart-forecast'), [
      { data: hist.concat(fc), color: accent(), fill: false },
      { data: new Array(n - 1).fill(null).concat([hist[n - 1]]).concat(fc).map((v) => (v == null ? NaN : v)), color: 'var(--warn)' }
    ], { ymin: 0, ymax: 100, xLabels: ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','F1','F2','F3','F4'] });

    const dir = damped >= 0 ? 'improving' : 'declining';
    const band = Math.max(4, 14 - n);
    U.el('forecast-notes').innerHTML =
      '<p class="small">Forecast for <b>' + s.name + '</b>: next 4 quiz scores ≈ <b>' + fc.map((v) => Math.round(v)).join(', ') + '</b> — the trend is <b>' + dir + '</b> (' + (damped >= 0 ? '+' : '') + damped.toFixed(1) + ' pts/quiz, damped towards the mean), with a ±' + Math.round(band) + ' pt uncertainty band (estimate).</p>' +
      '<p class="small">💡 ' + (damped < -0.5
        ? 'The forecast is declining — the Teacher Alert Agent suggests a check-in and revision of the weakest topic with Tutor-mode notes.'
        : 'The forecast is steady or improving — keep the current routine and add one challenge topic per week.') + '</p>' +
      '<p class="muted small">Method: least-squares trend with damping + mean reversion on synthetic data (estimate, not a guarantee).</p>';

    LEAREASE.agents.log('gap', 'Progress forecast', s.name + ': next 4 quiz scores ≈ ' + fc.map((v) => Math.round(v)).join(', ') + '.');
  }

  /* ---------- fairness ---------- */
  function renderFairness() {
    const preds = D.students.map((s) => predictStudent(s));
    const rows = D.GROUPS.map((g) => {
      const idxs = D.students.map((s, i) => ({ s, i })).filter((o) => o.s.group === g);
      const n = idxs.length;
      const pos = idxs.filter((o) => o.s.label === 1).length;
      const tp = idxs.filter((o) => o.s.label === 1 && preds[o.i] >= 0.5).length;
      const recall = pos ? tp / pos : 0;
      const avgRisk = idxs.reduce((a, o) => a + preds[o.i], 0) / n;
      return { group: g, n, recall, avgRisk, fnr: 1 - recall };
    });
    const overallFnr = 1 - rows.reduce((a, r) => a + r.recall * r.n, 0) / rows.reduce((a, r) => a + r.n, 0);
    const flagged = rows.filter((r) => Math.abs(r.fnr - overallFnr) > 0.10);
    U.el('fairness-out').innerHTML =
      '<div class="table-wrap"><table><thead><tr><th class="nosort">Group</th><th class="nosort">n</th><th class="nosort">Recall</th><th class="nosort">False-neg rate</th><th class="nosort">Avg predicted risk</th><th class="nosort">Flag</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td>' + r.group + '</td><td>' + r.n + '</td><td>' + (r.recall * 100).toFixed(1) + '%</td><td>' + (r.fnr * 100).toFixed(1) + '%</td><td>' + (r.avgRisk * 100).toFixed(1) + '%</td><td>' +
        (Math.abs(r.fnr - overallFnr) > 0.10 ? '<span class="chip risk-high">Check</span>' : '<span class="chip risk-low">OK</span>') + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<p class="small" style="margin-top:8px">Overall false-negative rate: <b>' + (overallFnr * 100).toFixed(1) + '%</b>. ' +
      (flagged.length
        ? '⚠️ Flagged groups (false-negative rate differs by >10 pts): <b>' + flagged.map((f) => f.group).join(', ') + '</b> — in production, rebalance training data and re-check.'
        : '✅ No group differs from the overall false-negative rate by more than 10 percentage points in this synthetic demo.') +
      ' <span class="muted">(computed live on the synthetic dataset with the current model)</span></p>';
    LEAREASE.agents.log('gap', 'Fairness check run', 'Recall & false-negative rate compared across ' + D.GROUPS.length + ' learner groups.');
  }

  /* ---------- SDG cards ---------- */
  function renderSdgCards() {
    const cards = [
      { icon: '📖', t: '4.1 · Learning outcomes', d: 'ESTIMATE: adaptive practice with instant feedback can lift quiz accuracy by ~15–25% over a term for supported learners (synthetic demo projection).' },
      { icon: '♿', t: '4.5 · Equity & inclusion', d: 'ESTIMATE: 100% of learners get support modes (dyslexia, dyscalculia, ADHD) and home-language notes — removing the wait for specialist staff.' },
      { icon: '🧑‍🏫', t: '4.c · Qualified teachers', d: 'ESTIMATE: early gap alerts can cut teacher diagnosis time from weeks to days, letting one coordinator support ~3× more students (synthetic demo projection).' },
      { icon: '🔍', t: '4.4 · Skills for life', d: 'ESTIMATE: plain-language explanations and read-aloud build independent study skills, not dependence on the tool.' },
      { icon: '📊', t: '4.1.1 · Monitoring', d: 'ESTIMATE: continuous, low-stakes monitoring replaces one-shot testing — every score feeds the gap detector in real time.' }
    ];
    U.el('sdg-cards').innerHTML = cards.map((c) =>
      '<div class="card" style="box-shadow:none;border:2px solid var(--grid)"><h3>' + c.icon + ' ' + c.t + '</h3><p class="small">' + c.d + '</p></div>'
    ).join('');
  }

  LEAREASE.ui = LEAREASE.ui || {};
  LEAREASE.ui.modelsInit = init;
  LEAREASE.ui.redrawAll = function () {
    if (trained && models.mlp) drawLoss(models.mlp.losses);
    if (lastEvals) { renderRocChart(); }
    renderCluster();
    renderSampleRisk();
  };
})();
