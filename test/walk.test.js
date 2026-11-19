import { test } from 'node:test';
import assert from 'node:assert/strict';
import { step, resolve, stick, axes, deadzone } from '../src/game/walk.js';

const wall = [[-50, -0.05, 50, 0.05]]; // a wall along x at z = 0

test('yaw 0 walks toward −Z (the nose)', () => {
  const { fx, fz } = axes(0);
  assert.ok(Math.abs(fx) < 1e-12 && fz === -1);
});

test('walking eases in and stops without input', () => {
  let me = { x: 0, z: 5, yaw: 0 };
  me = step(me, { forward: 1 }, 0.05, []);
  assert.ok(me.speed > 0 && me.speed < 2.2, 'eases in');
  for (let i = 0; i < 40; i++) me = step(me, { forward: 1 }, 0.05, []);
  assert.ok(Math.abs(me.speed - 2.2) < 0.05, 'reaches walking speed');
  for (let i = 0; i < 40; i++) me = step(me, {}, 0.05, []);
  assert.equal(me.speed, 0);
});

test('walls stop you and you slide along them', () => {
  let me = { x: 0, z: 2, yaw: Math.PI / 4 }; // heading −Z and −X
  for (let i = 0; i < 100; i++) me = step(me, { forward: 1 }, 0.05, wall);
  assert.ok(me.z > 0.05 + 0.27, 'stays on its side of the wall');
  assert.ok(me.x < -3, 'slid along it');
});

test('an open door lets you through', () => {
  const door = { box: [-0.5, -0.05, 0.5, 0.05], off: true };
  let me = { x: 0, z: 2, yaw: 0 };
  for (let i = 0; i < 60; i++) me = step(me, { forward: 1 }, 0.05, [door]);
  assert.ok(me.z < -1);
});

test('resolve pushes a point out of a box', () => {
  const p = resolve(0, 0.01, wall);
  assert.ok(Math.abs(p.z) >= 0.05 + 0.28 - 1e-9);
});

test('stick and dead zones', () => {
  assert.deepEqual(stick(1, 1, 60), { forward: 0, right: 0, run: false });
  const s = stick(0, -60, 60);
  assert.ok(s.forward > 0.99 && s.run);
  assert.deepEqual(deadzone(0.1, 0.1), [0, 0]);
});

test('stride: one footfall per stride length, none standing still', async () => {
  const { stride, strideStart, STRIDE } = await import('../src/game/walk.js');
  let st = strideStart(), steps = 0;
  for (let i = 0; i < 300; i++) { const r = stride(st, 2.2 / 60, 2.2, false, 1 / 60); st = r.st; if (r.step) steps++; } // 11 m at a walk
  assert.ok(Math.abs(steps - 11 / STRIDE.walk) <= 1.5, `steps ${steps}`);
  let none = 0;
  for (let i = 0; i < 120; i++) { const r = stride(st, 0, 0, false, 1 / 60); st = r.st; if (r.step) none++; }
  assert.equal(none, 0);
});

test('stride: the first step comes quickly from rest, and stopping settles once', async () => {
  const { stride, strideStart } = await import('../src/game/walk.js');
  let st = strideStart(), first = null;
  for (let i = 0; i < 60 && first == null; i++) { const r = stride(st, 2.2 / 60, 2.2, false, 1 / 60); st = r.st; if (r.step) first = i; }
  assert.ok(first != null && first < 20, `first step at frame ${first}`);
  for (let i = 0; i < 10; i++) st = stride(st, 2.2 / 60, 2.2, false, 1 / 60).st; // part of a stride past it
  let settles = 0;
  for (let i = 0; i < 60; i++) { const r = stride(st, 0, 0, false, 1 / 60); st = r.st; if (r.settle) settles++; }
  assert.equal(settles, 1);
});

test('stride: the bob is small, eases away at rest, and is bigger at a run', async () => {
  const { stride, strideStart } = await import('../src/game/walk.js');
  const peak = (speed, run) => { let st = strideStart(), m = 0; for (let i = 0; i < 240; i++) { const r = stride(st, speed / 60, speed, run, 1 / 60); st = r.st; m = Math.max(m, Math.abs(r.y)); } return { m, st }; };
  const w = peak(2.2, false), r = peak(4, true);
  assert.ok(w.m > 0.005 && w.m < 0.03, `walk bob ${w.m}`);
  assert.ok(r.m > w.m);
  let st = w.st, y = 1;
  for (let i = 0; i < 120; i++) { const q = stride(st, 0, 0, false, 1 / 60); st = q.st; y = q.y; }
  assert.ok(Math.abs(y) < 0.001, `rest offset ${y}`);
});

test('a partial key press (a tap shorter than the frame) moves less than a full one, and never more', () => {
  const full = step({ x: 0, z: 5, yaw: 0 }, { forward: 1 }, 0.25, []);
  const tap = step({ x: 0, z: 5, yaw: 0 }, { forward: 0.16 }, 0.25, []);
  const moved = (m) => Math.hypot(m.x, m.z - 5);
  assert.ok(moved(tap) > 0, 'a tap still moves');
  assert.ok(moved(tap) < moved(full) * 0.3, `${moved(tap)} vs ${moved(full)}`);
});
