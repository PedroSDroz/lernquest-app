// Answer labels on the map (FEAT-m3-test-020). After a wrong answer two pills sit at the items on the map:
// "✕ Deine Antwort: Wien" at the child's item and "✓ Richtig: Klagenfurt" at the right one. The placement is pure
// (and tested); the drawing adds an SVG group "ml" to the topic's map.
(function () {
  const FONT_PX = 13;   // text size on the screen at any map size (REQ-m3-test-264)
  const SHORT = 'Nicht ganz.';
  const MIN_GAP_PX = 12; // least distance on the screen between the wrong and the right label (FIX-m3-test-008)

  const text = (kind, name) => (kind === 'wrong' ? '✕ Deine Antwort: ' : '✓ Richtig: ') + name;

  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // Keeps a box inside the map's viewBox.
  function clamp(b, vb) {
    return { x: Math.min(Math.max(b.x, vb.x), vb.x + vb.w - b.w), y: Math.min(Math.max(b.y, vb.y), vb.y + vb.h - b.h), w: b.w, h: b.h };
  }

  // Two labels that share a stretch of the map (their widths overlap) keep at least minGap between them, top to bottom:
  // the upper one moves up and the lower one down, each by half the shortfall, and stay inside the map (FIX-m3-test-008).
  function separate(boxes, minGap, vb) {
    if (!minGap || boxes.length < 2) return boxes;
    const [a, b] = boxes;
    if (!(a.x < b.x + b.w && b.x < a.x + a.w)) return boxes;
    const [up, low] = a.y <= b.y ? [a, b] : [b, a];
    const short = minGap - (low.y - (up.y + up.h));
    if (short <= 0) return boxes;
    let u = clamp({ ...up, y: up.y - short / 2 }, vb);
    let l = clamp({ ...low, y: low.y + short / 2 }, vb);
    // a box held by the map's edge leaves the rest of the shortfall to the other one
    const left = minGap - (l.y - (u.y + u.h));
    if (left > 0) { if (u.y > vb.y) u = clamp({ ...u, y: u.y - left }, vb); else l = clamp({ ...l, y: l.y + left }, vb); }
    return a === up ? [u, l] : [l, u];
  }

  // items: [{ kind: 'wrong' | 'right', ax, ay, w, h }]; the wrong label goes above its item, the right one below;
  // when they would overlap, they swap, then both go on the same side. minGap (map units) is the least distance kept
  // between the two labels, top to bottom. Returns the boxes in the same order.
  function place(items, vb, gap, minGap = 0) {
    return separate(placeBoxes(items, vb, gap), minGap, vb);
  }

  function placeBoxes(items, vb, gap) {
    const box = (it, side) => clamp({ x: it.ax - it.w / 2, y: side === 'above' ? it.ay - gap - it.h : it.ay + gap, w: it.w, h: it.h }, vb);
    const wanted = (it) => (it.kind === 'wrong' ? 'above' : 'below');
    const flip = (s) => (s === 'above' ? 'below' : 'above');
    if (items.length < 2) return items.map((it) => box(it, wanted(it)));
    const tries = [[0, 0], [1, 1], [0, 1], [1, 0]]; // flip none, flip both, flip the first, flip the second
    let best = null;
    for (const [f0, f1] of tries) {
      const boxes = [box(items[0], f0 ? flip(wanted(items[0])) : wanted(items[0])), box(items[1], f1 ? flip(wanted(items[1])) : wanted(items[1]))];
      if (!overlap(boxes[0], boxes[1])) return boxes;
      best = best || boxes;
    }
    return best;
  }

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // One pill as SVG markup: box b in map units, `scale` screen pixels per map unit (REQ-m3-test-261, -264, NFR-m3-test-065).
  function pillSvg(kind, str, b, scale, padX) {
    const fs = FONT_PX / scale;
    return '<g class="' + (kind === 'wrong' ? 'ml-w' : 'ml-r') + '"><rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="' + 8 / scale + '" stroke-width="' + 2 / scale + '"/>'
      + '<text class="ml-t" x="' + (b.x + padX) + '" y="' + (b.y + b.h / 2) + '" font-size="' + fs + '" dominant-baseline="central">' + esc(str) + '</text></g>';
  }

  if (typeof module !== 'undefined') module.exports = { place, separate, text, overlap, clamp, pillSvg, SHORT, FONT_PX, MIN_GAP_PX };
  if (typeof document === 'undefined') return;

  const NS = 'http://www.w3.org/2000/svg';
  const drawn = new Set();

  function anchor(it) {
    try {
      if (it.mid && it.el.getTotalLength) { const p = it.el.getPointAtLength(it.el.getTotalLength() / 2); return { x: p.x, y: p.y }; }
      const b = it.el.getBBox();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    } catch (e) { return null; }
  }

  // items: [{ el, name, kind, mid }]; an empty list removes the labels.
  function draw(svg, items) {
    const old = svg.querySelector('.ml');
    if (old) old.remove();
    svg._labels = items;
    if (!items || !items.length) { drawn.delete(svg); return; }
    drawn.add(svg);
    const ctm = svg.getScreenCTM();
    const scale = ctm && ctm.a > 0 ? ctm.a : 1;
    const vbA = svg.viewBox.baseVal;
    const vb = { x: vbA.x, y: vbA.y, w: vbA.width, h: vbA.height };
    const fs = FONT_PX / scale, padX = 8 / scale, h = fs * 1.9;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'ml'); g.setAttribute('pointer-events', 'none');
    svg.appendChild(g);
    const sized = [];
    for (const it of items) {
      const a = anchor(it);
      if (!a) continue;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('font-size', fs); t.setAttribute('class', 'ml-t');
      t.textContent = text(it.kind, it.name);
      g.appendChild(t);
      const len = t.getComputedTextLength ? t.getComputedTextLength() : 0;
      g.removeChild(t);
      sized.push({ kind: it.kind, str: t.textContent, ax: a.x, ay: a.y, w: (len || t.textContent.length * fs * 0.62) + 2 * padX, h });
    }
    const boxes = place(sized, vb, 16 / scale, MIN_GAP_PX / scale); // 12 px between the two labels on the screen
    g.innerHTML = sized.map((s, i) => pillSvg(s.kind, s.str, boxes[i], scale, padX)).join('');
  }

  // Redraw at the new size when the window changes (REQ-m3-test-266).
  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { for (const svg of Array.from(drawn)) draw(svg, svg._labels); }, 100);
  });

  // The feedback box of a wrong answer shows "Nicht ganz."; the full sentence is kept for screen readers (NFR-m3-test-065).
  function wrongText(box, full) {
    box.textContent = '';
    const v = document.createElement('span'); v.setAttribute('aria-hidden', 'true'); v.textContent = SHORT;
    const s = document.createElement('span'); s.className = 'sr-only'; s.textContent = full;
    box.append(v, s);
  }

  window.MapLabels = { draw, wrongText, place, text };
})();
