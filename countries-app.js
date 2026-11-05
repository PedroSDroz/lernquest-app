// Page logic for the neighbouring countries (FEAT-m3-test-014), adapted from the countries page (FEAT-m3-test-011). Self-contained; the other topics' pages are untouched.
(() => {
  const g = (id) => document.getElementById(id);
  const countries = withBounds(COUNTRY_DATA.countries);
  const byId = Object.fromEntries(countries.map((l) => [l.id, l]));
  const svg = g('cy-map');
  svg.setAttribute('viewBox', COUNTRY_DATA.viewBox);
  const store = (() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} };
  const kept = createResults(store, 'm3-test-countries-results-v1');

  let active = false;
  let mode = 'explore';
  let sel = null;           // country id in Karte erkunden
  let practice = null, result = null;
  let test = null, testDone = false, choice = null, reviewing = null, reviewIndex = 0;

  const NSV = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => { const e = document.createElementNS(NSV, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const areas = {};
  for (const c of countries) { areas[c.id] = el('path', { d: c.path, class: 'cy cy-' + c.id }); svg.appendChild(areas[c.id]); }
  // Austria is context, not a question item: drawn over the neighbours, never selectable (REQ-m3-test-146).
  svg.appendChild(el('path', { d: COUNTRY_DATA.austria, class: 'cy-at' }));
  const atLabel = el('text', { x: 300, y: 150, class: 'cy-at-label', 'text-anchor': 'middle' });
  atLabel.textContent = 'Österreich';
  svg.appendChild(atLabel);

  // A small country, when marked, also gets a ring so that the mark can be seen (REQ-m3-test-148).
  const ring = el('circle', { r: 17, class: 'cy-ring', });
  svg.appendChild(ring);
  // Screen pixels per map unit, read afresh at every click so it follows a resize and the height limit (NFR-m3-test-047).
  const unit = () => { const m = svg.getScreenCTM(); return m && m.a > 0 ? m.a : 1; };

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
    ring.setAttribute('class', 'cy-ring');
    for (const c of countries) {
      const st = v.lk[c.id];
      if (st && Math.min(c.box.w, c.box.h) * unit() < COUNTRY_SMALL_PX) {
        const xs = c.rings.flat().map((p) => p[0]), ys = c.rings.flat().map((p) => p[1]);
        ring.setAttribute('cx', (Math.min(...xs) + Math.max(...xs)) / 2);
        ring.setAttribute('cy', (Math.min(...ys) + Math.max(...ys)) / 2);
        ring.setAttribute('class', 'cy-ring ' + st);
      }
    }
    for (const l of countries) areas[l.id].setAttribute('class', 'cy cy-' + l.id + (v.lk[l.id] ? ' ' + v.lk[l.id] : ''));
  }

  // A click or touch selects the country that holds the point; a small country also within a 24 px halo (NFR-m3-test-047).
  svg.addEventListener('click', (e) => {
    if (!view().live) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const country = pickCountry([p.x, p.y], countries, unit());
    if (!country) return;
    if (mode === 'explore') sel = sel === country.id ? null : country.id;
    else if (mode === 'practice') { if (!result) result = Progress.track('countries', practice.answer(country.id)); }
    else if (mode === 'test') choice = country.id;
    render();
  });

  // Owner decision 2026-11-04: the spelling line only for a typed answer accepted despite a spelling difference.

  function renderExplore() {
    const l = g('cy-label');
    l.textContent = sel ? byId[sel].name : 'Wähle ein Land';
    if (sel && flagElement(sel)) l.prepend(flagElement(sel));
  }

  function renderPractice() {
    g('cy-dir-m2n').setAttribute('aria-pressed', String(practice.direction === 'map-to-name'));
    g('cy-dir-n2m').setAttribute('aria-pressed', String(practice.direction === 'name-to-map'));
    const t = practice.tally();
    g('cy-tally').textContent = t.right + ' von ' + t.total + ' richtig';
    const q = practice.current();
    const m2n = practice.direction === 'map-to-name';
    g('cy-question').textContent = m2n ? 'Welches Land ist orange markiert?' : 'Zeige: ' + q.target.name;
    const box = g('cy-answers');
    box.replaceChildren();
    if (m2n) for (const o of practice.options()) {
      const b = document.createElement('button');
      b.type = 'button'; b.append(flagElement(o.id) || '', o.name); b.disabled = !!result;
      if (result && o.id === result.correctId) b.className = 'right';
      else if (result && o.id === result.chosenId) b.className = 'mistake';
      b.addEventListener('click', () => { if (!result) { result = Progress.track('countries', practice.answer(o.id)); render(); } });
      box.appendChild(b);
    }
    const fb = g('cy-feedback');
    fb.className = 'fb' + (result ? (result.correct ? ' right' : ' mistake') : '');
    if (!result) fb.textContent = '';
    else if (result.correct) fb.textContent = Feedback.right(byId[result.correctId].name);
    else MapLabels.wrongText(fb, Feedback.wrong(byId[result.correctId].name, byId[result.chosenId].name, false));
    if (result && result.correct && flagElement(result.correctId)) fb.prepend(flagElement(result.correctId));
    g('cy-next').hidden = !result;
  }

  function renderTest() {
    const run = !!test && !testDone;
    g('cy-test-start').hidden = run || testDone;
    g('cy-test-run').hidden = !run;
    g('cy-test-end').hidden = !testDone || !!reviewing;
    g('cy-test-look').hidden = !(testDone && reviewing);
    g('cy-test-title').textContent = 'Test Nr. ' + (kept.testCount() + 1);
    if (testDone && reviewing) { renderReview(); return; }
    if (testDone) {
      g('cy-test-done').textContent = 'Test Nr. ' + kept.testCount() + ' geschafft!';
      g('cy-test-score').textContent = test.score() + ' von ' + test.total;
      return;
    }
    if (!run) return;
    const q = test.current();
    const typing = q.type === 'map-to-name';
    g('cy-test-progress').textContent = 'Frage ' + (test.index + 1) + ' von ' + test.total;
    g('cy-test-type').hidden = !typing;
    g('cy-test-question').textContent = typing ? 'Wie heißt das orange markierte Land?' : 'Zeige: ' + q.target.name;
    g('cy-test-confirm').disabled = typing ? g('cy-test-name').value.trim() === '' : choice === null;
  }

  function renderReview() {
    const it = reviewing[reviewIndex];
    const typed = it.type === 'map-to-name';
    g('cy-look-progress').dataset.results = reviewing.map((i) => (i.correct ? 1 : 0)).join('');
    g('cy-look-progress').textContent = 'Frage ' + (reviewIndex + 1) + ' von ' + reviewing.length;
    g('cy-look-question').textContent = typed ? 'Wie heißt das markierte Land?' : 'Zeige: ' + it.target.name;
    const v = g('cy-look-verdict');
    v.className = 'fb ' + (it.correct ? 'right' : 'mistake');
    if (typed) {
      g('cy-look-answer').textContent = 'Du hast geschrieben: „' + String(it.answer).trim() + '“';
      if (it.correct) v.textContent = Feedback.right(it.target.name, it.answer);
      else if (it.chosen) MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
      else v.textContent = Feedback.wrongNoMatch(it.target.name, it.answer, 'keines der acht Nachbarländer');
    } else {
      g('cy-look-answer').textContent = 'Du hast gewählt: ' + it.chosen.name;
      if (it.correct) v.textContent = Feedback.right(it.target.name); else MapLabels.wrongText(v, Feedback.wrong(it.target.name, it.chosen.name, false));
    }
    if (flagElement(it.target.id) && !(it.chosen && !it.correct)) v.prepend(flagElement(it.target.id));
    g('cy-look-prev').disabled = reviewIndex === 0;
    g('cy-look-next').disabled = reviewIndex === reviewing.length - 1;
  }

  const topicButtons = () => [...document.querySelectorAll('.topics button')];
  function render() {
    g('topic-countries').setAttribute('aria-pressed', String(active));
    g('countries').hidden = !active;
    if (!active) return;
    for (const m of ['explore', 'practice', 'test', 'history']) g('cy-mode-' + m).setAttribute('aria-pressed', String(mode === m));
    hist.sync(mode === 'history');
    g('cy-label').hidden = mode !== 'explore';
    g('cy-dirbar').hidden = mode !== 'practice';
    g('cy-practice').hidden = mode !== 'practice';
    g('cy-test').hidden = mode !== 'test';
    if (mode === 'explore') renderExplore(); else if (mode === 'practice') renderPractice(); else if (mode === 'test') renderTest();
    drawMap();
  }

  function startTest() {
    reviewing = null; testDone = false; choice = null;
    test = createCountryTest({ countries });
    g('cy-test-name').value = '';
    render();
  }
  function confirmTest() {
    const q = test.current();
    const value = q.type === 'map-to-name' ? g('cy-test-name').value : choice;
    if (!test.confirm(value)) return;
    choice = null; g('cy-test-name').value = '';
    if (test.finished) { testDone = true; kept.addTest(test.score(), test.total); Progress.finishTest('countries', test.score(), test.total, test.review()); }
    render();
    if (!test.finished && test.current().type === 'map-to-name') g('cy-test-name').focus();
  }
  const reset = () => { sel = null; practice = null; result = null; test = null; testDone = false; reviewing = null; choice = null; };
  const hist = HistoryView.attach({ topic: 'countries', section: 'countries', buttonId: 'cy-mode-history', items: countries.map((c) => ({ key: c.id, name: c.name })),
    enter: () => { reset(); mode = 'history'; render(); }, change: drawMap });

  // Whichever topic button is pressed, this topic shows only when its own button was pressed; the other pages are left to their own handlers.
  document.querySelector('.topics').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    active = b.id === 'topic-countries';
    if (active) {
      for (const x of document.querySelectorAll('main > .contents')) if (x.id !== 'countries') x.hidden = true;
      for (const x of topicButtons()) if (x !== b) x.setAttribute('aria-pressed', 'false');
    }
    render();
  });
  g('cy-mode-explore').addEventListener('click', () => { reset(); mode = 'explore'; render(); });
  g('cy-mode-practice').addEventListener('click', () => { reset(); mode = 'practice'; practice = createCountryPractice({ countries }); render(); });
  g('cy-mode-test').addEventListener('click', () => { reset(); mode = 'test'; render(); });
  const swap = (fn) => () => { fn(); result = null; render(); };
  g('cy-dir-m2n').addEventListener('click', swap(() => practice.setDirection('map-to-name')));
  g('cy-dir-n2m').addEventListener('click', swap(() => practice.setDirection('name-to-map')));
  g('cy-next').addEventListener('click', () => { if (practice.next()) { result = null; render(); } });
  g('cy-test-go').addEventListener('click', startTest);
  g('cy-test-again').addEventListener('click', startTest);
  g('cy-test-back').addEventListener('click', () => { reviewing = null; test = null; testDone = false; render(); });
  g('cy-test-confirm').addEventListener('click', confirmTest);
  g('cy-test-name').addEventListener('input', renderTest);
  g('cy-test-name').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !g('cy-test-confirm').disabled) confirmTest(); });
  g('cy-test-review').addEventListener('click', () => { reviewing = test.review(); reviewIndex = 0; render(); });
  g('cy-look-prev').addEventListener('click', () => { if (reviewIndex > 0) { reviewIndex -= 1; render(); } });
  g('cy-look-next').addEventListener('click', () => { if (reviewIndex < reviewing.length - 1) { reviewIndex += 1; render(); } });
  g('cy-look-end').addEventListener('click', () => { reviewing = null; render(); });
  render();
})();
