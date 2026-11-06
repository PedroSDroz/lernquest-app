// App settings (FEAT-m3-test-029): the one place that sets the app up without a code change.
// To change a switch: set its value below to true or false, save, and reload the app. Nothing is stored in the browser,
// and nothing about settings is shown to the child. A missing or non-boolean value counts as that switch's default (DEFAULTS below).
const Settings = (() => {
  const DEFAULTS = { layersControl: false, groupCities: true };
  const VALUES = {
    layersControl: false, // true: the layer bar under the maps (FEAT-m3-test-027); false: no bar, no reset, no layer marks
    groupCities: true,    // true: city buttons in Städte grouped by Bundesland; false: one alphabetical list
  };
  // `make` reads any set of values with the same fallback; the app uses `get`, which reads VALUES.
  const make = (values) => ({ get: (name) => (values && typeof values[name] === 'boolean' ? values[name] : DEFAULTS[name] === undefined ? false : DEFAULTS[name]) });
  const get = make(VALUES).get;
  return { get, make, DEFAULTS };
})();
if (typeof module !== 'undefined') module.exports = Settings;
