// Logic for the Paesse (FEAT-m3-test-010, REQ-m3-test-079 to REQ-m3-test-091). Pure, no DOM.
// A pass is { id, name, also: [accepted typed forms], x, y }.
const passBase = typeof normaliseName === 'function' ? normaliseName : require('./test.js').normaliseName;
const PASS_POINTING = 3;
const PASS_TYPING = 3;
const MAX_OPTIONS = 6;

function passShuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const passKey = (text) => passBase(text).replace(/\s+/g, ' ');

// As the river names (REQ-m3-test-088): case, spaces and accents ignored; the other printed forms of a name also match.
function matchesPassName(input, pass) {
  const typed = passKey(input);
  return typed !== '' && [pass.name, ...(pass.also || [])].some((n) => passKey(n) === typed);
}

// Endless practice (REQ-m3-test-079 to -084). direction: 'map-to-name' | 'name-to-map'.
function createPassPractice({ passes, direction = 'map-to-name', rng = Math.random }) {
  let lastId = null;
  let question = null;
  let right = 0;
  let total = 0;
  function draw() {
    const pool = passes.filter((p) => p.id !== lastId);
    const target = pool[Math.floor(rng() * pool.length)];
    lastId = target.id;
    // Answer buttons: only items of the target's kind, at most 6 including the target, alphabetical (REQ-m3-test-191).
    const same = passes.filter((p) => p.kind === target.kind && p.id !== target.id);
    const others = passShuffle(same, rng).slice(0, MAX_OPTIONS - 1);
    question = { target, answered: false, options: [target, ...others].sort((a, b) => a.name.localeCompare(b.name, 'de')) };
  }
  draw();
  return {
    get direction() { return direction; },
    current: () => question,
    options: () => question.options,
    setDirection(d) { if (d !== direction) { direction = d; draw(); } },
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

// Pointing questions (name to map) first, then typed ones (map to name) (REQ-m3-test-085, REQ-m3-test-194).
// A list of one kind (e.g. the passes alone) gives 3 + 3 questions. With both kinds ('pass', 'summit') the test has 8:
// 5 pointing (3 summits, 2 passes) then 3 typed (2 summits, 1 pass); the questions of a block are mixed in random order.
const KIND_COUNTS = { 'name-to-map': { summit: 3, pass: 2 }, 'map-to-name': { summit: 2, pass: 1 } };
function createPassTest({ passes, rng = Math.random }) {
  const kinds = [...new Set(passes.map((p) => p.kind))];
  const legacy = kinds.length === 1; // one kind only (the passes alone): 3 + 3
  const count = (type, k) => (legacy ? (type === 'name-to-map' ? PASS_POINTING : PASS_TYPING) : KIND_COUNTS[type][k] || 0);
  const block = (type) => kinds.flatMap((k) => passShuffle(passes.filter((p) => p.kind === k), rng).slice(0, count(type, k)))
    .map((target) => ({ type, target, answer: null }));
  const questionsShuffled = [...passShuffle(block('name-to-map'), rng), ...passShuffle(block('map-to-name'), rng)];
  let index = 0;
  const matchChosen = (q) => (q.type === 'name-to-map'
    ? passes.find((p) => p.id === q.answer)
    : passes.find((p) => matchesPassName(q.answer, p))) || null;
  return {
    total: questionsShuffled.length,
    get index() { return index; },
    get finished() { return index >= questionsShuffled.length; },
    current: () => (index >= questionsShuffled.length ? null : questionsShuffled[index]),
    confirm(value) {
      if (index >= questionsShuffled.length) return false;
      if (value === null || value === undefined || String(value).trim() === '') return false;
      questionsShuffled[index].answer = value;
      index += 1;
      return true;
    },
    review() {
      if (index < questionsShuffled.length) return null;
      return questionsShuffled.map((q) => {
        const chosen = matchChosen(q);
        return { type: q.type, target: q.target, answer: q.answer, chosen, correct: !!chosen && chosen.id === q.target.id };
      });
    },
    score() {
      return questionsShuffled.filter((q) => q.answer !== null && matchChosen(q) && matchChosen(q).id === q.target.id).length;
    },
  };
}

if (typeof module !== 'undefined') module.exports = { matchesPassName, createPassPractice, createPassTest, PASS_POINTING, PASS_TYPING };
