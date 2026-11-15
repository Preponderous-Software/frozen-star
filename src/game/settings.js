// Player settings, kept in this browser (or desktop app). Never throws.
const KEY = 'frozen-star.settings.v1';
export const DEFAULTS = { sens: 1, invertY: false, fov: 70, volume: 0.8, subs: 'normal', quality: 'auto' };

export function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* storage off */ }
  return clean({ ...DEFAULTS, ...s });
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(clean(s))); } catch { /* storage off */ }
}

export function clean(s) {
  const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
  return {
    sens: num(s.sens, 0.2, 3, 1),
    invertY: !!s.invertY,
    fov: num(s.fov, 55, 95, 70),
    volume: num(s.volume, 0, 1, 0.8),
    subs: ['normal', 'large'].includes(s.subs) ? s.subs : 'normal',
    quality: ['auto', 'low', 'high'].includes(s.quality) ? s.quality : 'auto',
  };
}
