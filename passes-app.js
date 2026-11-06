// Page logic for Gipfel und Paesse (FEAT-m3-test-010, FEAT-m3-test-016). Self-contained; the river and region pages are untouched.
(() => {
  const g = (id) => document.getElementById(id);
  // Summits and passes are one list of items; `kind` tells which symbol and which noun (REQ-m3-test-186 to -188).
  const passes = [...PASS_DATA.summits, ...PASS_DATA.passes];
  const NOUN = { summit: 'Gipfel', pass: 'Pass' };
  const noun = (it) => NOUN[it.kind];
  const byId = Object.fromEntries(passes.map((p) => [p.id, p]));
  const psvg = g('ps-map');
  psvg.setAttribute('viewBox', PASS_DATA.viewBox);
  const store = (() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} };
  const kept = createResults(store, 'm3-test-gipfel-paesse-results-v1');
  const HIT_PX = 24; // touch radius from the centre, in screen pixels (NFR-m3-test-026)

  let active = false, mode = 'explore';
  let sel = null, practice = null, result = null;
  let test = null, testDone = false, choice = null, reviewing = null, reviewIndex = 0;

  const NSV = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => { const e = document.createElementNS(NSV, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const rings = {}, marks = {}, halos = {}, hits = {};
  for (const s of REGION_DATA.states) psvg.appendChild(el('path', { d: s.path, class: 'st' }));
  if (window.Layers) Layers.mount({ svg: psvg, host: 'passes' });
  for (const p of passes) {
    rings[p.id] = el('circle', { cx: p.x, cy: p.y, r: 10, class: 'ring' });
    halos[p.id] = el('path', { class: 'pkhalo' });
    marks[p.id] = el('path', { class: 'pk ' + p.kind });
    hits[p.id] = el('circle', { cx: p.x, cy: p.y, r: 14, class: 'phit' });
    psvg.append(rings[p.id], halos[p.id], marks[p.id], hits[p.id]);
  }
  // A tap picks the marker nearest to it inside the 24 px touch radius, so close markers never block each other (NFR-m3-test-052).
  psvg.addEventListener('click', (e) => {
    // Screen to map units through the SVG's own transform, so letterboxing (the map is height-limited) is respected.
    const ctm = psvg.getScreenCTM();
    if (!ctm) return;
    const at = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const limit = HIT_PX / ctm.a;
    let best = null, bestD = limit;
    for (const p of passes) {
      const d = Math.hypot(at.x - p.x, at.y - p.y);
      if (d <= bestD) { best = p.id; bestD = d; }
    }
    if (best) pointed(best);
  });
  // Summit: triangle. Pass: "] [" - two brackets facing each other (REQ-m3-test-188).
  const triangle = (p, k) => `M${p.x} ${p.y - 6.5 * k} L${p.x + 6 * k} ${p.y + 4.5 * k} L${p.x - 6 * k} ${p.y + 4.5 * k} Z`;
  const brackets = (p, k) => `M${p.x - 5 * k} ${p.y - 4.5 * k} H${p.x - 1.6 * k} V${p.y + 4.5 * k} H${p.x - 5 * k} M${p.x + 5 * k} ${p.y - 4.5 * k} H${p.x + 1.6 * k} V${p.y + 4.5 * k} H${p.x + 5 * k}`;
  const shape = (p, k) => (p.kind === 'summit' ? triangle(p, k) : brackets(p, k));

  function view() {
    const v = { live: false, cls: {} };
    if (mode === 'history') Object.assign(v.cls, hist.marks());
    else if (mode === 'explore') { v.live = true; if (sel) v.cls[sel] = 'sel'; }
    else if (mode === 'practice' && practice) {
      const q = practice.current();
      if (practice.direction === 'name-to-map' && !result) v.live = true;
      if (result) { v.cls[result.correctId] = 'correct'; if (!result.correct) v.cls[result.chosenId] = 'wrong'; }
      else if (practice.direction === 'map-to-name') v.cls[q.target.id] = 'target';
    } else if (mode === 'test' && test && !testDone) {
      const q = test.current();
      if (q.type === 'name-to-map') { v.live = true; if (choice) v.cls[choice] = 'pick'; } else v.cls[q.target.id] = 'target';
    } else if (mode === 'test' && reviewing) {
      const it = reviewing[reviewIndex];
      v.cls[it.target.id] = 'correct';
      if (it.chosen && !it.correct) v.cls[it.chosen.id] = 'wrong';
    }
    return v;
  }

  // Labels for a wrong answer: in practice, and in the review of a wrong test answer (FEAT-m3-test-020).
  function labelItems() {
    let c = null, w = null;
    if (mode === 'practice' && result && !result.correct) { c = result.correctId; w = result.chosenId; }
    else if (mode === 'test' && reviewing && !reviewing[reviewIndex].correct) { const it = reviewing[reviewIndex]; c = it.target.id; w = it.chosen ? it.chosen.id : null; }
    const out = [];
    if (w) out.push({ el: marks[w], name: byId[w].name, kind: 'wrong' });
    if (c) out.push({ el: marks[c], name: byId[c].name, kind: 'right' });
    return out;
  }

  function drawMap() {
    MapLabels.draw(psvg, labelItems());
    const v = view();
    // Touch radius in map units from the rendered width; redone on resize (NFR-m3-test-026).
    psvg.style.cursor = v.live ? 'pointer' : 'default';
    const ctm = psvg.getScreenCTM();
    const r = HIT_PX / (ctm ? ctm.a : 1);
    for (const p of passes) {
      const c = v.cls[p.id] || '';
      rings[p.id].setAttribute('class', 'ring ' + c);
      marks[p.id].setAttribute('class', 'pk ' + p.kind + ' ' + c);
      marks[p.id].setAttribute('d', shape(p, c ? 1.4 : 1));
      halos[p.id].setAttribute('d', p.kind === 'pass' ? shape(p, c ? 1.4 : 1) : '');
      hits[p.id].setAttribute('r', r.toFixed(1));
      hits[p.id].setAttribute('class', 'phit' + (v.live ? ' live' : ''));
      hits[p.id].style.pointerEvents = 'none';
    }
  }

  function pointed(id) {
    if (!view().live) return;
    if (mode === 'explore') sel = sel === id ? null : id;
    else if (mode === 'practice') { if (!result) result = Progress.track('passes', practice.answer(id)); }
    else if (mode === 'test') choice = id;
    render();
  }

  function renderExplore() {
    g('ps-label').textContent = sel ? byId[sel].name + ' (' + noun(byId[sel]) + ')' : 'Wähle einen Gipfel oder Pass';
  }

  function renderPractice() {
    g('ps-dir-m2n').setAttribute('aria-pressed', String(practice.direction === 'map-to-name'));
    g('ps-dir-n2m').setAttribute('aria-pressed', String(practice.direction === 'name-to-map'));
    const t = practice.tally();
    g('ps-tally').textContent = t.right + ' von ' + t.total + ' richtig';
    const q = practice.current();
    const m2n = practice.direction === 'map-to-name';
    g('ps-question').textContent = m2n ? 'Welcher ' + noun(q.target) + ' ist orange markiert?' : 'Zeige den ' + noun(q.target) + ': ' + q.target.name;
    const box = g('ps-answers');
    box.replaceChildren();
    if (m2n) for (const o of practice.options()) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o.name; b.disabled = !!result;
      if (result && o.id === result.correctId) b.className = 'right';
      else if (result && o.id === result.chosenId) b.className = 'mistake';
      b.addEventListener('click', () => { if (!result) { result = Progress.track('passes', practice.answer(o.id)); render(); } });
      box.appendChild(b);
    }
    const fb = g('ps-feedback');
    fb.className = 'fb' + (result ? (result.correct ? ' right' : ' mistake') : '');
    if (!result) fb.textContent = '';
    else if (result.correct) fb.textContent = Feedback.right(byId[result.correctId].name);
    else MapLabels.wrongText(fb, Feedback.wrong(byId[result.correctId].name, byId[result.chosenId].name, false));
    g('ps-next').hidden = !result;
  }

  function renderTest() {
    const run = !!test && !testDone;
    g('ps-test-start').hidden = run || testDone;
    g('ps-test-run').hidden = !run;
    g('ps-test-end').hidden = !testDone || !!reviewing;
    g('ps-test-look').hidden = !(testDone && reviewing);
    g('ps-test-title').textContent = 'Test Nr. ' + (kept.testCount() + 1);
    if (testDone && reviewing) { renderReview(); return; }
    if (testDone) {
      g('ps-test-done').textContent = 'Test Nr. ' + kept.testCount() + ' geschafft!';
      g('ps-test-score').textContent = test.score() + ' von ' + test.total;
      return;
    }
    if (!run) return;
    const q = test.current();
    const typing = q.type === 'map-to-name';
    g('ps-test-progress').textContent = 'Frage ' + (test.index + 1) + ' von ' + test.total;
    g('ps-test-type').hidden = !typing;
    g('ps-test-question').textContent = typing ? 'Wie heißt der orange markierte ' + noun(q.target) + '?' : 'Zeige den ' + noun(q.target) + ': ' + q.target.name;
    g('ps-test-confirm').disabled = typing ? g('ps-test-name').value.trim() === '' : choice === null;
  }

  function renderReview() {
    const it = reviewing[reviewIndex];
    const typed = it.type === 'map-to-name';
    g('ps-look-progress').dataset.results = reviewing.map((i) => (i.correct ? 1 : 0)).join('');
    g('ps-look-progress').textContent = 'Frage ' + (reviewIndex + 1) + ' von ' + reviewing.length;
    g('ps-look-question').textContent = typed ? 'Wie heißt der markierte ' + noun(it.target) + '?' : 'Zeige den ' + noun(it.target) + ': ' + it.target.name;
    const v = g('ps-look-verdict');
    v.className = 'fb ' + (it.correct ? 'right' : 'mistake');
    if (typed) {
      g('ps-look-answer').textContent = 'Du hast geschrieben: „' + String(it.answer).trim() + '“';
      if (it.correct) v.textContent = Feedback.right(it.target.name, it.answer);
      else if (it.chosen) MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
      else v.textContent = Feedback.wrongNoMatch(it.target.name, it.answer, 'keiner der 13 Gipfel und Pässe');
    } else {
      g('ps-look-answer').textContent = 'Du hast gewählt: ' + it.chosen.name;
      if (it.correct) v.textContent = Feedback.right(it.target.name); else MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
    }
    g('ps-look-prev').disabled = reviewIndex === 0;
    g('ps-look-next').disabled = reviewIndex === reviewing.length - 1;
  }

  function render() {
    // The topic buttons of the other pages are not touched here; they hide this page themselves (see below).
    g('topic-passes').setAttribute('aria-pressed', String(active));
    g('passes').hidden = !active;
    if (!active) return;
    for (const m of ['explore', 'practice', 'test', 'history']) g('ps-mode-' + m).setAttribute('aria-pressed', String(mode === m));
    hist.sync(mode === 'history');
    g('ps-label').hidden = mode !== 'explore';
    g('ps-dirbar').hidden = mode !== 'practice';
    g('ps-practice').hidden = mode !== 'practice';
    g('ps-test').hidden = mode !== 'test';
    if (mode === 'explore') renderExplore(); else if (mode === 'practice') renderPractice(); else if (mode === 'test') renderTest();
    drawMap();
  }

  function startTest() {
    reviewing = null; testDone = false; choice = null;
    test = createPassTest({ passes });
    g('ps-test-name').value = '';
    render();
  }
  function confirmTest() {
    const q = test.current();
    const value = q.type === 'map-to-name' ? g('ps-test-name').value : choice;
    if (!test.confirm(value)) return;
    choice = null; g('ps-test-name').value = '';
    if (test.finished) { testDone = true; kept.addTest(test.score(), test.total); Progress.finishTest('passes', test.score(), test.total, test.review()); }
    render();
    if (!test.finished && test.current().type === 'map-to-name') g('ps-test-name').focus();
  }
  const reset = () => { sel = null; practice = null; result = null; test = null; testDone = false; reviewing = null; choice = null; };
  const hist = HistoryView.attach({ topic: 'passes', section: 'passes', buttonId: 'ps-mode-history', items: passes.map((p) => ({ key: p.id, name: p.name, group: p.kind === 'summit' ? 'Gipfel' : 'Pässe' })),
    enter: () => { reset(); mode = 'history'; render(); }, change: drawMap });

  // Show this topic: hide the others (they re-show themselves when their own button is pressed), and hide this one
  // when any other topic button is pressed.
  const others = ['rivers', 'regions', 'lakes', 'cities', 'countries', 'mountains'].filter((id) => g(id));
  g('topic-passes').addEventListener('click', () => {
    active = true;
    for (const id of others) { g(id).hidden = true; if (g('topic-' + id)) g('topic-' + id).setAttribute('aria-pressed', 'false'); }
    render();
  });
  for (const id of others) if (g('topic-' + id)) g('topic-' + id).addEventListener('click', () => { active = false; render(); });
  g('ps-mode-explore').addEventListener('click', () => { reset(); mode = 'explore'; render(); });
  g('ps-mode-practice').addEventListener('click', () => { reset(); mode = 'practice'; practice = createPassPractice({ passes }); render(); });
  g('ps-mode-test').addEventListener('click', () => { reset(); mode = 'test'; render(); });
  const swap = (fn) => () => { fn(); result = null; render(); };
  g('ps-dir-m2n').addEventListener('click', swap(() => practice.setDirection('map-to-name')));
  g('ps-dir-n2m').addEventListener('click', swap(() => practice.setDirection('name-to-map')));
  g('ps-next').addEventListener('click', () => { if (practice.next()) { result = null; render(); } });
  g('ps-test-go').addEventListener('click', startTest);
  g('ps-test-again').addEventListener('click', startTest);
  g('ps-test-back').addEventListener('click', () => { reviewing = null; test = null; testDone = false; render(); });
  g('ps-test-confirm').addEventListener('click', confirmTest);
  g('ps-test-name').addEventListener('input', renderTest);
  g('ps-test-name').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !g('ps-test-confirm').disabled) confirmTest(); });
  g('ps-test-review').addEventListener('click', () => { reviewing = test.review(); reviewIndex = 0; render(); });
  g('ps-look-prev').addEventListener('click', () => { if (reviewIndex > 0) { reviewIndex -= 1; render(); } });
  g('ps-look-next').addEventListener('click', () => { if (reviewIndex < reviewing.length - 1) { reviewIndex += 1; render(); } });
  g('ps-look-end').addEventListener('click', () => { reviewing = null; render(); });
  window.addEventListener('resize', () => { if (active) drawMap(); });
  render();
})();
