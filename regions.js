// Logic for Bundeslaender and Hauptstaedte (REQ-m3-test-040 to REQ-m3-test-052). Pure, no DOM.
// An item is { kind: 'state' | 'capital', id, name }; a state and its capital share the state's id.
const regionBase = typeof normaliseName === 'function' ? normaliseName : require('./test.js').normaliseName;
const REGION_PER_KIND = 3;

function regionItems(states) {
  return states.flatMap((s) => [
    { kind: 'state', id: s.id, name: s.name },
    { kind: 'capital', id: s.id, name: s.capital.name },
  ]);
}

function regionShuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// As the river names (REQ-m3-test-050), plus: "St." and "Sankt" are equal and the full stop after "St" is optional.
function regionKey(text) {
  return regionBase(text)
    .replace(/\s+/g, ' ')
    .replace(/^st\b\.?\s*/, 'sankt ');
}

function matchesRegionName(input, name) {
  const typed = regionKey(input);
  return typed !== '' && typed === regionKey(name);
}

// Endless practice (REQ-m3-test-040 to -045). direction: 'map-to-name' | 'name-to-map'.
function createRegionPractice({ states, kind = 'state', direction = 'map-to-name', rng = Math.random }) {
  const items = regionItems(states);
  let lastId = null;
  let question = null;
  let right = 0;
  let total = 0;
  const optionsOf = (k) => items.filter((i) => i.kind === k).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  function draw() {
    const pool = items.filter((i) => i.kind === kind && i.id !== lastId);
    const target = pool[Math.floor(rng() * pool.length)];
    lastId = target.id;
    question = { target, answered: false };
  }
  draw();
  return {
    get kind() { return kind; },
    get direction() { return direction; },
    current: () => question,
    options: () => optionsOf(kind), // all nine names of the kind (REQ-m3-test-042)
    // Switching shows a new question and keeps the count (REQ-m3-test-041).
    setKind(k) { if (k !== kind) { kind = k; lastId = null; draw(); } },
    setDirection(d) { if (d !== direction) { direction = d; draw(); } },
    // The first answer per question is final; id is the state id for both kinds.
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

// 12 questions: 3 of each of state/capital to map (pointing first), then 3 of each map to state/capital (typed) (REQ-m3-test-046).
function createRegionTest({ states, rng = Math.random }) {
  const items = regionItems(states);
  const pick = (kind) => regionShuffle(items.filter((i) => i.kind === kind), rng).slice(0, REGION_PER_KIND);
  const block = (type) => regionShuffle(
    ['state', 'capital'].flatMap((kind) => pick(kind).map((target) => ({ type, kind, target, answer: null }))), rng);
  const questions = [...block('name-to-map'), ...block('map-to-name')];
  let index = 0;
  const matchChosen = (q) => (q.type === 'name-to-map'
    ? items.find((i) => i.kind === q.kind && i.id === q.answer)
    : items.find((i) => i.kind === q.kind && matchesRegionName(q.answer, i.name))) || null;
  return {
    total: questions.length,
    get index() { return index; },
    get finished() { return index >= questions.length; },
    current: () => (index >= questions.length ? null : questions[index]),
    // Records the confirmed answer and moves on; nothing is revealed (REQ-m3-test-049).
    confirm(value) {
      if (index >= questions.length) return false;
      if (value === null || value === undefined || String(value).trim() === '') return false;
      questions[index].answer = value;
      index += 1;
      return true;
    },
    // chosen: the item the child picked or typed, or null when a typed name matches none (REQ-m3-test-052).
    review() {
      if (index < questions.length) return null;
      return questions.map((q) => {
        const chosen = matchChosen(q);
        return { type: q.type, kind: q.kind, target: q.target, answer: q.answer, chosen, correct: !!chosen && chosen.id === q.target.id };
      });
    },
    score() {
      return questions.filter((q) => q.answer !== null && matchChosen(q) && matchChosen(q).id === q.target.id).length;
    },
  };
}

if (typeof module !== 'undefined') module.exports = { regionItems, matchesRegionName, createRegionPractice, createRegionTest, REGION_PER_KIND };
