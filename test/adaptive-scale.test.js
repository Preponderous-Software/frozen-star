import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveScale } from '../src/render/raytracer.js';

// A 60 Hz display with vsync: a frame takes the GPU work rounded up to a whole number of refreshes.
const vsync = (ms) => Math.ceil(ms / (1000 / 60) - 1e-9) * (1000 / 60);
// A machine where everything but the sky costs 10 ms and the sky 200 ms × scale² (UHD 630-like).
const gpuSky = (s) => 200 * s * s;
const run = (ctl, seconds, { timer = false, hitchEvery = 0 } = {}) => {
  let t = 0, i = 0, min = Infinity, max = 0;
  while (t < seconds * 1000) {
    let dt = vsync(10 + gpuSky(ctl.scale));
    if (hitchEvery && ++i % hitchEvery === 0) dt = 100;
    t += dt; ctl.update(dt, timer ? gpuSky(ctl.scale) : null);
    if (t > 20000) { min = Math.min(min, ctl.scale); max = Math.max(max, ctl.scale); }
  }
  return { min, max };
};

test('without a GPU timer, the sky scale climbs while the frame holds 30 fps (vsync no longer traps it)', () => {
  const ctl = new AdaptiveScale({ lo: 0.2, hi: 0.85, scale: 0.23 });
  run(ctl, 90);
  // 10 + 200 s² ≤ 33.3 ms holds up to s ≈ 0.341; it should settle just under that, not stay at 0.23
  assert.ok(ctl.scale > 0.28 && ctl.scale <= 0.345, `settled at ${ctl.scale}`);
});

test('a scale that costs the frame rate is backed off and not retried at once', () => {
  const ctl = new AdaptiveScale({ lo: 0.2, hi: 0.85, scale: 0.23 });
  const { min, max } = run(ctl, 120);
  assert.ok(max <= 0.36, `peaked at ${max}`);
  assert.ok(min > 0.25, `fell to ${min}`);
});

test('with a GPU timer, the scale settles where the sky takes its budget', () => {
  const ctl = new AdaptiveScale({ lo: 0.2, hi: 0.85, scale: 0.6, budgetMs: 12 });
  run(ctl, 60, { timer: true });
  const want = Math.sqrt(12 / 200); // ≈ 0.245
  assert.ok(Math.abs(ctl.scale - want) / want < 0.1, `settled at ${ctl.scale}, wanted ${want}`);
});

test('one-off hitches do not ratchet the scale down', () => {
  const ctl = new AdaptiveScale({ lo: 0.2, hi: 0.85, scale: 0.3 });
  const steady = new AdaptiveScale({ lo: 0.2, hi: 0.85, scale: 0.3 });
  run(ctl, 60, { hitchEvery: 97 }); run(steady, 60);
  assert.ok(ctl.scale >= steady.scale * 0.9, `${ctl.scale} vs ${steady.scale}`);
});

test('a machine that cannot hold 30 fps drops to the lowest scale', () => {
  const ctl = new AdaptiveScale({ lo: 0.2, hi: 0.85, scale: 0.6 });
  for (let i = 0; i < 400; i++) ctl.update(vsync(10 + 900 * ctl.scale * ctl.scale), null);
  assert.equal(ctl.scale, 0.2);
});

test('a lasting slowdown is not mistaken for hitches', () => {
  const ctl = new AdaptiveScale({ lo: 0.2, hi: 0.85, scale: 0.5 });
  for (let i = 0; i < 150; i++) ctl.update(33.3, null);
  const before = ctl.scale;
  for (let i = 0; i < 60; i++) ctl.update(120, null);
  assert.ok(ctl.scale < before * 0.7, `${before} → ${ctl.scale}`);
});
