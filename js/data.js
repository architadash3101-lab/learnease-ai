/* LearnEase AI — synthetic data generator, sample lesson, feature schema.
   ALL DATA IN THIS APP IS SYNTHETIC and generated deterministically from a seed. */
(function () {
  const { makeRng, clamp, sigmoid } = LEAREASE.util;
  const L = (LEAREASE.data = {});

  const FIRST = ['Aarav','Priya','Rahul','Sneha','Arjun','Divya','Kiran','Meena','Rohan','Anita','Vikram','Lakshmi','Imran','Fatima','Karthik','Deepa','Suresh','Pooja','Naveen','Shreya','Aditya','Kavya','Manoj','Ritu','Sanjay','Neha','Harish','Swati','Ravi','Bhavna','Gopal','Sita','Yash','Trisha','Mohan','Ishita'];
  const LAST = ['Sharma','Reddy','Patel','Nair','Iyer','Gupta','Rao','Menon','Das','Kulkarni','Verma','Joshi','Pillai','Chowdhury','Bhat','Shetty','Mehta','Singh','Prasad','Devi','Khan','Mishra'];
  const TOPICS = ['Arithmetic','Fractions','Algebra','Geometry','Reading','Grammar','Science'];

  // Feature schema used by models, explainability and what-if sliders
  L.FEATURES = [
    { key: 'avgScore',    label: 'Average score (%)',        min: 5,    max: 100, step: 1 },
    { key: 'trend',       label: 'Score trend (pts/week)',   min: -9,   max: 9,   step: 0.5 },
    { key: 'timePerQ',    label: 'Avg time per question (s)',min: 6,    max: 95,  step: 1 },
    { key: 'retries',     label: 'Retries per question',     min: 0,    max: 9,   step: 1 },
    { key: 'completion',  label: 'Task completion',          min: 0.25, max: 1,   step: 0.01 },
    { key: 'daysInactive',label: 'Days inactive',            min: 0,    max: 28,  step: 1 }
  ];
  L.TOPICS = TOPICS;
  L.GROUPS = ['Typical', 'Dyslexia', 'Dyscalculia', 'ADHD'];

  // Accepts either a student object (uses .features) or a raw features object.
  function featVec(s) {
    const f = s && s.features ? s.features : s;
    return L.FEATURES.map((d) => f[d.key]);
  }

  // Latent risk model (ground truth for synthetic labels)
  function latentRisk(f, group) {
    const z =
      1.2 -
      0.045 * f.avgScore -
      0.14 * f.trend +
      0.025 * (f.timePerQ - 30) +
      0.2 * f.retries -
      3.0 * (f.completion - 0.82) +
      0.07 * f.daysInactive +
      (group === 'Typical' ? -0.45 : group === 'ADHD' ? 0.25 : 0.15);
    return sigmoid(z);
  }

  function genStudents(n, seed) {
    const rng = makeRng(seed);
    const out = [];
    for (let i = 0; i < n; i++) {
      const group = rng.pick(['Typical', 'Typical', 'Dyslexia', 'Dyslexia', 'ADHD', 'Dyscalculia']);
      const a = clamp(rng.normal(56, 17), 15, 98);
      const avgScore = clamp(a + rng.normal(0, 4), 8, 100);
      const trend = clamp(rng.normal(0, 3.2) - (60 - avgScore) * 0.04, -9, 9);
      const timePerQ = clamp(20 + (100 - avgScore) * 0.35 + rng.normal(0, 8), 6, 95);
      const retries = clamp(Math.round((100 - avgScore) / 28 + rng.normal(0, 1.2)), 0, 9);
      const completion = clamp(0.55 + (avgScore / 100) * 0.45 + rng.normal(0, 0.07), 0.25, 1);
      const daysInactive = clamp(Math.round(Math.exp(rng.normal(0.4, 1.1)) - 1), 0, 28);
      const f = { avgScore, trend, timePerQ, retries, completion, daysInactive };
      const p = latentRisk(f, group);
      const label = rng.next() < p ? 1 : 0;
      const quizScores = Array.from({ length: 8 }, (_, k) =>
        clamp(avgScore + trend * (k - 3.5) * 0.8 + rng.normal(0, 7), 5, 100)
      );
      const topicAcc = {};
      TOPICS.forEach((t) => (topicAcc[t] = clamp(avgScore + rng.normal(0, 12), 5, 100)));
      out.push({
        id: 'S' + (1000 + i),
        name: rng.pick(FIRST) + ' ' + rng.pick(LAST),
        grade: rng.int(4, 9),
        group,
        features: f,
        quizScores,
        topicAcc,
        label,
        latentP: p
      });
    }
    return out;
  }

  L.genStudents = genStudents;
  L.featVec = featVec;
  L.latentRisk = latentRisk;

  // Full synthetic population (3,000+ students)
  L.students = genStudents(3200, 20260417);

  // Sample class of 30 (also synthetic) — mixed ability and support needs
  L.sampleClass = genStudents(30, 777001).map((s, i) => ({ ...s, id: 'C' + (2001 + i) }));

  // Sample lesson used by the Tutor Agent demo
  L.sampleLesson =
    'Photosynthesis is the fundamental process by which plants manufacture their own nourishment. ' +
    'Chlorophyll, the green pigment situated inside the chloroplasts of a leaf, absorbs sunlight and transforms ' +
    'light energy into chemical energy. During this process, the plant absorbs water from the soil through its roots ' +
    'and carbon dioxide from the atmosphere through microscopic pores called stomata. Subsequently, the plant combines ' +
    'these ingredients to produce glucose, a sugar that provides energy for growth, and releases oxygen into the air ' +
    'as a by-product. Photosynthesis is extraordinarily important because virtually every living creature depends on it ' +
    'either directly or indirectly for sustenance. Herbivores consume plants, carnivores consume herbivores, and ' +
    'decomposers return nutrients to the soil, completing the cycle. Without sufficient sunlight, water, or carbon dioxide, ' +
    'the process deteriorates and the plant eventually perishes.';

  L.statusFor = function (p) {
    if (p >= 0.66) return { label: 'Needs support', cls: 'risk-high' };
    if (p >= 0.33) return { label: 'Watch', cls: 'risk-mid' };
    return { label: 'On track', cls: 'risk-low' };
  };
})();
