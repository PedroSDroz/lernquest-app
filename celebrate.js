// Celebrations (FEAT-m3-test-024): a short message with a star burst when an item newly becomes known, and when a topic passes
// 50, 75 and 100 % known; the full confetti at 100 %. What counts as a celebration is decided in progress.js (`onCelebrate`);
// this file words the message (pure, tested) and shows it: in practice inside the bar above the feedback, after a test on the
// result screen.
(function () {
  const TOPIC_NAMES = {
    regions: 'Bundesländer & Hauptstädte', countries: 'Nachbarländer', cities: 'Städte', rivers: 'Flüsse', lakes: 'Seen',
    mountains: 'Gebirge', passes: 'Gipfel und Pässe',
  };
  // The ids of a topic's practice feedback element and test result screen.
  const IDS = {
    rivers: ['feedback', 'test-end'], regions: ['rg-feedback', 'rg-test-end'], passes: ['ps-feedback', 'ps-test-end'],
    mountains: ['mt-feedback', 'mt-test-end'], lakes: ['lk-feedback', 'lk-test-end'], cities: ['ct-feedback', 'ct-test-end'],
    countries: ['cy-feedback', 'cy-test-end'],
  };
  const MAX_NAMES = 3;

  // "Neu gewusst: A." / "3 neu gewusst: A, B, C." / "7 neu gewusst: A, B, C und 4 weitere."
  function itemText(names) {
    if (names.length === 0) return '';
    if (names.length === 1) return 'Neu gewusst: ' + names[0] + '.';
    const shown = names.slice(0, MAX_NAMES).join(', ');
    const rest = names.length - MAX_NAMES;
    return names.length + ' neu gewusst: ' + shown + (rest > 0 ? ' und ' + rest + ' weitere' : '') + '.';
  }

  // `lead` is the bold part, `rest` the rest; `big` is a milestone; `confetti` is only the full celebration.
  function message(event, topicName, names) {
    const items = itemText(names || []);
    const m = event.milestone;
    if (!m) return { lead: items.split(':')[0] + ':', rest: items.slice(items.indexOf(':') + 1).trim(), text: items, big: false, confetti: false };
    const lead = m.pct === 50 ? 'Halbzeit bei ' + topicName + ':' : m.pct === 75 ? 'Stark!' : 'Geschafft!';
    const rest = m.pct === 50 ? m.known + ' von ' + m.total + ' kennst du.'
      : m.pct === 75 ? 'Bei ' + topicName + ' kennst du schon ' + m.known + ' von ' + m.total + '.'
        : 'Alles aus ' + topicName + ' kennst du: ' + m.total + ' von ' + m.total + '.';
    return { lead, rest: rest + (items ? ' ' + items : ''), text: lead + ' ' + rest + (items ? ' ' + items : ''), big: true, confetti: m.pct === 100 };
  }

  if (typeof module !== 'undefined') module.exports = { message, itemText, TOPIC_NAMES, IDS };
  if (typeof document === 'undefined') return;

  const names = {}; // topic -> { key: name }
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>';
  const motionOff = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let live = null;

  function burst(host, n, spread) {
    if (motionOff()) return;
    const b = document.createElement('div');
    b.className = 'cele-burst'; b.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, d = spread * (0.6 + Math.random() * 0.6);
      const s = document.createElement('span'); s.innerHTML = STAR;
      const el = s.firstChild;
      el.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px'); el.style.setProperty('--dy', (Math.sin(a) * d).toFixed(0) + 'px');
      el.style.setProperty('--rot', (Math.random() * 360 - 180).toFixed(0) + 'deg'); el.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
      b.appendChild(el);
    }
    host.appendChild(b);
    setTimeout(() => b.remove(), 1400);
  }

  function card(msg) {
    const c = document.createElement('div');
    c.className = 'cele' + (msg.big ? ' big' : '');
    const badge = document.createElement('span'); badge.className = 'cele-badge'; badge.innerHTML = STAR; badge.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    const b = document.createElement('b'); b.textContent = msg.lead;
    text.appendChild(b); text.appendChild(document.createTextNode(' ' + msg.rest));
    c.appendChild(badge); c.appendChild(text);
    return c;
  }

  function speak(text) {
    if (!live) { live = document.createElement('div'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 50);
  }

  function show(event) {
    const ids = IDS[event.topic];
    if (!ids) return;
    const n = names[event.topic] || {};
    const msg = message(event, TOPIC_NAMES[event.topic] || '', event.items.map((k) => n[k] || k));
    let host, parent;
    if (event.kind === 'practice') {
      const fb = document.getElementById(ids[0]);
      if (!fb || !fb.parentNode) return;
      parent = fb.parentNode;
      parent.querySelectorAll('.cele').forEach((x) => x.remove());
      host = card(msg);
      parent.insertBefore(host, parent.firstChild);
      // The card goes when the next question clears the feedback.
      const obs = new MutationObserver(() => { if (!fb.textContent) { host.remove(); obs.disconnect(); } });
      obs.observe(fb, { childList: true, characterData: true, subtree: true });
    } else {
      const end = document.getElementById(ids[1]);
      if (!end) return;
      end.querySelectorAll('.cele').forEach((x) => x.remove());
      host = card(msg);
      const score = end.querySelector('[id$="test-score"]');
      if (score && score.parentNode === end) score.insertAdjacentElement('afterend', host); else end.insertBefore(host, end.firstChild);
      // The card goes when the result screen is left.
      const obs = new MutationObserver(() => { if (end.hidden) { host.remove(); obs.disconnect(); } });
      obs.observe(end, { attributes: true, attributeFilter: ['hidden'] });
    }
    burst(host, msg.big ? 14 : 7, msg.big ? 110 : 60);
    if (msg.confetti && window.lqConfetti) window.lqConfetti();
    speak(msg.text);
  }

  window.Celebrate = {
    // Called by every topic with its items ({ key, name }): the names for the message and the topic's size for the milestones.
    setItems(topic, items) {
      names[topic] = {};
      for (const i of items) names[topic][i.key] = i.name;
      if (typeof Progress !== 'undefined' && Progress.setTotal) Progress.setTotal(topic, items.length);
    },
  };
  if (typeof Progress !== 'undefined' && Progress.onCelebrate) Progress.onCelebrate(show);
})();
