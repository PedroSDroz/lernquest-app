// Practice session logic (REQ-m3-test-011 to REQ-m3-test-019). Pure, no DOM.
const SESSION_LENGTH = 5;

function shuffle(items, rng) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// direction: 'path-to-name' | 'name-to-path'
function createSession({ rivers, direction, rng = Math.random }) {
  if (direction !== 'path-to-name' && direction !== 'name-to-path') throw new Error('unknown direction');
  const targets = shuffle(rivers, rng).slice(0, SESSION_LENGTH);
  const questions = targets.map((target) => {
    const q = { target, answer: null };
    if (direction === 'path-to-name') {
      const others = shuffle(rivers.filter((r) => r.id !== target.id), rng).slice(0, 3);
      q.options = [target, ...others].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }
    return q;
  });
  let index = 0;
  let finished = false;

  return {
    direction,
    total: SESSION_LENGTH,
    get index() { return index; },
    get finished() { return finished; },
    current: () => (finished ? null : questions[index]),
    // Records the child's choice; the first answer per question is final (REQ-013, REQ-014).
    answer(id) {
      const q = questions[index];
      if (finished || q.answer !== null) return null;
      q.answer = id;
      return { correct: id === q.target.id, correctId: q.target.id, chosenId: id };
    },
    // Moves on only after the current question is answered (REQ-017).
    next() {
      if (finished || questions[index].answer === null) return false;
      if (index === questions.length - 1) finished = true;
      else index += 1;
      return true;
    },
    score: () => questions.filter((q) => q.answer === q.target.id).length,
  };
}

if (typeof module !== 'undefined') module.exports = { createSession, SESSION_LENGTH };
