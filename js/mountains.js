// Logic for the mountain areas (FEAT-m3-test-012, REQ-m3-test-116 to -133). Pure, no DOM.
// An item is an area: { id, name, region, accept, path, rings }.
const mountainBase = typeof normaliseName === 'function' ? normaliseName : require('./test.js').normaliseName;
const MOUNTAIN_TEST_POINT = 8; // 8 pointing questions, then 2 typed ones (REQ-m3-test-361; owner, 2026-11-06)
const MOUNTAIN_TEST_TYPE = 2;
const MOUNTAIN_CHOICES = 6;     // the right name and its five nearest areas (REQ-m3-test-122)
const MOUNTAIN_REACH_PX = 12;   // a tap this close outside an area still selects the nearest one (NFR-m3-test-036)
const MOUNTAIN_REGIONS = ['all', 'west', 'mitte', 'ost'];

function mountainShuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// As the river names (REQ-m3-test-050); spaces do not matter (REQ-m3-test-130).
const mountainKey = (text) => mountainBase(text).replace(/\s+/g, '');

// The name itself, or one of the names the data lists for the area ("Ötztaler", "Totes", "Gesäuse"), REQ-m3-test-130.
function matchesMountainName(input, area) {
  const typed = mountainKey(input);
  return typed !== '' && [area.name, ...(area.accept || [])].some((n) => mountainKey(n) === typed);
}

function mountainRings(path) {
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

function mountainDistance(pt, area) {
  if (area.rings.some((r) => pointInRing(pt, r))) return 0;
  let best = Infinity;
  for (const r of area.rings) for (let i = 0; i < r.length; i++) best = Math.min(best, segmentDistance(pt, r[i], r[(i + 1) % r.length]));
  return best;
}

// The area under the point; else the nearest area within px screen pixels of its outline, else null (REQ-m3-test-116, -123,
// NFR-m3-test-036). Inside always wins (the smallest area when outlines overlap), so widening never takes a point from a neighbour. scale: screen pixels per map unit.
function areaAt(pt, areas, scale, px = MOUNTAIN_REACH_PX) {
  // Where outlines overlap, the smaller area wins, so a small area is never hidden by a large one (UR-m3-test-169).
  const inside = areas.filter((a) => a.rings.some((r) => pointInRing(pt, r))).sort((a, b) => a.size - b.size)[0];
  if (inside) return inside;
  let best = null;
  let bestD = Infinity;
  for (const a of areas) {
    const d = mountainDistance(pt, a) * scale;
    if (d < bestD) { bestD = d; best = a; }
  }
  return bestD <= px ? best : null;
}

function withMountainRings(areas) {
  return areas.map((a) => {
    const rings = mountainRings(a.path);
    const big = rings.reduce((m, r) => (r.length > m.length ? r : m), rings[0]);
    const centre = [big.reduce((s, p) => s + p[0], 0) / big.length, big.reduce((s, p) => s + p[1], 0) / big.length];
    const size = rings.reduce((s, r) => s + Math.abs(r.reduce((t, p, i) => { const q = r[(i + 1) % r.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2, 0);
    return { ...a, rings, centre, size };
  });
}

// The right area and the five nearest of all areas, in alphabetical order (REQ-m3-test-122).
function mountainChoices(target, areas) {
  const near = areas.filter((a) => a.id !== target.id)
    .sort((a, b) => Math.hypot(a.centre[0] - target.centre[0], a.centre[1] - target.centre[1])
      - Math.hypot(b.centre[0] - target.centre[0], b.centre[1] - target.centre[1]))
    .slice(0, MOUNTAIN_CHOICES - 1);
  return [target, ...near].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

// Endless practice (REQ-m3-test-120 to -125). direction: 'map-to-name' | 'name-to-map'; region: 'all' | 'west' | 'mitte' | 'ost'.
function createMountainPractice({ areas, direction = 'map-to-name', region = 'all', rng = Math.random }) {
  let lastId = null;
  let question = null;
  let right = 0;
  let total = 0;
  const pool = () => areas.filter((a) => region === 'all' || a.region === region);
  function draw() {
    const p = pool().filter((a) => a.id !== lastId);
    const target = p[Math.floor(rng() * p.length)];
    lastId = target.id;
    question = { target, answered: false };
  }
  draw();
  return {
    get direction() { return direction; },
    get region() { return region; },
    current: () => question,
    options: () => mountainChoices(question.target, areas),
    // Switching shows a new question and keeps the count (REQ-m3-test-120, -121).
    setDirection(d) { if (d !== direction) { direction = d; draw(); } },
    setRegion(r) { if (r !== region && MOUNTAIN_REGIONS.includes(r)) { region = r; lastId = null; draw(); } },
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

// 10 questions from all areas: 5 name to map (pointing first), then 5 map to name (typed); different within a block (REQ-m3-test-126).
function createMountainTest({ areas, rng = Math.random }) {
  const block = (type, n) => mountainShuffle(areas, rng).slice(0, n).map((target) => ({ type, target, answer: null }));
  const questions = [...block('name-to-map', MOUNTAIN_TEST_POINT), ...block('map-to-name', MOUNTAIN_TEST_TYPE)];
  let index = 0;
  const matchChosen = (q) => (q.type === 'name-to-map'
    ? areas.find((a) => a.id === q.answer)
    : areas.find((a) => matchesMountainName(q.answer, a))) || null;
  return {
    total: questions.length,
    get index() { return index; },
    get finished() { return index >= questions.length; },
    current: () => (index >= questions.length ? null : questions[index]),
    // Records the confirmed answer and moves on; nothing is revealed (REQ-m3-test-129).
    confirm(value) {
      if (index >= questions.length) return false;
      if (value === null || value === undefined || String(value).trim() === '') return false;
      questions[index].answer = value;
      index += 1;
      return true;
    },
    // chosen: the area the child picked or typed, or null when a typed name matches none (REQ-m3-test-132).
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
  module.exports = { matchesMountainName, mountainRings, areaAt, withMountainRings, mountainChoices, createMountainPractice, createMountainTest, MOUNTAIN_TEST_POINT, MOUNTAIN_TEST_TYPE, MOUNTAIN_CHOICES, MOUNTAIN_REGIONS };
}
