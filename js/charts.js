/* LearnEase AI — lightweight Canvas/SVG charts (no dependencies).
   line, bar, grouped bar, donut/gauge, confusion matrix, ROC curve, scatter (k-means), sparkline. */
(function () {
  const U = LEAREASE.util;
  const C = (LEAREASE.charts = {});

  const cssVar = (name, fallback) => {
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fallback;
  };
  function colors() {
    return {
      ink: cssVar('--ink', '#1e2a3a'),
      dim: cssVar('--dim', '#5a6b7f'),
      grid: cssVar('--grid', '#e3e9f1'),
      accent: cssVar('--accent', '#4361ee'),
      green: cssVar('--ok', '#2a9d64'),
      orange: cssVar('--warn', '#e08a1e'),
      red: cssVar('--bad', '#d64550'),
      purple: cssVar('--purple', '#7c4dbe'),
      teal: cssVar('--teal', '#128d8d')
    };
  }

  function resolve(color, fallback) {
    if (color && color.indexOf('var(') === 0) {
      return cssVar(color.slice(4, -1).trim(), fallback || '#4361ee');
    }
    return color || fallback;
  }

  function prep(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(80, rect.width), h = Math.max(60, rect.height);
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function axisFrame(ctx, w, h, pad, ymax, yLabelFmt) {
    const c = colors();
    ctx.strokeStyle = c.grid; ctx.fillStyle = c.dim;
    ctx.font = '10px system-ui, sans-serif'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + ((h - pad.t - pad.b) * g) / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      const val = ymax - (ymax * g) / 4;
      ctx.fillText(yLabelFmt ? yLabelFmt(val) : Math.round(val), 4, y + 3);
    }
  }

  C.line = function (canvas, series, opts) {
    if (!canvas) return;
    const o = Object.assign({ ymin: 0, ymax: 100, xLabels: null }, opts);
    const { ctx, w, h } = prep(canvas);
    const c = colors();
    const pad = { l: 30, r: 10, t: 12, b: o.xLabels ? 22 : 10 };
    axisFrame(ctx, w, h, pad, o.ymax, o.yFmt);
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    series.forEach((s, si) => {
      const n = s.data.length;
      if (!n) return;
      const hasGap = s.data.some((v) => v == null || (typeof v === 'number' && !isFinite(v)));
      const px = (i) => pad.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
      const py = (v) => pad.t + ih - ((v - o.ymin) / (o.ymax - o.ymin)) * ih;
      const col = resolve(s.color, c.accent);
      if (s.dash) ctx.setLineDash(s.dash);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2; ctx.beginPath();
      let started = false;
      s.data.forEach((v, i) => {
        if (v == null || (typeof v === 'number' && !isFinite(v))) { started = false; return; }
        if (!started) { ctx.moveTo(px(i), py(v)); started = true; }
        else ctx.lineTo(px(i), py(v));
      });
      ctx.stroke();
      ctx.setLineDash([]);
      if (s.fill && !hasGap) {
        ctx.lineTo(px(n - 1), pad.t + ih); ctx.lineTo(px(0), pad.t + ih); ctx.closePath();
        ctx.fillStyle = col + '22'; ctx.fill();
      }
      if (n <= 14) {
        s.data.forEach((v, i) => {
          if (v == null || (typeof v === 'number' && !isFinite(v))) return;
          ctx.beginPath(); ctx.arc(px(i), py(v), 3, 0, 7);
          ctx.fillStyle = col; ctx.fill();
        });
      }
    });
    if (o.xLabels) {
      ctx.fillStyle = c.dim; ctx.font = '10px system-ui, sans-serif';
      const step = Math.ceil(o.xLabels.length / 6);
      o.xLabels.forEach((lb, i) => {
        if (i % step === 0 || i === o.xLabels.length - 1) {
          const x = pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, o.xLabels.length - 1);
          ctx.fillText(lb, Math.min(x - 8, w - pad.r - 20), h - 6);
        }
      });
    }
  };

  C.bars = function (canvas, items, opts) {
    // items: [{label, value, color}]
    if (!canvas) return;
    const o = Object.assign({ ymax: null, horizontal: false }, opts);
    const { ctx, w, h } = prep(canvas);
    const c = colors();
    const pad = o.horizontal ? { l: 150, r: 34, t: 8, b: 8 } : { l: 30, r: 8, t: 12, b: 30 };
    const ymax = o.ymax || Math.max(1, ...items.map((i) => i.value)) * 1.15;
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const n = items.length;
    items.forEach((it, i) => {
      const col = resolve(it.color, c.accent);
      if (o.horizontal) {
        const bh = Math.min(24, (ih / n) * 0.62);
        const y = pad.t + (i * ih) / n + (ih / n - bh) / 2;
        const bw = (it.value / ymax) * iw;
        ctx.fillStyle = col; ctx.fillRect(pad.l, y, bw, bh);
        ctx.fillStyle = c.dim; ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        const lab = it.label.length > 26 ? it.label.slice(0, 25) + '…' : it.label;
        ctx.fillText(lab, pad.l - 6, y + bh / 2 + 4);
        ctx.textAlign = 'left';
        ctx.fillStyle = c.ink; ctx.fillText((o.fmt ? o.fmt(it.value) : Math.round(it.value)), pad.l + bw + 5, y + bh / 2 + 4);
      } else {
        const bw = Math.min(38, (iw / n) * 0.6);
        const x = pad.l + (i * iw) / n + (iw / n - bw) / 2;
        const bh = (it.value / ymax) * ih;
        ctx.fillStyle = col; ctx.fillRect(x, pad.t + ih - bh, bw, bh);
        ctx.fillStyle = c.dim; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(it.label, x + bw / 2, h - 14);
        ctx.fillText(o.fmt ? o.fmt(it.value) : Math.round(it.value), x + bw / 2, pad.t + ih - bh - 4);
        ctx.textAlign = 'left';
      }
    });
  };

  C.gauge = function (canvas, value, opts) {
    if (!canvas) return;
    const o = Object.assign({ label: '' }, opts);
    const { ctx, w, h } = prep(canvas);
    const c = colors();
    const cx = w / 2, cy = h * 0.58, r = Math.min(w, h * 1.5) / 2 - 14;
    ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.strokeStyle = c.grid;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
    const frac = U.clamp(value, 0, 1);
    const col = frac >= 0.66 ? c.red : frac >= 0.33 ? c.orange : c.green;
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.85, Math.PI * 0.85 + frac * Math.PI * 1.3); ctx.stroke();
    ctx.fillStyle = c.ink; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(Math.round(frac * 100) + '%', cx, cy + 4);
    if (o.label) { ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = c.dim; ctx.fillText(o.label, cx, cy + 24); }
  };

  C.placeholder = function (canvas, msg) {
    if (!canvas) return;
    const { ctx, w, h } = prep(canvas);
    const c = colors();
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1.5;
    if (ctx.setLineDash) ctx.setLineDash([5, 5]);
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.setLineDash([]);
    ctx.fillStyle = c.dim; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(msg || 'Chart appears here', w / 2, h / 2);
    ctx.textAlign = 'left';
  };

  C.confusion = function (canvas, cm) {
    if (!canvas || !cm) return;
    const { ctx, w, h } = prep(canvas);
    const c = colors();
    const labels = ['Pred No risk', 'Pred Risk'];
    const rows = ['Actual No risk', 'Actual Risk'];
    const maxV = Math.max(cm[0][0], cm[0][1], cm[1][0], cm[1][1]);
    const ox = 96, oy = 26, bw = (w - ox - 10) / 2, bh = (h - oy - 10) / 2;
    ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = c.dim;
    labels.forEach((l, j) => ctx.fillText(l, ox + j * bw + bw / 2 - l.length * 2.7, 16));
    rows.forEach((l, i) => { ctx.save(); ctx.translate(12, oy + i * bh + bh / 2 + 4); ctx.fillText(l, 0, 0); ctx.restore(); });
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const v = cm[i][j];
      const correct = i === j;
      const alpha = 0.15 + 0.75 * (v / maxV);
      ctx.fillStyle = correct ? c.green : c.red;
      ctx.globalAlpha = alpha;
      ctx.fillRect(ox + j * bw + 3, oy + i * bh + 3, bw - 6, bh - 6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(v, ox + j * bw + bw / 2, oy + i * bh + bh / 2 + 5);
      ctx.textAlign = 'left'; ctx.font = '10px system-ui, sans-serif';
    }
  };

  C.roc = function (canvas, roc, color) {
    if (!canvas || !roc) return;
    const { ctx, w, h } = prep(canvas);
    const c = colors();
    const pad = { l: 28, r: 8, t: 10, b: 24 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    ctx.strokeStyle = c.grid;
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (ih * g) / 4, x = pad.l + (iw * g) / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke();
    }
    ctx.strokeStyle = c.dim; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, pad.t); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = color || c.accent; ctx.lineWidth = 2; ctx.beginPath();
    roc.fpr.forEach((f, i) => {
      const x = pad.l + f * iw, y = pad.t + ih - roc.tpr[i] * ih;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = c.dim; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('False positive rate', w / 2, h - 6);
    ctx.save(); ctx.translate(10, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('True positive rate', 0, 0); ctx.restore();
    ctx.textAlign = 'left';
    ctx.fillStyle = c.ink; ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('AUC ' + roc.auc.toFixed(3), w - pad.r - 70, pad.t + 14);
  };

  C.scatter = function (canvas, points, opts) {
    // points: [{x, y, c (0..k-1), name}]
    if (!canvas) return;
    const o = Object.assign({ xlabel: '', ylabel: '' }, opts);
    const { ctx, w, h } = prep(canvas);
    const c = colors();
    const palette = [c.accent, c.orange, c.green, c.purple, c.teal, c.red];
    const pad = { l: 38, r: 10, t: 10, b: 26 };
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const px = (v) => pad.l + ((v - xmin) / Math.max(1e-6, xmax - xmin)) * iw;
    const py = (v) => pad.t + ih - ((v - ymin) / Math.max(1e-6, ymax - ymin)) * ih;
    ctx.strokeStyle = c.grid;
    for (let g = 0; g <= 4; g++) {
      ctx.beginPath(); ctx.moveTo(pad.l, pad.t + (ih * g) / 4); ctx.lineTo(w - pad.r, pad.t + (ih * g) / 4); ctx.stroke();
    }
    points.forEach((p) => {
      ctx.fillStyle = palette[p.c % palette.length];
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(px(p.x), py(p.y), 3.4, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = c.dim; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
    if (o.xlabel) ctx.fillText(o.xlabel, w / 2, h - 6);
    ctx.textAlign = 'left';
  };

  C.sparkline = function (canvas, data, color) {
    if (!canvas) return;
    const { ctx, w, h } = prep(canvas);
    const c = colors();
    const col = resolve(color, c.accent);
    const min = Math.min(...data), max = Math.max(...data);
    const px = (i) => 2 + (i * (w - 4)) / Math.max(1, data.length - 1);
    const py = (v) => 3 + (h - 6) * (1 - (v - min) / Math.max(1e-6, max - min));
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath();
    data.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
    ctx.stroke();
    const last = data[data.length - 1];
    ctx.beginPath(); ctx.arc(px(data.length - 1), py(last), 2.6, 0, 7);
    ctx.fillStyle = col; ctx.fill();
  };
})();
