import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Infall, rStar } from '../src/physics/infall.js';
import { tidalStretch, minMassForSafeCrossing, hoverAccel, hoverRate, radiusForDilation, tidalRadius } from '../src/physics/body.js';
import { trace, staticVelocity, derivs, vec } from '../src/physics/geodesic.js';
import { formatDuration } from '../src/physics/units.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);

test('fall from 10 Schwarzschild radii: known proper times', () => {
  const f = new Infall(20);
  close(f.tauEnd, Math.PI * Math.sqrt(1000), 1e-9, 'τ to singularity = π√(R0³/8)');
  close(f.rOfTau(f.tauH), 2, 1e-9, 'r(τ_H) is the horizon');
  assert.ok(f.tauEnd - f.tauH < 1.5 && f.tauEnd - f.tauH > 1.3, 'horizon → singularity takes ~1.4 M');
});

test('coordinate time matches dt/dτ = E/(1−2/r)', () => {
  const f = new Infall(20);
  for (const eta of [0.3, 1.2, 2.0, 2.4]) {
    const h = 1e-6, r = f.rOf(eta);
    const num = (f.tCoord(eta + h) - f.tCoord(eta - h)) / (f.tauOf(eta + h) - f.tauOf(eta - h));
    close(num, f.E / (1 - 2 / r), 1e-5 * num);
  }
});

test('Eddington–Finkelstein v agrees with t + r* outside, stays finite through the horizon', () => {
  const f = new Infall(20);
  for (const eta of [0.5, 1.5, 2.3, 2.49]) close(f.vOf(eta), f.tCoord(eta) + rStar(f.rOf(eta)), 1e-4);
  assert.ok(isFinite(f.vH) && isFinite(f.vOf(Math.PI)));
  assert.ok(f.vOf(Math.PI) > f.vH);
});

test('station sees no shift at release, then unbounded redshift and an arrival time that diverges', () => {
  const f = new Infall(20);
  close(f.onePlusZ(20), 1, 1e-12);
  assert.ok(f.onePlusZ(2.001) > 1000);
  const a = f.messageArrival(f.tauH - 1e-3), b = f.messageArrival(f.tauH - 1e-6);
  assert.ok(b - a > 20, 'each factor 1000 closer to the horizon adds ~4 ln 1000 √f0 of station time');
  assert.equal(f.messageArrival(f.tauH + 0.1), Infinity);
});

test('redshift = d(station time)/d(probe time)', () => {
  const f = new Infall(20);
  for (const eta of [0.4, 1.6, 2.4]) {
    const h = 1e-6;
    const num = (f.stationArrival(eta + h) - f.stationArrival(eta - h)) / (f.tauOf(eta + h) - f.tauOf(eta - h));
    close(num, f.onePlusZ(f.rOf(eta)), 1e-5 * num);
  }
});

test('seenAt inverts arrival and freezes the image at the horizon', () => {
  const f = new Infall(20);
  const S = f.stationArrival(1.7), s = f.seenAt(S);
  close(s.tau, f.tauOf(1.7), 1e-7);
  const late = f.seenAt(1e4);
  assert.ok(late.r > 2 && late.r < 2 + 1e-9 && late.tau < f.tauH && late.lnz > 100);
});

test('rescue: light sent at the deadline meets the probe at the horizon', () => {
  const f = new Infall(20);
  const d = f.rescueDeadline;
  close(f.rescueAt(d).r, 2, 1e-3);
  assert.ok(!f.rescueAt(d - 1).inside && f.rescueAt(d + 1).inside);
  // At the deadline the station still sees the probe well outside the horizon.
  assert.ok(f.seenAt(d).r > 4, `seen at r=${f.seenAt(d).r}`);
});

test('outgoing rays inside the horizon still move inward', () => {
  const f = new Infall(20);
  assert.ok(f.outgoingT(1.5, 0, 1.0) > 0, 'r falls while t̃ grows');
  close(f.outgoingT(3, 0, 3), 0, 1e-12);
});

test('tides: stellar holes shred, supermassive ones do not', () => {
  assert.ok(tidalStretch(2, 10) / 9.8 > 1e6);
  assert.ok(tidalStretch(2, 4.3e6) / 9.8 < 1e-3);
  const m = minMassForSafeCrossing(10 * 9.80665);
  close(tidalStretch(2, m) / 9.80665, 10, 1e-6);
  close(tidalStretch(tidalRadius(100, 50), 100), 50, 1e-6);
});

test('hovering: dilation and acceleration', () => {
  close(hoverRate(radiusForDilation(2)), 0.5, 1e-12);
  assert.ok(hoverAccel(2.0001, 1e9) > hoverAccel(3, 1e9));
});

test('ray tracer: weak-field deflection ≈ 4M/b', () => {
  const b = 200, x0 = [-4000, 0, b];
  const res = trace(x0, [1, 0, 0], { V: staticVelocity(x0), rEscape: 6000, maxSteps: 20000 });
  assert.equal(res.fate, 'sky');
  // The ray we see looking +x came from a source bent toward the hole: direction tilts by ~4/b.
  const angle = Math.atan2(-res.dir[2], res.dir[0]);
  close(angle, 4 / b, 0.15 * (4 / b), 'deflection');
});

test('ray tracer: the shadow edge sits at impact parameter 3√3 M', () => {
  const R = 400, x0 = [-R, 0, 0];
  const bc = 3 * Math.sqrt(3);
  const at = (b) => trace(x0, vec.norm([Math.sqrt(R * R - b * b), 0, b]), { V: staticVelocity(x0), maxSteps: 20000 }).fate;
  // Looking direction at the camera with angle asin(b/R) from centre corresponds to impact b (√f correction small at R=400).
  assert.equal(at(bc * 0.97), 'hole');
  assert.equal(at(bc * 1.03), 'sky');
});

test('ray tracer: camera inside the horizon still sees the sky above', () => {
  const x0 = [0, 0, 1.5];
  assert.equal(trace(x0, [0, 0, 1]).fate, 'sky');
});

test('derivs conserve H = 0 along a ray', () => {
  let x = [10, 0, 0], p = [0, 0, 1];
  const r = 10, b = Math.sqrt(2 / r), E = 1 - b * 0; // s = 0
  const H = (x, p) => { const r = vec.len(x), rh = vec.scale(x, 1 / r), b = Math.sqrt(2 / r), s = vec.dot(p, rh); return 0.5 * (-E * E - 2 * b * E * s + vec.dot(p, p) - b * b * s * s); };
  for (let i = 0; i < 2000; i++) { const [dx, dp] = derivs(x, p, E); x = vec.add(x, dx, 0.005); p = vec.add(p, dp, 0.005); }
  close(H(x, p), 0, 1e-3);
});

test('formatDuration', () => {
  assert.equal(formatDuration(90), '1.5 min');
  assert.equal(formatDuration(0.0049), '4.9 ms');
});
