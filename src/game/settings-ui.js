// The settings form, shared by the pause menu and the main menu.
// Choices are drawn as on-page buttons rather than native dropdowns: native popups render as empty
// boxes in some browsers and are awkward with a thumb or a gamepad.
import { h } from '../ui/dom.js';
import { saveSettings, DEFAULTS } from './settings.js';

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
    const b = h('button.fp-switch', { type: 'button', role: 'switch', id }, h('i'));
    const paint = () => b.setAttribute('aria-checked', String(!!settings[key]));
    b.addEventListener('click', () => { settings[key] = !settings[key]; paint(); changed(); });
    sync.push(paint); paint();
    return h('div.fp-set.fp-set-switch', h('span', { id: id + '-l' }, label(id)), b);
  };
  const LABELS = { 'fp-sens': 'Look speed', 'fp-fov': 'Field of view', 'fp-vol': 'Volume', 'fp-invert': 'Invert look up and down', 'fp-subsize': 'Subtitle size', 'fp-quality': 'Graphics' };
  const label = (id) => LABELS[id];
  const invert = toggle('fp-invert', 'invertY');
  invert.querySelector('button').setAttribute('aria-labelledby', 'fp-invert-l');

  const canFs = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const fsLabel = () => (document.fullscreenElement ? 'Leave fullscreen' : 'Go fullscreen');
  const fs = canFs ? h('button.fp-wide', { type: 'button', id: 'fp-fullscreen' }, fsLabel()) : null;
  fs?.addEventListener('click', () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    p?.then?.(() => { fs.textContent = fsLabel(); }).catch?.(() => {});
  });
  const reset = h('button.fp-wide.fp-quiet', { type: 'button', id: 'fp-reset' }, 'Reset to defaults');
  reset.addEventListener('click', () => { Object.assign(settings, DEFAULTS); sync.forEach((f) => f()); changed(); });

  const group = (title, ...kids) => h('fieldset.fp-group', h('legend', title), kids);
  return h('div.fp-settings',
    h('p.eyebrow', 'Settings'),
    group('Looking around',
      range('fp-sens', 0.2, 3, 0.05, 'sens', (v) => `${v.toFixed(2)}×`),
      range('fp-fov', 55, 95, 1, 'fov', (v) => `${v}°`),
      invert),
    group('Sound and text',
      range('fp-vol', 0, 1, 0.05, 'volume', (v) => (v === 0 ? 'Off' : `${Math.round(v * 100)}%`)),
      choice('fp-subsize', 'subs', [['normal', 'Normal'], ['large', 'Large']])),
    group('Picture',
      choice('fp-quality', 'quality', [['auto', 'Auto'], ['low', 'Fast'], ['high', 'Sharp']]),
      h('p.fp-note', 'Fast draws a blurrier sky for slower computers. Sharp needs a strong graphics card.'),
      fs),
    reset,
    h('p.fp-note', 'Settings are saved in this browser and apply straight away.'),
    onBack ? h('button.fp-wide', { type: 'button', onclick: onBack }, 'Back') : null);
}

/** What every button does, for keyboard and mouse, a gamepad, and touch. */
export const CONTROL_ROWS = [
  ['Walk', 'W S, or ↑ ↓', 'Left stick', 'Left thumb pad'],
  ['Step sideways', 'A D', 'Left stick', 'Left thumb pad'],
  ['Turn', '← →', 'Right stick', 'Drag'],
  ['Look', 'Mouse (click to capture)', 'Right stick', 'Drag'],
  ['Use', 'E or Enter', 'A', 'Use button'],
  ['Run', 'Shift', 'Click left stick', '–'],
  ['Answer', '1 2 3', 'D-pad', 'Tap'],
  ['Skip a line', 'Space', '–', 'Tap the subtitles'],
  ['Back / pause', 'Esc or Q', 'B / Start', '☰ button'],
];

export function controlsTable() {
  return h('table.fp-controls',
    h('thead', h('tr', h('th', { scope: 'col' }, h('span.sr', 'Action')), h('th', { scope: 'col' }, 'Keyboard'), h('th', { scope: 'col' }, 'Gamepad'), h('th', { scope: 'col' }, 'Touch'))),
    h('tbody', CONTROL_ROWS.map(([a, ...v]) => h('tr', h('th', { scope: 'row' }, a), v.map((x) => h('td', x))))));
}

export const ACTS = [
  ['start', 'Prologue', 'A dream, and waking up aboard the Tern'],
  ['bridge', 'Beacon K-1', 'Drop a probe and watch it freeze'],
  ['probe-done', 'The rescue', 'Ines is falling'],
  ['rescue-done', 'The descent', 'Hover near the horizon'],
  ['helm-done', 'Orpheus', 'The camera probe'],
  ['epilogue', 'Free roam', 'Explore the ship'],
  ['halo', 'The photon sphere', 'Light that goes round in circles'],
];
