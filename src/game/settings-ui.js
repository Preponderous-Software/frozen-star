// The settings form, shared by the pause menu and the main menu.
import { h } from '../ui/dom.js';
import { saveSettings } from './settings.js';

export function settingsForm(settings, onChange, { onBack } = {}) {
  const changed = () => { saveSettings(settings); onChange?.(settings); };
  const row = (label, input, out) => h('label.fp-set', h('span', label), input, out || null);
  const range = (id, min, max, step, val, fmt, set) => {
    const out = h('output', fmt(val));
    const i = h('input', { type: 'range', id, min, max, step, value: val });
    i.addEventListener('input', () => { set(+i.value); out.textContent = fmt(+i.value); changed(); });
    return [i, out];
  };
  const select = (id, val, opts, set) => {
    const sel = h('select', { id }, opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l)));
    sel.addEventListener('change', () => { set(sel.value); changed(); });
    return sel;
  };
  const inv = h('input', { type: 'checkbox', id: 'fp-invert', checked: settings.invertY });
  inv.addEventListener('change', () => { settings.invertY = inv.checked; changed(); });
  const fs = h('button', { type: 'button', id: 'fp-fullscreen' }, document.fullscreenElement ? 'Leave fullscreen' : 'Fullscreen');
  fs.addEventListener('click', () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    p?.then?.(() => { fs.textContent = document.fullscreenElement ? 'Leave fullscreen' : 'Fullscreen'; }).catch?.(() => {});
  });
  return h('div.fp-settings',
    h('p.eyebrow', 'Settings'),
    row('Look speed', ...range('fp-sens', 0.2, 3, 0.05, settings.sens, (v) => `${v.toFixed(2)}×`, (v) => { settings.sens = v; })),
    row('Field of view', ...range('fp-fov', 55, 95, 1, settings.fov, (v) => `${v}°`, (v) => { settings.fov = v; })),
    row('Volume', ...range('fp-vol', 0, 1, 0.05, settings.volume, (v) => `${Math.round(v * 100)}%`, (v) => { settings.volume = v; })),
    row('Invert look', inv),
    row('Subtitles', select('fp-subsize', settings.subs, [['normal', 'Normal'], ['large', 'Large']], (v) => { settings.subs = v; })),
    row('Graphics', select('fp-quality', settings.quality, [['auto', 'Automatic'], ['low', 'Fast (blurrier sky)'], ['high', 'Sharp (slower)']], (v) => { settings.quality = v; })),
    fs,
    onBack ? h('button', { type: 'button', onclick: onBack }, 'Back') : null);
}

export const ACTS = [
  ['start', 'Prologue', 'A dream, and waking up aboard the Tern'],
  ['bridge', 'Beacon K-1', 'Drop a probe and watch it freeze'],
  ['probe-done', 'The rescue', 'Ines is falling'],
  ['rescue-done', 'The descent', 'Hover near the horizon'],
  ['helm-done', 'Orpheus', 'The camera probe'],
  ['epilogue', 'Free roam', 'Explore the ship'],
];
