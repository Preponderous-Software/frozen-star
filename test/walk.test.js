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
