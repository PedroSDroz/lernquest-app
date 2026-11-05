// Page logic for the Staedte topic (FEAT-m3-test-009). Self-contained; the river and Bundesland pages are untouched.
(() => {
  const g = (id) => document.getElementById(id);
  const cities = CITY_DATA.cities;
  const byId = Object.fromEntries(cities.map((c) => [c.id, c]));
  const csvg = g('ct-map');
  const MIN_DOT_PX = 4;     // a dot is drawn at least this big (screen pixels, radius)
  const HIT_MARGIN_PX = 4;  // touch radius = drawn dot radius + this, in screen pixels (NFR-m3-test-021)
  const MARKED = 1.5;       // a marked dot is drawn this much bigger
  csvg.setAttribute('viewBox', REGION_DATA.viewBox);
  const store = (() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} };
  const kept = createResults(store, 'm3-test-cities-results-v1');

  let topic = 'rivers';
  let mode = 'explore';
  let sel = null;
  let practice = null, result = null;
  let test = null, testDone = false, choice = null, reviewing = null, reviewIndex = 0;

  const rings = {}, dots = {};
  const NSV = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => { const e = document.createElementNS(NSV, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  for (const s of REGION_DATA.states) csvg.appendChild(el('path', { d: s.path, class: 'st' }));
  for (const c of cities) {
    rings[c.id] = el('circle', { cx: c.x, cy: c.y, class: 'ring' });
    dots[c.id] = el('circle', { cx: c.x, cy: c.y, class: 'dot' });
    csvg.append(rings[c.id], dots[c.id]);
  }

  // Screen pixels per map unit, and the map's screen transform. The map is letterboxed when its height is capped,
  // so the scale and offset come from the browser's own transform, not from the element's box.
  const unit = () => { const m = csvg.getScreenCTM(); return m && m.a > 0 ? m.a : 1.6; };
  const baseR = () => MIN_DOT_PX / unit();

  // What the map shows for the current screen: whether dots can be selected, and each city's class.
  function view() {
    const v = { live: false, cls: {} };
    if (mode === 'history') Object.assign(v.cls, hist.marks());
    else if (mode === 'explore') { v.live = true; if (sel) v.cls[sel] = 'sel'; }
    else if (mode === 'practice' && practice) {
      const q = practice.current();
      if (practice.direction === 'name-to-map' && !result) v.live = true;
      if (result) {
        v.cls[result.correctId] = 'correct';
        if (!result.correct) v.cls[result.chosenId] = 'wrong';
      } else if (practice.direction === 'map-to-name') v.cls[q.target.id] = 'target';
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
    if (w) out.push({ el: dots[w], name: byId[w].name, kind: 'wrong' });
    if (c) out.push({ el: dots[c], name: byId[c].name, kind: 'right' });
    return out;
  }

  function drawMap() {
    MapLabels.draw(csvg, labelItems());
    const v = view();
    const r = baseR();
    for (const c of cities) {
      const cl = v.cls[c.id] || '';
      const dr = cl ? r * MARKED : r;
      rings[c.id].setAttribute('class', 'ring ' + cl);
      rings[c.id].setAttribute('r', dr + 5 / unit());
      dots[c.id].setAttribute('class', 'dot ' + cl);
      dots[c.id].setAttribute('r', dr);
    }
    csvg.classList.toggle('live', v.live);
  }

  // One click handler for the whole map: the nearest dot within its drawn radius plus the margin wins (NFR-m3-test-021).
  csvg.addEventListener('click', (e) => {
    const v = view();
    if (!v.live) return;
    const m = csvg.getScreenCTM();
    if (!m) return;
    const k = unit();
    let best = null, bestD = Infinity;
    for (const c of cities) {
      const d = Math.hypot(e.clientX - (m.a * c.x + m.e), e.clientY - (m.d * c.y + m.f));
      const reach = (v.cls[c.id] ? MARKED : 1) * MIN_DOT_PX + HIT_MARGIN_PX;
      if (d <= reach && d < bestD) { best = c.id; bestD = d; }
    }
    if (best) pointed(best);
  });
  addEventListener('resize', () => { if (topic === 'cities') drawMap(); });

  function pointed(id) {
    if (mode === 'explore') sel = sel === id ? null : id;
    else if (mode === 'practice') { if (!result) result = Progress.track('cities', practice.answer(id)); }
    else if (mode === 'test') choice = id;
    render();
  }

  function renderExplore() {
    const l = g('ct-label');
    l.replaceChildren();
    if (!sel) { l.textContent = 'Wähle einen Punkt (Stadt)'; return; }
    const c = byId[sel];
    const small = document.createElement('small');
    l.append(c.name + ' ');
    small.textContent = '· ' + c.state + (c.note ? ' (' + c.note + ')' : '');
    l.append(small);
  }

  function renderPractice() {
    g('ct-dir-m2n').setAttribute('aria-pressed', String(practice.direction === 'map-to-name'));
    g('ct-dir-n2m').setAttribute('aria-pressed', String(practice.direction === 'name-to-map'));
    const t = practice.tally();
    g('ct-tally').textContent = t.right + ' von ' + t.total + ' richtig';
    const q = practice.current();
    const m2n = practice.direction === 'map-to-name';
    g('ct-question').textContent = m2n ? 'Wie heißt die orange markierte Stadt?' : 'Zeige: ' + q.target.name;
    const box = g('ct-answers');
    box.replaceChildren();
    if (m2n) for (const o of practice.options()) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o.name; b.disabled = !!result;
      if (result && o.id === result.correctId) b.className = 'right';
      else if (result && o.id === result.chosenId) b.className = 'mistake';
      b.addEventListener('click', () => { if (!result) { result = Progress.track('cities', practice.answer(o.id)); render(); } });
      box.appendChild(b);
    }
    const fb = g('ct-feedback');
    fb.className = 'fb' + (result ? (result.correct ? ' right' : ' mistake') : '');
    if (!result) fb.textContent = '';
    else if (result.correct) fb.textContent = Feedback.right(byId[result.correctId].name);
    else MapLabels.wrongText(fb, Feedback.wrong(byId[result.correctId].name, byId[result.chosenId].name, false));
    g('ct-next').hidden = !result;
  }

  function renderTest() {
    const run = !!test && !testDone;
    g('ct-test-start').hidden = run || testDone;
    g('ct-test-run').hidden = !run;
    g('ct-test-end').hidden = !testDone || !!reviewing;
    g('ct-test-look').hidden = !(testDone && reviewing);
    g('ct-test-title').textContent = 'Test ' + (kept.testCount() + 1);
    if (testDone && reviewing) { renderReview(); return; }
    if (testDone) {
      g('ct-test-done').textContent = 'Test ' + kept.testCount() + ' geschafft!';
      g('ct-test-score').textContent = test.score() + ' von ' + test.total;
      return;
    }
    if (!run) return;
    const q = test.current();
    const typing = q.type === 'map-to-name';
    g('ct-test-progress').textContent = 'Frage ' + (test.index + 1) + ' von ' + test.total;
    g('ct-test-type').hidden = !typing;
    g('ct-test-question').textContent = typing ? 'Wie heißt die orange markierte Stadt?' : 'Zeige: ' + q.target.name;
    g('ct-test-confirm').disabled = typing ? g('ct-test-name').value.trim() === '' : choice === null;
  }

  function renderReview() {
    const it = reviewing[reviewIndex];
    const typed = it.type === 'map-to-name';
    g('ct-look-progress').dataset.results = reviewing.map((i) => (i.correct ? 1 : 0)).join('');
    g('ct-look-progress').textContent = 'Frage ' + (reviewIndex + 1) + ' von ' + reviewing.length;
    g('ct-look-question').textContent = typed ? 'Wie heißt die markierte Stadt?' : 'Zeige: ' + it.target.name;
    const v = g('ct-look-verdict');
    v.className = 'fb ' + (it.correct ? 'right' : 'mistake');
    if (typed) {
      g('ct-look-answer').textContent = 'Du hast geschrieben: „' + String(it.answer).trim() + '“';
      if (it.correct) v.textContent = Feedback.right(it.target.name, it.answer);
      else if (it.chosen) MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
      else v.textContent = Feedback.wrongNoMatch(it.target.name, it.answer, 'keine der 30 Städte');
    } else {
      g('ct-look-answer').textContent = 'Du hast gewählt: ' + it.chosen.name;
      if (it.correct) v.textContent = Feedback.right(it.target.name); else MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
    }
    g('ct-look-prev').disabled = reviewIndex === 0;
    g('ct-look-next').disabled = reviewIndex === reviewing.length - 1;
  }

  function render() {
    const on = topic === 'cities';
    g('topic-cities').setAttribute('aria-pressed', String(on));
    if (on) { g('topic-rivers').setAttribute('aria-pressed', 'false'); g('topic-regions').setAttribute('aria-pressed', 'false'); }
    g('cities').hidden = !on;
    if (!on) return;
    for (const m of ['explore', 'practice', 'test', 'history']) g('ct-mode-' + m).setAttribute('aria-pressed', String(mode === m));
    hist.sync(mode === 'history');
    g('ct-label').hidden = mode !== 'explore';
    g('ct-practice').hidden = mode !== 'practice';
    g('ct-dirbar').hidden = mode !== 'practice';
    g('ct-test').hidden = mode !== 'test';
    if (mode === 'explore') renderExplore(); else if (mode === 'practice') renderPractice(); else if (mode === 'test') renderTest();
    drawMap();
  }

  function startTest() {
    reviewing = null; testDone = false; choice = null;
    test = createCityTest({ cities });
    g('ct-test-name').value = '';
    render();
  }
  function confirmTest() {
    const q = test.current();
    const value = q.type === 'map-to-name' ? g('ct-test-name').value : choice;
    if (!test.confirm(value)) return;
    choice = null; g('ct-test-name').value = '';
    if (test.finished) { testDone = true; kept.addTest(test.score(), test.total); Progress.finishTest('cities', test.score(), test.total, test.review()); }
    render();
    if (!test.finished && test.current().type === 'map-to-name') g('ct-test-name').focus();
  }
  const reset = () => { sel = null; practice = null; result = null; test = null; testDone = false; reviewing = null; choice = null; };
  const hist = HistoryView.attach({ topic: 'cities', section: 'cities', buttonId: 'ct-mode-history', items: cities.map((c) => ({ key: c.id, name: c.name })),
    enter: () => { reset(); mode = 'history'; render(); }, change: drawMap });

  // The other topics hide this one through their own handlers; this one hides theirs.
  g('topic-cities').addEventListener('click', () => { topic = 'cities'; g('rivers').hidden = true; g('regions').hidden = true; render(); });
  for (const id of ['topic-rivers', 'topic-regions']) g(id).addEventListener('click', () => { topic = id.slice(6); g('cities').hidden = true; g('topic-cities').setAttribute('aria-pressed', 'false'); });
  g('ct-mode-explore').addEventListener('click', () => { reset(); mode = 'explore'; render(); });
  g('ct-mode-practice').addEventListener('click', () => { reset(); mode = 'practice'; practice = createCityPractice({ cities }); render(); });
  g('ct-mode-test').addEventListener('click', () => { reset(); mode = 'test'; render(); });
  const swap = (fn) => () => { fn(); result = null; render(); };
  g('ct-dir-m2n').addEventListener('click', swap(() => practice.setDirection('map-to-name')));
  g('ct-dir-n2m').addEventListener('click', swap(() => practice.setDirection('name-to-map')));
  g('ct-next').addEventListener('click', () => { if (practice.next()) { result = null; render(); } });
  g('ct-test-go').addEventListener('click', startTest);
  g('ct-test-again').addEventListener('click', startTest);
  g('ct-test-back').addEventListener('click', () => { reviewing = null; test = null; testDone = false; render(); });
  g('ct-test-confirm').addEventListener('click', confirmTest);
  g('ct-test-name').addEventListener('input', renderTest);
  g('ct-test-name').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !g('ct-test-confirm').disabled) confirmTest(); });
  g('ct-test-review').addEventListener('click', () => { reviewing = test.review(); reviewIndex = 0; render(); });
  g('ct-look-prev').addEventListener('click', () => { if (reviewIndex > 0) { reviewIndex -= 1; render(); } });
  g('ct-look-next').addEventListener('click', () => { if (reviewIndex < reviewing.length - 1) { reviewIndex += 1; render(); } });
  g('ct-look-end').addEventListener('click', () => { reviewing = null; render(); });
})();
