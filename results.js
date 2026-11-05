// Kept results (REQ-m3-test-029, NFR-m3-test-013): test scores and completed practice sessions, in the browser.
// Stores counts only; every storage call is guarded so a blocked or full store never breaks the app.
const RESULTS_KEY = 'm3-test-results-v1';

function createResults(storage, key = RESULTS_KEY) {
  let memory = { tests: [], practiceSessions: 0 };
  function load() {
    try {
      const data = JSON.parse(storage.getItem(key));
      if (data && Array.isArray(data.tests) && Number.isInteger(data.practiceSessions)) memory = data;
    } catch (e) { /* unavailable or corrupt: keep what is in memory */ }
  }
  function save() {
    try { storage.setItem(key, JSON.stringify(memory)); } catch (e) { /* unavailable: results are lost on reload */ }
  }
  load();
  return {
    testCount: () => memory.tests.length,
    practiceSessions: () => memory.practiceSessions,
    tests: () => memory.tests.map((t) => ({ ...t })),
    addPracticeSession() { memory.practiceSessions += 1; save(); },
    addTest(score, total) {
      memory.tests.push({ score, total, practiceSessions: memory.practiceSessions });
      save();
    },
  };
}

if (typeof module !== 'undefined') module.exports = { createResults, RESULTS_KEY };
