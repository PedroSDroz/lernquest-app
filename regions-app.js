// Page logic for Bundeslaender and Hauptstaedte (FEAT-m3-test-008). Self-contained; the river page is untouched.
(() => {
  const g = (id) => document.getElementById(id);
  const states = REGION_DATA.states;
  const byId = Object.fromEntries(states.map((s) => [s.id, s]));
  const rsvg = g('rg-map');
  const HIT_MARGIN_PX = 4;  // touch radius = drawn dot radius + this, in screen pixels
  rsvg.setAttribute('viewBox', REGION_DATA.viewBox);
  const store = (() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} };
  const kept = createResults(store, 'm3-test-regions-results-v1');

  let topic = 'rivers';
  let mode = 'explore';
  let sel = null;           // { kind, id } in Karte erkunden
  let practice = null, result = null;
  let test = null, testDone = false, choice = null, reviewing = null, reviewIndex = 0;

  const areas = {}, rings = {}, dots = {};
  const NSV = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => { const e = document.createElementNS(NSV, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const label = { state: (s) => s.name, capital: (s) => s.capital.name };
  const nameOf = (kind, id) => label[kind](byId[id]);
  const askText = (kind) => (kind === 'state' ? 'das Bundesland' : 'die Hauptstadt');

  for (const s of states) {
    const a = el('path', { d: s.path, class: 'st' });
    a.dataset.id = s.id;
    areas[s.id] = a; rsvg.appendChild(a);
  }
  for (const s of states) {
    const { x, y } = s.capital;
    rings[s.id] = el('circle', { cx: x, cy: y, r: 9, class: 'ring' });
    dots[s.id] = el('circle', { cx: x, cy: y, r: 4, class: 'dot' });
    rsvg.append(rings[s.id], dots[s.id]);
  }

  // What the map shows for the current screen: which kinds are drawn and selectable, and each item's class.
  function view() {
    const v = { dots: false, live: null, dim: false, st: {}, cap: {} };
    const mark = (kind, id, cls) => { (kind === 'state' ? v.st : v.cap)[id] = cls; };
    if (mode === 'history') {
      v.dots = true; v.dim = true;
      const m = hist.marks();
      for (const key in m) { const [kind, id] = key.split(':'); mark(kind, id, m[key]); }
    } else if (mode === 'explore') {
      v.dots = true; v.live = 'both';
      if (sel) { mark(sel.kind, sel.id, 'sel'); v.dim = sel.kind === 'state'; }
    } else if (mode === 'practice' && practice) {
      const q = practice.current();
      v.dots = practice.kind === 'capital'; v.dim = practice.kind === 'state';
      if (practice.direction === 'name-to-map' && !result) v.live = practice.kind;
      if (result) {
        mark(practice.kind, result.correctId, 'correct');
        if (!result.correct) mark(practice.kind, result.chosenId, 'wrong');
      } else if (practice.direction === 'map-to-name') mark(practice.kind, q.target.id, 'target');
    } else if (mode === 'test' && test && !testDone) {
      const q = test.current();
      v.dots = q.kind === 'capital'; v.dim = q.kind === 'state';
      if (q.type === 'name-to-map') { v.live = q.kind; if (choice) mark(q.kind, choice, 'pick'); } else mark(q.kind, q.target.id, 'target');
    } else if (mode === 'test' && reviewing) {
      const it = reviewing[reviewIndex];
      v.dots = it.kind === 'capital'; v.dim = it.kind === 'state';
      mark(it.kind, it.target.id, 'correct');
      if (it.chosen && !it.correct) mark(it.kind, it.chosen.id, 'wrong');
    }
    return v;
  }

  // Labels for a wrong answer: in practice, and in the review of a wrong test answer (FEAT-m3-test-020).
  function labelItems() {
    let c = null, w = null, kind = null;
    if (mode === 'practice' && result && !result.correct) { kind = practice.kind; c = result.correctId; w = result.chosenId; }
    else if (mode === 'test' && reviewing && !reviewing[reviewIndex].correct) { const it = reviewing[reviewIndex]; kind = it.kind; c = it.target.id; w = it.chosen ? it.chosen.id : null; }
    const at = (id) => (kind === 'state' ? areas[id] : dots[id]);
    const out = [];
    if (w) out.push({ el: at(w), name: nameOf(kind, w), kind: 'wrong' });
    if (c) out.push({ el: at(c), name: nameOf(kind, c), kind: 'right' });
    return out;
  }

  function drawMap() {
    MapLabels.draw(rsvg, labelItems());
    const v = view();
    rsvg.classList.toggle('dim', v.dim);
    for (const s of states) {
      const stateLive = v.live === 'state' || v.live === 'both';
      areas[s.id].setAttribute('class', 'st' + (v.st[s.id] ? ' ' + v.st[s.id] : '') + (stateLive ? ' live' : ''));
      for (const e of [rings[s.id], dots[s.id]]) e.style.display = v.dots ? '' : 'none';
      const c = v.cap[s.id] || '';
      rings[s.id].setAttribute('class', 'ring ' + c);
      dots[s.id].setAttribute('class', 'dot ' + c);
      dots[s.id].setAttribute('r', c ? 6 : 4);
    }
  }

  // One click handler for the whole map: the nearest live capital dot within its touch radius wins (NFR-m3-test-016),
  // otherwise the state area under the click.
  rsvg.addEventListener('click', (e) => {
    const v = view();
    // The SVG is letterboxed when its height is capped, so scale and origin come from the real transform, not the element box.
    const ctm = rsvg.getScreenCTM();
    if (!ctm) return;
    const unit = ctm.a; // screen pixels per map unit
    if (v.dots && (v.live === 'capital' || v.live === 'both')) {
      let best = null, bestD = Infinity;
      for (const s of states) {
        const dx = (e.clientX - ctm.e) / ctm.a - s.capital.x, dy = (e.clientY - ctm.f) / ctm.d - s.capital.y;
        const d = Math.hypot(dx, dy) * unit;
        const r = (v.cap[s.id] ? 6 : 4) * unit + HIT_MARGIN_PX;
        if (d <= r && d < bestD) { best = s.id; bestD = d; }
      }
      if (best) { pointed('capital', best); return; }
    }
    const area = e.target.closest && e.target.closest('path.st');
    if (area) pointed('state', area.dataset.id);
  });

  function pointed(kind, id) {
    const v = view();
    if (!(v.live === kind || v.live === 'both')) return;
    if (mode === 'explore') sel = sel && sel.kind === kind && sel.id === id ? null : { kind, id };
    else if (mode === 'practice') { if (!result) { result = Progress.track('regions', practice.answer(id), practice.kind); } }
    else if (mode === 'test') choice = id;
    render();
  }

  function renderExplore() {
    const l = g('rg-label');
    l.replaceChildren();
    if (!sel) { l.textContent = 'Wähle ein Bundesland oder einen Punkt (Hauptstadt)'; return; }
    const s = byId[sel.id];
    const small = document.createElement('small');
    if (sel.kind === 'state') { l.append(s.name + ' '); small.textContent = '· Hauptstadt: ' + s.capital.name; }
    else { l.append(s.capital.name + ' '); small.textContent = '· Hauptstadt von ' + s.name; }
    l.append(small);
  }

  function renderPractice() {
    const kindBtn = { state: g('rg-kind-state'), capital: g('rg-kind-capital') };
    for (const k in kindBtn) kindBtn[k].setAttribute('aria-pressed', String(practice.kind === k));
    g('rg-dir-m2n').setAttribute('aria-pressed', String(practice.direction === 'map-to-name'));
    g('rg-dir-n2m').setAttribute('aria-pressed', String(practice.direction === 'name-to-map'));
    const t = practice.tally();
    g('rg-tally').textContent = t.right + ' von ' + t.total + ' richtig';
    const q = practice.current();
    const m2n = practice.direction === 'map-to-name';
    g('rg-question').textContent = m2n
      ? (practice.kind === 'state' ? 'Welches Bundesland ist orange markiert?' : 'Wie heißt die orange markierte Hauptstadt?')
      : 'Zeige ' + askText(practice.kind) + ': ' + q.target.name;
    const box = g('rg-answers');
    box.replaceChildren();
    if (m2n) for (const o of practice.options()) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o.name; b.disabled = !!result;
      if (result && o.id === result.correctId) b.className = 'right';
      else if (result && o.id === result.chosenId) b.className = 'mistake';
      b.addEventListener('click', () => { if (!result) { result = Progress.track('regions', practice.answer(o.id), practice.kind); render(); } });
      box.appendChild(b);
    }
    const fb = g('rg-feedback');
    fb.className = 'fb' + (result ? (result.correct ? ' right' : ' mistake') : '');
    if (!result) fb.textContent = '';
    else if (result.correct) fb.textContent = Feedback.right(nameOf(practice.kind, result.correctId));
    else MapLabels.wrongText(fb, Feedback.wrong(nameOf(practice.kind, result.correctId), nameOf(practice.kind, result.chosenId), false));
    g('rg-next').hidden = !result;
  }

  function renderTest() {
    const run = !!test && !testDone;
    g('rg-test-start').hidden = run || testDone;
    g('rg-test-run').hidden = !run;
    g('rg-test-end').hidden = !testDone || !!reviewing;
    g('rg-test-look').hidden = !(testDone && reviewing);
    g('rg-test-title').textContent = 'Test ' + (kept.testCount() + 1);
    if (testDone && reviewing) { renderReview(); return; }
    if (testDone) {
      g('rg-test-done').textContent = 'Test ' + kept.testCount() + ' geschafft!';
      g('rg-test-score').textContent = test.score() + ' von ' + test.total;
      return;
    }
    if (!run) return;
    const q = test.current();
    const typing = q.type === 'map-to-name';
    g('rg-test-progress').textContent = 'Frage ' + (test.index + 1) + ' von ' + test.total;
    g('rg-test-type').hidden = !typing;
    g('rg-test-name-label').textContent = q.kind === 'state' ? 'Name des Bundeslandes' : 'Name der Hauptstadt';
    g('rg-test-question').textContent = typing
      ? (q.kind === 'state' ? 'Wie heißt das orange markierte Bundesland?' : 'Wie heißt die orange markierte Hauptstadt?')
      : 'Zeige ' + askText(q.kind) + ': ' + q.target.name;
    g('rg-test-confirm').disabled = typing ? g('rg-test-name').value.trim() === '' : choice === null;
  }

  function renderReview() {
    const it = reviewing[reviewIndex];
    const typed = it.type === 'map-to-name';
    const notOne = it.kind === 'state' ? 'keines der neun Bundesländer' : 'keine der neun Hauptstädte';
    g('rg-look-progress').dataset.results = reviewing.map((i) => (i.correct ? 1 : 0)).join('');
    g('rg-look-progress').textContent = 'Frage ' + (reviewIndex + 1) + ' von ' + reviewing.length;
    g('rg-look-question').textContent = typed
      ? (it.kind === 'state' ? 'Wie heißt das markierte Bundesland?' : 'Wie heißt die markierte Hauptstadt?')
      : 'Zeige ' + askText(it.kind) + ': ' + it.target.name;
    const v = g('rg-look-verdict');
    v.className = 'fb ' + (it.correct ? 'right' : 'mistake');
    if (typed) {
      g('rg-look-answer').textContent = 'Du hast geschrieben: „' + String(it.answer).trim() + '“';
      if (it.correct) v.textContent = Feedback.right(it.target.name, it.answer);
      else if (it.chosen) MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
      else v.textContent = Feedback.wrongNoMatch(it.target.name, it.answer, notOne);
    } else {
      g('rg-look-answer').textContent = 'Du hast gewählt: ' + it.chosen.name;
      if (it.correct) v.textContent = Feedback.right(it.target.name); else MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
    }
    g('rg-look-prev').disabled = reviewIndex === 0;
    g('rg-look-next').disabled = reviewIndex === reviewing.length - 1;
  }

  function render() {
    const regions = topic === 'regions';
    g('topic-rivers').setAttribute('aria-pressed', String(!regions));
    g('topic-regions').setAttribute('aria-pressed', String(regions));
    g('rivers').hidden = regions;
    g('regions').hidden = !regions;
    if (!regions) return;
    for (const m of ['explore', 'practice', 'test', 'history']) g('rg-mode-' + m).setAttribute('aria-pressed', String(mode === m));
    hist.sync(mode === 'history');
    g('rg-label').hidden = mode !== 'explore';
    g('rg-practice').hidden = mode !== 'practice';
    g('rg-dirbar').hidden = mode !== 'practice';
    g('rg-test').hidden = mode !== 'test';
    if (mode === 'explore') renderExplore(); else if (mode === 'practice') renderPractice(); else if (mode === 'test') renderTest();
    drawMap();
  }

  function startTest() {
    reviewing = null; testDone = false; choice = null;
    test = createRegionTest({ states });
    g('rg-test-name').value = '';
    render();
  }
  function confirmTest() {
    const q = test.current();
    const value = q.type === 'map-to-name' ? g('rg-test-name').value : choice;
    if (!test.confirm(value)) return;
    choice = null; g('rg-test-name').value = '';
    if (test.finished) { testDone = true; kept.addTest(test.score(), test.total); Progress.finishTest('regions', test.score(), test.total, test.review(), true); }
    render();
    if (!test.finished && test.current().type === 'map-to-name') g('rg-test-name').focus();
  }
  const reset = () => { sel = null; practice = null; result = null; test = null; testDone = false; reviewing = null; choice = null; };
  const hist = HistoryView.attach({ topic: 'regions', section: 'regions', buttonId: 'rg-mode-history',
    items: [...states.map((s) => ({ key: 'state:' + s.id, name: s.name, group: 'Bundesländer' })), ...states.map((s) => ({ key: 'capital:' + s.id, name: s.capital.name, group: 'Hauptstädte', tag: 'Hauptstadt' }))],
    enter: () => { reset(); mode = 'history'; render(); }, change: drawMap });

  g('topic-rivers').addEventListener('click', () => { topic = 'rivers'; render(); });
  g('topic-regions').addEventListener('click', () => { topic = 'regions'; render(); });
  g('rg-mode-explore').addEventListener('click', () => { reset(); mode = 'explore'; render(); });
  g('rg-mode-practice').addEventListener('click', () => { reset(); mode = 'practice'; practice = createRegionPractice({ states }); render(); });
  g('rg-mode-test').addEventListener('click', () => { reset(); mode = 'test'; render(); });
  const swap = (fn) => () => { fn(); result = null; render(); };
  g('rg-kind-state').addEventListener('click', swap(() => practice.setKind('state')));
  g('rg-kind-capital').addEventListener('click', swap(() => practice.setKind('capital')));
  g('rg-dir-m2n').addEventListener('click', swap(() => practice.setDirection('map-to-name')));
  g('rg-dir-n2m').addEventListener('click', swap(() => practice.setDirection('name-to-map')));
  g('rg-next').addEventListener('click', () => { if (practice.next()) { result = null; render(); } });
  g('rg-test-go').addEventListener('click', startTest);
  g('rg-test-again').addEventListener('click', startTest);
  g('rg-test-back').addEventListener('click', () => { reviewing = null; test = null; testDone = false; render(); });
  g('rg-test-confirm').addEventListener('click', confirmTest);
  g('rg-test-name').addEventListener('input', renderTest);
  g('rg-test-name').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !g('rg-test-confirm').disabled) confirmTest(); });
  g('rg-test-review').addEventListener('click', () => { reviewing = test.review(); reviewIndex = 0; render(); });
  g('rg-look-prev').addEventListener('click', () => { if (reviewIndex > 0) { reviewIndex -= 1; render(); } });
  g('rg-look-next').addEventListener('click', () => { if (reviewIndex < reviewing.length - 1) { reviewIndex += 1; render(); } });
  g('rg-look-end').addEventListener('click', () => { reviewing = null; render(); });
  render();
})();
