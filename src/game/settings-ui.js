// The settings form, shared by the pause menu and the main menu.
// Choices are drawn as on-page buttons rather than native dropdowns: native popups render as empty
// boxes in some browsers and are awkward with a thumb or a gamepad.
import { h } from '../ui/dom.js';
import { loadSettings, saveSettings, defaults, KEY_ACTIONS, PAD_ACTIONS, RESERVED_KEYS, RESERVED_PAD, keyName, padName, keyText, padFor, capture } from './settings.js';

export function settingsForm(settings, onChange, { onBack } = {}) {
  const changed = () => { saveSettings(settings); onChange?.(settings); };
  const sync = [];
  const row = (label, input, out) => h('label.fp-set', h('span', label), input, out || null);
  const range = (id, min, max, step, key, fmt) => {
    const out = h('output', { for: id });
    const i = h('input', { type: 'range', id, min, max, step, value: settings[key] });
    const show = () => { out.textContent = fmt(+i.value); i.style.setProperty('--fill', `${((+i.value - min) / (max - min)) * 100}%`); };
    i.addEventListener('input', () => { settings[key] = +i.value; show(); changed(); });
    sync.push(() => { i.value = settings[key]; show(); });
    show();
    return row(label(id), i, out);
  };
  // a row of buttons that behaves like a radio group (arrow keys and the d-pad move along it)
  const choice = (id, key, opts) => {
    const btns = opts.map(([v, l]) => h('button.fp-seg-b', { type: 'button', role: 'radio', 'data-v': v }, l));
    const paint = () => btns.forEach((b) => { const on = b.dataset.v === settings[key]; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    const pick = (b) => { settings[key] = b.dataset.v; paint(); changed(); };
    btns.forEach((b, n) => {
      b.addEventListener('click', () => pick(b));
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault(); e.stopPropagation();
        const nb = btns[(n + d + btns.length) % btns.length]; pick(nb); nb.focus();
      });
    });
    sync.push(paint); paint();
    return h('div.fp-set.fp-set-choice', h('span', { id: id + '-l' }, label(id)), h('div.fp-seg', { id, role: 'radiogroup', 'aria-labelledby': id + '-l' }, btns));
  };
  const toggle = (id, key) => {
    const b = h('button.fp-switch', { type: 'button', role: 'switch', id, 'aria-labelledby': id + '-l' }, h('i'));
    const paint = () => b.setAttribute('aria-checked', String(!!settings[key]));
    b.addEventListener('click', () => { settings[key] = !settings[key]; paint(); changed(); });
    sync.push(paint); paint();
    return h('div.fp-set.fp-set-switch', h('span', { id: id + '-l' }, label(id)), b);
  };
  const LABELS = {
    'fp-sens': 'Look speed', 'fp-fov': 'Field of view', 'fp-vol': 'Volume', 'fp-invert': 'Invert look up and down', 'fp-subsize': 'Subtitle size', 'fp-quality': 'Graphics',
    'fp-smooth': 'Smooth mouse look', 'fp-runmode': 'Run key', 'fp-subbg': 'Subtitle background', 'fp-speakers': 'Colour speaker names',
    'fp-paneltext': 'Console text size', 'fp-flash': 'Reduce flashing', 'fp-coloursafe': 'Colour-safe redshift',
  };
  const label = (id) => LABELS[id];

  const canFs = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const fsLabel = () => (document.fullscreenElement ? 'Leave fullscreen' : 'Go fullscreen');
  const fs = canFs ? h('button.fp-wide', { type: 'button', id: 'fp-fullscreen' }, fsLabel()) : null;
  fs?.addEventListener('click', () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    p?.then?.(() => { fs.textContent = fsLabel(); }).catch?.(() => {});
  });
  // the key bindings have their own reset, under Controls
  const reset = h('button.fp-wide.fp-quiet', { type: 'button', id: 'fp-reset' }, 'Reset to defaults');
  reset.addEventListener('click', () => { const { keys, pad } = settings; Object.assign(settings, defaults(), { keys, pad }); sync.forEach((f) => f()); changed(); });

  const group = (title, ...kids) => h('fieldset.fp-group', h('legend', title), kids);
  return h('div.fp-settings',
    h('p.eyebrow', 'Settings'),
    group('Looking and moving',
      range('fp-sens', 0.2, 3, 0.05, 'sens', (v) => `${v.toFixed(2)}×`),
      range('fp-fov', 55, 95, 1, 'fov', (v) => `${v}°`),
      toggle('fp-invert', 'invertY'),
      toggle('fp-smooth', 'smoothing'),
      choice('fp-runmode', 'runMode', [['hold', 'Hold to run'], ['toggle', 'Press to toggle']])),
    group('Sound and text',
      range('fp-vol', 0, 1, 0.05, 'volume', (v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)),
      choice('fp-subsize', 'subs', [['normal', 'Normal'], ['large', 'Large']]),
      range('fp-subbg', 0, 1, 0.05, 'subsBg', (v) => (v === 0 ? 'None' : `${Math.round(v * 100)}%`)),
      toggle('fp-speakers', 'speakerColours'),
      choice('fp-paneltext', 'panelText', [['normal', 'Normal'], ['large', 'Large'], ['larger', 'Larger']])),
    group('Comfort and colour',
      toggle('fp-flash', 'reduceFlash'),
      h('p.fp-note', 'Steadies the red alarm light and the blinking lamps and markers. On by default when your system asks for less motion.'),
      toggle('fp-coloursafe', 'colourSafe'),
      h('p.fp-note', 'Redshifted radio lines keep a plain colour and are labelled with how stretched their light is.')),
    group('Picture',
      choice('fp-quality', 'quality', [['auto', 'Auto'], ['low', 'Fast'], ['high', 'Sharp']]),
      h('p.fp-note', 'Fast draws a blurrier sky for slower computers. Sharp needs a strong graphics card.'),
      fs),
    reset,
    h('p.fp-note', 'Settings are saved in this browser and apply straight away.'),
    onBack ? h('button.fp-wide', { type: 'button', onclick: onBack }, 'Back') : null);
}

/** Changing keys and gamepad buttons. Shared by the main menu and the pause menu. */
export function controlsForm(settings, onChange, { onBack } = {}) {
  const changed = () => { saveSettings(settings); onChange?.(settings); };
  const status = h('p.fp-note.fp-bind-status', { role: 'status', 'aria-live': 'polite' }, 'Choose a key to change it, then press the new key. Esc cancels, Backspace clears.');
  const say = (t) => { status.textContent = t; };
  const fullKeys = () => Object.fromEntries(KEY_ACTIONS.map(([a, , d]) => [a, [...(settings.keys?.[a] || d)]]));
  const fullPad = () => Object.fromEntries(PAD_ACTIONS.map(([a, , d]) => [a, settings.pad?.[a] ?? d]));
  const nameOf = (list, a) => list.find((x) => x[0] === a)[1];
  const paints = [];
  const glance = h('div.controls-ref');
  const repaint = () => { paints.forEach((f) => f()); glance.replaceChildren(controlsTable(settings)); };
  let stop = null; // ends the capture in progress
  const end = () => { stop?.(); stop = null; };

  function storeKeys(full) {
    // keep only the actions that differ from their defaults
    settings.keys = Object.fromEntries(KEY_ACTIONS.filter(([a, , d]) => full[a].join() !== d.join()).map(([a]) => [a, full[a].filter(Boolean)]));
  }
  function assignKey(action, slot, code) {
    const full = fullKeys();
    const old = full[action][slot];
    let note = '';
    for (const [a] of KEY_ACTIONS) {
      if (a === action) continue;
      const i = full[a].indexOf(code);
      if (i < 0) continue;
      // the key was already in use: the other action takes this slot's old key (a swap), or loses it
      if (old && !full[a].includes(old)) full[a][i] = old; else full[a].splice(i, 1);
      note = ` ${keyName(code)} was on ${nameOf(KEY_ACTIONS, a)}, which now uses ${full[a].filter(Boolean).map(keyName).join(' or ') || 'no key'}.`;
    }
    const mine = full[action].filter((c, i) => i !== slot && c !== code);
    full[action] = slot === 0 ? [code, ...mine] : [...mine, code];
    storeKeys(full); changed(); repaint();
    say(`${nameOf(KEY_ACTIONS, action)}: ${keyText(action, { pad: false })}.${note}`);
  }
  function clearKey(action, slot) {
    const full = fullKeys(); full[action].splice(slot, 1);
    storeKeys(full); changed(); repaint();
    say(`${nameOf(KEY_ACTIONS, action)}: ${full[action].length ? keyText(action, { pad: false }) : 'no key. Choose one so you can still do this.'}`);
  }
  function captureKey(btn, action, slot) {
    end();
    btn.classList.add('wait'); btn.textContent = 'Press a key…'; capture.on = true;
    say(`Press the new key for ${nameOf(KEY_ACTIONS, action).toLowerCase()}. Esc cancels, Backspace clears.`);
    const kd = (e) => {
      if (!btn.isConnected) { end(); return; } // the menu closed mid-capture
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.code === 'Escape') { end(); say('Not changed.'); return; }
      if (e.code === 'Backspace' || e.code === 'Delete') { end(); clearKey(action, slot); return; }
      if (RESERVED_KEYS.includes(e.code) || !e.code) { say(`${keyName(e.code) || 'That key'} cannot be used. Try another, or Esc to cancel.`); return; }
      end(); assignKey(action, slot, e.code);
    };
    const swallow = (e) => { e.stopImmediatePropagation(); };
    const away = (e) => { if (e.target !== btn) { end(); say('Not changed.'); } };
    addEventListener('keydown', kd, true); addEventListener('keyup', swallow, true); addEventListener('pointerdown', away, true);
    stop = () => { removeEventListener('keydown', kd, true); setTimeout(() => removeEventListener('keyup', swallow, true), 0); removeEventListener('pointerdown', away, true); capture.on = false; btn.classList.remove('wait'); repaint(); btn.focus(); };
  }
  function capturePad(btn, action) {
    end();
    btn.classList.add('wait'); btn.textContent = 'Press a button…'; capture.on = true;
    const pads = () => [...(navigator.getGamepads?.() || [])].filter(Boolean);
    say(pads().length ? `Press the new gamepad button for ${nameOf(PAD_ACTIONS, action).toLowerCase()}.` : 'No gamepad found. Connect one and press a button, or press Esc.');
    const held = new Set(pads()[0]?.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0) || []);
    const t0 = performance.now();
    let raf = 0, polls = 0;
    const poll = () => {
      if (!btn.isConnected) { end(); return; }
      const gp = pads()[0];
      if (gp) {
        for (let i = 0; i < gp.buttons.length; i++) {
          const p = gp.buttons[i].pressed;
          if (!p) { held.delete(i); continue; }
          if (held.has(i)) continue;
          if (RESERVED_PAD.includes(i)) { held.add(i); say(`${padName(i)} moves through menus and cannot be used here. Try another.`); continue; }
          end(); assignPad(action, i); return;
        }
      }
      // give up after 8 s (and at least 60 looks, so a slow computer still gets its chance)
      if (++polls > 60 && performance.now() - t0 > 8000) { end(); say('No button pressed. Not changed.'); return; }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    const kd = (e) => { if (!btn.isConnected) { end(); return; } if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); say('Not changed.'); } };
    addEventListener('keydown', kd, true);
    stop = () => {
      cancelAnimationFrame(raf); removeEventListener('keydown', kd, true); btn.classList.remove('wait'); repaint();
      // stay deaf to the gamepad until the button is let go, or the menus would act on it
      const release = () => { if (pads()[0]?.buttons.some((x) => x.pressed)) requestAnimationFrame(release); else capture.on = false; };
      release();
    };
  }
  function assignPad(action, b) {
    const full = fullPad(), old = full[action];
    let note = '';
    for (const [a] of PAD_ACTIONS) if (a !== action && full[a] === b) { full[a] = old; note = ` ${padName(b)} was on ${nameOf(PAD_ACTIONS, a)}, which now uses ${padName(old)}.`; }
    full[action] = b;
    settings.pad = Object.fromEntries(PAD_ACTIONS.filter(([a, , d]) => full[a] !== d).map(([a]) => [a, full[a]]));
    changed(); repaint();
    say(`${nameOf(PAD_ACTIONS, action)}: ${padName(b)}.${note}`);
  }

  const keyRow = ([action, name]) => {
    const btns = [0, 1].map((slot) => {
      const b = h('button.fp-bind', { type: 'button' });
      b.addEventListener('click', () => captureKey(b, action, slot));
      b.addEventListener('keydown', (e) => { if ((e.code === 'Backspace' || e.code === 'Delete') && !stop) { e.preventDefault(); clearKey(action, slot); b.focus(); } });
      return b;
    });
    const r = h('div.fp-bind-row', { role: 'group', 'aria-label': name }, h('span', name), btns);
    paints.push(() => {
      const ks = fullKeys()[action];
      btns.forEach((b, slot) => {
        if (b.classList.contains('wait')) return;
        const c = ks[slot];
        b.textContent = c ? keyName(c) : slot === 0 ? 'No key' : '+';
        b.setAttribute('aria-label', `${name}, ${slot ? 'second' : 'main'} key: ${c ? keyName(c) : 'none'}. Press to change.`);
        b.classList.toggle('empty', !c);
      });
      // the second slot appears once the first is set
      btns[1].hidden = !ks[0];
      r.classList.toggle('unbound', !ks.length);
    });
    return r;
  };
  const padRow = ([action, name]) => {
    const b = h('button.fp-bind', { type: 'button' });
    b.addEventListener('click', () => capturePad(b, action));
    paints.push(() => { if (b.classList.contains('wait')) return; const v = fullPad()[action]; b.textContent = padName(v); b.setAttribute('aria-label', `${name} on the gamepad: ${padName(v)}. Press to change.`); });
    return h('div.fp-bind-row', h('span', name), b);
  };

  const reset = h('button.fp-wide.fp-quiet', { type: 'button', id: 'fp-reset-keys' }, 'Reset controls to defaults');
  reset.addEventListener('click', () => { end(); settings.keys = {}; settings.pad = {}; changed(); repaint(); say('Keys and buttons are back to their defaults.'); });
  const group = (title, ...kids) => h('fieldset.fp-group', h('legend', title), kids);
  const form = h('div.fp-settings.fp-bindings',
    h('p.eyebrow', 'Controls'),
    status,
    group('Keyboard',
      KEY_ACTIONS.map(keyRow),
      h('p.fp-note', 'Esc always steps back and pauses too, and P is photo mode. The mouse looks around once you click the view.')),
    group('Gamepad',
      PAD_ACTIONS.map(padRow),
      h('p.fp-note', 'The left stick walks (push it all the way to run), the right stick looks, and the d-pad picks answers. In menus the d-pad moves, your Use button chooses, and your Step back button goes back.')),
    group('Touch',
      h('p.fp-note', 'Put your left thumb down to walk (push to the edge to run), drag anywhere else to look, and tap Use. Tap the subtitles to skip a line. The ☰ button pauses.')),
    h('details.fp-glance', h('summary', 'All controls at a glance'), glance),
    reset,
    onBack ? h('button.fp-wide', { type: 'button', onclick: () => { end(); onBack(); } }, 'Back') : null);
  repaint();
  return form;
}

/** What every button does, for keyboard and mouse, a gamepad, and touch, with the player's own keys. */
export function controlRows(s = loadSettings()) {
  const k = (...as) => as.map((a) => keyText(a, { pad: false })).filter((t) => t !== 'no key').join(' · ') || '–';
  const p = (a) => padName(padFor(a));
  return [
    ['Walk', k('forward', 'backward'), 'Left stick', 'Left thumb pad'],
    ['Step sideways', k('left', 'right'), 'Left stick', 'Left thumb pad'],
    ['Turn', k('turnLeft', 'turnRight'), 'Right stick', 'Drag'],
    ['Look', 'Mouse (click to capture)', 'Right stick', 'Drag'],
    ['Use', k('use'), p('use'), 'Use button'],
    ['Run', `${k('run')}${s.runMode === 'toggle' ? ' (press to toggle)' : ''}`, p('run'), 'Push the thumb pad to its edge'],
    ['Answer', k('answer1', 'answer2', 'answer3'), 'D-pad', 'Tap'],
    ['Skip a line', k('skip'), '–', 'Tap the subtitles'],
    ['Back / pause', k('pause'), `${p('back')} / ${p('pause')}`, '☰ button'],
    ['Photo mode', 'P', 'View (Select)', '–'],
  ];
}

/** A read-only table of the current controls. */
export function controlsTable(s) {
  return h('table.fp-controls',
    h('thead', h('tr', h('th', { scope: 'col' }, h('span.sr', 'Action')), h('th', { scope: 'col' }, 'Keyboard'), h('th', { scope: 'col' }, 'Gamepad'), h('th', { scope: 'col' }, 'Touch'))),
    h('tbody', controlRows(s).map(([a, ...v]) => h('tr', h('th', { scope: 'row' }, a), v.map((x) => h('td', x))))));
}

export const ACTS = [
  ['start', 'Waking up', 'A dream, and waking up aboard the Tern'],
  ['bridge', 'Beacon K-1', 'Drop a probe and watch it freeze'],
  ['probe-done', 'The rescue', 'Ines is falling'],
  ['rescue-done', 'The descent', 'Hover near the horizon'],
  ['helm-done', 'Orpheus', 'The camera probe'],
  ['epilogue', 'Free roam', 'Explore the ship'],
  ['halo', 'The photon sphere', 'Light that goes round in circles'],
];
