/* LearnEase AI — Tutor Agent: simplification, key words, read-aloud with highlighting,
   translation (mock glossary, demo mode), readability scoring. */
(function () {
  const U = LEAREASE.util;
  const T = (LEAREASE.tutor = {});

  /* ---------- Readability ---------- */
  function syllables(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
    if (w.length <= 3) return 1;
    const m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }
  T.flesch = function (text) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 2).length || 1;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const syl = words.reduce((a, w) => a + syllables(w), 0);
    const asl = words.length / sentences;
    const asw = syl / Math.max(1, words.length);
    const score = 206.835 - 1.015 * asl - 84.6 * asw;
    return Math.round(U.clamp(score, 0, 100));
  };
  T.fleschBand = function (score) {
    if (score >= 80) return 'Very easy';
    if (score >= 60) return 'Easy (plain English)';
    if (score >= 50) return 'Fairly hard';
    if (score >= 30) return 'Difficult';
    return 'Very difficult';
  };

  /* ---------- Word dictionary + simplification rules (demo-mode mock LLM) ---------- */
  const DICT = {
    photosynthesis: 'the way plants make their own food using sunlight',
    chlorophyll: 'the green stuff inside leaves that catches sunlight',
    pigment: 'a natural colouring material',
    chloroplasts: 'tiny green parts inside a leaf where food is made',
    situated: 'placed',
    transforms: 'changes',
    atmosphere: 'the air around the Earth',
    microscopic: 'so small you need a microscope to see it',
    stomata: 'tiny holes on a leaf that let air in and out',
    subsequently: 'after that',
    glucose: 'a simple sugar that gives plants energy',
    'by-product': 'something extra that is made along the way',
    extraordinarily: 'very, very much',
    sustenance: 'food and nourishment',
    herbivores: 'animals that eat only plants',
    carnivores: 'animals that eat other animals',
    decomposers: 'tiny living things that break down dead material',
    nutrients: 'good things in food that help living things grow',
    deteriorates: 'gets weaker or worse',
    perishes: 'dies',
    fundamental: 'basic and most important',
    manufacture: 'make',
    absorbs: 'takes in',
    sufficiency: 'enough',
    sufficient: 'enough',
    ingredient: 'one part of a mixture',
    eventually: 'in the end',
    'situ': 'placed'
  };
  const SIMPLIFY = [
    [/the fundamental process by which/g, 'the basic way'],
    [/is the fundamental process/g, 'is the basic way'],
    [/manufacture their own nourishment/g, 'make their own food'],
    [/situated inside/g, 'inside'],
    [/transforms light energy into chemical energy/g, 'changes light energy into stored (chemical) energy'],
    [/absorbs water from the soil through its roots/g, 'takes in water from the soil through its roots'],
    [/carbon dioxide from the atmosphere through microscopic pores called stomata/g, 'carbon dioxide from the air through tiny holes called stomata'],
    [/combines these ingredients to produce glucose, a sugar that provides energy for growth/g, 'mixes them to make glucose — a sugar that gives energy for growth'],
    [/is extraordinarily important because virtually every living creature depends on it either directly or indirectly for sustenance/g, 'is very important because almost every living thing needs it for food, directly or indirectly'],
    [/decomposers return nutrients to the soil, completing the cycle/g, 'decomposers put nutrients back into the soil — this completes the cycle'],
    [/the process deteriorates and the plant eventually perishes/g, 'the process gets weaker and the plant dies in the end'],
    [/in the air as a by-product/g, 'into the air as an extra product']
  ];
  T.simplifyPass = function (text, mode) {
    let out = text;
    SIMPLIFY.forEach(([re, rep]) => (out = out.replace(re, rep)));
    if (mode === 'adhd') {
      const parts = out.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      return '• ' + parts.join('\n\n• ');
    }
    return out.replace(/\s+/g, ' ').trim();
  };
  T.stepsFrom = function (text) {
    // split simplified text into 4–6 steps with short headings (deterministic demo logic)
    const sentences = text.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/).filter((s) => s.length > 4);
    const heads = ['What it is', 'What the leaf uses', 'How it happens', 'What is made', 'Why it matters', 'What plants need'];
    const n = Math.min(6, Math.max(4, Math.round(sentences.length / 2.2)));
    const per = Math.ceil(sentences.length / n);
    const steps = [];
    for (let i = 0; i < n; i++) {
      const chunk = sentences.slice(i * per, (i + 1) * per).join(' ');
      if (chunk) steps.push({ head: heads[i % heads.length], body: chunk });
    }
    return steps;
  };
  T.keywords = function (text) {
    const found = [];
    const lower = ' ' + text.toLowerCase() + ' ';
    Object.keys(DICT).forEach((w) => {
      if (lower.includes(' ' + w)) found.push({ word: w, meaning: DICT[w] });
    });
    return found.slice(0, 10);
  };
  T.dict = DICT;

  /* ---------- Translation (mock glossary, demo mode) ---------- */
  const HI = {
    'Photosynthesis': 'प्रकाश संश्लेषण',
    'plant': 'पौधा', 'plants': 'पौधे', 'food': 'भोजन', 'sunlight': 'धूप',
    'leaf': 'पत्ती', 'leaves': 'पत्तियाँ', 'water': 'पानी', 'soil': 'मिट्टी',
    'roots': 'जड़ें', 'air': 'हवा', 'oxygen': 'ऑक्सीजन', 'energy': 'ऊर्जा',
    'sugar': 'चीनी', 'green': 'हरा', 'process': 'प्रक्रिया', 'grows': 'बढ़ता है',
    'tiny holes': 'छोटे छिद्र', 'carbon dioxide': 'कार्बन डाइऑक्साइड',
    'animals': 'जानवर', 'living things': 'जीवित चीज़ें', 'growth': 'वृद्धि'
  };
  const TE = {
    'Photosynthesis': 'కిరణజన్య సంయోగక్రియ',
    'plant': 'మొక్క', 'plants': 'మొక్కలు', 'food': 'ఆహారం', 'sunlight': 'సూర్యకాంతి',
    'leaf': 'ఆకు', 'leaves': 'ఆకులు', 'water': 'నీరు', 'soil': 'నేల',
    'roots': 'వేర్లు', 'air': 'గాలి', 'oxygen': 'ఆక్సిజన్', 'energy': 'శక్తి',
    'sugar': 'చక్కెర', 'green': 'ఆకుపచ్చ', 'process': 'ప్రక్రియ', 'grows': 'పెరుగుతుంది',
    'tiny holes': 'చిన్న రంధ్రాలు', 'carbon dioxide': 'కార్బన్ డయాక్సైడ్',
    'animals': 'జంతువులు', 'living things': 'జీవులు', 'growth': 'పెరుగుదల'
  };
  T.translate = function (text, lang) {
    const dict = lang === 'hi' ? HI : TE;
    let out = text;
    Object.keys(dict).forEach((k) => {
      const re = new RegExp('\\b' + k + '\\b', 'gi');
      out = out.replace(re, (m) => (m[0] === m[0].toUpperCase() && /[a-zA-Z]/.test(m[0]) ? cap(dict[k]) : dict[k]));
    });
    return out;
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  T.LLMS = { hi: HI, te: TE };
  T.LANG_NAMES = { en: 'English', hi: 'हिन्दी (Hindi)', te: 'తెలుగు (Telugu)' };

  /* ---------- Read aloud with word-by-word highlighting ---------- */
  T.Reader = function (containerEl, statusEl) {
    let speaking = false, onEnd = null;
    function speak(text) {
      if (!('speechSynthesis' in window)) {
        if (statusEl) statusEl.textContent = 'Read aloud is not supported in this browser.';
        return;
      }
      stop();
      const spans = containerEl.querySelectorAll('.lr-word');
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92; u.lang = 'en-US';
      speaking = true;
      // word-by-word highlighting: boundary events, with time-based fallback
      let boundaryOK = false;
      u.onboundary = function (ev) {
        boundaryOK = true;
        if (ev.name && ev.name !== 'word') return;
        highlightAt(ev.charIndex, spans, text);
      };
      u.onend = function () {
        speaking = false;
        clear(spans);
        if (statusEl) statusEl.textContent = '';
        if (onEnd) onEnd();
      };
      if (statusEl) statusEl.textContent = 'Reading aloud… click again to stop.';
      speechSynthesis.speak(u);
      // fallback highlight if boundary events never fire (some engines)
      setTimeout(function () {
        if (!boundaryOK && speaking) {
          const words = text.split(/\s+/);
          let i = 0, pos = 0;
          const timer = setInterval(function () {
            if (!speaking || i >= words.length) { clearInterval(timer); clear(spans); return; }
            highlightAt(text.indexOf(words[i], pos), spans, text);
            pos = text.indexOf(words[i], pos) + words[i].length;
            i++;
          }, 280);
        }
      }, 900);
    }
    function highlightAt(charIndex, spans, text) {
      if (charIndex == null) return;
      const before = text.slice(0, charIndex);
      const n = (before.match(/\S+/g) || []).length;
      spans.forEach((s, i) => s.classList.toggle('lr-speaking', i === n));
    }
    function clear(spans) {
      spans.forEach((s) => s.classList.remove('lr-speaking'));
    }
    function stop() {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      speaking = false;
      clear(containerEl.querySelectorAll('.lr-word'));
    }
    return {
      toggle: function (text) {
        if (speaking) { stop(); if (statusEl) statusEl.textContent = 'Stopped.'; }
        else speak(text);
      },
      stop: stop
    };
  };
})();
