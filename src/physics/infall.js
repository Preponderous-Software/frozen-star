// Radial free fall from rest into a Schwarzschild black hole (G = c = M = 1, horizon at r = 2).
//
// The probe is released from a station that hovers at radius R0. Everything the station "sees"
// is computed from light that actually travels from the probe to the station, so the frozen,
// fading image is a consequence of the geometry rather than something drawn by hand.
//
// References: Misner, Thorne & Wheeler, Gravitation, §25.5 and §31.4 (cycloid parametrization).

const rStar = (r) => r + 2 * Math.log(Math.abs(r / 2 - 1)); // tortoise coordinate

function bisect(f, target, lo, hi, iters = 100) {
  for (let i = 0; i < iters; i++) {
    const m = (lo + hi) / 2;
    if (f(m) < target) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

export class Infall {
  constructor(R0 = 20) {
    if (!(R0 > 2)) throw new RangeError('The station must hover outside the horizon (R0 > 2M).');
    this.R0 = R0;
    this.f0 = 1 - 2 / R0; // station's redshift factor squared
    this.E = Math.sqrt(this.f0); // conserved energy per unit mass
    this.A = Math.sqrt(R0 ** 3 / 8);
    this.K = Math.sqrt(R0 / 2 - 1);
    this.etaH = 2 * Math.atan(this.K);
    this.tauH = this.tauOf(this.etaH);
    this.tauEnd = this.A * Math.PI;
    this._buildV();
    this.vH = this.vOf(this.etaH);
    this.etaSafe = this.etaH - 1e-11;
    this.SSafe = this.stationArrival(this.etaSafe);
    this.lnzSafe = Math.log(this.onePlusZ(this.rOf(this.etaSafe)));
  }

  rOf(eta) { return (this.R0 / 2) * (1 + Math.cos(eta)); }
  tauOf(eta) { return this.A * (eta + Math.sin(eta)); }
  etaOfTau(tau) { return bisect((e) => this.tauOf(e), Math.min(Math.max(tau, 0), this.tauEnd), 0, Math.PI); }
  rOfTau(tau) { return tau >= this.tauEnd ? 0 : this.rOf(this.etaOfTau(tau)); }

  /** Schwarzschild coordinate time along the fall (outside the horizon only). */
  tCoord(eta) {
    const x = Math.tan(eta / 2), K = this.K;
    return 2 * Math.log((K + x) / (K - x)) + 2 * K * (eta + (this.R0 / 4) * (eta + Math.sin(eta)));
  }

  /** dv/dτ for ingoing Eddington–Finkelstein v; finite straight through the horizon. */
  _dvdtau(r) { return 1 / (this.E + Math.sqrt(Math.max(0, this.E * this.E - 1 + 2 / r))); }

  _buildV() {
    // v(η) = v0 + ∫ (dv/dτ)(dτ/dη) dη, tabulated with Simpson's rule (smooth integrand).
    const N = 4096, h = Math.PI / N, g = (e) => this._dvdtau(Math.max(this.rOf(e), 1e-9)) * this.A * (1 + Math.cos(e));
    const v = new Float64Array(N + 1);
    v[0] = rStar(this.R0);
    for (let i = 0; i < N; i++) {
      const a = i * h, b = a + h;
      v[i + 1] = v[i] + (h / 6) * (g(a) + 4 * g((a + b) / 2) + g(b));
    }
    this._vTable = v; this._vH = h; this._vN = N;
  }

  vOf(eta) {
    const x = Math.min(Math.max(eta, 0), Math.PI) / this._vH, i = Math.min(Math.floor(x), this._vN - 1), t = x - i;
    return this._vTable[i] * (1 - t) + this._vTable[i + 1] * t;
  }

  /** Diagram time t̃ = v − r (ingoing EF time), smooth all the way to r = 0. */
  tTilde(eta) { return this.vOf(eta) - this.rOf(eta); }

  // ---- What the station sees ----

  /** Station proper time when light sent outward at η reaches the station (0 at release). */
  stationArrival(eta) {
    const t = this.tCoord(eta) + rStar(this.R0) - rStar(this.rOf(eta));
    return Math.sqrt(this.f0) * t;
  }

  /** Frequency ratio emitted/received for light from the probe at radius r reaching the station. */
  onePlusZ(r) {
    return Math.sqrt(this.f0) * (this.E + Math.sqrt(Math.max(0, 2 / r - 2 / this.R0))) / (1 - 2 / r);
  }

  /**
   * The probe as the station sees it at station proper time S.
   * Past the floating-point limit the redshift keeps growing by e every 4M of coordinate time.
   */
  seenAt(S) {
    if (S <= 0) return { r: this.R0, tau: 0, lnz: 0 };
    if (S <= this.SSafe) {
      const eta = bisect((e) => this.stationArrival(e), S, 0, this.etaSafe);
      const r = this.rOf(eta);
      return { r, tau: this.tauOf(eta), lnz: Math.log(this.onePlusZ(r)) };
    }
    return { r: this.rOf(this.etaSafe), tau: this.tauOf(this.etaSafe), lnz: this.lnzSafe + (S - this.SSafe) / Math.sqrt(this.f0) / 4 };
  }

  /** Station time a message sent at probe time τ arrives, or Infinity once inside the horizon. */
  messageArrival(tau) {
    if (tau >= this.tauH) return Infinity;
    return this.stationArrival(this.etaOfTau(tau));
  }

  // ---- Rescue: the station sends something inward at the speed of light ----

  /** Last station time an inward light pulse can still meet the probe outside the horizon. */
  get rescueDeadline() { return Math.sqrt(this.f0) * (this.vH - rStar(this.R0)); }

  /** Where an inward light pulse sent at station time S meets the probe. */
  rescueAt(S) {
    const v = S / Math.sqrt(this.f0) + rStar(this.R0);
    if (v >= this.vOf(Math.PI)) return { meets: false, inside: true, tau: this.tauEnd, r: 0 };
    const eta = bisect((e) => this.vOf(e), v, 0, Math.PI);
    const r = this.rOf(eta);
    return { meets: true, inside: r <= 2, tau: this.tauOf(eta), r, eta };
  }

  // ---- Spacetime diagram helpers (r, t̃) ----

  stationTTilde(S) { return S / Math.sqrt(this.f0) + 2 * Math.log(this.R0 / 2 - 1); }

  /** Outgoing light ray from (re, Te): t̃ at radius r. Inside the horizon it still falls (r < re). */
  outgoingT(re, Te, r) { return Te + (r - re) + 4 * Math.log(Math.abs(r - 2) / Math.abs(re - 2)); }

  /** Ingoing light ray through (r0, T0): t̃ at radius r. */
  ingoingT(r0, T0, r) { return T0 + (r0 - r); }
}

export { rStar };

/** How long the seen climb home takes, in M of station time (about 24 s at Erebus). */
export const CLIMB_M = 40;

/**
 * What the station sees of a faller rescued by the recall beam, once the light of its engine burn arrives
 * (station time S ≥ saved.seenAt). A simple, continuous picture rather than a solved trajectory: the seen
 * height eases from the burn back up to the station over CLIMB_M; the redshift eases from its value at the
 * burn to the static gravitational one for that height, √(f0 / (1 − 2/r)); and its clock runs at that rate.
 * saved = { seenAt } (station time the burn is seen); returns { r, tau, lnz } like Infall#seenAt.
 */
export function climbSeen(f, saved, S) {
  const b = f.seenAt(saved.seenAt), dt = Math.max(0, S - saved.seenAt);
  const k = Math.min(1, dt / CLIMB_M), e = k * k * (3 - 2 * k);
  const r = b.r + (f.R0 - b.r) * e;
  const lnStatic = (x) => 0.5 * Math.log(f.f0 / (1 - 2 / x));
  const lnz = lnStatic(r) + (b.lnz - lnStatic(b.r)) * (1 - e);
  return { r, tau: b.tau + dt / Math.exp(lnz), lnz };
}
