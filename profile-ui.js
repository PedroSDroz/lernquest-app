// Start screen "Wer lernt heute?", the capybara builder and the profile chip (FEAT-m3-test-021).
(function () {
  if (typeof document === 'undefined') return;
  const screen = document.getElementById('profile-screen');
  const chip = document.getElementById('profile-chip');
  const NAME_MAX = 16;
  const NAME_MIN = 3;

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function open(on) { screen.hidden = !on; document.body.classList.toggle('picking', on); }
  const reload = () => location.reload();

  function renderChip() {
    const a = Profiles.active();
    chip.replaceChildren();
    if (!a) { chip.hidden = true; return; }
    chip.hidden = false;
    const pic = el('span', 'chip-pic'); pic.innerHTML = avatarHtml(a.avatar, '');
    const txt = el('span', 'chip-txt'); txt.append(el('b', '', a.name));
    const sw = el('span', 'chip-swap'); sw.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>';
    chip.setAttribute('aria-label', a.name + ': Person wechseln'); chip.title = 'Person wechseln';
    chip.append(pic, txt, sw);
  }

  function picker() {
    screen.replaceChildren();
    const box = el('div', 'ps-box');
    box.append(el('h2', 'ps-title', 'Wer lernt heute?'));
    const grid = el('div', 'ps-grid');
    for (const p of Profiles.list()) {
      const card = el('div', 'ps-card');
      const pick = el('button', 'ps-pick'); pick.type = 'button';
      const pic = el('span', 'ps-pic'); pic.innerHTML = avatarHtml(p.avatar, '');
      pick.append(pic, el('span', 'ps-name', p.name));
      pick.addEventListener('click', () => { Profiles.setActive(p.id); reload(); });
      const edit = el('button', 'ps-edit'); edit.type = 'button'; edit.setAttribute('aria-label', p.name + ' ändern');
      edit.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg><span>Ändern</span>';
      edit.addEventListener('click', () => editor(p));
      card.append(pick, edit);
      grid.append(card);
    }
    const add = el('button', 'ps-card ps-new'); add.type = 'button';
    add.innerHTML = '<span class="ps-plus" aria-hidden="true">+</span>';
    add.append(el('span', 'ps-name', 'Noch jemand?'));
    add.addEventListener('click', () => builder(null));
    grid.append(add);
    box.append(grid);
    if (Profiles.active()) { const back = el('button', 'ps-secondary', 'Zurück'); back.type = 'button'; back.addEventListener('click', () => open(false)); box.append(back); }
    screen.append(box);
    open(true);
    const first = screen.querySelector('button'); if (first) first.focus();
  }

  const ICONS = {
    body: '<path d="M8 21c-3-5-2-9 1-12 1-3 5-3 6 0 3 3 4 7 1 12z"/>',
    eyes: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    mouth: '<path d="M4 11c3 7 13 7 16 0"/><path d="M9 16c2 1.2 4 1.2 6 0"/>',
    top: '<path d="M4 19l-1-11 5 4 4-7 4 7 5-4-1 11z"/>',
    pattern: '<path d="M4 4h7v7H4zM13 13h7v7h-7z"/><circle cx="16.5" cy="7.5" r="3.5"/><circle cx="7.5" cy="16.5" r="3.5"/>',
    colors: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/>',
    save: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    cancel: '<path d="M6 6l12 12M18 6L6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
    tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    sparkle: '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  };
  const icon = (name, big) => '<svg class="ico' + (big ? ' big' : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';

  // Three steps, one task each: name, pick a figure, make it yours (layout B of the design file).
  function builder(profile) {
    const choice = profile ? avatarClean(profile.avatar) : avatarRandom();
    let name = profile ? profile.name : '';
    let step = 1;
    // Five suggestions; the first is the figure the child starts with. The chosen one (sel) always shows the child's changes.
    let suggestions = [Object.assign({}, choice)].concat([1, 2, 3, 4].map(() => avatarRandom()));
    let sel = 0;
    let tab = 'eyes';

    // Save changes (editing), Abbrechen and Löschen (editing) are available in every step, below the card.
    const nameOk = () => name.trim().length >= NAME_MIN;
    function actionBar() {
      const bar = el('div', 'ps-outside');
      const show = () => {
        bar.replaceChildren();
        if (profile) {
          const save = el('button', 'ps-primary ps-save'); save.type = 'button';
          save.innerHTML = icon('save') + '<span>Änderungen speichern</span>';
          save.disabled = !nameOk();
          save.addEventListener('click', () => { if (!nameOk()) return; Profiles.update(profile.id, name, choice); Profiles.setActive(profile.id); reload(); });
          bar.append(save);
        }
        const row = el('div', 'ps-actions');
        if (Profiles.list().length) {
          const c = el('button', 'ps-secondary'); c.type = 'button'; c.innerHTML = icon('cancel') + '<span>Abbrechen</span>'; c.addEventListener('click', picker); row.append(c);
        }
        if (profile) {
          const del = el('button', 'ps-danger-ghost'); del.type = 'button'; del.innerHTML = icon('trash') + '<span>Löschen</span>';
          del.addEventListener('click', () => {
            bar.replaceChildren(el('p', 'ps-warn', 'Wirklich löschen? Dabei geht auch dein Fortschritt verloren.'));
            const r = el('div', 'ps-actions');
            const yes = el('button', 'ps-danger'); yes.type = 'button'; yes.innerHTML = icon('trash') + '<span>Ja, löschen</span>'; yes.addEventListener('click', () => { Profiles.remove(profile.id); reload(); });
            const no = el('button', 'ps-secondary'); no.type = 'button'; no.innerHTML = icon('cancel') + '<span>Nein</span>'; no.addEventListener('click', show);
            r.append(yes, no); bar.append(r); no.focus();
          });
          row.append(del);
        }
        if (row.children.length) bar.append(row);
      };
      show();
      return bar;
    }

    function frame(n, title) {
      screen.replaceChildren();
      const col = el('div', 'ps-col');
      const card = el('div', 'ps-wiz');
      const head = el('div', 'ps-wiz-head');
      const dots = el('div', 'ps-dots'); dots.setAttribute('role', 'img'); dots.setAttribute('aria-label', 'Schritt ' + n + ' von 3');
      for (let i = 1; i <= 3; i++) dots.append(el('i', i <= n ? 'on' : ''));
      head.append(dots, el('span', 'ps-step', 'Schritt ' + n + ' von 3'));
      card.append(head);
      if (title) card.append(el('h2', 'ps-title left', title));
      col.append(card);
      screen.append(col);
      card._col = col;
      col.append(actionBar());
      return card;
    }
    const nav = (card, backLabel, back, nextLabel, next, nextOff) => {
      const row = el('div', 'ps-actions');
      if (back) { const b = el('button', 'ps-secondary', backLabel); b.type = 'button'; b.addEventListener('click', back); row.append(b); }
      const n = el('button', 'ps-primary', nextLabel); n.type = 'button'; n.disabled = !!nextOff; n.addEventListener('click', next);
      row.append(n);
      card.append(row);
      return n;
    };
    const credit = () => {};

    function step1() {
      step = 1;
      const card = frame(1);
      if (profile) {
        const pv = el('div', 'ps-preview small'); pv.innerHTML = avatarHtml(choice, 'Deine Figur'); card.append(pv);
      } else {
        card.append(el('p', 'ps-hello', 'Wir lernen Österreich kennen!'));
        const img = el('img', 'ps-hero'); img.src = 'assets/clay-karte.svg'; img.alt = 'Clay-Figuren stehen rund um die Karte von Österreich';
        card.append(img);
        card.append(el('h2', 'ps-title left', 'Wer bist du?'), el('p', 'ps-hint', 'Schreibe einen Namen, den du dir gut merken kannst.'));
      }
      const wrap = el('div', 'ps-namewrap');
      const lab = el('label', '', 'Ich bin'); lab.htmlFor = 'ps-name';
      const input = el('input'); input.id = 'ps-name'; input.maxLength = NAME_MAX; input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = 'Nickname'; input.value = name;
      wrap.append(lab, input); card.append(wrap);
      const ok = nameOk;
      const go = () => { if (ok()) step2(); };
      const nextBtn = nav(card, '', null, profile ? 'Figur ändern' : 'Figur aussuchen', go, !ok());
      const minHint = el('p', 'ps-min', 'Mindestens ' + NAME_MIN + ' Buchstaben'); minHint.hidden = ok(); wrap.append(minHint);
      input.addEventListener('input', () => { name = input.value; nextBtn.disabled = !ok(); minHint.hidden = ok(); const sv = screen.querySelector('.ps-save'); if (sv) sv.disabled = !ok(); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      credit(card);
      open(true);
      input.focus();
    }

    function step2() {
      step = 2;
      suggestions[sel] = Object.assign({}, choice); // changes made in step 3 stay on the chosen tile
      const card = frame(2, 'Such dir eine Figur aus');
      const grid = el('div', 'ps-sugg3');
      suggestions.forEach((s, i) => {
        const b = el('button', 'ps-char'); b.type = 'button'; b.setAttribute('aria-label', 'Vorschlag ' + (i + 1));
        b.setAttribute('aria-pressed', String(i === sel));
        b.innerHTML = avatarHtml(s, '');
        b.addEventListener('click', () => { sel = i; Object.assign(choice, suggestions[i]); grid.querySelectorAll('.ps-char').forEach((t, j) => t.setAttribute('aria-pressed', String(j === i))); });
        grid.append(b);
      });
      const more = el('button', 'ps-more-tile'); more.type = 'button';
      more.innerHTML = icon('sparkle', true) + '<span>5 neue</span>';
      more.addEventListener('click', () => { suggestions = [1, 2, 3, 4, 5].map(() => avatarRandom()); sel = 0; Object.assign(choice, suggestions[0]); step2(); });
      grid.append(more);
      card.append(grid);
      nav(card, 'Zurück', step1, 'Mach sie zu deiner', step3);
      credit(card);
      open(true);
      const cur = grid.querySelector('[aria-pressed="true"]'); if (cur) cur.focus();
    }

    function step3() {
      step = 3;
      const card = frame(3, 'Mach sie zu deiner');
      card.append(el('p', 'ps-hint', 'Das ist freiwillig. Du kannst es später ändern.'));
      const preview = el('div', 'ps-preview small'); card.append(preview);
      const tabs = el('div', 'ps-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Teile');
      const content = el('div', 'ps-tabbody');
      const names = { body: 'Körper', eyes: 'Augen', mouth: 'Mund', top: 'Kopf', pattern: 'Muster', colors: 'Farben' };
      const paint = () => {
        preview.innerHTML = avatarHtml(choice, 'Vorschau deiner Figur');
        tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === tab)));
        content.replaceChildren();
        if (tab === 'colors') {
          const titles = { bodyColor: 'Körperfarbe', accent: 'Zweitfarbe', bg: 'Hintergrund' };
          const lists = { bodyColor: AVATAR_COLORS.body, accent: AVATAR_COLORS.accent, bg: AVATAR_COLORS.bg };
          for (const k of ['bodyColor', 'accent', 'bg']) {
            const g = el('div', 'ps-colorrow'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', titles[k]);
            g.append(el('span', 'ps-gt', titles[k]));
            const w = el('div', 'ps-swatches');
            for (const hex of lists[k]) {
              const b = el('button', 'ps-swatch'); b.type = 'button'; b.style.background = '#' + hex; b.setAttribute('aria-label', titles[k] + ' #' + hex);
              b.setAttribute('aria-pressed', String(choice[k] === hex));
              b.addEventListener('click', () => { choice[k] = hex; paint(); });
              w.append(b);
            }
            g.append(w); content.append(g);
          }
        } else {
          const row = el('div', 'ps-parts center');
          for (const v of AVATAR_PARTS[tab]) {
            const b = el('button', 'ps-part'); b.type = 'button'; b.setAttribute('aria-label', names[tab] + ' ' + v);
            b.setAttribute('aria-pressed', String(choice[tab] === v));
            b.innerHTML = avatarPartHtml(tab, v, choice);
            b.addEventListener('click', () => { choice[tab] = v; paint(); });
            row.append(b);
          }
          content.append(row);
        }
      };
      for (const t of ['body', 'eyes', 'mouth', 'top', 'pattern', 'colors']) {
        const b = el('button', 'ps-tab'); b.type = 'button'; b.dataset.t = t; b.innerHTML = icon(t); b.append(el('span', '', names[t]));
        b.addEventListener('click', () => { tab = t; paint(); });
        tabs.append(b);
      }
      card.append(tabs, content);
      nav(card, 'Zurück', step2, 'Fertig', () => {
        if (profile) { Profiles.update(profile.id, name, choice); Profiles.setActive(profile.id); } else Profiles.create(name, choice);
        reload();
      });
      credit(card);
      paint();
      open(true);
    }

    step1();
  }

  // Editing a profile (layout E1 of the design file): one card, one main action (Speichern) pinned to the bottom,
  // Abbrechen (cross) and Löschen (bin) as icon buttons in the header. Views: main, other figure, adjust parts.
  function editor(profile) {
    const choice = avatarClean(profile.avatar);
    let name = profile.name;
    let view = 'main';
    let suggestions = [Object.assign({}, choice)].concat([1, 2, 3, 4].map(() => avatarRandom()));
    let sel = 0;
    let tab = 'eyes';
    let confirming = false;
    const nameOk = () => name.trim().length >= NAME_MIN;

    function iconBtn(ic, label, onClick, danger) {
      const b = el('button', 'ps-ib' + (danger ? ' danger' : '')); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
      b.innerHTML = icon(ic); b.addEventListener('click', onClick); return b;
    }
    function save() { if (!nameOk()) return; Profiles.update(profile.id, name, choice); Profiles.setActive(profile.id); reload(); }

    function render() {
      screen.replaceChildren();
      const col = el('div', 'ps-col');
      const card = el('div', 'ps-wiz ps-editcard');
      screen.append(col); col.append(card);
      if (confirming) {
        card.append(el('h2', 'ps-title', 'Wirklich löschen?'), el('p', 'ps-hint center', profile.name + ' und der Fortschritt gehen dabei verloren.'));
        const pv = el('div', 'ps-fig small'); pv.innerHTML = avatarHtml(choice, ''); card.append(pv);
        card.append(el('div', 'f1'));
        const yes = el('button', 'ps-danger big'); yes.type = 'button'; yes.innerHTML = icon('trash') + '<span>Ja, löschen</span>'; yes.addEventListener('click', () => { Profiles.remove(profile.id); reload(); });
        const no = el('button', 'ps-secondary big'); no.type = 'button'; no.innerHTML = icon('back') + '<span>Nein, behalten</span>'; no.addEventListener('click', () => { confirming = false; render(); });
        card.append(yes, no); no.focus(); open(true); return;
      }
      const head = el('div', 'ps-eh');
      if (view === 'main') head.append(iconBtn('cancel', 'Abbrechen', picker));
      else head.append(iconBtn('back', 'Zurück', () => { suggestions[sel] = Object.assign({}, choice); view = 'main'; render(); }));
      head.append(el('h1', 'ps-eh-title', view === 'main' ? 'Profil bearbeiten' : view === 'figure' ? 'Andere Figur' : 'Anpassen'));
      head.append(iconBtn('trash', 'Profil löschen', () => { confirming = true; render(); }, true));
      card.append(head);

      if (view === 'main') {
        const fig = el('div', 'ps-fig'); fig.innerHTML = avatarHtml(choice, 'Deine Figur'); card.append(fig);
        const chips = el('div', 'ps-chiprow');
        const c1 = el('button', 'ps-chipbtn'); c1.type = 'button'; c1.innerHTML = icon('sparkle') + '<span>Andere Figur</span>'; c1.addEventListener('click', () => { view = 'figure'; render(); });
        const c2 = el('button', 'ps-chipbtn'); c2.type = 'button'; c2.innerHTML = icon('pencil') + '<span>Anpassen</span>'; c2.addEventListener('click', () => { view = 'adjust'; render(); });
        chips.append(c1, c2); card.append(chips);
        const wrap = el('div', 'ps-namefield');
        const lab = el('label', '', 'Name'); lab.htmlFor = 'ps-name';
        const boxw = el('div', 'ps-inputbox');
        const input = el('input'); input.id = 'ps-name'; input.maxLength = NAME_MAX; input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = 'Nickname'; input.value = name;
        const ok = el('span', 'ps-valid'); ok.innerHTML = icon('tick'); ok.hidden = !nameOk();
        boxw.append(input, ok);
        const hint = el('p', 'ps-min', 'Mindestens ' + NAME_MIN + ' Buchstaben');
        wrap.append(lab, boxw, hint); card.append(wrap);
        card.append(el('div', 'f1'));
        const sv = el('button', 'ps-primary big'); sv.type = 'button'; sv.innerHTML = icon('tick') + '<span>Speichern</span>'; sv.disabled = !nameOk(); sv.addEventListener('click', save);
        input.addEventListener('input', () => { name = input.value; ok.hidden = !nameOk(); sv.disabled = !nameOk(); });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
        card.append(sv); open(true); return;
      }

      if (view === 'figure') {
        suggestions[sel] = Object.assign({}, choice);
        const grid = el('div', 'ps-sugg3');
        suggestions.forEach((s, i) => {
          const b = el('button', 'ps-char'); b.type = 'button'; b.setAttribute('aria-label', 'Vorschlag ' + (i + 1)); b.setAttribute('aria-pressed', String(i === sel));
          b.innerHTML = avatarHtml(s, '');
          b.addEventListener('click', () => { sel = i; Object.assign(choice, suggestions[i]); grid.querySelectorAll('.ps-char').forEach((t, j) => t.setAttribute('aria-pressed', String(j === i))); });
          grid.append(b);
        });
        const more = el('button', 'ps-more-tile'); more.type = 'button'; more.innerHTML = icon('sparkle', true) + '<span>5 neue</span>';
        more.addEventListener('click', () => { suggestions = [1, 2, 3, 4, 5].map(() => avatarRandom()); sel = 0; Object.assign(choice, suggestions[0]); render(); });
        grid.append(more); card.append(grid);
      } else {
        const pv = el('div', 'ps-fig small'); card.append(pv);
        const tabs = el('div', 'ps-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Teile');
        const content = el('div', 'ps-tabbody');
        const names = { body: 'Körper', eyes: 'Augen', mouth: 'Mund', top: 'Kopf', pattern: 'Muster', colors: 'Farben' };
        const paint = () => {
          pv.innerHTML = avatarHtml(choice, 'Vorschau deiner Figur');
          tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === tab)));
          content.replaceChildren();
          if (tab === 'colors') {
            const titles = { bodyColor: 'Körperfarbe', accent: 'Zweitfarbe', bg: 'Hintergrund' };
            const lists = { bodyColor: AVATAR_COLORS.body, accent: AVATAR_COLORS.accent, bg: AVATAR_COLORS.bg };
            for (const k of ['bodyColor', 'accent', 'bg']) {
              const g = el('div', 'ps-colorrow'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', titles[k]); g.append(el('span', 'ps-gt', titles[k]));
              const w = el('div', 'ps-swatches');
              for (const hex of lists[k]) {
                const b = el('button', 'ps-swatch'); b.type = 'button'; b.style.background = '#' + hex; b.setAttribute('aria-label', titles[k] + ' #' + hex); b.setAttribute('aria-pressed', String(choice[k] === hex));
                b.addEventListener('click', () => { choice[k] = hex; paint(); }); w.append(b);
              }
              g.append(w); content.append(g);
            }
          } else {
            const row = el('div', 'ps-parts center');
            for (const v of AVATAR_PARTS[tab]) {
              const b = el('button', 'ps-part'); b.type = 'button'; b.setAttribute('aria-label', names[tab] + ' ' + v); b.setAttribute('aria-pressed', String(choice[tab] === v));
              b.innerHTML = avatarPartHtml(tab, v, choice); b.addEventListener('click', () => { choice[tab] = v; paint(); }); row.append(b);
            }
            content.append(row);
          }
        };
        for (const t of ['body', 'eyes', 'mouth', 'top', 'pattern', 'colors']) {
          const b = el('button', 'ps-tab'); b.type = 'button'; b.dataset.t = t; b.innerHTML = icon(t); b.append(el('span', '', names[t]));
          b.addEventListener('click', () => { tab = t; paint(); }); tabs.append(b);
        }
        card.append(tabs, content); paint();
      }
      card.append(el('div', 'f1'));
      const sv = el('button', 'ps-primary big'); sv.type = 'button'; sv.innerHTML = icon('tick') + '<span>Speichern</span>'; sv.disabled = !nameOk(); sv.addEventListener('click', save);
      card.append(sv); open(true);
    }
    render();
  }

  chip.addEventListener('click', picker);
  renderChip();
  if (!Profiles.active()) { if (Profiles.list().length) picker(); else builder(null); }
})();
