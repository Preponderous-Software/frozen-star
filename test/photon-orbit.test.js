import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tangentPulse, pulseAt, lapDrift, PHOTON_LAP } from '../src/physics/photon-orbit.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);
const atPhi = (run, phi) => run.samples.reduce((best, s) => (Math.abs(s.phi - phi) < Math.abs(best.phi - phi) ? s : best));

test('a pulse fired sideways at the photon sphere circles it, taking 2π·3√3 M of far-away time per lap', () => {
  const run = tangentPulse(3, { maxTurns: 2, every: 1 });
  assert.equal(run.fate, 'orbit');
  close(run.b, 3 * Math.sqrt(3), 1e-12, 'b');
  for (const s of run.samples) close(s.r, 3, 1e-9, `r at φ = ${s.phi}`);
  close(atPhi(run, 2 * Math.PI).t, PHOTON_LAP.far, 0.01, 'lap time');
  // on the hovering clock the lap is the circumference over c: 2π·3 M
  close(PHOTON_LAP.far * Math.sqrt(1 - 2 / 3), PHOTON_LAP.hover, 1e-12, 'hover lap');
});

test('the photon sphere is unstable: an offset grows by cosh(2π) ≈ 268 each lap', () => {
  close(lapDrift(1, 1), 267.74, 0.01);
  for (const d of [1e-6, -1e-6, 1e-8]) {
    const run = tangentPulse(3 + d, { maxTurns: 1.2, every: 1 });
    close(atPhi(run, 2 * Math.PI).r - 3, lapDrift(d, 1), Math.abs(lapDrift(d, 1)) * 0.01, `δ = ${d}`);
  }
});

test('off the sphere the pulse leaves: outward above it, through the horizon below it', () => {
  assert.equal(tangentPulse(3.001).fate, 'escape');
  assert.equal(tangentPulse(2.999).fate, 'capture');
  assert.equal(tangentPulse(3 + 1e-8, { maxTurns: 6 }).fate, 'escape');
});

test('pulseAt follows the samples in time and returns null once the pulse has left', () => {
  const run = tangentPulse(3.05);
  const p = pulseAt(run, 5);
  assert.ok(p.r > 3 && p.phi > 0);
  assert.equal(pulseAt(run, 1e6), null);
  close(pulseAt(tangentPulse(3, { maxTurns: 1.5 }), PHOTON_LAP.far).phi, 2 * Math.PI, 1e-3, 'φ after one lap');
});
