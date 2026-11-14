// Tides, hovering and evaporation: the parts that depend on how heavy the hole is.
import { C, METERS_PER_M_SUN, SEC_PER_M_SUN } from './units.js';

/** Tidal stretch (m/s²) across a body of length L metres at radius r (units of M). */
export function tidalStretch(r, massSun, L = 2) {
  const Mm = massSun * METERS_PER_M_SUN;
  return (2 * C * C * L) / (r ** 3 * Mm * Mm);
}

/** Radius (units of M) where the tidal stretch across L metres reaches `limit` m/s². */
export function tidalRadius(massSun, limit, L = 2) {
  const Mm = massSun * METERS_PER_M_SUN;
  return Math.cbrt((2 * C * C * L) / (limit * Mm * Mm));
}

/** Smallest mass (suns) whose horizon tide across L metres stays under `limit` m/s². */
export function minMassForSafeCrossing(limit, L = 2) {
  // tidalStretch(2, m) = c² L / (4 Mm²) ≤ limit
  return Math.sqrt((C * C * L) / (4 * limit)) / METERS_PER_M_SUN;
}

/** Clock rate of an observer hovering at r, relative to a clock far away. */
export const hoverRate = (r) => Math.sqrt(1 - 2 / r);

/** Proper acceleration (m/s²) needed to hover at r. */
export function hoverAccel(r, massSun) {
  const Mm = massSun * METERS_PER_M_SUN;
  return (C * C) / (Mm * r * r * Math.sqrt(1 - 2 / r));
}

/** Radius at which far-away time runs `factor` times faster than the hovering clock. */
export const radiusForDilation = (factor) => 2 / (1 - 1 / (factor * factor));

/** Longest possible proper time between horizon and singularity: πM, falling from rest at the horizon. */
export const maxTimeInside = (massSun) => Math.PI * massSun * SEC_PER_M_SUN;

/** Hawking evaporation time in years (photons only; Page 1976 order of magnitude). */
export const hawkingLifetimeYears = (massSun) => 2.1e67 * massSun ** 3;

/** Hawking temperature in kelvin. */
export const hawkingTemperature = (massSun) => 6.17e-8 / massSun;
