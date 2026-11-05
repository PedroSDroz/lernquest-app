// Page logic for the mountain areas (FEAT-m3-test-012). Self-contained; the other topics are untouched.
(() => {
  const g = (id) => document.getElementById(id);
  const areas = withMountainRings(MOUNTAIN_DATA.areas);
  const byId = Object.fromEntries(areas.map((a) => [a.id, a]));
  const svg = g('mt-map');
  svg.setAttribute('viewBox', MOUNTAIN_DATA.viewBox);
  const VB_WIDTH = MOUNTAIN_DATA.viewBox.split(' ').map(Number)[2];
  g('mt-credit').textContent = MOUNTAIN_DATA.credit + '. Die helle Fläche ist Österreich.';
  const store = (() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} };
  const kept = createResults(store, 'm3-test-mountains-results-v1');

  let active = false;
  let mode = 'explore';
  let sel = null;           // area id in Karte erkunden
  let practice = null, result = null;
  let test = null, testDone = false, choice = null, reviewing = null, reviewIndex = 0;

  const NSV = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => { const e = document.createElementNS(NSV, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const groups = {};
  // Austria's land behind the areas, for orientation: an outline pass, then a fill pass that hides the borders between states.
  const land = typeof REGION_DATA !== 'undefined' ? REGION_DATA.states : [];
  for (const s of land) svg.appendChild(el('path', { d: s.path, class: 'mt-land-edge' }));
  for (const s of land) svg.appendChild(el('path', { d: s.path, class: 'mt-land' }));
  // Three layers per area: a white border, the fill (its own stroke hides seams between joined units), the outline.
  for (const a of areas) {
    const grp = el('g', { class: 'mt' });
    for (const c of ['b', 'f', 'o']) grp.appendChild(el('path', { d: a.path, class: c }));
    groups[a.id] = grp;
    svg.appendChild(grp);
  }

  // Screen pixels per map unit, read afresh at every click so it follows a resize (NFR-m3-test-036).
  const unit = () => { const w = svg.getBoundingClientRect().width; return w > 0 ? w / VB_WIDTH : 1.6; };

  function view() {
    const v = { live: false, dim: false, mt: {} };
    if (mode === 'history') { v.dim = true; Object.assign(v.mt, hist.marks()); }
    else if (mode === 'explore') {
      v.live = true;
      if (sel) { v.mt[sel] = 'sel'; v.dim = true; }
    } else if (mode === 'practice' && practice) {
      v.dim = true;
      if (practice.direction === 'name-to-map' && !result) { v.live = true; v.dim = false; }
      if (result) {
        v.mt[result.correctId] = 'correct';
        if (!result.correct) v.mt[result.chosenId] = 'wrong';
      } else if (practice.direction === 'map-to-name') v.mt[practice.current().target.id] = 'target';
    } else if (mode === 'test' && test && !testDone) {
      const q = test.current();
      if (q.type === 'name-to-map') { v.live = true; if (choice) { v.mt[choice] = 'pick'; v.dim = true; } } else { v.mt[q.target.id] = 'target'; v.dim = true; }
    } else if (mode === 'test' && reviewing) {
      const it = reviewing[reviewIndex];
      v.dim = true;
      v.mt[it.target.id] = 'correct';
      if (it.chosen && !it.correct) v.mt[it.chosen.id] = 'wrong';
    }
    return v;
  }

  // Labels for a wrong answer: in practice, and in the review of a wrong test answer (FEAT-m3-test-020).
  function labelItems() {
    let c = null, w = null;
    if (mode === 'practice' && result && !result.correct) { c = result.correctId; w = result.chosenId; }
    else if (mode === 'test' && reviewing && !reviewing[reviewIndex].correct) { const it = reviewing[reviewIndex]; c = it.target.id; w = it.chosen ? it.chosen.id : null; }
    const out = [];
    if (w) out.push({ el: groups[w], name: byId[w].name, kind: 'wrong' });
    if (c) out.push({ el: groups[c], name: byId[c].name, kind: 'right' });
    return out;
  }

  function drawMap() {
    MapLabels.draw(svg, labelItems());
    const v = view();
    svg.classList.toggle('dim', v.dim);
    svg.style.cursor = v.live ? 'pointer' : '';
    for (const a of areas) groups[a.id].setAttribute('class', 'mt' + (v.mt[a.id] ? ' ' + v.mt[a.id] : ''));
  }

  // A click or touch selects the area under it, or the nearest within 12 screen pixels (REQ-m3-test-116, NFR-m3-test-036).
  svg.addEventListener('click', (e) => {
    if (!view().live) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const area = areaAt([p.x, p.y], areas, unit());
    if (!area) return;
    if (mode === 'explore') sel = sel === area.id ? null : area.id;
    else if (mode === 'practice') { if (!result) result = Progress.track('mountains', practice.answer(area.id)); }
    else if (mode === 'test') choice = area.id;
    render();
  });

  function renderExplore() {
    g('mt-label').textContent = sel ? byId[sel].name : 'Tippe ein Gebirge an.';
  }

  function renderPractice() {
    g('mt-dir-m2n').setAttribute('aria-pressed', String(practice.direction === 'map-to-name'));
    g('mt-dir-n2m').setAttribute('aria-pressed', String(practice.direction === 'name-to-map'));
    for (const r of MOUNTAIN_REGIONS) g('mt-region-' + r).setAttribute('aria-pressed', String(practice.region === r));
    const t = practice.tally();
    g('mt-tally').textContent = t.right + ' von ' + t.total + ' richtig';
    const q = practice.current();
    const m2n = practice.direction === 'map-to-name';
    g('mt-question').textContent = m2n ? 'Wie heißt das orange markierte Gebirge?' : 'Zeige: ' + q.target.name;
    const box = g('mt-answers');
    box.replaceChildren();
    if (m2n) for (const o of practice.options()) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o.name; b.disabled = !!result;
      if (result && o.id === result.correctId) b.className = 'right';
      else if (result && o.id === result.chosenId) b.className = 'mistake';
      b.addEventListener('click', () => { if (!result) { result = Progress.track('mountains', practice.answer(o.id)); render(); } });
      box.appendChild(b);
    }
    const fb = g('mt-feedback');
    fb.className = 'fb' + (result ? (result.correct ? ' right' : ' mistake') : '');
    if (!result) fb.textContent = '';
    else if (result.correct) fb.textContent = Feedback.right(byId[result.correctId].name);
    else MapLabels.wrongText(fb, Feedback.wrong(byId[result.correctId].name, byId[result.chosenId].name, false));
    g('mt-next').hidden = !result;
  }

  function renderTest() {
    const run = !!test && !testDone;
    g('mt-test-start').hidden = run || testDone;
    g('mt-test-run').hidden = !run;
    g('mt-test-end').hidden = !testDone || !!reviewing;
    g('mt-test-look').hidden = !(testDone && reviewing);
    g('mt-test-title').textContent = 'Test ' + (kept.testCount() + 1);
    if (testDone && reviewing) { renderReview(); return; }
    if (testDone) {
      g('mt-test-done').textContent = 'Test ' + kept.testCount() + ' geschafft!';
      g('mt-test-score').textContent = test.score() + ' von ' + test.total;
      return;
    }
    if (!run) return;
    const q = test.current();
    const typing = q.type === 'map-to-name';
    g('mt-test-progress').textContent = 'Frage ' + (test.index + 1) + ' von ' + test.total;
    g('mt-test-type').hidden = !typing;
    g('mt-test-question').textContent = typing ? 'Wie heißt das orange markierte Gebirge?' : 'Zeige: ' + q.target.name;
    g('mt-test-confirm').disabled = typing ? g('mt-test-name').value.trim() === '' : choice === null;
  }

  function renderReview() {
    const it = reviewing[reviewIndex];
    const typed = it.type === 'map-to-name';
    g('mt-look-progress').dataset.results = reviewing.map((i) => (i.correct ? 1 : 0)).join('');
    g('mt-look-progress').textContent = 'Frage ' + (reviewIndex + 1) + ' von ' + reviewing.length;
    g('mt-look-question').textContent = typed ? 'Wie heißt das markierte Gebirge?' : 'Zeige: ' + it.target.name;
    const v = g('mt-look-verdict');
    v.className = 'fb ' + (it.correct ? 'right' : 'mistake');
    g('mt-look-answer').textContent = typed ? 'Du hast geschrieben: „' + String(it.answer).trim() + '“' : 'Du hast gewählt: ' + it.chosen.name;
    if (it.correct) v.textContent = Feedback.right(it.target.name, typed ? it.answer : undefined);
    else if (it.chosen) MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
    else v.textContent = Feedback.wrongNoMatch(it.target.name, it.answer, 'keines der zwanzig Gebirge');
    g('mt-look-prev').disabled = reviewIndex === 0;
    g('mt-look-next').disabled = reviewIndex === reviewing.length - 1;
  }

  function render() {
    const topics = document.querySelectorAll('.topics button');
    g('topic-mountains').setAttribute('aria-pressed', String(active));
    g('mountains').hidden = !active;
    if (!active) return;
    // Show only this topic: hide every other topic page and release the other topic buttons.
    for (const s of document.querySelectorAll('main > .contents')) if (s.id !== 'mountains') s.hidden = true;
    for (const b of topics) if (b.id !== 'topic-mountains') b.setAttribute('aria-pressed', 'false');
    for (const m of ['explore', 'practice', 'test', 'history']) g('mt-mode-' + m).setAttribute('aria-pressed', String(mode === m));
    hist.sync(mode === 'history');
    g('mt-label').hidden = mode !== 'explore';
    g('mt-practice-head').hidden = mode !== 'practice';
    g('mt-dirbar').hidden = mode !== 'practice';
    g('mt-practice').hidden = mode !== 'practice';
    g('mt-test').hidden = mode !== 'test';
    if (mode === 'explore') renderExplore(); else if (mode === 'practice') renderPractice(); else if (mode === 'test') renderTest();
    drawMap();
  }

  function startTest() {
    reviewing = null; testDone = false; choice = null;
    test = createMountainTest({ areas });
    g('mt-test-name').value = '';
    render();
  }
  function confirmTest() {
    const q = test.current();
    const value = q.type === 'map-to-name' ? g('mt-test-name').value : choice;
    if (!test.confirm(value)) return;
    choice = null; g('mt-test-name').value = '';
    if (test.finished) { testDone = true; kept.addTest(test.score(), test.total); Progress.finishTest('mountains', test.score(), test.total, test.review()); }
    render();
    if (!test.finished && test.current().type === 'map-to-name') g('mt-test-name').focus();
  }
  const reset = () => { sel = null; practice = null; result = null; test = null; testDone = false; reviewing = null; choice = null; };
  const hist = HistoryView.attach({ topic: 'mountains', section: 'mountains', buttonId: 'mt-mode-history', items: areas.map((a) => ({ key: a.id, name: a.name })),
    enter: () => { reset(); mode = 'history'; render(); }, change: drawMap });

  g('topic-mountains').addEventListener('click', () => { active = true; render(); });
  // The other topics show their own page; they only need this one hidden (their handlers run first).
  for (const b of document.querySelectorAll('.topics button')) if (b.id !== 'topic-mountains') b.addEventListener('click', () => { active = false; render(); });
  g('mt-mode-explore').addEventListener('click', () => { reset(); mode = 'explore'; render(); });
  g('mt-mode-practice').addEventListener('click', () => { reset(); mode = 'practice'; practice = createMountainPractice({ areas }); render(); });
  g('mt-mode-test').addEventListener('click', () => { reset(); mode = 'test'; render(); });
  const swap = (fn) => () => { fn(); result = null; render(); };
  g('mt-dir-m2n').addEventListener('click', swap(() => practice.setDirection('map-to-name')));
  g('mt-dir-n2m').addEventListener('click', swap(() => practice.setDirection('name-to-map')));
  for (const r of MOUNTAIN_REGIONS) g('mt-region-' + r).addEventListener('click', swap(() => practice.setRegion(r)));
  g('mt-next').addEventListener('click', () => { if (practice.next()) { result = null; render(); } });
  g('mt-test-go').addEventListener('click', startTest);
  g('mt-test-again').addEventListener('click', startTest);
  g('mt-test-back').addEventListener('click', () => { reviewing = null; test = null; testDone = false; render(); });
  g('mt-test-confirm').addEventListener('click', confirmTest);
  g('mt-test-name').addEventListener('input', renderTest);
  g('mt-test-name').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !g('mt-test-confirm').disabled) confirmTest(); });
  g('mt-test-review').addEventListener('click', () => { reviewing = test.review(); reviewIndex = 0; render(); });
  g('mt-look-prev').addEventListener('click', () => { if (reviewIndex > 0) { reviewIndex -= 1; render(); } });
  g('mt-look-next').addEventListener('click', () => { if (reviewIndex < reviewing.length - 1) { reviewIndex += 1; render(); } });
  g('mt-look-end').addEventListener('click', () => { reviewing = null; render(); });
  render();
})();
