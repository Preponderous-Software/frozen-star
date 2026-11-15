// The setting: research vessel Tern, holding station above Erebus.
//
// Erebus is a fictional intermediate-mass black hole of 120,000 suns. At that mass one unit of
// geometric time, M = GM/c³, is 0.59 s, so everything in the game happens at its true speed:
// a probe dropped from 10 rₛ reaches the horizon in about 58 s of its own time.
import { SEC_PER_M_SUN } from '../physics/units.js';

export const HOLE = { name: 'Erebus', mass: 1.2e5 };
export const SEC_PER_M = HOLE.mass * SEC_PER_M_SUN; // ≈ 0.591 s
export const R_STATION = 20; // 10 Schwarzschild radii, in units of M
export const ELEVATION = 0.12; // the ship sits slightly above the disk plane (radians)
export const DISK_OUTER = 15;

/** Ship position in black-hole coordinates (units of M) at radius r. */
export function shipPosition(r = R_STATION) {
  return [0, r * Math.sin(ELEVATION), -r * Math.cos(ELEVATION)];
}

/** Ship axes → black-hole axes. The ship's nose (−Z) points at the hole; a 180° turn about Y. */
export const toHole = (v) => [-v[0], v[1], -v[2]];
export const fromHole = (v) => [-v[0], v[1], -v[2]];
