/* LearnEase AI — shared utilities (no dependencies) */
(function () {
  const LEAREASE = (window.LEAREASE = window.LEAREASE || {});

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    const r = mulberry32(seed);
    return {
      next: r,
      range: (a, b) => a + r() * (b - a),
      int: (a, b) => Math.floor(a + (b - a + 1) * r()),
      normal: (m = 0, s = 1) => {
        let u = 0, v = 0;
        while (u === 0) u = r();
        while (v === 0) v = r();
        return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      pick: (arr) => arr[Math.floor(r() * arr.length)]
    };
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sigmoid = (z) => 1 / (1 + Math.exp(-z));
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function copyText(text) {
    return new Promise((resolve) => {
      const fallback = () => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (e) { /* clipboard unavailable — resolve quietly */ }
        resolve(false);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => resolve(true), fallback);
        } else fallback();
      } catch (e) { fallback(); }
    });
  }

  function toast(msg) {
    let t = document.getElementById('lr-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'lr-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function downloadText(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    } catch (e) {
      LEAREASE.toast('Download not supported in this viewer');
    }
  }

  function todayStr(offsetDays) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  LEAREASE.util = { makeRng, clamp, sigmoid, el, esc, copyText, toast, downloadText, todayStr };
})();
