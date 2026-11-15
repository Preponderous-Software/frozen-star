// A light pulse fired sideways (tangentially) by an observer hovering at radius r0, M = 1.
//
// With u = 1/r the pulse follows the same orbit equation as any ray, u'' + u = 3u² (MTW §25.6), and
// starts with du/dφ = 0, so its impact parameter is b = r0 / √(1 − 2/r0). Schwarzschild time runs as
// dt/dφ = r² / (b (1 − 2/r)). At r0 = 3 (the photon sphere, 1.5 rₛ) the pulse circles forever; anywhere
// else it spirals away, out to the stars (r0 > 3) or in through the horizon (r0 < 3).
//
// The circle is unstable. Linearising about u = 1/3 gives δu'' = δu, so a pulse started δr off the
// sphere is δr·cosh φ off it after turning through φ: about 268 times further out after one lap.
import { PHOTON_SPHERE } from './light.js';

/** One lap of the photon sphere: Schwarzschild (far-away) time 2π·3√3 M, and 6π M on a clock hovering there. */
export const PHOTON_LAP = { far: 2 * Math.PI * 3 * Math.sqrt(3), hover: 6 * Math.PI };

/** Linear theory: how far (same units as delta) from the photon sphere a pulse started delta off it is after `laps`. */
export const lapDrift = (delta, laps = 1) => delta * Math.cosh(2 * Math.PI * laps);

/**
 * Follow a pulse fired tangentially at r0 (> 2). Returns { fate: 'orbit' | 'escape' | 'capture', b,
 * samples: [{ phi, r, t }] } where t is Schwarzschild time since launch. The run stops after `maxTurns`
 * laps, when the pulse passes rOut, or when it reaches the horizon.
 */
export function tangentPulse(r0, { maxTurns = 4, step = 0.002, rOut = 12, every = 10 } = {}) {
  const b = r0 / Math.sqrt(1 - 2 / r0);
  const f = (u, w) => [w, 3 * u * u - u, 1 / (b * u * u * (1 - 2 * u))];
  let u = 1 / r0, w = 0, t = 0, phi = 0, n = 0;
  const samples = [{ phi: 0, r: r0, t: 0 }];
  const limit = 2 * Math.PI * maxTurns;
  while (phi < limit) {
    const k1 = f(u, w);
    const k2 = f(u + 0.5 * step * k1[0], w + 0.5 * step * k1[1]);
    const k3 = f(u + 0.5 * step * k2[0], w + 0.5 * step * k2[1]);
    const k4 = f(u + step * k3[0], w + step * k3[1]);
    const nu = u + (step / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    if (nu >= 0.49 || nu <= 1 / rOut) { // horizon (stop just short: dt/dφ diverges there) or gone
      samples.push({ phi: phi + step, r: 1 / Math.min(0.49, Math.max(nu, 1e-9)), t: t + step * k1[2] });
      return { fate: nu >= 0.49 ? 'capture' : 'escape', b, samples };
    }
    w += (step / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    t += (step / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    u = nu; phi += step;
    if (++n % every === 0) samples.push({ phi, r: 1 / u, t });
  }
  samples.push({ phi, r: 1 / u, t });
  return { fate: 'orbit', b, samples };
}

/** Where the pulse is at Schwarzschild time t since launch (linear between samples). Null once it has left. */
export function pulseAt(run, t) {
  const s = run.samples;
  if (t <= 0) return s[0];
  let lo = 0, hi = s.length - 1;
  if (t >= s[hi].t) return null;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m].t <= t) lo = m; else hi = m; }
  const a = s[lo], c = s[hi], k = (t - a.t) / (c.t - a.t);
  return { phi: a.phi + k * (c.phi - a.phi), r: a.r + k * (c.r - a.r), t };
}

export { PHOTON_SPHERE };
