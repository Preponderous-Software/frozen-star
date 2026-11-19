// The story save: one localStorage record, 'frozen-star.fp.v1' = { cp, flags }. With no DOM and no engine,
// so it runs under node too (test/save.test.js).
//
// Breaking a player's save is the worst thing an update can do, so reading is forgiving: a record from any
// earlier build loads as it was, and a broken one (bad JSON, a wrong type, a checkpoint this build doesn't
// know) reads as "no save" or loses only the broken part. It is never thrown at the game.

export const SAVE_KEY = 'frozen-star.fp.v1';
/** The checkpoints, in story order (story.js's ORDER; test/save.test.js checks they agree). */
export const CHECKPOINTS = ['start', 'bridge', 'probe-done', 'rescue-done', 'helm-done', 'epilogue', 'halo'];

const plain = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** Raw record (string or parsed) → { cp, flags } or null. Unknown keys inside flags are kept as they are. */
export function normalizeSave(raw) {
  let s = raw;
  if (typeof s === 'string') { try { s = JSON.parse(s); } catch { return null; } }
  if (!plain(s)) return null;
  const cp = typeof s.cp === 'string' && CHECKPOINTS.includes(s.cp) ? s.cp : null;
  const flags = plain(s.flags) ? { ...s.flags } : {};
  if ('stats' in flags && !plain(flags.stats)) delete flags.stats; // the story writes into stats: it must be an object
  if (cp == null && !Object.keys(flags).length) return null;
  return { cp, flags };
}

const store = (storage) => storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);

export function readStorySave(storage) {
  try { return normalizeSave(store(storage)?.getItem(SAVE_KEY) ?? null); } catch { return null; } // storage off
}

/** Write the save; true when it was stored. Never throws (storage off, full, or flags that won't serialise). */
export function writeStorySave(cp, flags, storage) {
  try {
    store(storage).setItem(SAVE_KEY, JSON.stringify({ cp, flags }));
    return true;
  } catch { return false; }
}
