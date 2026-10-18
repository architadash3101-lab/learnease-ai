/* LearnEase AI — Quiz Master Agent: question bank, Elo ability estimate with confidence
   band, upper-confidence-bound (UCB) question selection, hints, retries, summary. */
(function () {
  const U = LEAREASE.util;
  const Q = (LEAREASE.quiz = {});

  const TOPICS = LEAREASE.data.TOPICS;

  function mcq(id, topic, level, q, options, correct, hint) {
    return { id, topic, level, q, options, correct, hint };
  }

  /* Question bank — 3 difficulty levels × topics */
  Q.bank = [
    // Arithmetic
    mcq('a1','Arithmetic',1,'What is 7 + 8?',['13','14','15','16'],2,'Count on from 7: 8, 9, 10…'),
    mcq('a2','Arithmetic',1,'What is 5 × 3?',['8','12','15','18'],2,'5 × 3 means three fives.'),
    mcq('a3','Arithmetic',1,'What is 20 − 6?',['13','14','15','16'],1,'20 − 6: count back six from 20.'),
    mcq('a4','Arithmetic',2,'What is 144 ÷ 12?',['11','12','13','14'],1,'12 × 12 = 144.'),
    mcq('a5','Arithmetic',2,'A pencil costs ₹6. How much do 8 pencils cost?',['₹44','₹46','₹48','₹50'],2,'6 × 8.'),
    mcq('a6','Arithmetic',2,'What is 25% of 80?',['15','20','25','30'],1,'25% is one quarter.'),
    mcq('a7','Arithmetic',3,'What is 15% of 240?',['30','34','36','38'],2,'10% is 24, 5% is 12.'),
    mcq('a8','Arithmetic',3,'A train travels 60 km in 45 minutes. Its speed is:',['75 km/h','80 km/h','85 km/h','90 km/h'],1,'45 min = 0.75 h; 60 ÷ 0.75.'),
    mcq('a9','Arithmetic',3,'The LCM of 8 and 12 is:',['16','24','32','48'],1,'Multiples of 12: 12, 24…'),
    // Fractions
    mcq('f1','Fractions',1,'Which fraction equals one half?',['2/5','3/6','4/9','5/8'],1,'3 out of 6 is half.'),
    mcq('f2','Fractions',1,'Which is bigger: 1/4 or 1/3?',['1/4','1/3','Same','Cannot tell'],1,'Smaller denominator = bigger slice.'),
    mcq('f3','Fractions',1,'1/2 + 1/2 = ?',['1','1/4','2/3','3/4'],0,'Two halves make a whole.'),
    mcq('f4','Fractions',2,'2/5 + 1/5 = ?',['3/10','3/5','2/10','1'],1,'Same denominator: add numerators.'),
    mcq('f5','Fractions',2,'Simplify 6/8.',['2/3','3/4','4/6','6/4'],1,'Divide top and bottom by 2.'),
    mcq('f6','Fractions',2,'1/3 of 27 = ?',['6','7','9','12'],2,'27 ÷ 3.'),
    mcq('f7','Fractions',3,'3/4 ÷ 1/2 = ?',['3/8','2/3','3/2','1.5'],2,'Dividing by ½ multiplies by 2.'),
    mcq('f8','Fractions',3,'0.375 as a fraction is:',['3/8','3/4','5/8','1/3'],0,'0.375 = 375/1000 = 3/8.'),
    mcq('f9','Fractions',3,'2/3, 5/8 and 3/5 in increasing order:',['2/3, 3/5, 5/8','5/8, 3/5, 2/3','3/5, 5/8, 2/3','5/8, 2/3, 3/5'],1,'Convert to decimals: 0.625, 0.6, 0.667.'),
    // Algebra
    mcq('g1','Algebra',1,'If x + 5 = 12, x = ?',['5','6','7','8'],2,'Take 5 from both sides.'),
    mcq('g2','Algebra',1,'What is 3 × a when a = 4?',['7','12','34','1'],1,'Replace a with 4.'),
    mcq('g3','Algebra',1,'Continue the pattern: 2, 5, 8, 11, …?',['13','14','15','16'],1,'Add 3 each time.'),
    mcq('g4','Algebra',2,'If 2x = 18, x = ?',['8','9','10','36'],1,'Divide both sides by 2.'),
    mcq('g5','Algebra',2,'Simplify: 4y + 3y.',['7y','12y','7y²','y'],0,'4y + 3y = (4+3)y.'),
    mcq('g6','Algebra',2,'If y = 2x + 1, what is y when x = 5?',['10','11','12','21'],1,'2×5 = 10, plus 1.'),
    mcq('g7','Algebra',3,'Solve: 3(x − 2) = 15.',['5','6','7','8'],2,'Divide by 3 first: x − 2 = 5.'),
    mcq('g8','Algebra',3,'If x² = 49 and x > 0, x = ?',['7','8','9','24.5'],0,'7 × 7 = 49.'),
    mcq('g9','Algebra',3,'The rule for 1, 4, 9, 16, … is:',['n + 3','2n','n²','n(n+1)/2'],2,'These are square numbers.'),
    // Geometry
    mcq('h1','Geometry',1,'How many sides does a triangle have?',['2','3','4','5'],1,'Tri = three.'),
    mcq('h2','Geometry',1,'A square has ___ equal sides.',['2','3','4','6'],2,'Squares have 4.'),
    mcq('h3','Geometry',1,'What do we call a shape with 5 sides?',['Hexagon','Pentagon','Octagon','Rhombus'],1,'Penta = five.'),
    mcq('h4','Geometry',2,'The angles of a triangle add up to:',['90°','180°','270°','360°'],1,'Always 180°.'),
    mcq('h5','Geometry',2,'Area of a rectangle 6 cm × 4 cm:',['10 cm²','20 cm²','24 cm²','30 cm²'],2,'Area = length × width.'),
    mcq('h6','Geometry',2,'A right angle measures:',['45°','60°','90°','120°'],2,'A corner of a square.'),
    mcq('h7','Geometry',3,'Area of a circle with r = 7 (π ≈ 22/7):',['44','154','308','616'],1,'π × 7 × 7 = 22 × 7.'),
    mcq('h8','Geometry',3,'Each angle of an equilateral triangle:',['30°','45°','60°','90°'],2,'180° ÷ 3.'),
    mcq('h9','Geometry',3,'The perimeter of a square of area 36 cm²:',['12 cm','18 cm','24 cm','36 cm'],2,'Side = 6, perimeter = 24.'),
    // Reading
    mcq('r1','Reading',1,'A word that means the opposite of "cold":',['Chilly','Warm','Freezing','Cool'],1,'Opposite of cold.'),
    mcq('r2','Reading',1,'Which word is a "doing" word (verb)?',['Happy','Quickly','Run','Blue'],2,'Run is an action.'),
    mcq('r3','Reading',1,'The plural of "box" is:',['Boxs','Boxes','Boxen','Box'],1,'Add -es after x.'),
    mcq('r4','Reading',2,'"She was exhausted" means she was very:',['Angry','Tired','Happy','Late'],1,'Exhausted = very tired.'),
    mcq('r5','Reading',2,'The main idea of a passage is:',['A small detail','The most important point','The last word','A rhyme'],1,'Main idea = key point.'),
    mcq('r6','Reading',2,'Which word rhymes with "light"?',['Night','Lime','Late','Love'],0,'-ight sound.'),
    mcq('r7','Reading',3,'"The wind whispered" is an example of:',['Simile','Personification','Fact','Exaggeration'],1,'Wind cannot literally whisper — it is given human action.'),
    mcq('r8','Reading',3,'A synonym for "commence":',['Finish','Begin','Delay','Cancel'],1,'Commence = begin.'),
    mcq('r9','Reading',3,'"Prefix" means the letters placed:',['At the end','At the start','In the middle','Nowhere'],1,'Pre = before.'),
    // Grammar
    mcq('m1','Grammar',1,'Choose the correct sentence:',['He go to school.','He goes to school.','He going school.','He gone school.'],1,'He + goes.'),
    mcq('m2','Grammar',1,'Which is a naming word (noun)?',['Sing','Table','Quick','Jump'],1,'Table is a thing.'),
    mcq('m3','Grammar',1,'The past tense of "eat":',['Eated','Ate','Eaten','Eating'],1,'Eat → ate.'),
    mcq('m4','Grammar',2,'Pick the correct spelling:',['Recieve','Receive','Receeve','Receve'],1,'"i before e except after c".'),
    mcq('m5','Grammar',2,'Which sentence needs a question mark?',['What a day','Where are you going','I am fine','Come here'],1,'It asks something.'),
    mcq('m6','Grammar',2,'"Their", "there" and "they\u2019re" are:',['The same word','Homophones','Antonyms','Adverbs'],1,'Same sound, different meaning.'),
    mcq('m7','Grammar',3,'Identify the adverb: "She sings beautifully."',['She','sings','beautifully','none'],2,'Beautifully describes how she sings.'),
    mcq('m8','Grammar',3,'Passive form of "Riya wrote a letter":',['A letter was written by Riya','Riya was writing a letter','A letter wrote Riya','Riya writes a letter'],0,'Object becomes subject + was written.'),
    mcq('m9','Grammar',3,'Which sentence is punctuated correctly?',['Its raining today.','It\u2019s raining today.','Its\u2019 raining today.','It is\u2019nt raining.'],1,"It's = it is."),
    // Science
    mcq('s1','Science',1,'Which planet is closest to the Sun?',['Venus','Earth','Mercury','Mars'],2,'Mercury is first.'),
    mcq('s2','Science',1,'Water freezes into:',['Steam','Ice','Air','Salt'],1,'Ice is frozen water.'),
    mcq('s3','Science',1,'Which animal lays eggs?',['Cow','Dog','Hen','Cat'],2,'Hens lay eggs.'),
    mcq('s4','Science',2,'The gas plants take in for photosynthesis:',['Oxygen','Nitrogen','Carbon dioxide','Hydrogen'],2,'Plants breathe in CO₂ for food-making.'),
    mcq('s5','Science',2,'Which part of the plant makes food?',['Root','Stem','Leaf','Flower'],2,'Leaves make food.'),
    mcq('s6','Science',2,'The force pulling objects to Earth:',['Friction','Gravity','Magnetism','Tension'],1,'Gravity pulls things down.'),
    mcq('s7','Science',3,'Which blood cells fight infection?',['Red cells','White cells','Platelets','Plasma'],1,'White blood cells defend the body.'),
    mcq('s8','Science',3,'Speed of light is about:',['3 × 10⁵ km/s','3 × 10³ km/s','3 × 10⁸ km/h','3 × 10² m/s'],0,'Light travels 300,000 km every second.'),
    mcq('s9','Science',3,'Chemical symbol for gold:',['Go','Gd','Au','Ag'],2,'Au, from the Latin "aurum".')
  ];

  /* ---------- Elo ability model with confidence band ---------- */
  Q.newSession = function (topics) {
    return {
      ability: 30,           // start below mid so demo progress is visible
      ci: 14,                // confidence band half-width
      answered: 0,
      correct: 0,
      history: [],           // {n, ability, ci, correct, qid, topic, level}
      topicStats: {},        // {topic: {right, total}}
      seenIds: {},
      filterTopics: topics || TOPICS.slice()
    };
  };

  Q.chooseQuestion = function (session) {
    // Upper-Confidence-Bound (bandit) selection with maximum-information flavour:
    // prefer unseen questions whose difficulty best matches ability + exploration bonus.
    const pool = Q.bank.filter(
      (q) => !session.seenIds[q.id] && session.filterTopics.includes(q.topic)
    );
    if (!pool.length) return null;
    const scored = pool.map((q) => {
      const diff = q.level * 33;                       // map level 1-3 to ~33-99 ability target
      const fit = 10 - Math.abs(diff - session.ability) / 6;  // closeness of difficulty to estimate
      const explore = (U.clamp(session.ci, 0, 16) / 16) * 6;  // explore more while uncertain
      const byTopic = session.topicStats[q.topic];
      const topicNeed = byTopic ? (1 - byTopic.right / byTopic.total) * 2 : 1.5;
      return { q, score: fit + explore + topicNeed + U.makeRng(q.id.charCodeAt(1) * 7 + session.answered * 13).next() * 1.5 };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].q;
  };

  Q.reason = function (session, q) {
    const byTopic = session.topicStats[q.topic];
    const needs = byTopic ? byTopic.right / Math.max(1, byTopic.total) < 0.5 : true;
    const fit = Math.abs(q.level * 33 - session.ability) < 16;
    let r = [];
    if (needs) r.push('you are still building accuracy in ' + q.topic);
    else if (fit) r.push('its difficulty matches your current level (≈' + Math.round(session.ability) + ')');
    else r.push('it gently stretches your current level');
    if (session.ci > 8) r.push('a few more answers will sharpen your estimate');
    return 'Chosen because ' + r.join(', ') + '.';
  };

  // returns updated session stats after one answer
  Q.recordAnswer = function (session, q, correctIdx) {
    const correct = correctIdx === q.correct;
    // Elo-style update with dynamic K that shrinks as confidence grows
    const expected = 1 / (1 + Math.pow(10, (q.level * 33 - session.ability) / 40));
    const K = 18 + session.ci * 1.4;
    session.ability = U.clamp(session.ability + K * ((correct ? 1 : 0) - expected), 0, 100);
    session.ci = Math.max(3.5, session.ci * 0.82);
    session.answered++;
    if (correct) session.correct++;
    const ts = session.topicStats[q.topic] || (session.topicStats[q.topic] = { right: 0, total: 0 });
    ts.total++; if (correct) ts.right++;
    session.seenIds[q.id] = true;
    session.history.push({ n: session.answered, ability: session.ability, ci: session.ci, correct, qid: q.id, topic: q.topic, level: q.level });
    return correct;
  };

  Q.topicAccuracy = function (session) {
    return TOPICS.map((t) => {
      const s = session.topicStats[t];
      return { topic: t, right: s ? s.right : 0, total: s ? s.total : 0, pct: s ? Math.round((100 * s.right) / s.total) : 0 };
    });
  };

  Q.summary = function (session) {
    const acc = session.answered ? Math.round((100 * session.correct) / session.answered) : 0;
    return {
      ability: Math.round(session.ability),
      ci: session.ci,
      lo: Math.round(U.clamp(session.ability - session.ci, 0, 100)),
      hi: Math.round(U.clamp(session.ability + session.ci, 0, 100)),
      answered: session.answered,
      correct: session.correct,
      acc
    };
  };
})();
