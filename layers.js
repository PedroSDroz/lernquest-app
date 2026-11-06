// Map layers (FEAT-m3-test-027): in "Karte erkunden" a child can show the items of other topics on the current map,
// muted and display only. The choice is kept per profile and per topic; since FEAT-m3-test-030 the control is in every mode
// of every topic, Nachbarländer included. Nachbarländer and Gebirge are not offered as layers.
(function () {
  const KEY = 'm3-test-layers-v1';
  const ORDER = ['rivers', 'states', 'cities', 'capitals', 'lakes', 'passes'];
  const NAMES = { rivers: 'Flüsse', states: 'Bundesländer', cities: 'Städte', capitals: 'Hauptstädte', lakes: 'Seen', passes: 'Gipfel und Pässe' };
  const PLACES = ['cities', 'capitals']; // one choice: off, Städte or Hauptstädte (REQ-m3-test-344)

  // Per topic that has the control: the layers it offers (everything except its own items) and the layers that are on
  // without the child's doing. `base` marks maps that already draw the Bundesländer outlines, so "states" is a class
  // switch there and a drawn layer elsewhere (REQ-m3-test-351).
  const HOSTS = {
    rivers: { offer: ['states', 'cities', 'capitals', 'lakes', 'passes'], dflt: [], base: false },
    regions: { offer: ['rivers', 'cities', 'lakes', 'passes'], dflt: [], base: false },
    cities: { offer: ['rivers', 'states', 'capitals', 'lakes', 'passes'], dflt: ['states'], base: true },
    lakes: { offer: ['rivers', 'states', 'cities', 'capitals', 'passes'], dflt: ['states'], base: true },
    passes: { offer: ['rivers', 'states', 'cities', 'capitals', 'lakes'], dflt: ['states'], base: true },
    countries: { offer: ['rivers', 'states', 'cities', 'capitals', 'lakes', 'passes'], dflt: [], base: false },
    mountains: { offer: ['rivers', 'states', 'cities', 'capitals', 'lakes', 'passes'], dflt: [], base: false },
  };

  const hostOf = (host) => HOSTS[host] || { offer: [], dflt: [], base: false };
  const offered = (host) => ORDER.filter((id) => hostOf(host).offer.includes(id));
  const defaults = (host) => ORDER.filter((id) => hostOf(host).dflt.includes(id));

  // A clean list of layer ids for a topic: only offered ones, in the fixed order, and never both cities and capitals.
  function normalise(host, ids) {
    const ok = offered(host);
    const want = new Set(Array.isArray(ids) ? ids : []);
    const out = ORDER.filter((id) => ok.includes(id) && want.has(id));
    const place = out.filter((id) => PLACES.includes(id));
    return place.length > 1 ? out.filter((id) => !PLACES.includes(id) || id === place[0]) : out;
  }

  // Switch one layer; choosing cities replaces capitals and the other way round.
  function toggle(host, ids, id, on) {
    const set = new Set(ids);
    if (on) { if (PLACES.includes(id)) PLACES.forEach((p) => set.delete(p)); set.add(id); } else set.delete(id);
    return normalise(host, [...set]);
  }

  // The places choice as one of '', 'cities', 'capitals' for the layers that are on.
  const placeOf = (ids) => PLACES.find((p) => ids.includes(p)) || '';

  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // The kept state of one topic. `storage` is the profile's scoped storage; unavailable or corrupt storage means the default.
  function createState(storage, host) {
    const read = () => { try { const d = JSON.parse(storage.getItem(KEY)); return d && typeof d === 'object' && !Array.isArray(d) ? d : {}; } catch (e) { return {}; } };
    const write = (d) => { try { storage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* not kept; the layers still work for this visit */ } };
    const kept = read()[host];
    let on = Array.isArray(kept) ? normalise(host, kept) : defaults(host);
    const save = () => {
      const d = read();
      if (sameList(on, defaults(host))) delete d[host]; else d[host] = on;
      write(d);
    };
    return {
      ids: () => on.slice(),
      has: (id) => on.includes(id),
      set(id, value) { on = toggle(host, on, id, value); save(); return on.slice(); },
      reset() { on = defaults(host); save(); return on.slice(); },
      isDefault: () => sameList(on, defaults(host)),
    };
  }

  if (typeof module !== 'undefined') module.exports = { KEY, ORDER, NAMES, PLACES, HOSTS, offered, defaults, normalise, toggle, placeOf, createState };
  if (typeof document === 'undefined') return;

  const NSV = 'http://www.w3.org/2000/svg';
  const svgEl = (name, attrs) => { const e = document.createElementNS(NSV, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const html = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

  // The muted marks of each layer, drawn in map units. Every item is a plain shape with no id, label or class that selects.
  const DRAW = {
    rivers: (add) => { if (typeof MAP_DATA === 'undefined') return; for (const r of MAP_DATA.rivers) add('path', { d: r.path, class: 'ly-line' }); },
    states: (add) => { if (typeof REGION_DATA === 'undefined') return; for (const s of REGION_DATA.states) add('path', { d: s.path, class: 'ly-line' }); },
    cities: (add) => { if (typeof CITY_DATA === 'undefined') return; for (const c of CITY_DATA.cities) add('circle', { cx: c.x, cy: c.y, r: 2, class: 'ly-dot' }); },
    capitals: (add) => { if (typeof REGION_DATA === 'undefined') return; for (const s of REGION_DATA.states) add('circle', { cx: s.capital.x, cy: s.capital.y, r: 3, class: 'ly-ring' }); },
    lakes: (add) => { if (typeof LAKE_DATA === 'undefined') return; for (const l of LAKE_DATA.lakes) add('path', { d: l.path, class: 'ly-area' }); },
    passes: (add) => {
      if (typeof PASS_DATA === 'undefined') return;
      // The marks of the Pässe map at about half the size: a summit is a triangle, a pass is "] [" (REQ-m3-test-188).
      const k = 0.55;
      for (const s of PASS_DATA.summits) add('path', { d: `M${s.x} ${s.y - 6.5 * k} L${s.x + 6 * k} ${s.y + 4.5 * k} L${s.x - 6 * k} ${s.y + 4.5 * k} Z`, class: 'ly-dot' });
      for (const p of PASS_DATA.passes) add('path', { d: `M${p.x - 5 * k} ${p.y - 4.5 * k} H${p.x - 1.6 * k} V${p.y + 4.5 * k} H${p.x - 5 * k} M${p.x + 5 * k} ${p.y - 4.5 * k} H${p.x + 1.6 * k} V${p.y + 4.5 * k} H${p.x + 5 * k}`, class: 'ly-bracket' });
    },
  };
  // The topic icons of the rail (same drawings), used as the toggles; the capitals get a star.
  const ICON = {
    rivers: 'M3 8c3-3 5 3 9 0s6 3 9 0M3 16c3-3 5 3 9 0s6 3 9 0',
    states: 'M4 5l5-2 6 2 5-2v16l-5 2-6-2-5 2zM9 3v16M15 5v16',
    cities: 'M4 20V9h6v11M10 20V4h10v16M3 20h18',
    capitals: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    lakes: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z',
    passes: 'M3 20L9 6M21 20L15 6M12 20v-3M12 14v-3M12 8V6',
  };
  const ico = (id) => '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[id] + '"/></svg>';

  function mount({ svg, host }) {
    if (!HOSTS[host] || !svg) return null;
    // The settings file can switch the whole control off: then nothing is drawn or read, and the map is as before FEAT-m3-test-027.
    if (typeof Settings !== 'undefined' && !Settings.get('layersControl')) return null;
    const cfg = HOSTS[host];
    const storage = (() => { try { return window.ProfileStorage; } catch (e) { return null; } })() || { getItem() { return null; }, setItem() {} };
    const state = createState(storage, host);

    // The group sits where the map's base drawing ends, so the topic's own items are drawn above it (REQ-m3-test-343).
    const group = svgEl('g', { class: 'layers', 'aria-hidden': 'true' });
    svg.appendChild(group);
    const parts = {};
    const part = (id) => {
      if (parts[id]) return parts[id];
      const g = svgEl('g', { 'data-layer': id });
      DRAW[id]((name, attrs) => g.appendChild(svgEl(name, attrs)));
      group.appendChild(g);
      return (parts[id] = g);
    };
    // On a map that already draws the borders, "Bundesländer" is a switch of its own look; elsewhere it is drawn.
    const drawn = (id) => !(id === 'states' && cfg.base);

    function paint() {
      const on = state.ids();
      for (const id of ORDER) if (drawn(id) && (on.includes(id) || parts[id])) part(id).style.display = on.includes(id) ? '' : 'none';
      if (cfg.base) svg.classList.toggle('ly-nobl', !on.includes('states'));
    }

    // The toggles sit directly under the map, before the topic's own legend and credit (REQ-m3-test-337).
    if (svg.parentElement && svg.parentElement.classList.contains('mapcol')) {
      const bar = html('div', 'layer-ctl');
      bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Ebenen auf der Karte');
      const choices = offered(host);
      const singles = choices.filter((id) => !PLACES.includes(id));
      const places = choices.filter((id) => PLACES.includes(id));
      const buttons = {};
      const toggleBtn = (id) => {
        const b = html('button'); b.type = 'button';
        b.innerHTML = ico(id);
        b.setAttribute('aria-label', NAMES[id]); b.title = NAMES[id];
        buttons[id] = b;
        return b;
      };
      if (singles.length) {
        const g = html('div', 'seg layer-seg');
        for (const id of singles) { const b = toggleBtn(id); b.addEventListener('click', () => { state.set(id, !state.has(id)); sync(); }); g.appendChild(b); }
        bar.appendChild(g);
      }
      if (places.length) {
        // Related toggles in one pill: choosing one replaces the other, and tapping the chosen one switches it off.
        const g = html('div', 'seg layer-seg layer-places'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Orte');
        for (const id of places) { const b = toggleBtn(id); b.addEventListener('click', () => { state.set(id, !state.has(id)); sync(); }); g.appendChild(b); }
        bar.appendChild(g);
      }
      const reset = html('button', 'layer-reset'); reset.type = 'button';
      reset.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/></svg>';
      reset.setAttribute('aria-label', 'Zurücksetzen'); reset.title = 'Zurücksetzen';
      reset.addEventListener('click', () => { state.reset(); sync(); });
      bar.appendChild(reset);

      function sync() {
        const on = state.ids();
        for (const id in buttons) buttons[id].setAttribute('aria-pressed', String(on.includes(id)));
        reset.hidden = state.isDefault();
        paint();
      }
      svg.after(bar);
      sync();
    } else paint();

    return { state, paint };
  }

  window.Layers = { mount, offered, defaults, NAMES };
})();
