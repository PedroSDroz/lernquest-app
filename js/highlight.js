// Highlight state: at most one river highlighted; selecting it again clears it (REQ-m3-test-003).
function createHighlight() {
  let current = null;
  return {
    get: () => current,
    select(id) {
      current = current === id ? null : id;
      return current;
    },
  };
}
if (typeof module !== 'undefined') module.exports = { createHighlight };
