// The scroll signifier for the lists in the side panels (FIX-m3-test-011): while a list that scrolls has more below the
// visible part, its foot shows a fade and a chevron; both go at the end of the list. Every side list that scrolls gets it
// (project rule): add its selector to LISTS below. The "Mein Stand" list has the same cue, built in history.js (FIX-m3-test-001).
const ScrollCue = (() => {
  // The lists that scroll: the city, Gebirge and Seen name buttons and the answer buttons of every practice and test.
  const LISTS = '#ct-list, #mt-list, #lk-list, .side [id$="answers"]';

  // Is there more of the list below the visible part? A pixel of slack absorbs fractional scroll positions.
  const moreBelow = (el) => el.scrollHeight - el.clientHeight - el.scrollTop > 1;

  function attach(list) {
    if (!list || !list.parentNode || list.parentNode.classList.contains('scroll-cue')) return null;
    const wrap = document.createElement('div');
    wrap.className = 'scroll-cue';
    list.parentNode.insertBefore(wrap, list);
    wrap.appendChild(list);
    const more = document.createElement('span');
    more.className = 'hist-more'; more.setAttribute('aria-hidden', 'true');
    more.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
    wrap.appendChild(more);
    const cue = () => wrap.classList.toggle('more', moreBelow(list));
    list.addEventListener('scroll', cue, { passive: true });
    window.addEventListener('resize', cue);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(cue).observe(list);
    if (typeof MutationObserver !== 'undefined') new MutationObserver(cue).observe(list, { childList: true, subtree: true });
    cue();
    return { cue };
  }

  const attachAll = () => document.querySelectorAll(LISTS).forEach(attach);
  if (typeof document !== 'undefined' && typeof module === 'undefined') attachAll();
  return { LISTS, moreBelow, attach, attachAll };
})();
if (typeof module !== 'undefined') module.exports = ScrollCue;
