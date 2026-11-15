// Player settings, kept in this browser (or desktop app). Never throws.
// Also the one place that knows which key or button does what (the bindings) and how to name them,
// so every prompt, hint and table shows the keys the player actually chose.
const KEY = 'frozen-star.settings.v1';

const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

// ---- bindings ----
/** Keyboard actions: [id, name, default codes]. Each action has up to two keys. */
export const KEY_ACTIONS = [
  ['forward', 'Walk forward', ['KeyW', 'ArrowUp']],
  ['backward', 'Walk back', ['KeyS', 'ArrowDown']],
  ['left', 'Step left', ['KeyA']],
  ['right', 'Step right', ['KeyD']],
  ['turnLeft', 'Turn left', ['ArrowLeft']],
  ['turnRight', 'Turn right', ['ArrowRight']],
  ['run', 'Run', ['ShiftLeft', 'ShiftRight']],
  ['use', 'Use', ['KeyE', 'Enter']],
  ['pause', 'Step back / pause', ['KeyQ']],
  ['skip', 'Skip a line', ['Space']],
  ['answer1', 'Answer 1', ['Digit1', 'Numpad1']],
  ['answer2', 'Answer 2', ['Digit2', 'Numpad2']],
  ['answer3', 'Answer 3', ['Digit3', 'Numpad3']],
];
/** Gamepad actions (standard mapping button numbers). */
export const PAD_ACTIONS = [
  ['use', 'Use', 0],
  ['back', 'Step back', 1],
  ['run', 'Run', 10],
  ['pause', 'Pause', 9],
];
const KEY_DEFAULTS = Object.fromEntries(KEY_ACTIONS.map(([a, , d]) => [a, d]));
const PAD_DEFAULTS = Object.fromEntries(PAD_ACTIONS.map(([a, , d]) => [a, d]));
/** Keys that can never be bound: Esc always steps back (browsers reserve it), Tab moves focus, P is photo mode. */
export const RESERVED_KEYS = ['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'ContextMenu', 'KeyP'];
/** View/Select is photo mode, the d-pad answers and moves through menus, and Home belongs to the system. */
export const RESERVED_PAD = [8, 12, 13, 14, 15, 16];
const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Start', 'Left stick click', 'Right stick click', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home'];

let current = { keys: KEY_DEFAULTS, pad: PAD_DEFAULTS };
/** True while Settings > Controls waits for a key or button, so nothing else acts on it. */
export const capture = { on: false };
let layout = null; // the keyboard's own labels (so an AZERTY player sees Z, not W), where the browser tells us
try { navigator.keyboard?.getLayoutMap?.().then((m) => { layout = m; }).catch(() => {}); } catch { /* not offered */ }

/** Make `s` (cleaned settings) the live bindings for every prompt and for the controls. */
export function setBindings(s) {
  current = { keys: { ...KEY_DEFAULTS, ...(s?.keys || {}) }, pad: { ...PAD_DEFAULTS, ...(s?.pad || {}) } };
}
export const bindings = () => current;
export const keysFor = (action) => current.keys[action] || [];
export const padFor = (action) => current.pad[action];

const SPECIAL = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Enter: 'Enter', Escape: 'Esc',
  ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Alt', AltRight: 'Alt Gr',
  Backspace: 'Backspace', CapsLock: 'Caps Lock', NumpadEnter: 'Num Enter', Backquote: '`', Minus: '-', Equal: '=',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
  PageUp: 'Page Up', PageDown: 'Page Down', Home: 'Home', End: 'End', Insert: 'Ins', Delete: 'Del',
};
/** A key code's name as printed on the key. */
export function keyName(code) {
  if (!code) return '';
  const l = layout?.get?.(code);
  if (l && /^Key|^Digit/.test(code)) return l.toUpperCase();
  if (SPECIAL[code]) return SPECIAL[code];
  let m;
  if ((m = /^Key([A-Z])$/.exec(code))) return m[1];
  if ((m = /^Digit(\d)$/.exec(code))) return m[1];
  if ((m = /^Numpad(\d)$/.exec(code))) return `Num ${m[1]}`;
  return code.replace(/([a-z])([A-Z])/g, '$1 $2');
}
export const padName = (b) => PAD_NAMES[b] ?? `Button ${b}`;

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const padMode = () => typeof document !== 'undefined' && document.body?.dataset.input === 'pad';
// pause and the gamepad's back: Esc always works too
const keyList = (action) => (action === 'pause' ? ['Escape', ...keysFor('pause')] : keysFor(action));
const PAD_OF = { use: 'use', run: 'run', pause: 'back' };

/** Plain text for an action's keys: "E or Enter". With a gamepad in hand, its button instead. */
export function keyText(action, { pad = padMode(), all = true } = {}) {
  if (pad && PAD_OF[action] != null) return padName(padFor(PAD_OF[action]));
  const ks = keyList(action).map(keyName);
  return ks.length ? (all ? ks.join(' or ') : ks[0]) : 'no key';
}
/** The main key for an action as a <kbd> (HTML), for in-game prompts. */
export function keyHtml(action, opts) { return `<kbd>${esc(keyText(action, { all: false, ...opts }))}</kbd>`; }
/** The four walking keys in one word ("WASD"), for compact hints. */
export function moveKeysText() { return ['forward', 'left', 'backward', 'right'].map((a) => keyName(keysFor(a)[0]) || '?').join(''); }
/** The label in front of answer n (0-based) of a choice. */
export function answerLabel(i) { return keyName(keysFor(`answer${i + 1}`)[0]) || String(i + 1); }

/** The first "how to move" hint, in whatever the player holds. */
export function controlsHintHtml({ touch = false } = {}) {
  if (touch) return 'Left thumb to walk, drag to look around.';
  if (padMode()) return `Left stick to walk, right stick to look, ${keyHtml('use')} to use things, <kbd>${esc(padName(padFor('pause')))}</kbd> to pause.`;
  const k = (a) => `<kbd>${esc(keyName(keysFor(a)[0]) || '?')}</kbd>`;
  const turn = keysFor('turnLeft').length && keysFor('turnRight').length ? ` or ${k('turnLeft')}${k('turnRight')}` : '';
  const run = keysFor('run').length ? (loadSettings().runMode === 'toggle' ? `, ${k('run')} to run (press again to walk)` : `, hold ${k('run')} to run`) : '';
  return `${k('forward')}${k('left')}${k('backward')}${k('right')} to walk${run}, mouse${turn} to look, ${keyHtml('use')} to use things, <kbd>Esc</kbd> to pause.`;
}

// ---- settings ----
export const DEFAULTS = {
  sens: 1, invertY: false, fov: 70, volume: 0.8, subs: 'normal', quality: 'auto',
  // accessibility
  subsBg: 0.7, speakerColours: true, reduceFlash: false, colourSafe: false, panelText: 'normal', runMode: 'hold', smoothing: false,
  // bindings: only the actions the player changed
  keys: {}, pad: {},
};
/** Defaults for this player: reduce flashing follows the system's reduce-motion setting. */
export const defaults = () => ({ ...DEFAULTS, reduceFlash: reducedMotion(), keys: {}, pad: {} });

export function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* storage off */ }
  const c = clean({ ...defaults(), ...s });
  setBindings(c);
  return c;
}

export function saveSettings(s) {
  setBindings(clean(s));
  try { localStorage.setItem(KEY, JSON.stringify(clean(s))); } catch { /* storage off */ }
}

const CODE = /^[A-Za-z][A-Za-z0-9]{0,24}$/;
export function clean(s) {
  const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
  const bool = (v, d) => (typeof v === 'boolean' ? v : d);
  const keys = {};
  if (s.keys && typeof s.keys === 'object') {
    for (const a of Object.keys(KEY_DEFAULTS)) {
      const v = s.keys[a];
      if (Array.isArray(v)) keys[a] = [...new Set(v.filter((c) => typeof c === 'string' && CODE.test(c) && !RESERVED_KEYS.includes(c)))].slice(0, 2);
    }
  }
  const pad = {};
  if (s.pad && typeof s.pad === 'object') {
    for (const a of Object.keys(PAD_DEFAULTS)) {
      const v = s.pad[a];
      if (Number.isInteger(v) && v >= 0 && v < 32 && !RESERVED_PAD.includes(v)) pad[a] = v;
    }
  }
  return {
    sens: num(s.sens, 0.2, 3, 1),
    invertY: !!s.invertY,
    fov: num(s.fov, 55, 95, 70),
    volume: num(s.volume, 0, 1, 0.8),
    subs: ['normal', 'large'].includes(s.subs) ? s.subs : 'normal',
    quality: ['auto', 'low', 'high'].includes(s.quality) ? s.quality : 'auto',
    subsBg: num(s.subsBg, 0, 1, 0.7),
    speakerColours: bool(s.speakerColours, true),
    reduceFlash: bool(s.reduceFlash, reducedMotion()),
    colourSafe: !!s.colourSafe,
    panelText: ['normal', 'large', 'larger'].includes(s.panelText) ? s.panelText : 'normal',
    runMode: ['hold', 'toggle'].includes(s.runMode) ? s.runMode : 'hold',
    smoothing: !!s.smoothing,
    keys, pad,
  };
}

/** Put the look-and-feel settings on the game's root element (classes and CSS variables). */
export function applyDisplay(el, s) {
  el.classList.toggle('fp-subs-large', s.subs === 'large');
  el.classList.toggle('fp-plain-speakers', !s.speakerColours);
  el.classList.toggle('fp-reduce-flash', !!s.reduceFlash);
  el.classList.toggle('fp-colour-safe', !!s.colourSafe);
  el.classList.toggle('fp-text-large', s.panelText === 'large');
  el.classList.toggle('fp-text-larger', s.panelText === 'larger');
  el.style.setProperty('--subs-bg', String(s.subsBg));
}
