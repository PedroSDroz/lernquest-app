// Enter moves on (FEAT-m3-test-018): "Weiter" in practice and review, "Antwort bestätigen" in the test, "Test starten".
// Does nothing while a button or a field has the focus, so those keep their own Enter.
(function () {
  const IDS = ['next', 'rg-next', 'ps-next', 'mt-next', 'lk-next', 'ct-next', 'cy-next',
    'look-next', 'rg-look-next', 'ps-look-next', 'mt-look-next', 'lk-look-next', 'ct-look-next', 'cy-look-next',
    'test-confirm', 'rg-test-confirm', 'ps-test-confirm', 'mt-test-confirm', 'lk-test-confirm', 'ct-test-confirm', 'cy-test-confirm',
    'test-go', 'rg-test-go', 'ps-test-go', 'mt-test-go', 'lk-test-go', 'ct-test-go', 'cy-test-go'];

  function pick(isUsable) {
    for (const id of IDS) if (isUsable(id)) return id;
    return null;
  }
  if (typeof module !== 'undefined') module.exports = { IDS, pick };
  if (typeof document === 'undefined') return;

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.repeat || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.body.classList.contains('picking')) return;
    const t = e.target;
    if (t && t.closest && t.closest('button:not(:disabled), input, textarea, select, a')) return;
    const id = pick(function (i) {
      const b = document.getElementById(i);
      return b && !b.disabled && !b.hidden && b.getClientRects().length > 0;
    });
    if (id) { e.preventDefault(); document.getElementById(id).click(); }
  });
})();
