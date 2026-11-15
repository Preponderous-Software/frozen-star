// Light rays in the equatorial plane of a Schwarzschild black hole (G = c = M = 1, horizon at r = 2).
//
// A ray comes in from far away with impact parameter b (its sideways offset from a straight line
// through the centre). With u = 1/r its path obeys the orbit equation u'' + u = 3u² (MTW §25.6).
// Rays with b below 3√3 cross the horizon; rays just above it wind around the photon sphere
// (r = 3) before escaping. That critical b is also the radius of the black hole's shadow.

/** Impact parameter that separates captured from escaping rays: 3√3 M ≈ 2.598 rₛ. */
export const CRITICAL_B = 3 * Math.sqrt(3);
/** The photon sphere, where light can orbit: r = 3M = 1.5 rₛ. */
export const PHOTON_SPHERE = 3;

/** Closest approach for an escaping ray: the largest root r of b = r / √(1 − 2/r). Null if captured. */
export function closestApproach(b) {
  if (!(b > CRITICAL_B)) return null;
  // b(r) rises from b_c at r = 3 to infinity; bisect on the outer branch.
  let lo = 3, hi = Math.max(4, b + 2);
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (m / Math.sqrt(1 - 2 / m) < b) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/**
 * Follow a ray with impact parameter b in from infinity.
 * Returns { fate: 'escape' | 'capture', deflection (rad, escapes only), turns (times round the centre),
 *   rMin, path: [[x, y], ...] } with the ray arriving from −x, travelling +x at height +b.
 * Points farther than `rView` are left out of the path.
 */
export function bendLight(b, { step = 0.002, rView = 40, maxTurns = 12 } = {}) {
  if (!(b > 0)) return { fate: 'capture', deflection: NaN, turns: 0, rMin: 0, path: [[-rView, 0], [-2, 0]] };
  const acc = (u) => 3 * u * u - u;
  let u = 0, w = 1 / b, psi = 0, rMin = Infinity;
  const path = [];
  const push = () => {
    if (u <= 0) return;
    const r = 1 / u; if (r > rView) return;
    // the ray starts at polar angle π (far left) and sweeps clockwise as ψ grows
    const phi = Math.PI - psi; path.push([r * Math.cos(phi), r * Math.sin(phi)]);
  };
  const limit = 2 * Math.PI * maxTurns;
  while (psi < limit) {
    // RK4 on (u, w = du/dψ)
    const k1u = w, k1w = acc(u);
    const k2u = w + 0.5 * step * k1w, k2w = acc(u + 0.5 * step * k1u);
    const k3u = w + 0.5 * step * k2w, k3w = acc(u + 0.5 * step * k2u);
    const k4u = w + step * k3w, k4w = acc(u + step * k3u);
    const nu = u + (step / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    const nw = w + (step / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
    if (nu >= 0.5) { // crosses the horizon: it can never come back out
      const t = (0.5 - u) / (nu - u); psi += t * step; u = 0.5; push();
      return { fate: 'capture', deflection: NaN, turns: psi / (2 * Math.PI), rMin: 2, path };
    }
    if (nu <= 0 && psi > 0) { // back out at infinity
      const t = u / (u - nu); psi += t * step;
      return { fate: 'escape', deflection: psi - Math.PI, turns: psi / (2 * Math.PI), rMin, path };
    }
    u = nu; w = nw; psi += step;
    if (u > 0) rMin = Math.min(rMin, 1 / u);
    push();
  }
  return { fate: 'orbit', deflection: Infinity, turns: psi / (2 * Math.PI), rMin, path };
}
