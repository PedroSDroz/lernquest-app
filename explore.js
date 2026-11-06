// Shared bits of "Karte erkunden" (FIX-m3-test-001): the one-line hint every topic shows in this mode, and the
// German alphabetical order of a list of named items. The hint is added to each topic's side column; the stylesheet
// shows it only while that topic's "Karte erkunden" button is pressed (theme.css, `.explore-hint`).
(function () {
  const EXPLORE_HINT = 'Tippe auf die Karte oder die Liste, um etwas kennenzulernen. Hier gibt es keine Punkte.';

  // A new array, sorted by name with German collation (Ä sorts with A, ß with ss).
  const sortByName = (items) => [...items].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  if (typeof module !== 'undefined') module.exports = { EXPLORE_HINT, sortByName };
  if (typeof document === 'undefined') return;

  for (const nav of document.querySelectorAll('main nav')) {
    if (!nav.querySelector('button[id$="mode-explore"]')) continue;
    const side = nav.parentElement.querySelector('.side');
    if (!side) continue;
    const p = document.createElement('p');
    p.className = 'explore-hint';
    p.textContent = EXPLORE_HINT;
    side.insertBefore(p, side.firstChild);
  }
  window.Explore = { EXPLORE_HINT, sortByName };
})();
