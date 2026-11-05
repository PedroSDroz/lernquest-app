// Page logic for the lakes (FEAT-m3-test-011). Self-contained; the river and Bundeslaender pages are untouched.
(() => {
  const g = (id) => document.getElementById(id);
  const lakes = withRings(LAKE_DATA.lakes);
  const byId = Object.fromEntries(lakes.map((l) => [l.id, l]));
  const svg = g('lk-map');
  svg.setAttribute('viewBox', LAKE_DATA.viewBox);
  const VB_WIDTH = LAKE_DATA.viewBox.split(' ').map(Number)[2];
  const store = (() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} };
  const kept = createResults(store, 'm3-test-lakes-results-v1');

  let active = false;
  let mode = 'explore';
  let sel = null;           // lake id in Karte erkunden
  let practice = null, result = null;
  let test = null, testDone = false, choice = null, reviewing = null, reviewIndex = 0;

  const NSV = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => { const e = document.createElementNS(NSV, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const areas = {};
  for (const s of REGION_DATA.states) svg.appendChild(el('path', { d: s.path, class: 'bl' }));
  for (const l of lakes) { areas[l.id] = el('path', { d: l.path, class: 'lk' }); svg.appendChild(areas[l.id]); }

  // Screen pixels per map unit, read afresh at every click so it follows a resize (NFR-m3-test-031).
  const unit = () => { const w = svg.getBoundingClientRect().width; return w > 0 ? w / VB_WIDTH : 1.6; };

  function view() {
    const v = { live: false, dim: false, lk: {} };
    if (mode === 'history') { v.dim = true; Object.assign(v.lk, hist.marks()); }
    else if (mode === 'explore') {
      v.live = true;
      if (sel) { v.lk[sel] = 'sel'; v.dim = true; }
    } else if (mode === 'practice' && practice) {
      v.dim = true;
      if (practice.direction === 'name-to-map' && !result) { v.live = true; v.dim = false; }
      if (result) {
        v.lk[result.correctId] = 'correct';
        if (!result.correct) v.lk[result.chosenId] = 'wrong';
      } else if (practice.direction === 'map-to-name') v.lk[practice.current().target.id] = 'target';
    } else if (mode === 'test' && test && !testDone) {
      const q = test.current();
      if (q.type === 'name-to-map') { v.live = true; if (choice) { v.lk[choice] = 'pick'; v.dim = true; } } else { v.lk[q.target.id] = 'target'; v.dim = true; }
    } else if (mode === 'test' && reviewing) {
      const it = reviewing[reviewIndex];
      v.dim = true;
      v.lk[it.target.id] = 'correct';
      if (it.chosen && !it.correct) v.lk[it.chosen.id] = 'wrong';
    }
    return v;
  }

  // Labels for a wrong answer: in practice, and in the review of a wrong test answer (FEAT-m3-test-020).
  function labelItems() {
    let c = null, w = null;
    if (mode === 'practice' && result && !result.correct) { c = result.correctId; w = result.chosenId; }
    else if (mode === 'test' && reviewing && !reviewing[reviewIndex].correct) { const it = reviewing[reviewIndex]; c = it.target.id; w = it.chosen ? it.chosen.id : null; }
    const out = [];
    if (w) out.push({ el: areas[w], name: byId[w].name, kind: 'wrong' });
    if (c) out.push({ el: areas[c], name: byId[c].name, kind: 'right' });
    return out;
  }

  function drawMap() {
    MapLabels.draw(svg, labelItems());
    const v = view();
    svg.classList.toggle('dim', v.dim);
    svg.classList.toggle('live-map', v.live);
    for (const l of lakes) areas[l.id].setAttribute('class', 'lk' + (v.lk[l.id] ? ' ' + v.lk[l.id] : ''));
  }

  // A click or touch selects the nearest lake within 24 screen pixels of its outline (NFR-m3-test-031).
  svg.addEventListener('click', (e) => {
    if (!view().live) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const lake = nearestLake([p.x, p.y], lakes, unit());
    if (!lake) return;
    if (mode === 'explore') sel = sel === lake.id ? null : lake.id;
    else if (mode === 'practice') { if (!result) result = Progress.track('lakes', practice.answer(lake.id)); }
    else if (mode === 'test') choice = lake.id;
    render();
  });

  function renderExplore() {
    g('lk-label').textContent = sel ? byId[sel].name : 'Wähle einen See';
  }

  function renderPractice() {
    g('lk-dir-m2n').setAttribute('aria-pressed', String(practice.direction === 'map-to-name'));
    g('lk-dir-n2m').setAttribute('aria-pressed', String(practice.direction === 'name-to-map'));
    const t = practice.tally();
    g('lk-tally').textContent = t.right + ' von ' + t.total + ' richtig';
    const q = practice.current();
    const m2n = practice.direction === 'map-to-name';
    g('lk-question').textContent = m2n ? 'Welcher See ist orange markiert?' : 'Zeige: ' + q.target.name;
    const box = g('lk-answers');
    box.replaceChildren();
    if (m2n) for (const o of practice.options()) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o.name; b.disabled = !!result;
      if (result && o.id === result.correctId) b.className = 'right';
      else if (result && o.id === result.chosenId) b.className = 'mistake';
      b.addEventListener('click', () => { if (!result) { result = Progress.track('lakes', practice.answer(o.id)); render(); } });
      box.appendChild(b);
    }
    const fb = g('lk-feedback');
    fb.className = 'fb' + (result ? (result.correct ? ' right' : ' mistake') : '');
    if (!result) fb.textContent = '';
    else if (result.correct) fb.textContent = Feedback.right(byId[result.correctId].name);
    else MapLabels.wrongText(fb, Feedback.wrong(byId[result.correctId].name, byId[result.chosenId].name, false));
    g('lk-next').hidden = !result;
  }

  function renderTest() {
    const run = !!test && !testDone;
    g('lk-test-start').hidden = run || testDone;
    g('lk-test-run').hidden = !run;
    g('lk-test-end').hidden = !testDone || !!reviewing;
    g('lk-test-look').hidden = !(testDone && reviewing);
    g('lk-test-title').textContent = 'Test ' + (kept.testCount() + 1);
    if (testDone && reviewing) { renderReview(); return; }
    if (testDone) {
      g('lk-test-done').textContent = 'Test ' + kept.testCount() + ' geschafft!';
      g('lk-test-score').textContent = test.score() + ' von ' + test.total;
      return;
    }
    if (!run) return;
    const q = test.current();
    const typing = q.type === 'map-to-name';
    g('lk-test-progress').textContent = 'Frage ' + (test.index + 1) + ' von ' + test.total;
    g('lk-test-type').hidden = !typing;
    g('lk-test-question').textContent = typing ? 'Wie heißt der orange markierte See?' : 'Zeige: ' + q.target.name;
    g('lk-test-confirm').disabled = typing ? g('lk-test-name').value.trim() === '' : choice === null;
  }

  function renderReview() {
    const it = reviewing[reviewIndex];
    const typed = it.type === 'map-to-name';
    g('lk-look-progress').dataset.results = reviewing.map((i) => (i.correct ? 1 : 0)).join('');
    g('lk-look-progress').textContent = 'Frage ' + (reviewIndex + 1) + ' von ' + reviewing.length;
    g('lk-look-question').textContent = typed ? 'Wie heißt der markierte See?' : 'Zeige: ' + it.target.name;
    const v = g('lk-look-verdict');
    v.className = 'fb ' + (it.correct ? 'right' : 'mistake');
    if (typed) {
      g('lk-look-answer').textContent = 'Du hast geschrieben: „' + String(it.answer).trim() + '“';
      if (it.correct) v.textContent = Feedback.right(it.target.name, it.answer);
      else if (it.chosen) MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
      else v.textContent = Feedback.wrongNoMatch(it.target.name, it.answer, 'keiner der neun Seen');
    } else {
      g('lk-look-answer').textContent = 'Du hast gewählt: ' + it.chosen.name;
      if (it.correct) v.textContent = Feedback.right(it.target.name); else MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
    }
    g('lk-look-prev').disabled = reviewIndex === 0;
    g('lk-look-next').disabled = reviewIndex === reviewing.length - 1;
  }

  function render() {
    g('topic-lakes').setAttribute('aria-pressed', String(active));
    g('lakes').hidden = !active;
    if (!active) return;
    for (const id of ['rivers', 'regions', 'cities']) g(id).hidden = true;
    for (const id of ['topic-rivers', 'topic-regions', 'topic-cities']) g(id).setAttribute('aria-pressed', 'false');
    for (const m of ['explore', 'practice', 'test', 'history']) g('lk-mode-' + m).setAttribute('aria-pressed', String(mode === m));
    hist.sync(mode === 'history');
    g('lk-label').hidden = mode !== 'explore';
    g('lk-dirbar').hidden = mode !== 'practice';
    g('lk-practice').hidden = mode !== 'practice';
    g('lk-test').hidden = mode !== 'test';
    if (mode === 'explore') renderExplore(); else if (mode === 'practice') renderPractice(); else if (mode === 'test') renderTest();
    drawMap();
  }

  function startTest() {
    reviewing = null; testDone = false; choice = null;
    test = createLakeTest({ lakes });
    g('lk-test-name').value = '';
    render();
  }
  function confirmTest() {
    const q = test.current();
    const value = q.type === 'map-to-name' ? g('lk-test-name').value : choice;
    if (!test.confirm(value)) return;
    choice = null; g('lk-test-name').value = '';
    if (test.finished) { testDone = true; kept.addTest(test.score(), test.total); Progress.finishTest('lakes', test.score(), test.total, test.review()); }
    render();
    if (!test.finished && test.current().type === 'map-to-name') g('lk-test-name').focus();
  }
  const reset = () => { sel = null; practice = null; result = null; test = null; testDone = false; reviewing = null; choice = null; };
  const hist = HistoryView.attach({ topic: 'lakes', section: 'lakes', buttonId: 'lk-mode-history', items: lakes.map((l) => ({ key: l.id, name: l.name })),
    enter: () => { reset(); mode = 'history'; render(); }, change: drawMap });

  g('topic-lakes').addEventListener('click', () => { active = true; render(); });
  // The other topics show their own page; they only need the lakes hidden (their handlers run first).
  for (const id of ['topic-rivers', 'topic-regions', 'topic-cities']) g(id).addEventListener('click', () => { active = false; render(); });
  g('lk-mode-explore').addEventListener('click', () => { reset(); mode = 'explore'; render(); });
  g('lk-mode-practice').addEventListener('click', () => { reset(); mode = 'practice'; practice = createLakePractice({ lakes }); render(); });
  g('lk-mode-test').addEventListener('click', () => { reset(); mode = 'test'; render(); });
  const swap = (fn) => () => { fn(); result = null; render(); };
  g('lk-dir-m2n').addEventListener('click', swap(() => practice.setDirection('map-to-name')));
  g('lk-dir-n2m').addEventListener('click', swap(() => practice.setDirection('name-to-map')));
  g('lk-next').addEventListener('click', () => { if (practice.next()) { result = null; render(); } });
  g('lk-test-go').addEventListener('click', startTest);
  g('lk-test-again').addEventListener('click', startTest);
  g('lk-test-back').addEventListener('click', () => { reviewing = null; test = null; testDone = false; render(); });
  g('lk-test-confirm').addEventListener('click', confirmTest);
  g('lk-test-name').addEventListener('input', renderTest);
  g('lk-test-name').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !g('lk-test-confirm').disabled) confirmTest(); });
  g('lk-test-review').addEventListener('click', () => { reviewing = test.review(); reviewIndex = 0; render(); });
  g('lk-look-prev').addEventListener('click', () => { if (reviewIndex > 0) { reviewIndex -= 1; render(); } });
  g('lk-look-next').addEventListener('click', () => { if (reviewIndex < reviewing.length - 1) { reviewIndex += 1; render(); } });
  g('lk-look-end').addEventListener('click', () => { reviewing = null; render(); });
  render();
})();
