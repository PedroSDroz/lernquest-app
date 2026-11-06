// Flags of the eight neighbours, drawn as simple SVG (30 x 20), for the Nachbarländer topic (FEAT-m3-test-019).
const FLAGS = {
  deutschland: '<rect width="30" height="7" fill="#000"/><rect y="6.7" width="30" height="6.7" fill="#DD0000"/><rect y="13.3" width="30" height="6.7" fill="#FFCE00"/>',
  tschechien: '<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#D7141A"/><path d="M0 0 L15 10 L0 20Z" fill="#11457E"/>',
  slowakei: '<rect width="30" height="6.7" fill="#fff"/><rect y="6.7" width="30" height="6.7" fill="#0B4EA2"/><rect y="13.3" width="30" height="6.7" fill="#EE1C25"/><path d="M6 4 h9 v7 q0 4 -4.5 6 q-4.5 -2 -4.5 -6z" fill="#EE1C25" stroke="#fff" stroke-width="1"/><path d="M10.5 6 v8 M8 8.5 h5 M8.6 11 h3.8" stroke="#fff" stroke-width="1.2"/>',
  ungarn: '<rect width="30" height="6.7" fill="#CE2939"/><rect y="6.7" width="30" height="6.7" fill="#fff"/><rect y="13.3" width="30" height="6.7" fill="#477050"/>',
  slowenien: '<rect width="30" height="6.7" fill="#fff"/><rect y="6.7" width="30" height="6.7" fill="#005DA4"/><rect y="13.3" width="30" height="6.7" fill="#ED1C24"/><path d="M5 3 h7 v6 q0 3.5 -3.5 5 q-3.5 -1.5 -3.5 -5z" fill="#005DA4" stroke="#ED1C24" stroke-width="1"/><path d="M6.5 9 l2 -2.4 2 2.4 M6.5 11 l2 -2.4 2 2.4" fill="none" stroke="#fff" stroke-width="1"/>',
  italien: '<rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE2B37"/>',
  schweiz: '<rect width="30" height="20" fill="#D52B1E"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/>',
  liechtenstein: '<rect width="30" height="10" fill="#002B7F"/><rect y="10" width="30" height="10" fill="#CE1126"/><path d="M5 7.5 l1 -3 1.6 1.8 1.4 -2.4 1.4 2.4 1.6 -1.8 1 3z" fill="#FFD83D" stroke="#B8860B" stroke-width=".4"/>',
};

// An <svg> element for the country id (a decoration, hidden from screen readers), or null.
function flagElement(id) {
  if (typeof document === 'undefined' || !FLAGS[id]) return null;
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 30 20');
  s.setAttribute('class', 'flag');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = FLAGS[id];
  return s;
}

if (typeof module !== 'undefined') module.exports = { FLAGS };
