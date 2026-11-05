// Presentation helpers for the Lernquest look (FEAT-m3-test-017): stage title, progress bars, confetti.
// No behaviour of the topics is changed; this only reads the DOM and decorates it.
(function () {
  function parseProgress(text) {
    const m = /(\d+)\s+von\s+(\d+)/.exec(String(text || ''));
    return m ? { current: Number(m[1]), total: Number(m[2]) } : null;
  }

  // How to get from the question `current` to `target` in a review: which button and how often (REQ-m3-test-270).
  function reviewSteps(current, target) {
    return target === current ? { id: 'next', times: 0 } : target > current ? { id: 'next', times: target - current } : { id: 'prev', times: current - target };
  }

  // Confetti only for a test with all three stars (REQ-m3-test-271); `text` reads "8 von 10".
  function celebrates(text) {
    const p = parseProgress(text);
    return !!p && p.total > 0 && starsFor(p.current, p.total) === 3;
  }

  function starsFor(score, total) { const r = total ? score / total : 0; return r >= 0.8 ? 3 : r >= 0.5 ? 2 : score > 0 ? 1 : 0; }
  if (typeof module !== 'undefined') module.exports = { parseProgress, starsFor, reviewSteps, celebrates };
  if (typeof window !== 'undefined') window.starsFor = starsFor;
  if (typeof document === 'undefined') return;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stage title follows the active topic button.
  const title = document.getElementById('stage-title');
  const topics = document.querySelector('.topics');
  function syncTitle() {
    const b = document.body.classList.contains('home') ? document.getElementById('home-btn') : topics.querySelector('button[id^="topic-"][aria-pressed="true"]');
    if (b && title) title.textContent = b.textContent.trim();
  }
  new MutationObserver(syncTitle).observe(topics, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
  new MutationObserver(syncTitle).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncTitle();

  // "Frage n von m": a segmented bar in the test and its review, a continuous bar in practice.
  function renderBar(el) {
    const p = parseProgress(el.textContent);
    let bar = el.previousElementSibling && el.previousElementSibling.classList.contains('pbar') ? el.previousElementSibling : null;
    if (!p) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.className = 'pbar'; bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', 'Fortschritt'); el.parentNode.insertBefore(bar, el); }
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(p.total)); bar.setAttribute('aria-valuenow', String(p.current));
    const segmented = /test-progress$|look-progress$/.test(el.id) && p.total <= 20;
    bar.classList.toggle('cont', !segmented);
    bar.classList.toggle('rev', !!el.dataset.results && /look-progress$/.test(el.id));
    bar.textContent = '';
    if (segmented) {
      for (let i = 1; i <= p.total; i++) {
        const s = document.createElement('i');
        const res = el.dataset.results;
        if (res && /look-progress$/.test(el.id)) {
          s.className = (res[i - 1] === '1' ? 'ok' : 'no') + (i === p.current ? ' c' : '');
          // In the review every pill jumps to its question (REQ-m3-test-270).
          s.setAttribute('role', 'button'); s.tabIndex = 0;
          s.setAttribute('aria-label', 'Frage ' + i + ': ' + (res[i - 1] === '1' ? 'richtig' : 'falsch'));
          if (i === p.current) s.setAttribute('aria-current', 'step');
          const go = () => {
            const prefix = el.id.replace(/look-progress$/, '');
            const now = parseProgress(el.textContent);
            const steps = reviewSteps(now ? now.current : p.current, i);
            const btn = document.getElementById(prefix + 'look-' + steps.id);
            for (let k = 0; k < steps.times && btn; k++) btn.click();
          };
          s.addEventListener('click', go);
          s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go(); } });
        }
        else s.className = i < p.current ? 'd' : i === p.current ? 'c' : '';
        bar.appendChild(s);
      }
    } else {
      const f = document.createElement('b');
      f.style.width = Math.round(((p.current - 1) / p.total) * 100) + '%';
      f.style.minWidth = '8%';
      bar.appendChild(f);
    }
  }
  const progressEls = Array.from(document.querySelectorAll('[id$="test-progress"], [id$="look-progress"]'));
  const textObserver = new MutationObserver(function (list) { list.forEach(function (m) { renderBar(m.target.nodeType === 3 ? m.target.parentNode : m.target); }); });
  progressEls.forEach(function (el) { textObserver.observe(el, { childList: true, characterData: true, subtree: true }); renderBar(el); });

  // Ring and stars above the test score.
  const NS = 'http://www.w3.org/2000/svg';
  function renderResult(el) {
    const p = parseProgress(el.textContent);
    let art = el.previousElementSibling && el.previousElementSibling.classList.contains('result-art') ? el.previousElementSibling : null;
    if (!p) { if (art) art.remove(); return; }
    if (!art) { art = document.createElement('div'); art.className = 'result-art'; art.setAttribute('aria-hidden', 'true'); el.parentNode.insertBefore(art, el); }
    const pct = p.total ? Math.round(p.current / p.total * 100) : 0;
    const C = 2 * Math.PI * 40;
    art.innerHTML = '<svg class="ring" viewBox="0 0 100 100"><circle class="ring-track" cx="50" cy="50" r="40" fill="none" stroke-width="10"/>'
      + '<circle class="ring-fill" cx="50" cy="50" r="40" fill="none" stroke-width="10" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/>'
      + '<text x="50" y="58" text-anchor="middle" font-size="24" font-weight="900" fill="currentColor" font-family="inherit">' + pct + '%</text></svg>'
      + '<div class="stars">' + [1, 2, 3].map(function (i) { return '<svg viewBox="0 0 24 24" class="' + (i <= starsFor(p.current, p.total) ? 'on' : '') + '"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>'; }).join('') + '</div>';
  }
  const scoreObserver = new MutationObserver(function (list) { list.forEach(function (m) { renderResult(m.target.nodeType === 3 ? m.target.parentNode : m.target); }); });
  document.querySelectorAll('[id$="test-score"]').forEach(function (el) { scoreObserver.observe(el, { childList: true, characterData: true, subtree: true }); renderResult(el); });

  // Confetti when a test is finished with three stars: a lot of it, in different sizes, speeds and turns (REQ-m3-test-271).
  const PIECES = 150;
  function confetti() {
    if (reduced) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    box.setAttribute('aria-hidden', 'true');
    const colours = ['#5cc628', '#ffc21a', '#1ca6ea', '#ff7a1a', '#ff6b5f', '#9b6bff'];
    for (let i = 0; i < PIECES; i++) {
      const c = document.createElement('i');
      c.style.left = (Math.random() * 100).toFixed(1) + '%';
      c.style.background = colours[i % colours.length];
      c.style.width = (7 + Math.random() * 9).toFixed(0) + 'px';
      c.style.height = (10 + Math.random() * 14).toFixed(0) + 'px';
      c.style.animationDelay = (Math.random() * 2.4).toFixed(2) + 's';
      c.style.animationDuration = (2.6 + Math.random() * 2).toFixed(2) + 's';
      c.style.setProperty('--turn', ((Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720)).toFixed(0) + 'deg');
      box.appendChild(c);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 8000);
  }
  const endObserver = new MutationObserver(function (list) {
    list.forEach(function (m) {
      if (m.target.hidden || m.oldValue === null) return;
      const score = m.target.querySelector('[id$="test-score"]');
      if (score && celebrates(score.textContent)) confetti();
    });
  });
  document.querySelectorAll('[id$="test-end"]').forEach(function (el) { endObserver.observe(el, { attributes: true, attributeFilter: ['hidden'], attributeOldValue: true }); });
})();

// Light / dark switch (FEAT-m3-test-020): light is the default; the choice is kept in the browser.
(function () {
  if (typeof document === 'undefined') return;
  const KEY = 'm3-test-theme';
  const buttons = { light: document.getElementById('theme-light'), dark: document.getElementById('theme-dark') };
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function show(mode) {
    buttons.light.setAttribute('aria-pressed', String(mode !== 'dark'));
    buttons.dark.setAttribute('aria-pressed', String(mode === 'dark'));
  }
  function apply(mode) { document.documentElement.setAttribute('data-theme', mode); show(mode); }
  function set(mode) { apply(mode); try { localStorage.setItem(KEY, mode); } catch (e) { /* not kept */ } }
  buttons.light.addEventListener('click', function () { set('light'); });
  buttons.dark.addEventListener('click', function () { set('dark'); });
  // Without a saved choice the page follows the device; the switch only shows what is in effect.
  const chosen = document.documentElement.getAttribute('data-theme');
  show(chosen || (media && media.matches ? 'dark' : 'light'));
  if (media && media.addEventListener) media.addEventListener('change', function () { if (!document.documentElement.getAttribute('data-theme')) show(media.matches ? 'dark' : 'light'); });
})();
