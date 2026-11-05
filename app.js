const NS = 'http://www.w3.org/2000/svg';
const highlight = createHighlight();
const svg = document.getElementById('map');
const list = document.getElementById('river-list');
const label = document.getElementById('river-label');
const $ = (id) => document.getElementById(id);
svg.setAttribute('viewBox', MAP_DATA.viewBox);

const border = document.createElementNS(NS, 'path');
border.setAttribute('d', MAP_DATA.border);
border.setAttribute('class', 'border');
svg.appendChild(border);

const paths = {}, buttons = {}, hits = {};
let mode = 'explore';
let session = null;
let test = null;      // current test, or null on the start/end screens
let testDone = false; // true once a test has ended
let reviewing = null; // review items while browsing a finished test, else null
let reviewIndex = 0;
let testChoice = null; // river selected but not yet confirmed (name to path)
const results = createResults((() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} });
let result = null; // outcome of the current question's answer, or null while unanswered

const nameOf = (id) => MAP_DATA.rivers.find((r) => r.id === id).name;

function renderExplore() {
  const sel = highlight.get();
  svg.classList.toggle('has-selection', sel !== null);
  for (const r of MAP_DATA.rivers) {
    paths[r.id].setAttribute('class', 'river' + (r.id === sel ? ' selected' : ''));
    buttons[r.id].setAttribute('aria-pressed', String(r.id === sel));
  }
  const river = MAP_DATA.rivers.find((r) => r.id === sel);
  label.textContent = river ? river.name : 'Wähle einen Fluss';
}

function renderHistory() {
  const m = hist.marks();
  svg.classList.add('has-selection');
  for (const r of MAP_DATA.rivers) paths[r.id].setAttribute('class', 'river' + (m[r.id] ? ' ' + m[r.id] : ''));
}

function renderPractice() {
  const run = session && !session.finished;
  if (session) { $('start-p2n').setAttribute('aria-pressed', String(session.direction === 'path-to-name')); $('start-n2p').setAttribute('aria-pressed', String(session.direction === 'name-to-path')); }
  $('practice-run').hidden = !run;
  svg.classList.toggle('practice-answering', !!run && session.direction === 'name-to-path' && !result);
  svg.classList.toggle('has-selection', !!run);
  for (const r of MAP_DATA.rivers) {
    let cls = 'river';
    if (run) {
      const q = session.current();
      if (result) {
        if (r.id === result.correctId) cls += ' correct';
        else if (r.id === result.chosenId) cls += ' wrong';
      } else if (session.direction === 'path-to-name' && r.id === q.target.id) cls += ' target';
      if (!run) cls = 'river';
    }
    paths[r.id].setAttribute('class', cls);
  }
  if (!session) { $('progress').textContent = ''; return; }
  const q = session.current();
  $('progress').textContent = tally.right + ' von ' + tally.total + ' richtig';
  $('question').textContent = session.direction === 'path-to-name'
    ? 'Wie heißt der orange markierte Fluss?'
    : 'Tippe auf den Fluss: ' + q.target.name;
  const answers = $('answers');
  answers.replaceChildren();
  if (session.direction === 'path-to-name') {
    for (const o of q.options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.name;
      b.disabled = !!result;
      if (result && o.id === result.correctId) b.className = 'right';
      else if (result && o.id === result.chosenId) b.className = 'mistake';
      b.addEventListener('click', () => answer(o.id));
      answers.appendChild(b);
    }
  }
  const fb = $('feedback');
  fb.className = result ? (result.correct ? 'right' : 'mistake') : '';
  if (!result) fb.textContent = '';
  else if (result.correct) fb.textContent = Feedback.right(nameOf(result.correctId));
  else MapLabels.wrongText(fb, Feedback.wrong(nameOf(result.correctId), nameOf(result.chosenId), false));
  $('next').hidden = !result;
}

function renderTest() {
  const run = !!test && !test.finished;
  $('test-look').hidden = !(testDone && reviewing);
  $('test-start').hidden = run || testDone;
  $('test-run').hidden = !run;
  $('test-end').hidden = !testDone || !!reviewing;
  svg.classList.toggle('practice-answering', run && test.current().type === 'name-to-path');
  svg.classList.toggle('has-selection', (run && test.current().type === 'path-to-name') || !!(testDone && reviewing));
  for (const r of MAP_DATA.rivers) {
    let cls = 'river';
    if (testDone && reviewing) {
      const it = reviewing[reviewIndex];
      if (r.id === it.target.id) cls += ' correct';
      else if (it.chosen && r.id === it.chosen.id) cls += ' wrong';
    } else if (run) {
      const q = test.current();
      if (q.type === 'path-to-name' && r.id === q.target.id) cls += ' target';
      else if (q.type === 'name-to-path' && r.id === testChoice) cls += ' selected';
    }
    paths[r.id].setAttribute('class', cls);
  }
  $('test-title').textContent = 'Test Nr. ' + (results.testCount() + 1);
  if (testDone && reviewing) { renderReview(); return; }
  if (testDone) {
    $('test-done').textContent = 'Test Nr. ' + results.testCount() + ' geschafft!';
    $('test-score').textContent = test.score() + ' von ' + test.total;
    return;
  }
  if (!run) return;
  const q = test.current();
  $('test-progress').textContent = 'Frage ' + (test.index + 1) + ' von ' + test.total;
  const typing = q.type === 'path-to-name';
  $('test-type').hidden = !typing;
  $('test-question').textContent = typing ? 'Wie heißt der orange markierte Fluss?' : 'Tippe auf den Fluss: ' + q.target.name;
  $('test-confirm').disabled = typing ? $('test-name').value.trim() === '' : testChoice === null;
}

function renderReview() {
  const it = reviewing[reviewIndex];
  const typed = it.type === 'path-to-name';
  $('look-progress').dataset.results = reviewing.map((i) => (i.correct ? 1 : 0)).join('');
  $('look-progress').textContent = 'Frage ' + (reviewIndex + 1) + ' von ' + reviewing.length;
  $('look-question').textContent = typed ? 'Wie heißt der markierte Fluss?' : 'Tippe auf den Fluss: ' + it.target.name;
  const v = $('look-verdict');
  v.className = it.correct ? 'right' : 'mistake';
  if (typed) {
    $('look-answer').textContent = 'Du hast geschrieben: „' + it.answer.trim() + '“';
    if (it.correct) v.textContent = Feedback.right(it.target.name, it.answer);
    else if (it.chosen) MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
    else v.textContent = Feedback.wrongNoMatch(it.target.name, it.answer, 'keiner der 14 Flüsse');
  } else {
    $('look-answer').textContent = 'Du hast gewählt: ' + it.chosen.name;
    if (it.correct) v.textContent = Feedback.right(it.target.name); else MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
  }
  $('look-prev').disabled = reviewIndex === 0;
  $('look-next').disabled = reviewIndex === reviewing.length - 1;
}

function startTest() {
  reviewing = null;
  test = createTest({ rivers: MAP_DATA.rivers });
  testDone = false;
  testChoice = null;
  $('test-name').value = '';
  render();
}

function confirmTest() {
  const q = test.current();
  const value = q.type === 'path-to-name' ? $('test-name').value : testChoice;
  if (!test.confirm(value)) return;
  testChoice = null;
  $('test-name').value = '';
  if (test.finished) { testDone = true; results.addTest(test.score(), test.total); Progress.finishTest('rivers', test.score(), test.total, test.review()); }
  render();
  if (!test.finished && test.current().type === 'path-to-name') $('test-name').focus();
}

// Labels for a wrong answer: in practice, and in the review of a wrong test answer (FEAT-m3-test-020).
function labelItems() {
  let c = null, w = null;
  if (mode === 'practice' && session && result && !result.correct) { c = result.correctId; w = result.chosenId; }
  else if (mode === 'test' && reviewing && !reviewing[reviewIndex].correct) { const it = reviewing[reviewIndex]; c = it.target.id; w = it.chosen ? it.chosen.id : null; }
  const out = [];
  if (w) out.push({ el: paths[w], name: nameOf(w), kind: 'wrong', mid: true });
  if (c) out.push({ el: paths[c], name: nameOf(c), kind: 'right', mid: true });
  return out;
}

function render() {
  const practice = mode === 'practice';
  const testing = mode === 'test';
  const history = mode === 'history';
  hist.sync(history);
  $('mode-test').setAttribute('aria-pressed', String(testing));
  $('test').hidden = !testing;
  document.querySelector('main').classList.toggle('testing', testing);
  $('mode-explore').setAttribute('aria-pressed', String(!practice && !testing && !history));
  $('mode-practice').setAttribute('aria-pressed', String(practice));
  document.querySelector('main').classList.toggle('practicing', practice);
  $('practice').hidden = !practice;
  list.hidden = practice || testing || history;
  label.hidden = practice || testing || history;
  if (testing) renderTest(); else if (practice) renderPractice(); else if (history) renderHistory(); else renderExplore();
  MapLabels.draw(svg, labelItems());
}

function answer(id) {
  if (!session || result) return;
  result = Progress.track('rivers', session.answer(id));
  if (result) { tally.total += 1; if (result.correct) tally.right += 1; }
  render();
}

// Practice is endless (like the other topics): a new set of five follows the last one; the score keeps counting.
let tally = { right: 0, total: 0 };
function start(direction, keepTally) {
  if (!keepTally || !session || session.direction !== direction) tally = { right: 0, total: 0 };
  session = createSession({ rivers: MAP_DATA.rivers, direction });
  result = null;
  render();
}

function choose(id) {
  highlight.select(id);
  render();
}

for (const r of MAP_DATA.rivers) {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', r.path);
  p.setAttribute('class', 'river');
  p.setAttribute('data-id', r.id);
  paths[r.id] = p;
  svg.appendChild(p);
}
// Wider invisible targets on top, so rivers are easy to hit by touch (NFR-m3-test-007).
for (const r of MAP_DATA.rivers) {
  const h = document.createElementNS(NS, 'path');
  h.setAttribute('d', r.path);
  h.setAttribute('class', 'hit');
  h.setAttribute('data-hit', r.id);
  h.addEventListener('click', () => {
    if (mode === 'explore') choose(r.id);
    else if (mode === 'practice' && session && session.direction === 'name-to-path') answer(r.id);
    else if (mode === 'test' && test && !test.finished && test.current().type === 'name-to-path') { testChoice = r.id; render(); }
  });
  hits[r.id] = h;
  svg.appendChild(h);

  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = r.name;
  b.addEventListener('click', () => choose(r.id));
  buttons[r.id] = b;
  li.appendChild(b);
  list.appendChild(li);
}

const hist = HistoryView.attach({ topic: 'rivers', section: 'rivers', buttonId: 'mode-history', items: MAP_DATA.rivers.map((r) => ({ key: r.id, name: r.name })),
  enter: () => { mode = 'history'; reviewing = null; test = null; testDone = false; session = null; result = null; render(); }, change: renderHistory });
$('mode-explore').addEventListener('click', () => { mode = 'explore'; reviewing = null; test = null; testDone = false; render(); });
$('mode-test').addEventListener('click', () => { mode = 'test'; reviewing = null; test = null; testDone = false; testChoice = null; render(); });
$('test-review').addEventListener('click', () => { reviewing = test.review(); reviewIndex = 0; render(); });
$('look-prev').addEventListener('click', () => { if (reviewIndex > 0) { reviewIndex -= 1; render(); } });
$('look-next').addEventListener('click', () => { if (reviewIndex < reviewing.length - 1) { reviewIndex += 1; render(); } });
$('look-end').addEventListener('click', () => { reviewing = null; render(); });
$('test-go').addEventListener('click', startTest);
$('test-again').addEventListener('click', startTest);
$('test-back').addEventListener('click', () => { reviewing = null; test = null; testDone = false; render(); });
$('test-confirm').addEventListener('click', confirmTest);
$('test-name').addEventListener('input', renderTest);
$('test-name').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('test-confirm').disabled) confirmTest(); });
$('mode-practice').addEventListener('click', () => { mode = 'practice'; reviewing = null; test = null; testDone = false; session = null; result = null; start('path-to-name', true); });
$('start-p2n').addEventListener('click', () => start('path-to-name'));
$('start-n2p').addEventListener('click', () => start('name-to-path'));
$('next').addEventListener('click', () => { if (session.next()) { result = null; if (session.finished) { results.addPracticeSession(); start(session.direction, true); } else render(); } });
render();
