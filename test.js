// Baseline test logic (REQ-m3-test-021 to REQ-m3-test-028). Pure, no DOM.
const TEST_HALF = 5;

function shuffleItems(items, rng) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lower case, umlauts and ß written out as ae, oe, ue, ss, other accents removed (REQ-m3-test-027).
// Expanding rather than folding keeps "Muer" from matching "Mur".
function normaliseName(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function matchesName(input, riverName) {
  const typed = normaliseName(input);
  return typed !== '' && typed === normaliseName(riverName);
}

// Ten questions about ten different rivers drawn from the river set: five name to path, then five path to name (REQ-m3-test-022, REQ-m3-test-178).
function createTest({ rivers, rng = Math.random }) {
  if (rivers.length < TEST_HALF * 2) throw new Error('the test needs at least ten rivers');
  const shuffled = shuffleItems(rivers, rng).slice(0, TEST_HALF * 2);
  const questions = [
    ...shuffled.slice(0, TEST_HALF).map((target) => ({ type: 'name-to-path', target, answer: null })),
    ...shuffled.slice(TEST_HALF).map((target) => ({ type: 'path-to-name', target, answer: null })),
  ];
  let index = 0;
  return {
    total: questions.length,
    get index() { return index; },
    get finished() { return index >= questions.length; },
    current: () => (index >= questions.length ? null : questions[index]),
    // Records the confirmed answer and moves on; nothing is revealed (REQ-m3-test-025, -026).
    // value: a river id (name to path) or typed text (path to name).
    confirm(value) {
      if (index >= questions.length) return false;
      const q = questions[index];
      if (value === null || value === undefined || String(value).trim() === '') return false;
      q.answer = value;
      index += 1;
      return true;
    },
    // Every question with the child's answer resolved (REQ-m3-test-031 to -033); available once finished.
    // chosen: the river the child picked or typed, or null when a typed name matches no river.
    review() {
      if (index < questions.length) return null;
      return questions.map((q) => {
        const chosen = q.type === 'name-to-path'
          ? rivers.find((r) => r.id === q.answer) || null
          : rivers.find((r) => matchesName(q.answer, r.name)) || null;
        return { type: q.type, target: q.target, answer: q.answer, chosen, correct: !!chosen && chosen.id === q.target.id };
      });
    },
    score: () => questions.filter((q) => (q.type === 'name-to-path'
      ? q.answer === q.target.id
      : q.answer !== null && matchesName(q.answer, q.target.name))).length,
  };
}

if (typeof module !== 'undefined') module.exports = { createTest, matchesName, normaliseName, TEST_HALF };
