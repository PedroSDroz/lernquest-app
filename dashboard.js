// Landing page (FEAT-m3-test-004): one card per topic with the last practice, the last test and how much is known.
(function () {
  const TOPICS = [
    { id: 'regions', name: 'Bundesländer & Hauptstädte', total: () => REGION_DATA.states.length * 2 },
    { id: 'countries', name: 'Nachbarländer', total: () => COUNTRY_DATA.countries.length },
    { id: 'cities', name: 'Städte', total: () => CITY_DATA.cities.length },
    { id: 'rivers', name: 'Flüsse', total: () => MAP_DATA.rivers.length },
    { id: 'lakes', name: 'Seen', total: () => LAKE_DATA.lakes.length },
    { id: 'mountains', name: 'Gebirge', total: () => MOUNTAIN_DATA.areas.length },
    { id: 'passes', name: 'Gipfel und Pässe', total: () => PASS_DATA.passes.length + PASS_DATA.summits.length },
  ];

  function cheer(known, total) {
    if (total === 0 || known === 0) return 'Los geht\'s! Wähle ein Thema und übe ein paar Fragen.';
    const r = known / total;
    if (r < 0.25) return 'Guter Start! Jede Übung bringt dich weiter.';
    if (r < 0.5) return 'Stark! Du kennst schon einiges.';
    if (r < 0.8) return 'Super! Mehr als die Hälfte ist geschafft.';
    if (r < 1) return 'Fast geschafft! Nur noch wenige fehlen.';
    return 'Alles gekannt! Du bist Österreich-Profi.';
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  function render() {
    const root = document.getElementById('dashboard');
    if (!root || typeof Progress === 'undefined') return;
    root.replaceChildren();
    const rows = TOPICS.map((t) => ({ t, s: Progress.summary(t.id, t.total()) }));
    const known = rows.reduce((a, r) => a + r.s.known, 0);
    const total = rows.reduce((a, r) => a + r.s.total, 0);

    const hero = el('div', 'dash-hero');
    const who = typeof Profiles !== 'undefined' && Profiles.active();
    if (who) hero.append(el('p', 'dash-hello', 'Hallo ' + who.name + '!'));
    const big = el('p', 'dash-big');
    big.append(el('b', '', String(known)), ' von ' + total + ' gekannt');
    hero.append(big, el('p', 'dash-cheer', cheer(known, total)));
    const bar = el('div', 'dash-bar big'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(total)); bar.setAttribute('aria-valuenow', String(known)); bar.setAttribute('aria-label', 'Alles zusammen');
    const f = el('i'); f.style.width = (total ? Math.round(known / total * 100) : 0) + '%'; bar.append(f); hero.append(bar);
    const tip = el('div', 'dash-tip');
    const bulb = el('span', 'dash-bulb'); bulb.setAttribute('aria-hidden', 'true');
    bulb.innerHTML = '<svg class="ico" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>';
    tip.append(bulb, el('p', '', 'Gekannt heißt: von deinen letzten 5 Antworten sind 3 von 3, 4 von 4 oder 4 von 5 richtig.'));
    hero.append(tip);
    root.append(hero);

    const grid = el('div', 'dash-grid');
    for (const { t, s } of rows) {
      const card = el('button', 'dash-card');
      card.type = 'button';
      card.setAttribute('data-topic', t.id);
      const src = document.querySelector('#topic-' + t.id + ' .bub');
      const head = el('div', 'dash-head');
      const bub = el('span', 'bub'); if (src) bub.innerHTML = src.innerHTML;
      head.append(bub, el('span', 'dash-name', t.name));
      card.append(head);
      const pb = el('div', 'dash-bar'); pb.setAttribute('role', 'progressbar'); pb.setAttribute('aria-valuemin', '0'); pb.setAttribute('aria-valuemax', String(s.total)); pb.setAttribute('aria-valuenow', String(s.known)); pb.setAttribute('aria-label', t.name + ' gekannt');
      const pf = el('i'); pf.style.width = (s.total ? Math.round(s.known / s.total * 100) : 0) + '%'; pb.append(pf);
      card.append(pb, el('p', 'dash-line strong', s.known + ' von ' + s.total + ' gekannt'));
      if (s.known === s.total && s.total > 0) {
        card.classList.add('done');
        const img = el('img', 'dash-stamp'); img.src = 'assets/capybara-gym-sticker.png'; img.alt = ''; card.append(img);
        card.append(el('span', 'dash-stamp-tag', 'Alles gekannt!'));
      }
      if (s.lastTest) {
        const { score, total } = s.lastTest;
        const pct = total ? Math.round(score / total * 100) : 0;
        const C = 2 * Math.PI * 40;
        const n = typeof starsFor === 'function' ? starsFor(score, total) : 0;
        const art = el('div', 'dash-test');
        art.setAttribute('role', 'img');
        art.setAttribute('aria-label', 'Letzter Test: ' + score + ' von ' + total + ' richtig');
        art.innerHTML = '<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="40" fill="none" stroke-width="12"/><circle class="ring-fill" cx="50" cy="50" r="40" fill="none" stroke-width="12" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/><text x="50" y="59" text-anchor="middle" font-size="26" font-weight="900" fill="currentColor" font-family="inherit">' + pct + '%</text></svg>'
          + '<div class="dash-test-text"><p class="dash-line">Letzter Test</p><div class="stars" aria-hidden="true">' + [1, 2, 3].map((i) => '<svg viewBox="0 0 24 24" class="' + (i <= n ? 'on' : '') + '"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>').join('') + '</div><p class="dash-line">' + score + ' von ' + total + ' richtig</p></div>';
        card.append(art);
      } else card.append(el('p', 'dash-line', 'Noch kein Test'));
      card.append(el('p', 'dash-line small', s.lastPractice ? 'Letzte Übung: ' + s.lastPractice.right + ' von ' + s.lastPractice.total + ' richtig' : 'Noch nicht geübt'));
      card.addEventListener('click', () => { document.body.classList.remove('home'); const b = document.getElementById('topic-' + t.id); if (b) b.click(); });
      grid.append(card);
    }
    root.append(grid);
  }

  if (typeof module !== 'undefined') module.exports = { cheer, TOPICS };
  if (typeof document === 'undefined') return;

  const homeBtn = document.getElementById('home-btn');
  function setHome(on) {
    document.body.classList.toggle('home', on);
    homeBtn.setAttribute('aria-pressed', String(on));
    if (on) render();
  }
  homeBtn.addEventListener('click', () => setHome(true));
  document.querySelectorAll('.topics button[id^="topic-"]').forEach((b) => b.addEventListener('click', () => setHome(false), true));
  setHome(true);
})();
