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
