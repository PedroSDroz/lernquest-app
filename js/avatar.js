// The child's character (FEAT-m3-test-021): a clay figure built from a few parts and three colours.
// Figures come from the DiceBear "Clay" style (CC0), bundled in vendor/clay.js.
const AVATAR_PARTS = {
  body: ['pear', 'boulder', 'loaf', 'column', 'stack', 'gumdrop', 'dollop', 'slug', 'egg', 'blob', 'bell', 'cube', 'squat', 'lean'],
  eyes: ['googly', 'even', 'big', 'tiny', 'mono', 'trio', 'side', 'outward', 'inward', 'dots', 'happy', 'wink', 'down', 'up', 'pinprick'],
  mouth: ['teeth', 'smile', 'o', 'frown', 'line', 'wavy', 'open', 'toothy', 'tongue', 'pout', 'grin', 'smirk', 'zigzag', 'dot', 'laugh', 'cat', 'smileBig', 'uu', 'openSmall', 'smileTongue'],
  top: ['none', 'horns', 'nub', 'curl', 'spikes', 'antenna', 'loop', 'peak', 'ears', 'crest', 'swirl', 'pellet', 'hornsSmall', 'tuft'],
  pattern: ['none', 'spiral', 'prints', 'pellets', 'buttons', 'stitches', 'patch', 'coil', 'freckles', 'checker', 'zig'],
};
const AVATAR_COLORS = {
  body: ['c4795c', 'd99277', 'e0bd6a', 'cf9f52', 'a8b37e', '8ba06b', '83b0a4', '86a5c3', '9793bd', 'ab8bbd', 'cd8ea6', 'b3a696'],
  accent: ['c4795c', 'd99277', 'e0bd6a', 'cf9f52', 'a8b37e', '8ba06b', '83b0a4', '86a5c3', '9793bd', 'ab8bbd', 'cd8ea6', 'b3a696'],
  bg: ['f4e8d4', 'f8f1e5', 'f7e3d9', 'f9ecc9', 'eff0da', 'e3efe9', 'e2ecf4', 'e9e7f4', 'f4e4ef', 'ece8e2', 'f9e8cf', 'e8edf0'],
};
const AVATAR_DEFAULT = { body: 'gumdrop', eyes: 'happy', mouth: 'smile', top: 'none', pattern: 'none', bodyColor: '83b0a4', accent: 'e0bd6a', bg: 'f8f1e5' };
const AVATAR_CREDIT = 'Figuren: DiceBear „Clay“ (CC0).';

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

// Only known choices are used; anything else (also the figures of earlier versions) falls back to the default.
function avatarClean(a) {
  const ok = (list, v, d) => (list.indexOf(v) >= 0 ? v : d);
  const x = a || {};
  return {
    body: ok(AVATAR_PARTS.body, x.body, AVATAR_DEFAULT.body), eyes: ok(AVATAR_PARTS.eyes, x.eyes, AVATAR_DEFAULT.eyes), mouth: ok(AVATAR_PARTS.mouth, x.mouth, AVATAR_DEFAULT.mouth),
    top: ok(AVATAR_PARTS.top, x.top, AVATAR_DEFAULT.top), pattern: ok(AVATAR_PARTS.pattern, x.pattern, AVATAR_DEFAULT.pattern),
    bodyColor: ok(AVATAR_COLORS.body, x.bodyColor, AVATAR_DEFAULT.bodyColor), accent: ok(AVATAR_COLORS.accent, x.accent, AVATAR_DEFAULT.accent), bg: ok(AVATAR_COLORS.bg, x.bg, AVATAR_DEFAULT.bg),
  };
}

// A random figure; `rnd` returns a number in [0, 1).
function avatarRandom(rnd) {
  const r = rnd || Math.random;
  const accent = pick(AVATAR_COLORS.accent, r);
  const bodyColor = pick(AVATAR_COLORS.body.filter((c) => c !== accent), r);
  return {
    body: pick(AVATAR_PARTS.body, r), eyes: pick(AVATAR_PARTS.eyes, r), mouth: pick(AVATAR_PARTS.mouth, r),
    top: r() < 0.7 ? pick(AVATAR_PARTS.top.slice(1), r) : 'none', pattern: r() < 0.55 ? pick(AVATAR_PARTS.pattern.slice(1), r) : 'none',
    bodyColor, accent, bg: pick(AVATAR_COLORS.bg, r),
  };
}

function avatarOptions(a) {
  return {
    seed: 'clay', bodyVariant: [a.body], eyesVariant: [a.eyes], mouthVariant: [a.mouth],
    topProbability: a.top === 'none' ? 0 : 100, topVariant: [a.top === 'none' ? AVATAR_PARTS.top[1] : a.top],
    patternProbability: a.pattern === 'none' ? 0 : 100, patternVariant: [a.pattern === 'none' ? AVATAR_PARTS.pattern[1] : a.pattern],
    bodyColor: [a.bodyColor], accentColor: [a.accent], backgroundColor: [a.bg],
  };
}

const avatarCache = {};
// An <img> with a data URI (several figures on one page never share SVG ids). Empty in tests, where Clay is not loaded.
function avatarHtml(choice, label) {
  if (typeof Clay === 'undefined') return '';
  const a = avatarClean(choice);
  const key = JSON.stringify(a);
  if (!avatarCache[key]) avatarCache[key] = Clay.uri(avatarOptions(a));
  return '<img src="' + avatarCache[key] + '" alt="' + (label || '') + '"' + (label ? '' : ' aria-hidden="true"') + '>';
}

// One part (eyes, mouth, top, pattern) on its own tile, in the current colours; the body shows the whole figure.
function avatarPartHtml(kind, value, choice) {
  if (typeof Clay === 'undefined') return '';
  if (kind === 'body') return avatarHtml(Object.assign({}, choice, { body: value }), '');
  if (value === 'none') return '<span class="ps-none" aria-hidden="true"></span>';
  const a = avatarClean(Object.assign({}, choice, { [kind]: value }));
  const key = 'part|' + kind + '|' + JSON.stringify(a);
  if (!avatarCache[key]) avatarCache[key] = Clay.partUri(kind, avatarOptions(a), a.bg);
  return '<img src="' + avatarCache[key] + '" alt="" aria-hidden="true">';
}

if (typeof module !== 'undefined') module.exports = { avatarPartHtml, avatarHtml, avatarClean, avatarRandom, AVATAR_PARTS, AVATAR_COLORS, AVATAR_DEFAULT, AVATAR_CREDIT };
