// Writes the save fixtures in test/fixtures/saves/ with the game's own save-writing code, in node, into a
// fake localStorage, then prints or writes what localStorage holds afterwards (key -> stored string).
//
//   node tools/save-fixtures.mjs [game-root] [out-dir]
//
// game-root defaults to this checkout; pass a checkout of a released tag (git worktree add ../fs-x.y.z x.y.z)
// to write the fixtures for that release. Released fixtures never change (docs/RELEASING.md): this tool is
// for adding the fixtures of a new SAVE_VERSION, not for rewriting old ones.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || new URL('..', import.meta.url).pathname);
const outDir = process.argv[3] ? resolve(process.argv[3]) : null;
const mod = (p, tag) => import(pathToFileURL(resolve(root, p)).href + `?fixture=${tag}`); // a fresh module per fixture

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    dump: () => Object.fromEntries([...m.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

// Each fixture replays the writes a player's run makes up to that point, through the same functions the
// game calls (story.js/act-halo.js -> g.save -> writeStorySave, progress.award, discoveries.unlock/noteProp,
// settings.saveSettings, audio.setMuted). The flags are the ones story.js has set by that checkpoint.
const FIXTURES = {
  // Chapter I reached: the prologue is done, the bridge checkpoint is saved, nothing else touched.
  'v1-early': async ({ save }) => {
    save.writeStorySave('bridge', { stats: {}, mapUnlocked: false, seenBridge: true });
  },
  // The survey finished and the postscript (the halo) played, training lessons starred, discoveries found,
  // settings changed and the sound muted.
  'v1-complete': async ({ save, progress, discoveries, settings, audio, now }) => {
    const flags = {
      stats: {
        prediction: 'right', margin: 3.4, marginS: 3, seenAt: 1.62, metAt: 1.09, deepest: 1.05, lost: 41.7,
        frames: 9, rLast: 1.0004, answer: 'fell in',
        halo: { prediction: 'right', lap: 11.1, mast: true, done: true },
      },
      mapUnlocked: true, seenBridge: true, beaconDone: true, rescueTries: 2, rescueIntro: true, inesHome: true,
      helmUnlocked: true, orpheusReady: true, finished: true, haloDone: true,
    };
    save.writeStorySave('epilogue', flags);
    for (const [id, stars] of [['two-clocks', 3], ['last-words', 2], ['rescue', 3], ['tides', 1], ['hover', 3], ['bend-light', 2]]) progress.award(id, stars);
    for (const p of discoveries.PROPS) noteAt(now, () => discoveries.noteProp(p));
    for (const id of ['metronome', 'called-it', 'cutting-it-fine', 'four-to-one', 'it-fell-in', 'frozen-star', 'shutterbug']) noteAt(now, () => discoveries.unlock(id, { quiet: true }));
    noteAt(now, () => discoveries.syncTraining(progress.getStars));
    const s = settings.loadSettings();
    settings.saveSettings({ ...s, sens: 1.4, invertY: true, fov: 80, volume: 0.5, subs: 'large', subsBg: 0.9, reduceFlash: true, runMode: 'toggle', keys: { forward: ['KeyZ', 'ArrowUp'], use: ['KeyF'] } });
    // createAudio waits for the first click or key on the page; node has no page, so it gets listeners that do nothing
    const ignore = () => {};
    globalThis.document ??= { addEventListener: ignore, removeEventListener: ignore };
    globalThis.addEventListener ??= ignore;
    audio.createAudio().setMuted(true);
  },
};

// discoveries stamp each unlock with Date.now(); a fixed clock keeps the fixture reproducible
let tick = 0;
function noteAt(base, fn) { const real = Date.now; Date.now = () => base + 1000 * tick++; try { fn(); } finally { Date.now = real; } }

for (const [name, run] of Object.entries(FIXTURES)) {
  const storage = fakeStorage();
  globalThis.localStorage = storage;
  const [save, progress, discoveries, settings, audio] = await Promise.all(
    ['src/game/save.js', 'src/progress.js', 'src/game/discoveries.js', 'src/game/settings.js', 'src/game/audio.js'].map((p) => mod(p, name)));
  await run({ save, progress, discoveries, settings, audio, now: Date.UTC(2026, 10, 19, 15, 0, 0) });
  const json = JSON.stringify(storage.dump(), null, 2) + '\n';
  if (outDir) { mkdirSync(outDir, { recursive: true }); writeFileSync(resolve(outDir, `${name}.json`), json); console.log(`wrote ${name}.json`); }
  else process.stdout.write(`--- ${name}.json\n${json}`);
}
