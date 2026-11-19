import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeSave, readStorySave, writeStorySave, CHECKPOINTS, SAVE_KEY } from '../src/game/save.js';
import { clean, loadSettings, DEFAULTS } from '../src/game/settings.js';

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test('the checkpoint list matches story.js', () => {
  const src = readFileSync(new URL('../src/game/story.js', import.meta.url), 'utf8');
  const order = JSON.parse(/const ORDER = (\[[^\]]*\])/.exec(src)[1].replace(/'/g, '"'));
  assert.deepEqual(order, CHECKPOINTS);
});

test('saves from every earlier build load unchanged', () => {
  // the shapes written by game.js (g.save) and by the title menu's chapter select, 0.1.0 to 0.2.0
  for (const cp of CHECKPOINTS) {
    const old = { cp, flags: { beaconDone: true, finished: cp === 'epilogue', stats: { margin: 12.5, halo: { lap: 11.1 } }, someFutureFlag: 3 } };
    assert.deepEqual(normalizeSave(JSON.stringify(old)), old);
  }
  assert.deepEqual(normalizeSave('{"cp":"bridge","flags":{"finished":false,"stats":{}}}'), { cp: 'bridge', flags: { finished: false, stats: {} } });
});

test('a broken save reads as no save, never as an error', () => {
  for (const bad of [null, '', 'not json', '{', '5', '"bridge"', '[]', 'null', '{}', '{"cp":42}', '{"cp":"nowhere"}', '{"flags":[1,2]}']) {
    assert.equal(normalizeSave(bad), null, bad);
  }
});

test('only the broken part of a save is dropped', () => {
  assert.deepEqual(normalizeSave('{"cp":"probe-done","flags":"oops"}'), { cp: 'probe-done', flags: {} });
  assert.deepEqual(normalizeSave('{"cp":"probe-done","flags":{"stats":7,"beaconDone":true}}'), { cp: 'probe-done', flags: { beaconDone: true } });
  // unknown checkpoint but real progress: the flags survive, the story starts from the top
  assert.deepEqual(normalizeSave('{"cp":"chapter-9","flags":{"finished":true}}'), { cp: null, flags: { finished: true } });
});

test('read and write go through storage, and survive storage that throws', () => {
  const s = mem();
  assert.equal(writeStorySave('helm-done', { helmUnlocked: true }, s), true);
  assert.deepEqual(readStorySave(s), { cp: 'helm-done', flags: { helmUnlocked: true } });
  const broken = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(readStorySave(broken), null);
  assert.equal(writeStorySave('bridge', {}, broken), false);
  const cyc = {}; cyc.self = cyc;
  assert.equal(writeStorySave('bridge', cyc, mem()), false);
  assert.equal(readStorySave(mem({ [SAVE_KEY]: '{oops' })), null);
});

test('settings: null, empty and odd values fall back to the defaults', () => {
  const s = clean({ ...DEFAULTS, sens: null, fov: '', volume: true, subsBg: '0.4' });
  assert.equal(s.sens, 1); assert.equal(s.fov, 70); assert.equal(s.volume, 0.8); assert.equal(s.subsBg, 0.4);
});

test('settings: a broken record loads as the defaults', () => {
  const prev = globalThis.localStorage;
  try {
    for (const raw of ['{bad', '"text"', '[1,2]', '42', 'null']) {
      globalThis.localStorage = mem({ 'frozen-star.settings.v1': raw });
      assert.deepEqual(loadSettings(), clean(DEFAULTS), raw);
    }
  } finally { if (prev === undefined) delete globalThis.localStorage; else globalThis.localStorage = prev; }
});
