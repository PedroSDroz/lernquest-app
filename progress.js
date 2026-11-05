// What the child knows (FEAT-m3-test-004, rule changed by FEAT-m3-test-019). Per item the last WINDOW answers, per topic
// the last practice and the last test, kept in the browser.
// An item is "known" when at least KNOWN_MIN of its last WINDOW answers exist and at least 80 % of them were right
// (3 of 3, 4 of 4 or 4 of 5).
const PROGRESS_KEY = 'm3-test-progress-v2';
const OLD_PROGRESS_KEY = 'm3-test-progress-v1'; // counts without order: not read, only its last practice and last test are carried over
const KNOWN_RATIO = 0.8;
const KNOWN_MIN = 3;
const WINDOW = 5;
const MILESTONES = [50, 75, 100]; // per cent of a topic known that are celebrated (FEAT-m3-test-024)
const SESSION_GAP_MS = 10 * 60 * 1000; // practice answers closer together than this belong to one practice

// `results` is a string of '1' (right) and '0' (wrong), oldest first, at most WINDOW long.
function isKnown(results) {
  const last = String(results || '').slice(-WINDOW);
  const right = (last.match(/1/g) || []).length;
  return last.length >= KNOWN_MIN && right / last.length >= KNOWN_RATIO;
}

// The highest milestone (0 to 3) that `known` of `total` items reaches; a share is reached when known / total is at least that
// per cent, so the item count rounds up (10, 15 and 20 of 20).
function level(known, total) {
  if (!total) return 0;
  let n = 0;
  MILESTONES.forEach((m, i) => { if (known * 100 >= total * m) n = i + 1; });
  return n;
}

function createProgress(storage, now = () => Date.now()) {
  let data = { topics: {} };
  const read = (key) => { try { const d = JSON.parse(storage.getItem(key)); return d && typeof d.topics === 'object' && d.topics ? d : null; } catch (e) { return null; } };
  const current = read(PROGRESS_KEY);
  if (current) data = current;
  else {
    const old = read(OLD_PROGRESS_KEY);
    if (old) for (const t in old.topics) {
      const { lastPractice, lastTest } = old.topics[t] || {};
      data.topics[t] = { items: {} };
      if (lastPractice) data.topics[t].lastPractice = lastPractice;
      if (lastTest) data.topics[t].lastTest = lastTest;
    }
  }
  // Celebrations (FEAT-m3-test-024). Per topic: `cele.items[key]` is 'c' once the item was celebrated, 'l' once it lapsed (three
  // wrong answers in a row since); `cele.ms` is the highest milestone (0 none, 1 = 50 %, 2 = 75 %, 3 = 100 %) already reached.
  const totals = {};
  const listeners = [];
  const knownCount = (t) => { let n = 0; for (const k in topic(t).items) if (isKnown(topic(t).items[k])) n += 1; return n; };
  const cele = (t) => { const p = topic(t); if (!p.cele || typeof p.cele !== 'object') p.cele = { items: {}, ms: undefined }; if (!p.cele.items) p.cele.items = {}; return p.cele; };
  // Call before the answers are counted: `before` is what an answer is compared with.
  const snapshot = (t) => { const c = cele(t); const ms = c.ms === undefined ? level(knownCount(t), totals[t]) : c.ms; return { known: new Set(Object.keys(topic(t).items).filter((k) => isKnown(topic(t).items[k]))), ms }; };
  // Call after: which items just became known and are worth a celebration, and the milestone newly reached, if any.
  function settle(t, before, touched, kind) {
    const c = cele(t);
    const items = [];
    for (const k of touched) {
      const str = topic(t).items[k];
      const state = c.items[k]; // undefined: never celebrated, 'c': celebrated, 'l': lapsed since
      if (!before.known.has(k) && isKnown(str) && state !== 'c') { if (!items.includes(k)) items.push(k); c.items[k] = 'c'; }
      else if (state === 'c' && /000$/.test(str)) c.items[k] = 'l';
    }
    const known = knownCount(t);
    const now = level(known, totals[t]);
    let milestone = null;
    if (now > before.ms) milestone = { pct: MILESTONES[now - 1], known, total: totals[t] };
    if (totals[t]) c.ms = Math.max(before.ms, now); // without a total nothing is recorded, so the first real answer sets the baseline
    if ((items.length || milestone) && listeners.length) for (const l of listeners) l({ topic: t, kind, items, milestone });
  }
  const save = () => { try { storage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch (e) { /* lost on reload */ } };
  const topic = (t) => (data.topics[t] = data.topics[t] || { items: {} });
  const count = (t, key, correct) => {
    const it = topic(t).items;
    it[key] = ((typeof it[key] === 'string' ? it[key] : '') + (correct ? '1' : '0')).slice(-WINDOW);
  };
  return {
    isKnown,
    // How many items the topic has (for the milestones) and who hears about a celebration: fn({ topic, kind, items, milestone }).
    setTotal(t, n) { totals[t] = n; },
    onCelebrate(fn) { listeners.push(fn); },
    // One practice answer.
    practice(t, key, correct) {
      const before = snapshot(t);
      count(t, key, correct);
      settle(t, before, [key], 'practice');
      const p = topic(t);
      const at = now();
      if (!p.lastPractice || at - p.lastPractice.at > SESSION_GAP_MS) p.lastPractice = { right: 0, total: 0, at };
      p.lastPractice.total += 1;
      if (correct) p.lastPractice.right += 1;
      p.lastPractice.at = at;
      save();
    },
    // A finished test; items: [{ key, correct }].
    test(t, score, total, items) {
      const before = snapshot(t);
      for (const i of items) count(t, i.key, i.correct);
      settle(t, before, items.map((i) => i.key), 'test');
      topic(t).lastTest = { score, total, at: now() };
      save();
    },
    // Call-site helpers used by the topic scripts. `kind` (Bundesländer and Hauptstädte) keeps state and capital apart.
    track(t, result, kind) {
      if (result) this.practice(t, (kind ? kind + ':' : '') + result.correctId, result.correct);
      return result;
    },
    finishTest(t, score, total, review, byKind) {
      this.test(t, score, total, (review || []).map((i) => ({ key: (byKind ? i.kind + ':' : '') + i.target.id, correct: i.correct })));
    },
    // The last answers of every item of a topic, oldest first: { key: [true, false, ...] }.
    answers(t) {
      const out = {};
      const items = (data.topics[t] || { items: {} }).items;
      for (const k in items) out[k] = String(items[k]).split('').map((c) => c === '1');
      return out;
    },
    summary(t, totalItems) {
      const p = data.topics[t] || { items: {} };
      let known = 0;
      for (const k in p.items) if (isKnown(p.items[k])) known += 1;
      return { known, total: totalItems, lastPractice: p.lastPractice || null, lastTest: p.lastTest || null };
    },
  };
}

if (typeof module !== 'undefined') module.exports = { createProgress, isKnown, PROGRESS_KEY, OLD_PROGRESS_KEY, KNOWN_MIN, KNOWN_RATIO, WINDOW, MILESTONES, level, SESSION_GAP_MS };
else window.Progress = createProgress((() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} });
