// Procedural sound with WebAudio: no audio files. Starts on the first click or key press.
//
// The beacon is the teaching sound: its carrier is played as a tone whose pitch is the emitted pitch
// divided by 1 + z, and whose loudness follows the received flux. As the probe nears the horizon you
// hear the tone slide down and fade out, while the pings come further and further apart.

const KEY = 'frozen-star.muted';

export function createAudio() {
  let ctx = null, master = null, muted = false, hum = null, alarm = null, statics = null, volume = 0.8, ducked = false;
  const carriers = new Map();
  try { muted = localStorage.getItem(KEY) === '1'; } catch { /* storage off */ }

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = level(); master.connect(ctx.destination);
    startHum();
    return true;
  }
  const unlock = () => ensure();
  addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  // The click on "Wake up" already counts as a user gesture in most browsers: start now if allowed.
  try { ensure(); } catch { /* wait for a gesture */ }

  function level() { return muted ? 0 : volume * (ducked ? 0.3 : 1); }
  const applyLevel = () => { if (master) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.1); };

  function noiseBuffer(sec = 2) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  let noise = null;
  const getNoise = () => (noise ||= noiseBuffer(2));

  function startHum() {
    // ship hum: two low tones and filtered air
    const g = ctx.createGain(); g.gain.value = 0.0; g.connect(master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.connect(g);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = 48; o2.type = 'sine'; o2.frequency.value = 72.3;
    const og = ctx.createGain(); og.gain.value = 0.35; o1.connect(og); o2.connect(og); og.connect(lp);
    const n = ctx.createBufferSource(); n.buffer = getNoise(); n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 500;
    const ng = ctx.createGain(); ng.gain.value = 0.25; n.connect(nf); nf.connect(ng); ng.connect(g);
    o1.start(); o2.start(); n.start();
    g.gain.setTargetAtTime(0.06, ctx.currentTime, 1.5);
    hum = { g, o1, o2, lp };
  }

  function env(node, t0, a, peak, d) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  function blip(freq, { type = 'sine', dur = 0.12, vol = 0.12, attack = 0.005 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(master);
    env(g, t, attack, vol, dur); o.start(t); o.stop(t + attack + dur + 0.05);
  }

  function noiseBurst({ freq = 1200, q = 0.8, dur = 0.08, vol = 0.1, sweepTo, type = 'bandpass' } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = getNoise();
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(master);
    env(g, t, 0.01, vol, dur); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }

  return {
    get ready() { return !!ctx; },
    get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* */ } applyLevel(); },
    setVolume(v) { volume = v; applyLevel(); },
    duck(on) { ducked = on; applyLevel(); },

    /** Hum level and pitch: louder on the bridge, higher when the field works harder. */
    setHum(level, pitch = 1) { if (!hum) return; hum.g.gain.setTargetAtTime(0.06 * level, ctx.currentTime, 0.4); hum.o1.frequency.setTargetAtTime(48 * pitch, ctx.currentTime, 0.6); hum.o2.frequency.setTargetAtTime(72.3 * pitch, ctx.currentTime, 0.6); },

    step(soft = 1) { noiseBurst({ freq: 220 + Math.random() * 80, q: 1.2, dur: 0.07, vol: 0.05 * soft, type: 'lowpass' }); },
    door() { noiseBurst({ freq: 400, sweepTo: 1600, q: 0.7, dur: 0.45, vol: 0.06 }); blip(140, { type: 'triangle', dur: 0.25, vol: 0.03 }); },
    click() { blip(1320, { dur: 0.05, vol: 0.05 }); },
    open() { blip(660, { dur: 0.08, vol: 0.05 }); setTimeout(() => blip(990, { dur: 0.1, vol: 0.05 }), 70); },
    close() { blip(990, { dur: 0.08, vol: 0.04 }); setTimeout(() => blip(660, { dur: 0.1, vol: 0.04 }), 70); },

    /** A received ping: pitch divided by 1 + z, loudness by flux. */
    ping(onePlusZ, flux = 1) {
      if (!ctx) return;
      const f = 1240 / onePlusZ, v = 0.16 * Math.min(1, Math.pow(flux, 0.35));
      if (f < 30 || v < 0.003) return;
      blip(f, { dur: 0.5, vol: v, attack: 0.004 }); blip(f * 2, { dur: 0.18, vol: v * 0.3 });
    },

    /** A continuous carrier tone for a falling transmitter. Call every frame with its state; null removes it. */
    carrier(id, st) {
      if (!ctx) return;
      let c = carriers.get(id);
      if (!st) { if (c) { c.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => c.o.stop(), 1500); carriers.delete(id); } return; }
      if (!c) {
        const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sine'; o.frequency.value = st.freq; g.gain.value = 0; lfo.frequency.value = 3.1; lg.gain.value = 3;
        lfo.connect(lg); lg.connect(o.frequency); o.connect(g); g.connect(master); o.start(); lfo.start();
        c = { o, g }; carriers.set(id, c);
      }
      c.o.frequency.setTargetAtTime(Math.max(20, st.freq), ctx.currentTime, 0.08);
      c.g.gain.setTargetAtTime(st.freq < 25 ? 0 : st.vol, ctx.currentTime, 0.15);
    },

    radio() { noiseBurst({ freq: 2200, q: 1.5, dur: 0.18, vol: 0.05 }); setTimeout(() => noiseBurst({ freq: 1800, q: 2, dur: 0.1, vol: 0.03 }), 160); },

    alarm(on) {
      if (!ctx) return;
      if (on && !alarm) {
        alarm = setInterval(() => { blip(740, { type: 'square', dur: 0.18, vol: 0.025 }); setTimeout(() => blip(554, { type: 'square', dur: 0.2, vol: 0.025 }), 260); }, 1400);
      } else if (!on && alarm) { clearInterval(alarm); alarm = null; }
    },

    /** Static hiss level 0..1 (the Orpheus feed losing its signal). */
    static(level) {
      if (!ctx) return;
      if (!statics) {
        const s = ctx.createBufferSource(); s.buffer = getNoise(); s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
        const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start();
        statics = { g };
      }
      statics.g.gain.setTargetAtTime(0.05 * level, ctx.currentTime, 0.2);
    },

    frame() { blip(2000, { dur: 0.03, vol: 0.02 }); },
    heartbeat() { blip(55, { type: 'sine', dur: 0.18, vol: 0.25 }); setTimeout(() => blip(50, { type: 'sine', dur: 0.22, vol: 0.18 }), 220); },
    whoosh(sec = 3) { noiseBurst({ freq: 200, sweepTo: 2400, q: 0.6, dur: sec, vol: 0.05 }); },

    dispose() {
      removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock);
      if (alarm) clearInterval(alarm);
      ctx?.close();
    },
  };
}
