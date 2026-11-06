# Changelog

All notable changes to Lernquest (Österreich lernen), newest first.

When a release is tagged, set `VERSION` and `RELEASE_DATE` in `src/version.js` to the newest entry below; a test fails if they disagree. The heading format is `## v1.2 – 2026-11-05`.

## v1.4 – 2026-11-06

- The layer bar (when switched on in `src/settings.js`) now also shows in "Mein Stand" of every topic and in all four modes of Nachbarländer, which offers Flüsse, Bundesländer, Städte or Hauptstädte, Seen and Gipfel und Pässe. The layers lie behind the known / not-yet marks in Mein Stand, and on the Nachbarländer map they lie on Austria. One choice per topic for all four modes; on a phone the bar is one row at 375 px (`FEAT-m3-test-030`).

## v1.3.1 – 2026-11-06

- On a phone the top bar (brand button, moon toggle, profile figure) now stays during a practice, in every topic. In a practice it is a little slimmer, and a phone held sideways scrolls the practice page (`FIX-m3-test-010`).

## v1.3 – 2026-11-06

- App settings: `src/settings.js` is one place to set the app up without a code change. Two switches: `layersControl` (the layer bar under the maps; off as delivered, so the bar is hidden until it is switched on) and `groupCities` (city buttons grouped by Bundesland, or one alphabetical list). Change a value, reload; nothing is shown to the child or kept in the browser (`FEAT-m3-test-029`).
- Karte erkunden, Üben and Test have icon toggles under the map: show the rivers, lakes, cities or capitals, passes and summits, or the Bundesländer borders of other topics, quietly in the background; a round arrow brings the map back. Remembered for each child and topic. Not in Mein Stand or Nachbarländer (`FEAT-m3-test-027`).
- Städte, Karte erkunden: each Bundesland heading above the city buttons shows the state's coat of arms to the left of the name, replacing the striped flags (`FIX-m3-test-009`, `FIX-m3-test-006`).
- Städte, Karte erkunden: Kärnten now comes before Oberösterreich in the grouped city buttons (`FIX-m3-test-005`).
- The source line under a map (Seen, Gebirge, Nachbarländer) is smaller and grey, and begins "Quelle:"; the licence wording is unchanged (`FIX-m3-test-007`).
- Städte, Karte erkunden: the city buttons are grouped by Bundesland, with the state's name above each group; the states run from west to east, and so do the cities within a state (`FIX-m3-test-004`).
- Städte, Karte erkunden: the city buttons scroll in a box of their own instead of making the page long (`FIX-m3-test-003`).
- Städte, Karte erkunden: below the map there is now a button for every city, in alphabetical order. Pressing a button selects the city on the map, like clicking its dot (`FIX-m3-test-002`).

- Karte erkunden carries a one-line hint in every topic: tap the map or the list to learn; there are no points here (`FIX-m3-test-001`).
- Mein Stand shows a fade and a small chevron at the foot of the list while there is more below it (`FIX-m3-test-001`).
- The river list in Karte erkunden is in alphabetical order (`FIX-m3-test-001`).

## v1.2.3 – 2026-11-05

- On a computer, the Hell/Dunkel switch at the bottom of the menu is whole again: the moon button meant for phones no longer squeezes it, and the help button no longer covers it.

## v1.2.2 – 2026-11-05

- On a phone the topic strip is replaced by a slim bar that stays at the top: the logo and name lead to the Übersicht, one moon button switches between hell and dunkel, and the profile shows only the figure. The help button is not shown on a phone. During a practice the bar steps aside (`FEAT-m3-test-026`).

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
