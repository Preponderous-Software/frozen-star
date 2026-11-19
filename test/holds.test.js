import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHolds } from '../src/game/holds.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('a tap between two slow frames still counts, for exactly its length', () => {
  let t = 0; const k = createHolds(() => t);
  t = 250; k.sample(); // frame at 250 ms
  k.press('KeyA', 300); k.release('KeyA', 340); // a 40 ms tap, all inside the next 250 ms frame
  t = 500; const s = k.sample();
  near(s.held('KeyA'), 0.04); near(s.frac('KeyA'), 40 / 250);
  t = 750; near(k.sample().held('KeyA'), 0); // and it's over
});

test('a half-second hold at 4 fps lasts half a second, not a whole number of frames', () => {
  let t = 0; const k = createHolds(() => t);
  k.press('ArrowLeft', 130); // mid-frame
  let total = 0;
  for (const f of [250, 500, 750]) {
    if (f === 750) k.release('ArrowLeft', 630);
    t = f; total += k.sample().held('ArrowLeft');
  }
  near(total, 0.5);
});

test('a key held across frames reads as fully down; repeats do not restart it', () => {
  let t = 0; const k = createHolds(() => t);
  k.press('KeyW', 0); t = 16; k.sample();
  k.press('KeyW', 20); // auto-repeat
  t = 32; const s = k.sample();
  near(s.frac('KeyW'), 1); near(s.sec, 0.016);
  assert.equal(k.isDown('KeyW'), true);
});

test('release without press, and clear(), are harmless', () => {
  let t = 0; const k = createHolds(() => t);
  k.release('KeyQ', 5);
  k.press('KeyD', 10); k.clear();
  t = 100; const s = k.sample();
  near(s.held('KeyD'), 0); near(s.held('KeyQ'), 0);
});

test('two taps in one frame add up, capped at the frame', () => {
  let t = 0; const k = createHolds(() => t);
  k.press('KeyS', 10); k.release('KeyS', 30); k.press('KeyS', 50); k.release('KeyS', 90);
  t = 100; const s = k.sample();
  near(s.held('KeyS'), 0.06); near(s.frac('KeyS'), 0.6);
});
