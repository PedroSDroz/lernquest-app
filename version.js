// The one place that holds the release (FEAT-m3-test-025, REQ-m3-test-321). Set when a release is tagged, together with
// the newest entry of CHANGELOG.md; tests/help.test.js fails when the two disagree.
const Version = { VERSION: '1.2.3', RELEASE_DATE: '2026-11-05' };
if (typeof module !== 'undefined') module.exports = Version;
