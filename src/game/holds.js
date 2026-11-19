// Key holds measured in real time, not in frames. With no DOM, so it runs under node too (test/holds.test.js).
//
// At a low frame rate a frame can last 100–250 ms. Reading "is the key down right now?" once a frame then
// loses a tap that starts and ends between two frames, and rounds every hold to whole frames: a half-second
// turn at 4 fps came out anywhere from 0.25 s to 0.75 s. Here each key's press and release times are kept,
// and sample() says what fraction of the time since the last sample each key was down, so a tap of 40 ms
// counts as 40 ms and a hold lasts exactly as long as the player held it.

export function createHolds(now = () => performance.now()) {
  const down = new Map(); // code -> when it went down (ms)
  const acc = new Map(); // code -> ms it was down, already released, since the last sample
  let last = now();

  return {
    press(code, t = now()) { if (!down.has(code)) down.set(code, t); },
    release(code, t = now()) {
      const t0 = down.get(code);
      if (t0 == null) return;
      down.delete(code);
      acc.set(code, (acc.get(code) || 0) + Math.max(0, t - Math.max(t0, last)));
    },
    isDown(code) { return down.has(code); },
    clear() { down.clear(); acc.clear(); },
    /** Close the window since the last sample. Returns { sec, frac(code), held(code) }:
     *  sec: the window's length in seconds; frac: the share of it the key was down (0..1); held: that in seconds. */
    sample(t = now()) {
      const win = Math.max(1e-3, t - last);
      const ms = new Map(acc);
      for (const [c, t0] of down) ms.set(c, (ms.get(c) || 0) + Math.max(0, t - Math.max(t0, last)));
      acc.clear(); last = t;
      const frac = (c) => Math.min(1, (ms.get(c) || 0) / win);
      return { sec: win / 1000, frac, held: (c) => Math.min(win, ms.get(c) || 0) / 1000 };
    },
  };
}
