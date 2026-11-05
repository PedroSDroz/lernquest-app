// What the child knows (FEAT-m3-test-004, rule changed by FEAT-m3-test-019). Per item the last WINDOW answers, per topic
// the last practice and the last test, kept in the browser.
// An item is "known" when at least KNOWN_MIN of its last WINDOW answers exist and at least 80 % of them were right
// (3 of 3, 4 of 4 or 4 of 5).
const PROGRESS_KEY = 'm3-test-progress-v2';
const OLD_PROGRESS_KEY = 'm3-test-progress-v1'; // counts without order: not read, only its last practice and last test are carried over
const KNOWN_RATIO = 0.8;
const KNOWN_MIN = 3;
const WINDOW = 5;
const SESSION_GAP_MS = 10 * 60 * 1000; // practice answers closer together than this belong to one practice

// `results` is a string of '1' (right) and '0' (wrong), oldest first, at most WINDOW long.
function isKnown(results) {
  const last = String(results || '').slice(-WINDOW);
  const right = (last.match(/1/g) || []).length;
  return last.length >= KNOWN_MIN && right / last.length >= KNOWN_RATIO;
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
  const save = () => { try { storage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch (e) { /* lost on reload */ } };
  const topic = (t) => (data.topics[t] = data.topics[t] || { items: {} });
  const count = (t, key, correct) => {
    const it = topic(t).items;
    it[key] = ((typeof it[key] === 'string' ? it[key] : '') + (correct ? '1' : '0')).slice(-WINDOW);
  };
  return {
    isKnown,
    // One practice answer.
    practice(t, key, correct) {
      count(t, key, correct);
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
      for (const i of items) count(t, i.key, i.correct);
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

if (typeof module !== 'undefined') module.exports = { createProgress, isKnown, PROGRESS_KEY, OLD_PROGRESS_KEY, KNOWN_MIN, KNOWN_RATIO, WINDOW, SESSION_GAP_MS };
else window.Progress = createProgress((() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} });
