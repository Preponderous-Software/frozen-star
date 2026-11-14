// Geometric units: G = c = 1, lengths and times in units of the hole's mass M.
// Converting to the real world needs the mass in solar masses.

export const C = 299792458; // m/s
export const SEC_PER_M_SUN = 4.925490947e-6; // GM_sun / c^3
export const METERS_PER_M_SUN = 1476.625; // GM_sun / c^2
export const G_EARTH = 9.80665;

export const secondsFromM = (m, massSun) => m * massSun * SEC_PER_M_SUN;
export const metersFromM = (m, massSun) => m * massSun * METERS_PER_M_SUN;

// Real black holes (masses are published estimates, rounded).
export const HOLES = [
  { id: 'cygx1', name: 'Cygnus X-1', mass: 21, note: 'The first black hole confirmed (1971), feeding on a blue supergiant.' },
  { id: 'sgra', name: 'Sagittarius A*', mass: 4.3e6, note: 'The black hole at the centre of the Milky Way.' },
  { id: 'm87', name: 'M87*', mass: 6.5e9, note: 'The first black hole ever photographed (Event Horizon Telescope, 2019).' },
  { id: 'ton618', name: 'TON 618', mass: 4.0e10, note: 'One of the most massive black holes known.' },
];

const YEAR = 365.25 * 86400;

/** Human-readable duration from seconds, three significant figures. */
export function formatDuration(s) {
  if (!isFinite(s)) return 'forever';
  const a = Math.abs(s);
  const units = [
    [1e9 * YEAR, 'billion years'], [1e6 * YEAR, 'million years'], [YEAR, 'years'], [86400, 'days'],
    [3600, 'hours'], [60, 'min'], [1, 's'], [1e-3, 'ms'], [1e-6, 'µs'], [1e-9, 'ns'],
  ];
  if (a >= 1e12 * YEAR) return `${expo(s / YEAR)} years`;
  for (const [k, n] of units) if (a >= k) return `${sig(s / k)} ${n}`;
  return `${sig(s / 1e-9)} ns`;
}

export function formatMass(massSun) {
  if (massSun >= 1e9) return `${sig(massSun / 1e9)} billion suns`;
  if (massSun >= 1e6) return `${sig(massSun / 1e6)} million suns`;
  if (massSun >= 1e3) return `${sig(massSun / 1e3)} thousand suns`;
  return `${sig(massSun)} suns`;
}

export function formatAccel(ms2) {
  const g = ms2 / G_EARTH;
  if (!isFinite(g)) return '∞ g';
  if (g >= 1e4 || (g > 0 && g < 1e-3)) return `${expo(g)} g`;
  return `${sig(g)} g`;
}

export function sig(x, n = 3) {
  if (x === 0) return '0';
  const s = Number(x.toPrecision(n));
  return Math.abs(s) >= 1e5 ? expo(s) : String(s);
}

export function expo(x) {
  if (x === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / 10 ** e;
  return `${Number(m.toPrecision(2))}×10${superscript(e)}`;
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export const superscript = (n) => String(n).split('').map((c) => SUP[c] ?? c).join('');
