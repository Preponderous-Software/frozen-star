// Renders every game sound offline (OfflineAudioContext in headless Chromium, which has no speakers),
// prints levels and pitches, and writes each scene as a WAV so it can be checked by ear.
// Usage: NODE_PATH=<dir with playwright> node tools/audio-check.cjs <base-url> <out-dir>
const { chromium } = require('playwright');
const fs = require('node:fs');

(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + 'package.json');
  const results = await page.evaluate(async (base) => {
    const { createAudio } = await import(base + 'src/game/audio.js');
    const { Infall } = await import(base + 'src/physics/infall.js');
    const { carrierState } = await import(base + 'src/game/apps.js');
    const { hoverRate } = await import(base + 'src/physics/body.js');
    const { SEC_PER_M } = await import(base + 'src/game/world.js');
    const SR = 48000;

    // ---- analysis helpers ----
    const mono = (b) => { const l = b.getChannelData(0), r = b.getChannelData(1), m = new Float32Array(l.length); for (let i = 0; i < l.length; i++) m[i] = (l[i] + r[i]) / 2; return m; };
    const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
    const rms = (m, t0, t1) => { const a = Math.floor(t0 * SR), b = Math.min(m.length, Math.floor(t1 * SR)); let s = 0; for (let i = a; i < b; i++) s += m[i] * m[i]; return db(Math.sqrt(s / Math.max(1, b - a))); };
    const peakOf = (b) => { let p = 0; for (let c = 0; c < b.numberOfChannels; c++) for (const v of b.getChannelData(c)) p = Math.max(p, Math.abs(v)); return db(p); };
    // fundamental by autocorrelation, searched between lo and hi Hz
    function pitch(m, t, lo = 20, hi = 2000, win = 8192) {
      const a = Math.floor(t * SR), x = m.subarray(a, a + win); let best = 0, bl = 0;
      const e0 = x.reduce((s, v) => s + v * v, 0); if (e0 < 1e-9) return 0;
      const corr = (lag) => { let s = 0; for (let i = 0; i + lag < x.length; i++) s += x[i] * x[i + lag]; return s / (x.length - lag); };
      const cs = []; for (let lag = Math.floor(SR / hi); lag <= Math.floor(SR / lo); lag++) cs.push([lag, corr(lag)]);
      const max = Math.max(...cs.map((c) => c[1]));
      for (let i = 1; i < cs.length - 1; i++) if (cs[i][1] > 0.85 * max && cs[i][1] >= cs[i - 1][1] && cs[i][1] >= cs[i + 1][1]) { bl = cs[i][0]; best = cs[i][1]; break; }
      return best > 0 ? SR / bl : 0;
    }
    // spectral centroid (Hz) of a stretch, by a plain DFT on decimated bins
    function centroid(m, t0, t1) {
      const N = 2048, a = Math.floor(t0 * SR), b = Math.floor(t1 * SR); let num = 0, den = 0;
      for (let s = a; s + N < b; s += N * 4) for (let k = 2; k < N / 2; k += 2) {
        let re = 0, im = 0; for (let n = 0; n < N; n++) { const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N), v = m[s + n] * w; re += v * Math.cos((2 * Math.PI * k * n) / N); im -= v * Math.sin((2 * Math.PI * k * n) / N); }
        const mag = Math.hypot(re, im), f = (k * SR) / N; num += f * mag; den += mag;
      }
      return den ? num / den : 0;
    }
    function activeSpan(m, floorDb = -50) { const th = 10 ** (floorDb / 20), W = 480; let first = -1, lastI = -1; for (let i = 0; i + W < m.length; i += W) { let p = 0; for (let j = i; j < i + W; j++) p = Math.max(p, Math.abs(m[j])); if (p > th) { if (first < 0) first = i; lastI = i; } } return first < 0 ? 0 : (lastI - first) / SR; }
    function wav(b) {
      const n = b.length, data = new DataView(new ArrayBuffer(44 + n * 4)); let o = 0;
      const str = (s) => { for (const c of s) data.setUint8(o++, c.charCodeAt(0)); };
      str('RIFF'); data.setUint32(o, 36 + n * 4, true); o += 4; str('WAVEfmt '); data.setUint32(o, 16, true); o += 4;
      data.setUint16(o, 1, true); o += 2; data.setUint16(o, 2, true); o += 2; data.setUint32(o, SR, true); o += 4; data.setUint32(o, SR * 4, true); o += 4; data.setUint16(o, 4, true); o += 2; data.setUint16(o, 16, true); o += 2;
      str('data'); data.setUint32(o, n * 4, true); o += 4;
      const l = b.getChannelData(0), r = b.getChannelData(1);
      for (let i = 0; i < n; i++) { data.setInt16(o, Math.max(-1, Math.min(1, l[i])) * 32767, true); data.setInt16(o + 2, Math.max(-1, Math.min(1, r[i])) * 32767, true); o += 4; }
      const u = new Uint8Array(data.buffer); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s);
    }

    // ---- rendering: events are [time, fn(audio)] ----
    async function render(sec, events, volume = 0.8, prep) {
      const oc = new OfflineAudioContext(2, sec * SR, SR), a = createAudio({ context: oc }); a.setVolume(volume);
      if (prep) await prep(a);
      const q = 128 / SR, seen = new Set();
      for (const [t, fn] of events) {
        if (t <= 0) { fn(a); continue; }
        const k = Math.round(t / q); if (seen.has(k)) { const prev = oc.__e?.get(k); if (prev) prev.push(fn); continue; }
        seen.add(k); (oc.__e ||= new Map()).set(k, [fn]);
        oc.suspend(k * q).then(() => { for (const f of oc.__e.get(k)) f(a); oc.resume(); });
      }
      return oc.startRendering();
    }
    const room = (id, shipR = 20, clocks = { ship: 0, relay: 0 }) => ({ inRoom: (r) => r === id, shipR, hideShip: false, clocks, mode: 'walk' });
    const frames = (sec, fn, hz = 30) => { const e = []; for (let i = 0; i < sec * hz; i++) e.push([i / hz, (a) => fn(a, i / hz)]); return e; };
    const R = {}, W = {};

    // ambience by room
    for (const id of ['bridge', 'corridor', 'quarters', 'lab']) {
      const g = room(id), b = await render(8, frames(8, (a) => a.scene(g), 10));
      const m = mono(b); R[`ambience.${id}`] = { rmsDb: +rms(m, 3, 8).toFixed(1), peakDb: +peakOf(b).toFixed(1) }; W[`ambience-${id}`] = b;
    }
    // descent: 20 s down to 1.03 rₛ, 15 s holding, 10 s back up, with both clocks running
    {
      const T = 45, clocks = { ship: 0, relay: 0 }, g = room('bridge', 20, clocks); let lastT = 0;
      const rAt = (t) => (t < 20 ? 20 * Math.pow(2.06 / 20, t / 20) : t < 35 ? 2.06 : 2.06 * Math.pow(20 / 2.06, Math.min(1, (t - 35) / 10)));
      const ticks = {};
      const b = await render(T, [...frames(T, (a, t) => { const dt = t - lastT; lastT = t; g.shipR = rAt(t); clocks.ship += dt; clocks.relay += dt / hoverRate(g.shipR); a.scene(g); }, 20), [25, (a) => { ticks.t25 = a.debug.ticks; }], [35, (a) => { const n = a.debug.ticks; ticks.hold = { ship: n.ship - ticks.t25.ship, relay: n.relay - ticks.t25.relay, seconds: 10 }; }], [44.9, (a) => { ticks.all = a.debug.ticks; }]]);
      const m = mono(b);
      R.descent = {
        rmsDb: [0, 10, 20, 30, 40].map((t) => [`${t}-${t + 5}s`, +rms(m, t, t + 5).toFixed(1)]),
        ticks: ticks.hold, ticksAll: ticks.all,
        relayRateAtHold: +(1 / hoverRate(2.06)).toFixed(2), peakDb: +peakOf(b).toFixed(1),
      };
      W.descent = b;
    }
    // footsteps: bridge deck, then quarters rug
    for (const id of ['bridge', 'quarters']) {
      const g = room(id), b = await render(3, [[0, (a) => a.scene(g)], ...[0.5, 1.0, 1.5, 2.0].map((t) => [t, (a) => a.step(0.8)])], 0.8);
      R[`steps.${id}`] = { peakDb: +peakOf(b).toFixed(1) }; W[`steps-${id}`] = b;
    }
    // UI and console
    { const b = await render(3, [[0.2, (a) => a.tick()], [0.8, (a) => a.open()], [1.8, (a) => a.close()], [2.4, (a) => a.door()]]); R.ui = { peakDb: +peakOf(b).toFixed(1) }; W['ui-tick-open-close-door'] = b; }
    // pings at increasing redshift
    {
      const zs = [1, 1.5, 3, 6], b = await render(10, zs.map((z, i) => [0.3 + i * 2.4, (a) => a.ping(z, z ** -4)]));
      const m = mono(b);
      R.pings = zs.map((z, i) => ({ onePlusZ: z, expectHz: +(1240 / z).toFixed(1), measuredHz: +pitch(m, 0.32 + i * 2.4, 100, 1500, 4096).toFixed(1), rmsDb: +rms(m, 0.3 + i * 2.4, 0.8 + i * 2.4).toFixed(1) }));
      W.pings = b;
    }
    // the beacon carrier, following a real infall as the bridge sees it
    {
      const f = new Infall(20), T = 110, run = { seen: () => f.seenAt((run.t || 0) / SEC_PER_M) };
      const b = await render(T, frames(T, (a, t) => { run.t = t; a.carrier('beacon', carrierState(run)); }, 15));
      const m = mono(b);
      R.beacon = [5, 45, 60, 68, 75, 82, 90, 100].map((t) => { run.t = t; const st = carrierState(run); return { t, expectHz: st ? +st.freq.toFixed(1) : 0, measuredHz: +pitch(m, t, 15, 900).toFixed(1), rmsDb: +rms(m, t, t + 0.5).toFixed(1) }; });
      R.beaconPeakDb = +peakOf(b).toFixed(1);
      W.beacon = b;
    }
    // Ines on the radio, as her light reddens
    {
      const zs = [1.0, 1.3, 1.87, 4.42], line = 'Doc, the stars behind me are going blue. Is that right?';
      for (const z of zs) {
        const b = await render(10, [[0.1, (a) => a.radio(z, line.length)]]), m = mono(b);
        R[`radio.${z}`] = { activeSec: +activeSpan(m).toFixed(2), centroidHz: Math.round(centroid(m, 0.4, 3)), rmsDb: +rms(m, 0.4, 3).toFixed(1), peakDb: +peakOf(b).toFixed(1) };
        W[`radio-z${z}`] = b;
      }
    }
    // Ines's recorded voice (Kokoro af_sky): the same clip in the room, on the intercom, and over the radio
    // at rising redshift, where it must last exactly 1 + z times as long (playbackRate 1/(1+z))
    {
      const man = await (await fetch(base + 'assets/voice/ines/manifest.json')).json();
      const line = 'Doc, the stars behind me are going blue. Is that right?';
      const clip = Object.values(man.lines).find((e) => e.text === line);
      const load = async (a) => { if (!(await a.voiceLoad(line))) throw new Error('clip did not load'); };
      for (const setting of ['room', 'intercom']) {
        const b = await render(6, [[0.1, (a) => a.voice('INES', line, setting)]], 0.8, load), m = mono(b);
        R[`voice.${setting}`] = { clipSec: clip.dur, activeSec: +activeSpan(m).toFixed(2), rmsDb: +rms(m, 0.2, 0.1 + clip.dur).toFixed(1), peakDb: +peakOf(b).toFixed(1) };
        W[`voice-${setting}`] = b;
      }
      let pad = null; // squelch and fade around the voice, measured at z = 1
      for (const z of [1.0, 1.3, 1.87, 4.42]) {
        let got = null;
        const sec = Math.ceil(clip.dur * z + 2);
        const b = await render(sec, [[0.1, (a) => { a.radio(z, line.length); got = a.voice('INES', line, 'radio'); }]], 0.8, load), m = mono(b);
        // the voice itself, without the squelch clicks and static: measured on a render with the clip alone
        R[`voice.radio.${z}`] = { expectSec: +(clip.dur * z).toFixed(2), reportedSec: got ? +(got.dur - 0.25 - 0.14).toFixed(2) : null, activeSec: +activeSpan(m, -40).toFixed(2), centroidHz: Math.round(centroid(m, 0.3, 0.3 + Math.min(3, clip.dur * z))), rmsDb: +rms(m, 0.3, 0.2 + clip.dur * z).toFixed(1), peakDb: +peakOf(b).toFixed(1) };
        const act = activeSpan(m, -40); if (pad == null) pad = act - clip.dur;
        R[`voice.radio.${z}`].measuredStretch = +((act - pad) / clip.dur).toFixed(3);
        W[`voice-radio-z${z}`] = b;
      }
      // a line with no clip still gets the procedural voice
      { const b = await render(6, [[0.1, (a) => { a.radio(1.2, 30); a.voice('INES', 'A line nobody recorded.', 'intercom'); }]], 0.8, load); R['voice.fallback'] = { activeSec: +activeSpan(mono(b)).toFixed(2) }; }
    }
    // WREN's recorded voice (Kokoro bm_george) over the ship's PA: full speed, never redshifted, and never
    // over Ines: asked to speak while she is on the radio, it waits until she has finished
    {
      const man = await (await fetch(base + 'assets/voice/wren/manifest.json')).json();
      const line = 'Notice the gaps between pings growing.', iline = 'Doc, the stars behind me are going blue. Is that right?';
      const clip = Object.values(man.lines).find((e) => e.text === line);
      const load = async (a) => { if (!(await a.voiceLoad(line, 'WREN')) || !(await a.voiceLoad(iline))) throw new Error('clip did not load'); };
      { // even when the caller names the radio, WREN stays the ship's PA: clean and at full speed
        let got = null;
        const b = await render(5, [[0.1, (a) => { got = a.voice('WREN', line, 'radio'); }]], 0.8, load), m = mono(b);
        R['voice.wren.pa'] = { clipSec: clip.dur, reportedSec: got ? +(got.dur - 0.25 - 0.05).toFixed(2) : null, activeSec: +activeSpan(m, -40).toFixed(2), centroidHz: Math.round(centroid(m, 0.2, 0.1 + Math.min(3, clip.dur))), rmsDb: +rms(m, 0.2, 0.1 + clip.dur).toFixed(1), peakDb: +peakOf(b).toFixed(1) };
        W['voice-wren-pa'] = b;
      }
      { // one at a time: Ines over the radio at 1 + z = 1.3, then WREN asked in the same instant
        let gi = null, gw = null; const z = 1.3;
        const b = await render(Math.ceil(5 * z + clip.dur + 2), [[0.1, (a) => { a.radio(z, iline.length); gi = a.voice('INES', iline, 'radio'); gw = a.voice('WREN', line); }]], 0.8, load);
        R['voice.queue'] = { inesEndsSec: gi && +(gi.dur - 0.25).toFixed(2), wrenStartsSec: gw && +(gw.dur - 0.25 - clip.dur).toFixed(2), wrenWaits: !!(gi && gw && gw.dur - 0.25 - clip.dur >= gi.dur - 0.25) };
        W['voice-queue'] = b;
      }
    }
    // the alarm
    { const b = await render(22, [[0.1, (a) => a.alarm(true)], [21, (a) => a.alarm(false)]]), m = mono(b); R.alarm = { rmsFirst10sDb: +rms(m, 0.1, 10).toFixed(1), rmsAfter15sDb: +rms(m, 16, 21).toFixed(1), peakDb: +peakOf(b).toFixed(1) }; W.alarm = b; }
    // Orpheus feed: static and frames
    { const b = await render(6, [...frames(6, (a, t) => a.static(t / 6), 10), ...[0.5, 1.5, 3, 5].map((t) => [t, (a) => a.frame()])]); R.orpheusStatic = { peakDb: +peakOf(b).toFixed(1) }; W['orpheus-static'] = b; }
    // dream
    { const b = await render(5, [[0.2, (a) => a.heartbeat()], [1.3, (a) => a.heartbeat()], [2.4, (a) => a.whoosh(2.5)]]); R.dream = { peakDb: +peakOf(b).toFixed(1) }; W.dream = b; }
    // worst case: everything at once at full volume must not clip
    {
      const f = new Infall(20), run = { seen: () => f.seenAt((run.t || 0) / SEC_PER_M) }, clocks = { ship: 0, relay: 0 }, g = room('bridge', 3, clocks);
      const b = await render(8, [[0.1, (a) => a.alarm(true)], [0.5, (a) => a.radio(1.2, 60)], [1, (a) => a.ping(1, 1)], [1.2, (a) => a.open()], [1.5, (a) => a.step(1.2)], [1.6, (a) => a.door()],
        ...frames(8, (a, t) => { run.t = t; clocks.ship += 1 / 30; clocks.relay += 1 / 30 / hoverRate(3); a.scene(g); a.carrier('beacon', carrierState(run)); a.static(0.6); })], 1);
      R.everythingAtFullVolume = { peakDb: +peakOf(b).toFixed(1) }; W['everything-at-once'] = b;
    }
    // muted and zero volume are silent
    { const b = await render(2, [[0, (a) => a.setVolume(0)], ...frames(2, (a) => a.scene(room('bridge')), 10), [0.5, (a) => a.ping(1, 1)]], 0); R.volumeZeroRmsAfterHalfSecondDb = rms(mono(b), 0.5, 2); }
    // calls with nonsense arguments never throw
    { let threw = false; try { const oc = new OfflineAudioContext(2, SR, SR), a = createAudio({ context: oc }); a.scene({}); a.carrier('x', { freq: NaN, vol: NaN }); a.radio(undefined); a.ping(0, 0); a.static(null); a.step(); a.carrier('x', null); a.alarm(false); a.dispose(); } catch { threw = true; } R.neverThrows = !threw; }
    const wavs = {}; for (const [k, b] of Object.entries(W)) wavs[k] = wav(b);
    return { R, wavs };
  }, base);
  for (const [k, b64] of Object.entries(results.wavs)) fs.writeFileSync(`${out}/${k}.wav`, Buffer.from(b64, 'base64'));
  for (const [k, v] of Object.entries(results.R)) console.log(k, JSON.stringify(v));
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
})();
