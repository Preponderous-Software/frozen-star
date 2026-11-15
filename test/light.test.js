import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bendLight, closestApproach, CRITICAL_B } from '../src/physics/light.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);

test('rays inside the critical impact parameter 3√3 M are captured, rays outside escape', () => {
  assert.equal(bendLight(CRITICAL_B * 0.999).fate, 'capture');
  assert.equal(bendLight(2).fate, 'capture');
  assert.equal(bendLight(CRITICAL_B * 1.001).fate, 'escape');
  assert.equal(bendLight(30).fate, 'escape');
});

test('weak field: deflection matches the series 4M/b + 15πM²/(4b²) + 128M³/(3b³)', () => {
  for (const b of [200, 500]) close(bendLight(b).deflection, 4 / b + (15 * Math.PI) / (4 * b * b) + 128 / (3 * b ** 3), 5e-7, `b = ${b}`);
});

test('strong field: deflection near the photon sphere matches Bozza (2002), −ln(b/b_c − 1) + ln[216(7 − 4√3)] − π', () => {
  const c = Math.log(216 * (7 - 4 * Math.sqrt(3))) - Math.PI;
  for (const eps of [1e-4, 1e-5, 1e-6]) close(bendLight(CRITICAL_B * (1 + eps)).deflection, -Math.log(eps) + c, 0.01, `ε = ${eps}`);
});

test('closest approach solves b = r/√(1 − 2/r) and matches the traced path', () => {
  for (const b of [6, 10, 25]) {
    const r = closestApproach(b);
    close(r / Math.sqrt(1 - 2 / r), b, 1e-9);
    close(bendLight(b, { step: 0.0005 }).rMin, r, 1e-3, `b = ${b}`);
  }
  assert.equal(closestApproach(5), null);
});
