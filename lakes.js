// Logic for the lakes (FEAT-m3-test-011, REQ-m3-test-096 to -112). Pure, no DOM.
// An item is a lake: { id, name, path, rings }.
const lakeBase = typeof normaliseName === 'function' ? normaliseName : require('./test.js').normaliseName;
const LAKE_TEST_POINT = 4; // 4 pointing and 4 typed questions (REQ-m3-test-105)
const LAKE_HIT_PX = 24;    // selection distance in screen pixels (NFR-m3-test-031)

function lakeShuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// As the river names (REQ-m3-test-050), plus: spaces do not matter, so "Neusiedler See" and "Neusiedlersee" are equal (REQ-m3-test-109).
function lakeKey(text) {
  return lakeBase(text).replace(/\s+/g, '');
}

function matchesLakeName(input, name) {
  const typed = lakeKey(input);
  return typed !== '' && typed === lakeKey(name);
}

// Path "M x y L x y ... Z M ..." to a list of rings of [x, y].
function lakeRings(path) {
  return path.split('M').filter(Boolean).map((r) => r.replace('Z', '').split('L').map((p) => p.trim().split(' ').map(Number)));
}

function pointInRing(pt, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i];
    const [x, y] = ring[j];
    if ((b > pt[1]) !== (y > pt[1]) && pt[0] < ((x - a) * (pt[1] - b)) / (y - b) + a) c = !c;
  }
  return c;
}

function segmentDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

// Distance in map units from a point to a lake: 0 inside, else to the nearest outline.
function lakeDistance(pt, lake) {
  if (lake.rings.some((r) => pointInRing(pt, r))) return 0;
  let best = Infinity;
  for (const r of lake.rings) for (let i = 0; i < r.length; i++) best = Math.min(best, segmentDistance(pt, r[i], r[(i + 1) % r.length]));
  return best;
}

// The nearest lake within px screen pixels of the point, else null (NFR-m3-test-031). scale: screen pixels per map unit.
function nearestLake(pt, lakes, scale, px = LAKE_HIT_PX) {
  let best = null;
  let bestD = Infinity;
  for (const l of lakes) {
    const d = lakeDistance(pt, l) * scale;
    if (d < bestD) { bestD = d; best = l; }
  }
  return bestD <= px ? best : null;
}

function withRings(lakes) {
  return lakes.map((l) => ({ ...l, rings: lakeRings(l.path) }));
}

// Endless practice (REQ-m3-test-099 to -104). direction: 'map-to-name' | 'name-to-map'.
function createLakePractice({ lakes, direction = 'map-to-name', rng = Math.random }) {
  let lastId = null;
  let question = null;
  let right = 0;
  let total = 0;
  const options = lakes.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));
  function draw() {
    const pool = lakes.filter((l) => l.id !== lastId);
    const target = pool[Math.floor(rng() * pool.length)];
    lastId = target.id;
    question = { target, answered: false };
  }
  draw();
  return {
    get direction() { return direction; },
    current: () => question,
    options: () => options, // all nine names (REQ-m3-test-101)
    // Switching shows a new question and keeps the count (REQ-m3-test-100).
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

// 8 questions: 4 name to map (pointing first), then 4 map to name (typed), eight different lakes (REQ-m3-test-105).
function createLakeTest({ lakes, rng = Math.random }) {
  const picked = lakeShuffle(lakes, rng).slice(0, LAKE_TEST_POINT * 2);
  const questions = [
    ...picked.slice(0, LAKE_TEST_POINT).map((target) => ({ type: 'name-to-map', target, answer: null })),
    ...picked.slice(LAKE_TEST_POINT).map((target) => ({ type: 'map-to-name', target, answer: null })),
  ];
  let index = 0;
  const matchChosen = (q) => (q.type === 'name-to-map'
    ? lakes.find((l) => l.id === q.answer)
    : lakes.find((l) => matchesLakeName(q.answer, l.name))) || null;
  return {
    total: questions.length,
    get index() { return index; },
    get finished() { return index >= questions.length; },
    current: () => (index >= questions.length ? null : questions[index]),
    // Records the confirmed answer and moves on; nothing is revealed (REQ-m3-test-108).
    confirm(value) {
      if (index >= questions.length) return false;
      if (value === null || value === undefined || String(value).trim() === '') return false;
      questions[index].answer = value;
      index += 1;
      return true;
    },
    // chosen: the lake the child picked or typed, or null when a typed name matches none (REQ-m3-test-111).
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

if (typeof module !== 'undefined') {
  module.exports = { matchesLakeName, lakeRings, lakeDistance, nearestLake, withRings, createLakePractice, createLakeTest, LAKE_HIT_PX, LAKE_TEST_POINT };
}
