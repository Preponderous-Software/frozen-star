// Released saves keep loading. Each fixture in test/fixtures/saves/ is what localStorage held (key -> stored
// string) after the game's own save code wrote it (tools/save-fixtures.mjs). Every one is loaded here
// through the same read paths the game uses, and must come back with its progress.
//
// Contract (src/game/save.js): released fixtures never change. A new save format bumps SAVE_VERSION, adds
// a migration on load and a v<SAVE_VERSION>-<name>.json fixture, listed below by its file name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { SAVE_VERSION } from '../src/game/save.js';

const FIXTURES = [
  'v1-early.json',
  'v1-complete.json',
];
const DIR = new URL('./fixtures/saves/', import.meta.url);

function storageOf(name) {
  const data = JSON.parse(readFileSync(new URL(name, DIR), 'utf8'));
  const m = new Map(Object.entries(data));
  for (const [k, v] of m) assert.equal(typeof v, 'string', `${name}: ${k} must hold the stored string`);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, m };
}

// Load every persisted module afresh with the fixture as localStorage (discoveries keep a cache per module).
async function loadAll(name) {
  const storage = storageOf(name);
  const prev = { ls: globalThis.localStorage, doc: globalThis.document, ael: globalThis.addEventListener };
  globalThis.localStorage = storage;
  try {
    const q = `?fixture=${name}`;
    const [save, progress, discoveries, settings, audio] = await Promise.all([
      import('../src/game/save.js' + q), import('../src/progress.js' + q), import('../src/game/discoveries.js' + q),
      import('../src/game/settings.js' + q), import('../src/game/audio.js' + q),
    ]);
    const DIS = discoveries.DISCOVERIES.map((d) => d.id);
    // createAudio waits for the first click or key on the page; node has no page, so it gets listeners that do nothing
    const ignore = () => {};
    globalThis.document ??= { addEventListener: ignore, removeEventListener: ignore };
    globalThis.addEventListener ??= ignore;
    return {
      storage,
      story: save.readStorySave(storage),
      stars: Object.fromEntries(['two-clocks', 'last-words', 'rescue', 'tides', 'hover', 'bend-light', 'into-the-dark', 'evaporation'].map((id) => [id, progress.getStars(id)])),
      total: progress.totalStars(),
      found: DIS.filter((id) => discoveries.has(id)),
      settings: settings.loadSettings(),
      muted: audio.createAudio().muted,
    };
  } finally {
    globalThis.localStorage = prev.ls;
    if (prev.doc === undefined) delete globalThis.document;
    if (prev.ael === undefined) delete globalThis.addEventListener;
  }
}

test('every fixture is listed, and every listed fixture exists', () => {
  const onDisk = readdirSync(DIR).sort();
  assert.deepEqual(onDisk, [...FIXTURES].sort());
});

test('there is a fixture for every save format up to SAVE_VERSION', () => {
  assert.equal(SAVE_VERSION, 1);
  for (let v = 1; v <= SAVE_VERSION; v++) assert.ok(FIXTURES.some((f) => f.startsWith(`v${v}-`)), `no fixture for format ${v}`);
  for (const f of FIXTURES) assert.match(f, /^v\d+-[a-z0-9-]+\.json$/);
});

test('v1-early.json: Chapter I reached, nothing else', async () => {
  const r = await loadAll('v1-early.json');
  assert.deepEqual(r.story, { cp: 'bridge', flags: { stats: {}, mapUnlocked: false, seenBridge: true } });
  assert.equal(r.total, 0);
  assert.deepEqual(r.found, []);
  assert.equal(r.settings.fov, 70); // no settings stored: the defaults
  assert.equal(r.muted, false);
});

test('v1-complete.json: the survey finished, stars, discoveries, settings and mute all come back', async () => {
  const r = await loadAll('v1-complete.json');
  assert.equal(r.story.cp, 'epilogue');
  for (const f of ['finished', 'haloDone', 'helmUnlocked', 'mapUnlocked', 'orpheusReady', 'beaconDone', 'inesHome', 'seenBridge', 'rescueIntro']) assert.equal(r.story.flags[f], true, f);
  assert.equal(r.story.flags.rescueTries, 2);
  assert.deepEqual(r.story.flags.stats.halo, { prediction: 'right', lap: 11.1, mast: true, done: true });
  assert.equal(r.story.flags.stats.answer, 'fell in');
  assert.equal(r.story.flags.stats.margin, 3.4);
  assert.deepEqual(r.stars, { 'two-clocks': 3, 'last-words': 2, rescue: 3, tides: 1, hover: 3, 'bend-light': 2, 'into-the-dark': 0, evaporation: 0 });
  assert.equal(r.total, 14);
  assert.deepEqual(r.found.sort(), ['called-it', 'curious', 'cutting-it-fine', 'four-to-one', 'frozen-star', 'it-fell-in', 'lesson-hover', 'lesson-rescue', 'lesson-two-clocks', 'metronome', 'shutterbug'].sort());
  const s = r.settings;
  assert.deepEqual([s.sens, s.invertY, s.fov, s.volume, s.subs, s.subsBg, s.reduceFlash, s.runMode], [1.4, true, 80, 0.5, 'large', 0.9, true, 'toggle']);
  assert.deepEqual(s.keys, { forward: ['KeyZ', 'ArrowUp'], use: ['KeyF'] });
  assert.equal(r.muted, true);
});

test('loading a fixture writes nothing back', async () => {
  for (const name of FIXTURES) {
    const r = await loadAll(name);
    assert.deepEqual(Object.fromEntries(r.storage.m), JSON.parse(readFileSync(new URL(name, DIR), 'utf8')), name);
  }
});
