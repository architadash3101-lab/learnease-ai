/* LearnEase AI — in-browser machine learning models (no dependencies).
   Logistic regression (batch GD), small MLP (1 hidden layer), decision tree (CART-style),
   plus shared metrics: accuracy, precision, recall, F1, confusion matrix, ROC/AUC. */
(function () {
  const U = LEAREASE.util;
  const M = (LEAREASE.ml = {});

  function standardize(X) {
    const d = X[0].length, mu = [], sd = [];
    for (let j = 0; j < d; j++) {
      let s = 0;
      for (let i = 0; i < X.length; i++) s += X[i][j];
      mu.push(s / X.length);
      let v = 0;
      for (let i = 0; i < X.length; i++) v += (X[i][j] - mu[j]) ** 2;
      sd.push(Math.sqrt(v / X.length) || 1);
    }
    return { mu, sd, apply: (x) => x.map((v, j) => (v - mu[j]) / sd[j]) };
  }

  function splitTrainTest(X, y, frac, seed) {
    const rng = U.makeRng(seed);
    const idx = X.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const nTr = Math.floor(X.length * frac);
    const tr = idx.slice(0, nTr), te = idx.slice(nTr);
    return {
      Xtr: tr.map((i) => X[i]), ytr: tr.map((i) => y[i]),
      Xte: te.map((i) => X[i]), yte: te.map((i) => y[i])
    };
  }
  M.splitTrainTest = splitTrainTest;

  function metrics(yTrue, probs, threshold = 0.5) {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    yTrue.forEach((y, i) => {
      const p = probs[i] >= threshold ? 1 : 0;
      if (y === 1 && p === 1) tp++; else if (y === 0 && p === 1) fp++;
      else if (y === 0 && p === 0) tn++; else fn++;
    });
    const acc = (tp + tn) / Math.max(1, yTrue.length);
    const prec = tp / Math.max(1, tp + fp);
    const rec = tp / Math.max(1, tp + fn);
    const f1 = prec + rec === 0 ? 0 : (2 * prec * rec) / (prec + rec);
    return { acc, prec, rec, f1, cm: [[tn, fp], [fn, tp]] };
  }
  M.metrics = metrics;

  function rocAuc(yTrue, probs) {
    const pairs = yTrue.map((y, i) => ({ y, p: probs[i] })).sort((a, b) => b.p - a.p);
    let tp = 0, fp = 0, tpr = [0], fpr = [0];
    const P = yTrue.reduce((a, b) => a + b, 0), N = yTrue.length - P;
    pairs.forEach((o) => {
      if (o.y === 1) tp++; else fp++;
      tpr.push(P ? tp / P : 0); fpr.push(N ? fp / N : 0);
    });
    let auc = 0;
    for (let i = 1; i < tpr.length; i++) auc += (fpr[i] - fpr[i - 1]) * ((tpr[i] + tpr[i - 1]) / 2);
    return { tpr, fpr, auc };
  }
  M.rocAuc = rocAuc;

  /* ---------- Logistic regression (batch gradient descent) ---------- */
  function trainLogistic(Xtr, ytr, opts) {
    const o = Object.assign({ epochs: 160, lr: 0.25, l2: 0.001, onProgress: null }, opts);
    const norm = standardize(Xtr);
    const X = Xtr.map(norm.apply);
    const d = X[0].length;
    let w = new Array(d).fill(0), b = 0;
    const n = X.length, losses = [];
    for (let e = 1; e <= o.epochs; e++) {
      const gw = new Array(d).fill(0);
      let gb = 0, loss = 0;
      for (let i = 0; i < n; i++) {
        let z = b;
        for (let j = 0; j < d; j++) z += w[j] * X[i][j];
        const p = U.sigmoid(z), err = p - ytr[i];
        loss += -(ytr[i] * Math.log(p + 1e-9) + (1 - ytr[i]) * Math.log(1 - p + 1e-9));
        for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
        gb += err;
      }
      for (let j = 0; j < d; j++) w[j] -= o.lr * (gw[j] / n + o.l2 * w[j]);
      b -= o.lr * (gb / n);
      losses.push(loss / n);
      if (o.onProgress && e % 8 === 0) o.onProgress(e / o.epochs, losses.slice());
    }
    return {
      name: 'Logistic Regression', kind: 'logreg', norm, w, b, losses,
      predictOne: (xRaw) => {
        const x = norm.apply(xRaw);
        let z = b;
        for (let j = 0; j < x.length; j++) z += w[j] * x[j];
        return U.sigmoid(z);
      },
      // contribution of each raw feature to the log-odds (standardized weight × z-score)
      contributions: (xRaw) => {
        const x = norm.apply(xRaw);
        return x.map((zv, j) => ({ key: LEAREASE.data.FEATURES[j].key, label: LEAREASE.data.FEATURES[j].label, value: w[j] * zv }));
      }
    };
  }
  M.trainLogistic = trainLogistic;

  /* ---------- Small MLP: input → 6 tanh → 1 sigmoid ---------- */
  function trainMLP(Xtr, ytr, opts) {
    const o = Object.assign({ epochs: 220, lr: 0.35, hidden: 6, onProgress: null }, opts);
    const norm = standardize(Xtr);
    const X = Xtr.map(norm.apply);
    const d = X[0].length, H = o.hidden;
    const rng = U.makeRng(42);
    let W1 = Array.from({ length: H }, () => Array.from({ length: d }, () => rng.normal(0, 0.5)));
    let b1 = new Array(H).fill(0);
    let W2 = Array.from({ length: H }, () => rng.normal(0, 0.5));
    let b2 = 0;
    const n = X.length, losses = [];
    const tanh = Math.tanh;
    const forward = (x) => {
      const h = new Array(H);
      for (let k = 0; k < H; k++) {
        let s = b1[k];
        for (let j = 0; j < d; j++) s += W1[k][j] * x[j];
        h[k] = tanh(s);
      }
      let z = b2;
      for (let k = 0; k < H; k++) z += W2[k] * h[k];
      return { h, p: U.sigmoid(z) };
    };
    for (let e = 1; e <= o.epochs; e++) {
      let loss = 0;
      const gW1 = Array.from({ length: H }, () => new Array(d).fill(0));
      const gb1 = new Array(H).fill(0);
      const gW2 = new Array(H).fill(0);
      let gb2 = 0;
      for (let i = 0; i < n; i++) {
        const { h, p } = forward(X[i]);
        const err = p - ytr[i];
        loss += -(ytr[i] * Math.log(p + 1e-9) + (1 - ytr[i]) * Math.log(1 - p + 1e-9));
        const dz = err;
        for (let k = 0; k < H; k++) {
          gW2[k] += dz * h[k];
          const dh = dz * W2[k] * (1 - h[k] * h[k]);
          gb1[k] += dh;
          for (let j = 0; j < d; j++) gW1[k][j] += dh * X[i][j];
        }
        gb2 += dz;
      }
      for (let k = 0; k < H; k++) {
        W2[k] -= o.lr * gW2[k] / n;
        b1[k] -= o.lr * gb1[k] / n;
        for (let j = 0; j < d; j++) W1[k][j] -= o.lr * gW1[k][j] / n;
      }
      b2 -= o.lr * gb2 / n;
      losses.push(loss / n);
      if (o.onProgress && e % 11 === 0) o.onProgress(e / o.epochs, losses.slice());
    }
    return {
      name: 'Neural Network (6-unit MLP)', kind: 'mlp', norm, losses,
      predictOne: (xRaw) => forward(norm.apply(xRaw)).p,
      contributions: (xRaw) => {
        const x = norm.apply(xRaw);
        return x.map((zv, j) => {
          let s = 0;
          for (let k = 0; k < H; k++) s += W2[k] * (1 - Math.tanh(b1[k])**2) * W1[k][j];
          return { key: LEAREASE.data.FEATURES[j].key, label: LEAREASE.data.FEATURES[j].label, value: s * zv };
        });
      }
    };
  }
  M.trainMLP = trainMLP;

  /* ---------- Decision tree (CART, depth-limited, Gini) ---------- */
  function trainTree(Xtr, ytr, opts) {
    const o = Object.assign({ maxDepth: 4, minLeaf: 12, onProgress: null }, opts);
    const feats = LEAREASE.data.FEATURES;
    let nodes = 0;
    function gini(pos, tot) { const p = pos / Math.max(1, tot); return 2 * p * (1 - p); }
    function build(Xi, yi, depth, path) {
      nodes++;
      const tot = yi.length, pos = yi.reduce((a, b) => a + b, 0);
      const leaf = { leaf: true, p: pos / tot, n: tot, path };
      if (depth >= o.maxDepth || tot < 2 * o.minLeaf || pos === 0 || pos === tot) return leaf;
      let best = null;
      for (let j = 0; j < feats.length; j++) {
        const vals = Xi.map((r) => r[j]);
        const sorted = [...vals].sort((a, b) => a - b);
        const cand = [];
        for (let q = 1; q < 8; q++) cand.push(sorted[Math.floor((q / 8) * (sorted.length - 1))]);
        for (const t of cand) {
          let lp = 0, lt = 0, rp = 0, rt = 0;
          for (let i = 0; i < tot; i++) {
            if (vals[i] <= t) { lt++; lp += yi[i]; } else { rt++; rp += yi[i]; }
          }
          if (lt < o.minLeaf || rt < o.minLeaf) continue;
          const g = (lt / tot) * gini(lp, lt) + (rt / tot) * gini(rp, rt);
          if (!best || g < best.g) best = { g, j, t };
        }
      }
      if (!best) return leaf;
      const Xl = [], yl = [], Xr = [], yr = [];
      for (let i = 0; i < tot; i++) {
        if (Xi[i][best.j] <= best.t) { Xl.push(Xi[i]); yl.push(yi[i]); }
        else { Xr.push(Xi[i]); yr.push(yi[i]); }
      }
      const f = feats[best.j];
      return {
        leaf: false, featIdx: best.j, featLabel: f.label, thr: best.t,
        left: build(Xl, yl, depth + 1, path.concat([f.label + ' ≤ ' + best.t])),
        right: build(Xr, yr, depth + 1, path.concat([f.label + ' > ' + best.t]))
      };
    }
    const tree = build(Xtr, ytr, 0, []);
    if (o.onProgress) o.onProgress(1, []);
    return {
      name: 'Decision Tree (depth 4)', kind: 'tree', tree,
      losses: [],
      predictOne: (x) => {
        let nd = tree;
        while (!nd.leaf) nd = x[nd.featIdx] <= nd.thr ? nd.left : nd.right;
        return nd.p;
      },
      contributions: (x) => {
        // walk path; features whose test was satisfied push risk up/down
        const contribs = LEAREASE.data.FEATURES.map((f, j) => ({ key: f.key, label: f.label, value: 0 }));
        let nd = tree;
        while (!nd.leaf) {
          const goLeft = x[nd.featIdx] <= nd.thr;
          const branch = goLeft ? nd.left : nd.right;
          const sib = goLeft ? nd.right : nd.left;
          contribs[nd.featIdx].value += (branch.p - sib.p) * 0.8;
          nd = branch;
        }
        return contribs;
      }
    };
  }
  M.trainTree = trainTree;

  /* ---------- k-means (learning profiles) ---------- */
  function kmeans(X, k, seed, iters = 30) {
    const norm = standardize(X);
    const Z = X.map(norm.apply);
    let best = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const rng = U.makeRng(seed + attempt * 101);
      let cent = Array.from({ length: k }, () => Z[Math.floor(rng.next() * Z.length)].slice());
      let assign = new Array(Z.length).fill(0);
      for (let it = 0; it < iters; it++) {
        let moved = false;
        Z.forEach((z, i) => {
          let bi = 0, bd = Infinity;
          cent.forEach((c, ci) => {
            let d2 = 0;
            for (let j = 0; j < z.length; j++) d2 += (z[j] - c[j]) ** 2;
            if (d2 < bd) { bd = d2; bi = ci; }
          });
          if (assign[i] !== bi) moved = true;
          assign[i] = bi;
        });
        const d = Z[0].length;
        cent = cent.map((c, ci) => {
          const mem = Z.filter((_, i) => assign[i] === ci);
          if (!mem.length) return c;
          const nc = new Array(d).fill(0);
          mem.forEach((z) => z.forEach((v, j) => (nc[j] += v)));
          return nc.map((v) => v / mem.length);
        });
        if (!moved && it > 2) break;
      }
      const counts = new Array(k).fill(0);
      assign.forEach((a) => counts[a]++);
      const result = { assign, centroids: cent, norm };
      if (counts.every((c) => c > 0)) return result;   // all clusters populated — done
      if (!best) best = result;                        // fallback if every attempt has an empty cluster
    }
    return best;
  }
  M.kmeans = kmeans;
})();
