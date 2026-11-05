// "Mein Stand" (FEAT-m3-test-019): the mode "Mein Stand" of every topic. A list of all items with their last five
// answers and a known indicator, next to the topic's map. The row logic is pure (and tested); the wiring at the bottom
// adds the mode button and the panel to a topic's page and tells the topic's script what to mark on its map.
(function () {
  const EXPLAIN = 'Die letzten 5 Antworten, älteste links. Gekannt heißt: 3 von 3, 4 von 4 oder 4 von 5 richtig.';
  const FILTERS = [['all', 'Alle'], ['known', 'Gekannt'], ['open', 'Noch nicht']];
  const STATUS = { known: 'Gekannt', open: 'Noch nicht' };
  // Shown instead of the list (and instead of the explanation) when a filter matches nothing.
  const EMPTY = { known: 'Noch nichts gekannt. Übe weiter, dann füllt sich diese Liste.', open: 'Du kennst alles! Stark.', all: 'Hier ist noch nichts.' };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // items: [{ key, name, group?, tag? }]; answers: { key: [true, false, ...] } oldest first; isKnown takes a string of 1 and 0.
  // `group` is the category (Bundesländer / Hauptstädte, Gipfel / Pässe); the rows come in the order the groups first
  // appear in `items`, alphabetical within a group. `tag` is spoken after the name where the heading is not read.
  function buildRows(items, answers, isKnown) {
    const order = [];
    for (const it of items) if (!order.includes(it.group || '')) order.push(it.group || '');
    return items.map((it) => {
      const a = (answers && answers[it.key]) || [];
      const right = a.filter(Boolean).length;
      const state = isKnown(a.map((x) => (x ? '1' : '0')).join('')) ? 'known' : 'open';
      return { key: it.key, name: it.name, group: it.group || '', tag: it.tag || '', answers: a, right, state };
    }).sort((x, y) => (order.indexOf(x.group) - order.indexOf(y.group)) || x.name.localeCompare(y.name, 'de'));
  }

  // The list: with more than one group, a heading above each group that has rows (REQ-m3-test-250).
  function listHtml(rows) {
    const groups = new Set(rows.map((r) => r.group));
    let out = '', last = null;
    for (const r of rows) {
      if (groups.size > 1 && r.group !== last) out += '<h3 class="hist-group">' + esc(r.group) + '</h3>';
      last = r.group;
      out += rowHtml(r);
    }
    return out;
  }

  function counts(rows) {
    const c = { all: rows.length, known: 0, open: 0 };
    for (const r of rows) c[r.state] += 1;
    return c;
  }

  const filterRows = (rows, f) => (f === 'all' ? rows : rows.filter((r) => r.state === f));

  function label(r) {
    const name = r.name + (r.tag ? ' (' + r.tag + ')' : '');
    if (r.answers.length === 0) return name + ': noch nicht gekannt, noch keine Antwort';
    return name + ': ' + (r.state === 'known' ? 'gekannt' : 'noch nicht gekannt') + ', ' + r.right + ' von ' + r.answers.length + ' richtig';
  }

  // Five slots, oldest left; the answers start at the left and the slots still missing are empty at the right (REQ-m3-test-251).
  function slotsHtml(answers) {
    let out = '';
    for (let i = 0; i < 5; i++) {
      if (i >= answers.length) out += '<i class="hs e"></i>';
      else if (answers[i]) out += '<i class="hs r" title="richtig">&#10003;</i>';
      else out += '<i class="hs w" title="falsch">&#10005;</i>';
    }
    return out;
  }

  function rowHtml(r) {
    const chip = '<span class="hist-st ' + r.state + '">' + (r.state === 'known' ? '&#10003; ' : '') + STATUS[r.state] + '</span>';
    return '<button type="button" class="hist-row ' + r.state + '" data-key="' + esc(r.key) + '" aria-label="' + esc(label(r)) + '">'
      + '<span class="hist-name">' + esc(r.name) + '</span>' + chip
      + '<span class="hist-slots" aria-hidden="true">' + slotsHtml(r.answers) + '</span></button>';
  }

  const emptyHtml = (filter) => '<p class="hist-empty">' + esc(EMPTY[filter] || EMPTY.all) + '</p>';

  function chipsHtml(c, f) {
    return FILTERS.map(([id, text]) => '<button type="button" class="hist-chip" data-filter="' + id + '" aria-pressed="' + (f === id) + '">' + text + ' ' + c[id] + '</button>').join('');
  }

  if (typeof module !== 'undefined') module.exports = { buildRows, listHtml, counts, filterRows, rowHtml, chipsHtml, slotsHtml, label, emptyHtml, EXPLAIN, EMPTY };
  if (typeof document === 'undefined') return;

  // opts: { topic, section: id of the topic's section, items: [{ key, name }], enter(): switch the topic to this mode, change(): redraw the map }
  function attach(opts) {
    if (typeof Celebrate !== 'undefined') Celebrate.setItems(opts.topic, opts.items); // names and size for the celebrations (FEAT-m3-test-024)
    const section = document.getElementById(opts.section);
    const nav = section.querySelector('nav');
    const side = section.querySelector('.side');
    let filter = 'all', hover = null, pinned = null, rows = [], on = false;

    const button = document.createElement('button');
    button.type = 'button'; button.id = opts.buttonId; button.textContent = 'Mein Stand'; button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => opts.enter());
    nav.appendChild(button);

    const panel = document.createElement('section');
    panel.className = 'hist-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'Mein Stand');
    panel.innerHTML = '<div class="hist-head"><p class="hist-big"></p><div class="hist-bar" role="progressbar" aria-label="gekannt"><i></i></div>'
      + '<div class="hist-chips"></div></div><div class="hist-list"></div><p class="hist-note"></p>';
    panel.querySelector('.hist-note').textContent = EXPLAIN;
    side.appendChild(panel);
    const note = panel.querySelector('.hist-note'), big = panel.querySelector('.hist-big'), bar = panel.querySelector('.hist-bar'), chips = panel.querySelector('.hist-chips'), list = panel.querySelector('.hist-list');

    const marked = () => (hover !== null ? hover : pinned);
    function paintRows() {
      const shown = filterRows(rows, filter);
      list.innerHTML = shown.length ? listHtml(shown) : emptyHtml(filter);
      note.hidden = shown.length === 0;
      for (const b of list.querySelectorAll('.hist-row')) {
        const k = b.getAttribute('data-key');
        b.classList.toggle('hl', k === marked());
        b.addEventListener('mouseenter', () => { hover = k; mark(); });
        b.addEventListener('focus', () => { hover = k; mark(); });
        b.addEventListener('mouseleave', () => { hover = null; mark(); });
        b.addEventListener('blur', () => { hover = null; mark(); });
        b.addEventListener('click', () => { pinned = pinned === k ? null : k; mark(); });
      }
    }
    function mark() {
      for (const b of list.querySelectorAll('.hist-row')) b.classList.toggle('hl', b.getAttribute('data-key') === marked());
      opts.change();
    }
    function refresh() {
      rows = buildRows(opts.items, Progress.answers(opts.topic), Progress.isKnown);
      const c = counts(rows);
      big.innerHTML = '<b>' + c.known + ' von ' + c.all + '</b> gekannt';
      bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(c.all)); bar.setAttribute('aria-valuenow', String(c.known));
      bar.firstChild.style.width = (c.all ? Math.round(c.known / c.all * 100) : 0) + '%';
      chips.innerHTML = chipsHtml(c, filter);
      paintRows();
    }
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('.hist-chip');
      if (!b) return;
      filter = b.getAttribute('data-filter');
      chips.innerHTML = chipsHtml(counts(rows), filter);
      paintRows();
    });

    // The topic's render() calls this with whether its mode is "history".
    function sync(active) {
      button.setAttribute('aria-pressed', String(active));
      panel.hidden = !active;
      section.classList.toggle('hist-on', active);
      if (active && !on) { hover = null; pinned = null; refresh(); }
      if (!active) { hover = null; pinned = null; }
      on = active;
    }
    // What the topic's view() paints: known items "correct", the pointed-at row's item "target".
    function marks() {
      const m = {};
      for (const r of rows) if (r.state === 'known') m[r.key] = 'correct';
      if (marked() !== null) m[marked()] = 'target';
      return m;
    }

    // The map is not selectable while this mode is on.
    const svg = section.querySelector('svg');
    // The legend sits over the map's top left corner, where Austria leaves room (REQ-m3-test-252).
    if (svg && svg.parentElement) {
      const legend = document.createElement('p');
      legend.className = 'hist-maplegend';
      legend.innerHTML = '<span class="k">gekannt</span><span class="o">noch nicht</span>';
      svg.parentElement.appendChild(legend);
    }
    if (svg) svg.addEventListener('click', (e) => { if (on) e.stopPropagation(); }, true);

    const end = section.querySelector('[id$="test-end"]');
    if (end) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = 'Mein Stand'; b.addEventListener('click', () => opts.enter());
      (end.querySelector('.row') || end).appendChild(b);
    }

    // Choosing the topic in the menu or on a card of the Übersicht always starts in "Karte erkunden" (owner, 2026-11-05).
    // This runs after the topic's own click handler, which has shown the topic.
    const topicButton = document.getElementById('topic-' + opts.topic);
    const exploreButton = document.getElementById(opts.buttonId.replace('history', 'explore'));
    if (topicButton && exploreButton) topicButton.addEventListener('click', () => exploreButton.click());

    return { sync, marks, active: () => on };
  }

  window.HistoryView = { attach };
})();
