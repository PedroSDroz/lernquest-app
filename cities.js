// Logic for the Staedte topic (REQ-m3-test-059 to REQ-m3-test-071). Pure, no DOM.
// A city is { id, name, state, short, note, x, y }; a typed answer may use the name or its short worksheet form (REQ-m3-test-069). Answers are city ids (pointing) or typed names.
const cityMatch = typeof matchesRegionName === 'function' ? matchesRegionName : require('./regions.js').matchesRegionName;
const CITY_TEST_POINTING = 5;
const CITY_TEST_TYPED = 5;
const CITY_CHOICES = 6;      // names offered in map to name: the right one and five others
const CITY_NEAR = 4;         // of the five others, at least this many are among the nearest cities
const CITY_NEAR_POOL = 8;    // the "nearest cities" are this many

function cityShuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Endless practice (REQ-m3-test-059 to -064). direction: 'map-to-name' | 'name-to-map'.
function createCityPractice({ cities, direction = 'map-to-name', rng = Math.random }) {
  let lastId = null;
  let question = null;
  let right = 0;
  let total = 0;
  function draw() {
    const pool = cities.filter((c) => c.id !== lastId);
    const target = pool[Math.floor(rng() * pool.length)];
    lastId = target.id;
    // The right city and five others, alphabetical, fixed for the question; four of the others are close by (REQ-m3-test-061).
    const byDistance = cities.filter((c) => c.id !== target.id)
      .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
    const near = cityShuffle(byDistance.slice(0, CITY_NEAR_POOL), rng).slice(0, CITY_NEAR);
    const rest = cityShuffle(byDistance.filter((c) => !near.includes(c)), rng).slice(0, CITY_CHOICES - 1 - CITY_NEAR);
    const others = [...near, ...rest];
    const choices = [target, ...others].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    question = { target, choices, answered: false };
  }
  draw();
  return {
    get direction() { return direction; },
    current: () => question,
    options: () => question.choices, // six names, the right one among them, most of the others near it (REQ-m3-test-061)
    // Switching shows a new question and keeps the count (REQ-m3-test-060).
    setDirection(d) { if (d !== direction) { direction = d; draw(); } },
    // The first answer per question is final.
    answer(id) {
      if (question.answered) return null;
      question.answered = true;
      total += 1;
      const correct = id === question.target.id;
      if (correct) right += 1;
      return { correct, correctId: question.target.id, chosenId: id };
    },
    next() {
      if (!question.answered) return false;
      draw();
      return true;
    },
    tally: () => ({ right, total }),
  };
}

// 10 questions about different cities of the 30: 5 name to map (pointing first), then 5 map to name (typed) (REQ-m3-test-065).
function createCityTest({ cities, rng = Math.random }) {
  const picked = cityShuffle(cities, rng).slice(0, CITY_TEST_POINTING + CITY_TEST_TYPED);
  const questions = picked.map((target, i) => ({
    type: i < CITY_TEST_POINTING ? 'name-to-map' : 'map-to-name', target, answer: null,
  }));
  let index = 0;
  const matchChosen = (q) => (q.type === 'name-to-map'
    ? cities.find((c) => c.id === q.answer)
    : cities.find((c) => cityMatch(q.answer, c.name) || (c.short && cityMatch(q.answer, c.short)))) || null;
  return {
    total: questions.length,
    get index() { return index; },
    get finished() { return index >= questions.length; },
    current: () => (index >= questions.length ? null : questions[index]),
    // Records the confirmed answer and moves on; nothing is revealed (REQ-m3-test-068).
    confirm(value) {
      if (index >= questions.length) return false;
      if (value === null || value === undefined || String(value).trim() === '') return false;
      questions[index].answer = value;
      index += 1;
      return true;
    },
    // chosen: the city the child picked or typed, or null when a typed name matches none (REQ-m3-test-071).
    review() {
      if (index < questions.length) return null;
      return questions.map((q) => {
        const chosen = matchChosen(q);
        return { type: q.type, target: q.target, answer: q.answer, chosen, correct: !!chosen && chosen.id === q.target.id };
      });
    },
    score() {
      return questions.filter((q) => q.answer !== null && matchChosen(q) && matchChosen(q).id === q.target.id).length;
    },
  };
}

if (typeof module !== 'undefined') module.exports = { createCityPractice, createCityTest, CITY_TEST_POINTING, CITY_TEST_TYPED, CITY_CHOICES, CITY_NEAR, CITY_NEAR_POOL };
