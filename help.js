// Help and version bubble (FEAT-m3-test-025): a square button beside the Hell/Dunkel switch opens a bubble with a random
// capybara message, the version and date of the release, and a link to the repository. The pure parts (messages, the pick,
// the date and version line) are tested; the rest wires the button and the bubble. It stores nothing and asks for nothing.
(function () {
  const MESSAGES = [
    'Fehler sind nur Zwischenstopps auf dem Weg zum Gipfel.',
    'Wer lernt, darf auch baden gehen.',
    'Ein Fluss fängt klein an und kommt trotzdem am Meer an.',
    'Noch nicht gewusst heißt nur: noch nicht.',
    'Kleine Schritte, große Karte.',
    'Eine Pause ist auch Lernen. Aber nur eine kurze.',
  ];
  const REPO_URL = 'https://github.com/PedroSDroz/lernquest-app';
  const REPO_TAB = 'lernquest-repo';

  // An index into MESSAGES, never `prev`; every other message is equally likely. `rand` returns a number in [0, 1).
  function pickIndex(prev, rand) {
    const n = MESSAGES.length;
    let i = Math.floor(rand() * (n - 1));
    if (prev >= 0 && prev < n && i >= prev) i += 1;
    return Math.min(i, n - 1);
  }

  // "2026-11-05" -> "5.11.2026"
  function dateText(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    return Number(m[3]) + '.' + Number(m[2]) + '.' + m[1];
  }

  // "Lernquest v1.2 · 5.11.2026"
  function versionLine(version, iso) { return 'Lernquest v' + version + ' · ' + dateText(iso); }

  const api = { MESSAGES, REPO_URL, REPO_TAB, pickIndex, dateText, versionLine };
  if (typeof module !== 'undefined') { module.exports = api; return; }
  if (typeof document === 'undefined' || typeof Version === 'undefined') return;

  const btn = document.getElementById('help-btn'), bubble = document.getElementById('help-bubble');
  if (!btn || !bubble) return;
  const msg = document.getElementById('help-msg'), live = document.getElementById('help-live');
  const link = document.getElementById('help-link'), text = document.getElementById('help-version');
  link.href = REPO_URL; link.target = REPO_TAB; link.rel = 'noopener';
  text.textContent = versionLine(Version.VERSION, Version.RELEASE_DATE);
  const phone = () => window.matchMedia('(max-width: 900px)').matches;
  let last = -1;

  // The bubble belongs to the page, not to the rail: on a phone the rail scrolls sideways and would cut it off.
  // The bubble is fixed to the window, so it does not scroll with the lesson. On the desktop the rail stays put and the
  // bubble stays beside the button; on a phone the rail scrolls away with the page, so a scroll closes the bubble.
  function place() {
    const r = btn.getBoundingClientRect(), small = phone();
    bubble.classList.toggle('up', !small); bubble.classList.toggle('down', small);
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const left = small ? Math.min(Math.max(12, r.right - w), document.documentElement.clientWidth - w - 12) : 16;
    const top = small ? r.bottom + 14 : r.top - h - 14;
    bubble.style.left = left + 'px'; bubble.style.top = Math.max(8, top) + 'px';
    bubble.style.setProperty('--tail', (r.left + r.width / 2 - left) + 'px');
  }
  function open() {
    last = pickIndex(last, Math.random);
    msg.textContent = MESSAGES[last];
    bubble.hidden = false; btn.setAttribute('aria-expanded', 'true'); place();
    live.textContent = ''; setTimeout(() => { live.textContent = 'Das Kapybara sagt: ' + MESSAGES[last]; }, 50);
  }
  function close(refocus) {
    if (bubble.hidden) return;
    bubble.hidden = true; btn.setAttribute('aria-expanded', 'false'); live.textContent = '';
    if (refocus) btn.focus();
  }
  btn.addEventListener('click', (e) => { e.stopPropagation(); if (bubble.hidden) open(); else close(); });
  document.addEventListener('click', (e) => { if (!bubble.hidden && !bubble.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !bubble.hidden) close(true); });
  window.addEventListener('resize', () => { if (!bubble.hidden) place(); });
  window.addEventListener('scroll', () => { if (!bubble.hidden && phone()) close(); }, { passive: true });
  document.querySelectorAll('.topics button').forEach((b) => b.addEventListener('click', () => close()));
})();
