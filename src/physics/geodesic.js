// Light rays in Painlevé–Gullstrand (PG) coordinates, M = 1.
//
// PG slices are flat Euclidean space, and "rain" observers (falling from rest at infinity) are at
// rest on them. That makes a camera at any radius, including inside the horizon, easy to set up:
// its local frame is just the Cartesian axes, boosted by its velocity relative to the rain.
//
// Null geodesics follow from the Hamiltonian H = ½ g^{μν} p_μ p_ν with
//   g^{tt} = −1,  g^{ti} = β r̂^i,  g^{ij} = δ^{ij} − β² r̂^i r̂^j,   β = √(2/r)
// and p_t = −E conserved:  H = ½(−E² − 2βE s + |p|² − β² s²),  s = p·r̂.
// src/render/raytracer.js runs the same equations in GLSL; tests keep them honest.

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b, k = 1) => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.sqrt(dot(a, a));
const norm = (a) => scale(a, 1 / len(a));

/** Derivatives (dx/dλ, dp/dλ) of a forward-in-time null ray. */
export function derivs(x, p, E) {
  const r = len(x), rh = scale(x, 1 / r), b = Math.sqrt(2 / r), bp = -b / (2 * r), s = dot(p, rh);
  const dx = add(add(p, rh, -b * E), rh, -b * b * s);
  const ps = add(p, rh, -s); // component of p across r̂
  // ∂H/∂x
  const dHdx = add(add(scale(rh, -E * bp * s - b * bp * s * s), ps, (-E * b - b * b * s) / r), [0, 0, 0]);
  return [dx, scale(dHdx, -1)];
}

/** Boost a photon seen by the camera into the local rain frame. n' = travel direction, V = camera velocity vs rain. */
export function cameraToRain(nCam, V) {
  const v2 = dot(V, V);
  if (v2 < 1e-12) return { n: nCam, Erain: 1 };
  const g = 1 / Math.sqrt(1 - v2), vh = scale(V, 1 / Math.sqrt(v2)), c = dot(nCam, vh);
  const p = add(add(nCam, vh, (g - 1) * c), V, g); // spatial momentum (camera energy 1)
  const Erain = g * (1 + dot(V, nCam));
  return { n: scale(p, 1 / Erain), Erain };
}

/** Velocity of a hovering (static) observer relative to the rain frame at x: outward at β. */
export const staticVelocity = (x) => scale(norm(x), Math.sqrt(2 / len(x)));

/**
 * Trace backwards from a camera at x looking along `look` (unit). Returns the fate of the ray and the
 * frequency ratio g = ν_received / ν_emitted for light from a static source at infinity (fate 'sky').
 */
export function trace(x0, look, { V = [0, 0, 0], disk = null, maxSteps = 4000, rEscape = 1000 } = {}) {
  const { n, Erain } = cameraToRain(scale(look, -1), V);
  const r0 = len(x0), b0 = Math.sqrt(2 / r0);
  const E = 1 - b0 * dot(n, scale(x0, 1 / r0)); // energy at infinity, rain-frame energy 1
  const gCam = 1 / Erain; // camera energy per unit rain energy
  let x = x0.slice(), p = n.slice();
  for (let i = 0; i < maxSteps; i++) {
    const r = len(x);
    const [k1x, k1p] = derivs(x, p, E);
    // Step a set distance in space (backwards in λ): fine near the horizon and the hole, coarse far out.
    const h = -(0.02 * Math.min(r, 8) + 0.09 * Math.max(0, r - 8)) / len(k1x);
    const [k2x, k2p] = derivs(add(x, k1x, h / 2), add(p, k1p, h / 2), E);
    const [k3x, k3p] = derivs(add(x, k2x, h / 2), add(p, k2p, h / 2), E);
    const [k4x, k4p] = derivs(add(x, k3x, h), add(p, k3p, h), E);
    const nx = add(x, add(add(k1x, k4x), add(k2x, k3x), 2), h / 6);
    const np = add(p, add(add(k1p, k4p), add(k2p, k3p), 2), h / 6);
    if (disk && Math.sign(x[1]) !== Math.sign(nx[1])) {
      const t = x[1] / (x[1] - nx[1]), hit = add(x, add(nx, x, -1), t), rd = len(hit);
      if (rd >= disk.inner && rd <= disk.outer) return { fate: 'disk', x: hit, p: np, E, gCam, steps: i };
    }
    x = nx; p = np;
    const rn = len(x), backDx = scale(derivs(x, p, E)[0], -1), radial = dot(backDx, x) / rn;
    if (rn > rEscape && radial > 0) return { fate: 'sky', dir: norm(backDx), g: gCam / E, steps: i };
    if ((rn < 2.01 && radial < 0) || len(p) > 1e5) return { fate: 'hole', steps: i };
    if (rn < 0.05) return { fate: 'hole', steps: i };
  }
  return { fate: 'lost' };
}

export const vec = { dot, add, scale, len, norm };
