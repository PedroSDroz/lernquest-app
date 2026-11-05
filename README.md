# Lernquest – Österreich lernen

A small, playful geography quiz about Austria, for kids. The interface is in German.
It runs entirely in the browser: there is no server, no account and no tracking.

## Topics

- Regions (Bundesländer)
- Mountain passes
- Mountains
- Lakes
- Cities
- Countries

Each topic offers a practice mode and a test mode. Results are shown per topic.

## Run it

**Online:** open the hosted page (GitHub Pages) at
<https://pedrosdroz.github.io/lernquest-app/>.

**Offline:** download or clone this repository, unzip it if necessary, and double-click
`index.html`. It opens in your default browser and needs no internet connection.

> Unzip the archive first. Opening `index.html` from inside a zip file can break the
> relative file paths.

## Saved data

Profiles, results and theme (light/dark) are stored in the browser's `localStorage`.
This means:

- data stays on that device and in that browser;
- the hosted page and a local copy opened from a file keep separate data;
- clearing the browser's site data resets everything.

To reset only this app's data, open the browser console (F12) and run:

```js
Object.keys(localStorage).filter(k => k.startsWith('m3-test-')).forEach(k => localStorage.removeItem(k)); location.reload();
```

## Contents

Plain HTML, CSS and JavaScript, with no build step and no dependencies.
Map and place data live in `data/*.js`.

## Versions

- `v1.1` – first published release.

This repository is a publish target. It is generated from the `src/` folder of the
development project, so changes should be made there and copied over.
