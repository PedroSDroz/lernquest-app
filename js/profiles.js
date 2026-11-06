// Profiles on this device (FEAT-m3-test-021): name and capybara per child, each with their own stored progress.
// Everything stays in the browser. A profile's data lives under keys prefixed "p<id>:".
const PROFILES_KEY = 'm3-test-profiles-v1';
const NAME_MAX = 16;
const NAME_MIN = 3;

function createProfiles(storage) {
  let data = { profiles: [], activeId: null };
  try {
    const d = JSON.parse(storage.getItem(PROFILES_KEY));
    if (d && Array.isArray(d.profiles)) data = { profiles: d.profiles, activeId: d.activeId || null };
  } catch (e) { /* unavailable or corrupt: no profiles */ }
  const save = () => { try { storage.setItem(PROFILES_KEY, JSON.stringify(data)); } catch (e) { /* not kept */ } };
  const clean = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  const prefix = (id) => 'p' + id + ':';

  // The data of before profiles existed moves to the first profile (copied, the old keys stay).
  function adoptLegacy(id) {
    try {
      const keys = [];
      for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
      for (const k of keys) {
        if (k && k.indexOf('m3-test-') === 0 && k !== PROFILES_KEY && k !== 'm3-test-theme') storage.setItem(prefix(id) + k, storage.getItem(k));
      }
    } catch (e) { /* nothing to adopt */ }
  }

  return {
    list: () => data.profiles.map((p) => ({ ...p })),
    active() { return data.profiles.find((p) => p.id === data.activeId) || null; },
    create(name, avatar) {
      const n = clean(name);
      if (n.length < NAME_MIN) return null;
      const id = Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
      const first = data.profiles.length === 0;
      data.profiles.push({ id, name: n, avatar: avatar || {} });
      data.activeId = id;
      if (first) adoptLegacy(id);
      save();
      return id;
    },
    update(id, name, avatar) {
      const p = data.profiles.find((x) => x.id === id);
      const n = clean(name);
      if (!p || n.length < NAME_MIN) return false;
      p.name = n; p.avatar = avatar || p.avatar;
      save();
      return true;
    },
    remove(id) {
      data.profiles = data.profiles.filter((p) => p.id !== id);
      if (data.activeId === id) data.activeId = null;
      try {
        const keys = [];
        for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
        for (const k of keys) if (k && k.indexOf(prefix(id)) === 0) storage.removeItem(k);
      } catch (e) { /* ignore */ }
      save();
    },
    setActive(id) { if (data.profiles.some((p) => p.id === id)) { data.activeId = id; save(); } },
    // A storage object limited to one profile's keys (for results and progress).
    scoped(id) {
      return {
        getItem: (k) => storage.getItem(prefix(id) + k),
        setItem: (k, v) => storage.setItem(prefix(id) + k, v),
      };
    },
  };
}

if (typeof module !== 'undefined') module.exports = { createProfiles, PROFILES_KEY, NAME_MAX, NAME_MIN };
else {
  const raw = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const mem = {};
  const fallback = { length: 0, key: () => null, getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  window.Profiles = createProfiles(raw || fallback);
  const a = window.Profiles.active();
  // Until a profile is chosen, the topics read an empty store; the page then asks who is learning.
  window.ProfileStorage = a ? window.Profiles.scoped(a.id) : { getItem() { return null; }, setItem() {} };
}
