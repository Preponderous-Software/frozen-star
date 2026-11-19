// Walking maths with no DOM and no engine, so it runs under node too (test/walk.test.js).
// Conventions follow the arcade hall's walk: velocity eases toward what the input asks for, walls
// take away only the part of the velocity that goes into them, and nothing here ever turns the view.
//
// Ship coordinates: metres, Y up, the nose at −Z. yaw = 0 looks along −Z; positive pitch looks up.

export const EYE = 1.64;
export const RADIUS = 0.28;
export const WALK = 2.2, RUN = 4.0; // m/s
const ACCEL = 9, DAMP = 12, STOP = 0.02, SUBSTEP = 0.03;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Push (x, z) out of every solid box [x0, z0, x1, z1]. */
export function resolve(x, z, boxes, r = RADIUS) {
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (const b of boxes) {
      if (b.off) continue;
      const [x0, z0, x1, z1] = b.box || b;
      if (x < x0 - r || x > x1 + r || z < z0 - r || z > z1 + r) continue;
      const cx = clamp(x, x0, x1), cz = clamp(z, z0, z1);
      const ex = x - cx, ez = z - cz, d = Math.hypot(ex, ez);
      if (d >= r) continue;
      if (d > 1e-6) { x = cx + (ex / d) * r; z = cz + (ez / d) * r; }
      else {
        const pl = x - x0, pr = x1 - x, pb = z - z0, pf = z1 - z, m = Math.min(pl, pr, pb, pf);
        if (m === pl) x = x0 - r; else if (m === pr) x = x1 + r; else if (m === pb) z = z0 - r; else z = z1 + r;
      }
      moved = true;
    }
    if (!moved) break;
  }
  return { x, z };
}

/** Forward and right unit vectors on the floor for a yaw. */
export function axes(yaw) {
  return { fx: -Math.sin(yaw), fz: -Math.cos(yaw), rx: Math.cos(yaw), rz: -Math.sin(yaw) };
}

/** The walker after dt seconds of input {forward, right, run}. me: {x, z, yaw, vx, vz}. */
export function step(me, input, dt, boxes) {
  dt = clamp(dt, 0, 0.25);
  let f = input.forward || 0, s = input.right || 0;
  const mag = Math.hypot(f, s);
  if (mag > 1) { f /= mag; s /= mag; }
  let { x, z } = me, vx = me.vx || 0, vz = me.vz || 0;
  const { fx, fz, rx, rz } = axes(me.yaw);
  const speed = input.run ? RUN : WALK, on = mag > 0.02;
  const wx = on ? (fx * f + rx * s) * speed : 0, wz = on ? (fz * f + rz * s) * speed : 0;
  for (let left = dt; left > 1e-6; left -= SUBSTEP) {
    const h = Math.min(SUBSTEP, left), k = 1 - Math.exp(-(on ? ACCEL : DAMP) * h);
    vx += (wx - vx) * k; vz += (wz - vz) * k;
    if (!on && Math.hypot(vx, vz) < STOP) { vx = 0; vz = 0; break; }
    const ix = x + vx * h, iz = z + vz * h, p = resolve(ix, iz, boxes);
    const px = p.x - ix, pz = p.z - iz, pl = Math.hypot(px, pz);
    if (pl > 1e-9) { const nx = px / pl, nz = pz / pl, vn = vx * nx + vz * nz; if (vn < 0) { vx -= vn * nx; vz -= vn * nz; } }
    x = p.x; z = p.z;
  }
  return { ...me, x, z, vx, vz, speed: Math.hypot(vx, vz) };
}

/** Joystick offset (CSS px) → {forward, right, run}. Dead zone in the middle, run near the rim. */
export function stick(dx, dy, radius) {
  const m = Math.hypot(dx, dy) / radius;
  if (m < 0.12) return { forward: 0, right: 0, run: false };
  const k = Math.min(1, (m - 0.12) / 0.88) / m;
  return { forward: (-dy / radius) * k, right: (dx / radius) * k, run: m > 0.95 };
}

/** Gamepad axis pair with a radial dead zone, rescaled. */
export function deadzone(x, y, dead = 0.18) {
  const m = Math.hypot(x, y);
  if (m <= dead) return [0, 0];
  const k = Math.min(1, (m - dead) / (1 - dead)) / m;
  return [x * k, y * k];
}

// ---- stride: footsteps and head bob from the same phase ----
// One footfall per half cycle of the phase (at phase = kπ the foot lands, and the eye is at its lowest);
// the phase advances with distance walked, so steps match speed exactly and stop when you do.
export const STRIDE = { walk: 0.75, run: 0.95 }; // metres per step
const BOB = { walk: 0.022, run: 0.034 }; // eye rise mid-stride, metres

/** A fresh stride state. */
export const strideStart = () => ({ phase: 0, amp: 0, moving: false, sinceStep: 0 });

/**
 * Advance the stride by `dist` metres at `speed` m/s over dt seconds.
 * Returns { st, step, settle, y, x }: step is a footfall's loudness (0 for none), settle is true on the
 * frame you come to rest after walking, and y (up) / x (right) are the eye's offset in metres.
 */
export function stride(st, dist, speed, run, dt) {
  const len = run ? STRIDE.run : STRIDE.walk;
  let { phase, amp, moving, sinceStep } = st;
  let step = 0, settle = false;
  sinceStep += dist;
  const going = speed > 0.35;
  // from rest, the first foot lands soon, not a whole stride later
  if (going && !moving) { phase = Math.floor(phase / Math.PI) * Math.PI + 0.55 * Math.PI; }
  const before = Math.floor(phase / Math.PI);
  phase += (dist / len) * Math.PI;
  if (Math.floor(phase / Math.PI) > before) { step = run ? 1.2 : Math.min(1, 0.45 + 0.55 * (speed / WALK)); sinceStep = 0; }
  // came to rest after real walking, and the last footfall was a while back: draw the trailing foot in
  if (moving && speed < 0.15) { settle = sinceStep > 0.25 * len; moving = false; } else if (going) moving = true;
  // the bob eases in and out with speed rather than switching
  const want = Math.min(1, speed / WALK) * (run ? BOB.run : BOB.walk);
  amp += (want - amp) * (1 - Math.exp(-8 * Math.max(0, dt)));
  const y = amp * (Math.abs(Math.sin(phase)) - 0.35);
  const x = amp * 0.45 * Math.sin(phase); // a slight sway toward the planted foot, once per two steps
  return { st: { phase, amp, moving, sinceStep }, step, settle, y, x };
}
