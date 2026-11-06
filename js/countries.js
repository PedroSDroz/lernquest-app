// Logic for the neighbouring countries (FEAT-m3-test-014, REQ-m3-test-146 to -165). Pure, no DOM.
// An item is a country: { id, name, path, rings, box }. Practice and test handling is the lakes' (an item list with ids and names),
// so it is reused from src/lakes.js; this file adds the selection rule for country shapes and the page constants.
const cn = typeof lakeRings === 'function'
  ? { lakeRings, lakeDistance, createLakePractice, createLakeTest }
  : require('./lakes.js');
const COUNTRY_HIT_PX = 24;   // halo around a small country's outline, in screen pixels (NFR-m3-test-047)
const COUNTRY_SMALL_PX = 44; // a country whose drawn shape is smaller than this in width or height counts as small (NFR-m3-test-047)

// Add rings and the bounding box (map units) to each country.
function withBounds(countries) {
  return countries.map((c) => {
    const rings = cn.lakeRings(c.path);
    const xs = rings.flat().map((p) => p[0]);
    const ys = rings.flat().map((p) => p[1]);
    return { ...c, rings, box: { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } };
  });
}

// The country a point selects, or null (NFR-m3-test-047). scale: screen pixels per map unit.
// 1. A small country wins within its halo, even over a larger neighbour that holds the point.
// 2. Otherwise the country whose shape holds the point. A large country has no margin; Austria selects nothing.
function pickCountry(pt, countries, scale, haloPx = COUNTRY_HIT_PX, smallPx = COUNTRY_SMALL_PX) {
  let best = null;
  let bestD = Infinity;
  for (const c of countries) {
    if (Math.min(c.box.w, c.box.h) * scale >= smallPx) continue;
    const d = cn.lakeDistance(pt, c) * scale;
    if (d <= haloPx && d < bestD) { best = c; bestD = d; }
  }
  if (best) return best;
  return countries.find((c) => cn.lakeDistance(pt, c) === 0) || null;
}

const createCountryPractice = ({ countries, direction, rng }) => cn.createLakePractice({ lakes: countries, direction, rng });
// 8 questions: 4 name to map, then 4 map to name typed; each of the eight countries once (REQ-m3-test-153).
const createCountryTest = ({ countries, rng }) => cn.createLakeTest({ lakes: countries, rng });

if (typeof module !== 'undefined') {
  module.exports = { withBounds, pickCountry, createCountryPractice, createCountryTest, COUNTRY_HIT_PX, COUNTRY_SMALL_PX };
}
