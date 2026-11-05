# Changelog

All notable changes to Lernquest (Österreich lernen), newest first.

When a release is tagged, set `VERSION` and `RELEASE_DATE` in `src/version.js` to the newest entry below; a test fails if they disagree. The heading format is `## v1.2 – 2026-11-05`.

## v1.2.1 – 2026-11-05

- New help button beside the Hell/Dunkel switch: a bubble with a random capybara message and the version and date of the release. The version is a link to the project's page on GitHub.
- The DiceBear credit is shown only on the figure selection; the footer on every page is gone.

## v1.2 – 2026-11-05

- Celebrations: a message with stars when an item becomes known, plus confetti and messages at 50, 75 and 100 % of a topic (`FEAT-m3-test-024`).
- Every test screen now labels its heading "Test Nr. n".

## v1.1 – 2026-11-05

- Profiles: each child builds a clay figure, picks a name and gets their own progress, with a start screen and a profile chip (`FEAT-m3-test-021`).
- "Was ich kenne": an item counts as known from the last five answers, with the mode "Mein Stand" in every topic (`FEAT-m3-test-019`).
- Answer labels on the map, a practice screen that fits the window, clickable review pills, and confetti only for three stars (`FEAT-m3-test-020`).

## v1.0 – 2026-11-04

- First complete version, covering the topics rivers, Bundesländer and Hauptstädte, Städte, Seen, Gebirge, Gipfel und Pässe, and Nachbarländer, each with a map.
- Practice sessions, a baseline test with a review of a finished test, and clearer answer feedback.
- Lernquest look: a design system and the "A+ Spielerisch" layout on every screen.
- Dashboard with known progress per topic, the last result as a ring with stars, and the "Alles gekannt" capybara stamp.
- Neighbour-country flags and a light/dark switch that follows the device by default.
