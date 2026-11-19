// Procedural sound with WebAudio: no audio files. Nothing starts until the player has clicked, tapped or
// pressed a key (the "Wake up" click usually counts).
//
// The teaching sounds are honest. A falling transmitter's carrier is played at its emitted pitch divided
// by 1 + z, with loudness following the received flux; all of its overtones move with it, so the slide
// stays audible on small speakers even when the fundamental drops below what they can play. Ines's radio
// voice is the same: her words arrive stretched in time and lowered in pitch by 1 + z, then pass through
// the ship's receiver band, so near the edge they sink into a slow growl and the hiss takes over.
//
// Cost: the ambience is one fixed graph built once. Per-frame calls (scene, carrier, static) only move
// parameters, and only when a value has changed enough to hear. Nodes are created per sound event
// (a footstep, a ping, a line of radio), never per frame.

import { hoverAccel } from '../physics/body.js';
import { R_STATION } from './world.js';

const KEY = 'frozen-star.muted';
const R_FLOOR = 2.06; // the lowest altitude the helm allows (1.03 rₛ), in units of M

// how each room sounds: field hum, air handling, bridge electronics heard through the walls, footfall
const ROOMS = {
  bridge: { hum: 1, air: 0.55, airLP: 650, elec: 1, elecLP: 5200, ring: 1, thud: 1, chirps: true },
  corridor: { hum: 0.75, air: 0.85, airLP: 950, elec: 0.3, elecLP: 650, ring: 1.3, thud: 1 },
  quarters: { hum: 0.4, air: 0.3, airLP: 300, elec: 0.1, elecLP: 380, ring: 0.15, thud: 0.6 },
  lab: { hum: 0.65, air: 0.6, airLP: 800, elec: 0.45, elecLP: 1400, ring: 1.1, thud: 0.9 },
  // the capsule bay: a big, cold space next to the hull, thin air movement, bare plating that rings
  bay: { hum: 0.9, air: 0.4, airLP: 420, elec: 0.15, elecLP: 500, ring: 1.5, thud: 1.1 },
};
const AMB_LEVEL = 0.8, AMB_UNDER_VOICE = 0.5; // the ambience bus, and how far it dips while someone speaks
const ROOM_IDS = Object.keys(ROOMS);
const VOWELS = [[800, 1200, 2500], [400, 2200, 2900], [320, 2500, 3200], [470, 850, 2600], [350, 700, 2450], [600, 1700, 2600]];
const CHIRP_NOTES = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093]; // C6 pentatonic

/**
 * @param {{ context?: BaseAudioContext }} [opts] pass an OfflineAudioContext to render sounds for tests
 */
export function createAudio(opts = {}) {
  const offline = !!opts.context;
  let ctx = null, master = null, muted = false, volume = 0.8, ducked = false, disposed = false;
  let buses = null, amb = null, alarm = null, statics = null, lastUi = 0;
  const carriers = new Map(), last = new Map();
  let serial = 0;
  const S = { room: null, hidden: false, depth: 0, shipT: null, relayT: null, nextChirp: 0, nextCreak: 0, sceneAt: -1, ticks: { ship: 0, relay: 0 }, events: [], talk: [] };
  // a short log of the one-shot sounds, for the debug probe and tests (headless runs cannot listen)
  const note = (name, extra) => { S.events.push({ name, t: ctx ? +ctx.currentTime.toFixed(2) : 0, ...extra }); if (S.events.length > 60) S.events.shift(); };
  // spans of ctx time when someone is speaking (recorded or procedural); the ambience dips under them
  const talking = (t0, end) => { S.talk.push([t0, end]); if (S.talk.length > 8) S.talk.shift(); };
  const speaking = (now) => S.talk.some(([a, b]) => now > a - 0.15 && now < b + 0.25);
  try { muted = localStorage.getItem(KEY) === '1'; } catch { /* storage off */ }

  // ---------- context, mix and safety ----------
  const safe = (fn) => (...a) => { try { return fn(...a); } catch { return undefined; } };

  function ensure() {
    if (disposed) return false;
    if (ctx) { if (ctx.state === 'suspended' && !offline && !document.hidden) ctx.resume().catch(() => {}); return true; }
    if (offline) ctx = opts.context;
    else {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC({ latencyHint: 'playback' });
    }
    build();
    return true;
  }
  function gestureAllowed() { const ua = navigator.userActivation; return ua ? ua.hasBeenActive : false; }
  const unlock = safe(() => ensure());
  const onVisibility = safe(() => { if (!ctx || offline) return; (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {}); });

  // slider volume is perceptual: square it so 50% sounds like half, not like 90%
  function level() { return muted ? 0 : volume * volume * (ducked ? 0.3 : 1); }
  const applyLevel = () => { if (master) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.08); };

  /** Move a parameter only when the new value differs audibly from the last one asked for. */
  function glide(param, key, v, tc = 0.2, rel = 0.004) {
    const p = last.get(key);
    if (p != null && Math.abs(v - p) <= Math.max(rel * Math.abs(p), 1e-5)) return;
    last.set(key, v); param.setTargetAtTime(v, ctx.currentTime, tc);
  }

  function noiseBuffer(sec, brown) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
    let acc = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { acc = (acc + 0.02 * w) / 1.02; d[i] = acc * 3.5; } else d[i] = w;
    }
    return b;
  }
  function reverbBuffer(sec = 2.6) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) { const t = i / n; lp += (Math.random() * 2 - 1 - lp) * (0.5 - 0.42 * t); d[i] = lp * Math.pow(1 - t, 2.2) * 0.5; }
    }
    return b;
  }
  const gain = (v = 0, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const filter = (type, f, q = 0.707, to) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; if (to) n.connect(to); return n; };
  const osc = (type, f, to) => { const o = ctx.createOscillator(); if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type); o.frequency.value = f; if (to) o.connect(to); return o; };
  const loop = (buf, to) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; if (to) s.connect(to); return s; };
  const wave = (partials) => ctx.createPeriodicWave(new Float32Array(partials.length), new Float32Array(partials), { disableNormalization: false });
  const panTo = (pan, to) => { if (!pan || !ctx.createStereoPanner) return to; const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(to); return p; };

  function build() {
    master = gain(level());
    // gentle glue so stacked sounds never clip, and a floor that keeps inaudible rumble from eating headroom
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3; comp.attack.value = 0.012; comp.release.value = 0.3;
    const floorHp = filter('highpass', 24, 0.5, comp);
    master.connect(floorHp); comp.connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = reverbBuffer(); verb.connect(gain(0.55, master));
    buses = {
      noise: noiseBuffer(2), brown: noiseBuffer(3, true), verb,
      amb: gain(AMB_LEVEL, master), sfx: gain(1, master), ui: gain(1, master), sig: gain(1, master),
      warm: wave([0, 1, 0.32, 0.14, 0.06, 0.025]), // the carriers' timbre: soft overtones that move with the pitch
      organ: wave([0, 1, 0.5, 0.33, 0.2, 0.1, 0.05]),
    };
    buildAmbience();
  }

  // ---------- the ship ----------
  function buildAmbience() {
    const B = buses, t = ctx.currentTime;
    // station-keeping field: two low tones, louder and higher when the field works harder
    const humG = gain(0, B.amb), breathe = gain(1, humG), humLP = filter('lowpass', 190, 0.9, breathe), humMix = gain(0.4, humLP);
    const h1 = osc('sawtooth', 48, humMix), h2 = osc('sine', 72.3, humMix);
    const wob = osc('sine', 0.13), wobG = gain(0.15, breathe.gain); wob.connect(wobG); // a slow breath in the hum, ±15%
    // air handling: brown noise through a room-dependent low-pass
    const airG = gain(0, B.amb), airLP = filter('lowpass', 700, 0.5, airG), air = loop(B.brown, airLP);
    // bridge electronics: mains harmonics and a fan whir, muffled by the walls when you are elsewhere
    const elG = gain(0, B.amb), elLP = filter('lowpass', 5000, 0.5, elG);
    const eMix = gain(0.5, elLP), e1 = osc('sine', 120, eMix), e2 = osc('sine', 180.4, gain(0.4, eMix));
    const whirBP = filter('bandpass', 3100, 0.8, gain(0.18, elLP)), whir = loop(B.noise, whirBP);
    // the descent: a deep organ drone that sinks a full octave as the ship goes down, and hull stress
    const drG = gain(0, B.amb), drLP = filter('lowpass', 900, 0.6, drG);
    const d1 = osc(B.organ, 73.42, drLP), d2 = osc(B.organ, 73.42 * 1.003, drLP), d3 = osc('sine', 36.71, gain(0.8, drG));
    const grG = gain(0, B.amb), grBP = filter('bandpass', 110, 3, grG), groan = loop(B.brown, grBP);
    const grL = osc('sine', 0.07), grLG = gain(0, grG.gain); grL.connect(grLG);
    for (const n of [h1, h2, wob, air, e1, e2, whir, d1, d2, d3, groan, grL]) n.start(t);
    air.playbackRate.value = 0.9; whir.playbackRate.value = 1.1; groan.playbackRate.value = 0.6;
    amb = { humG, humLP, h1, h2, airG, airLP, elG, elLP, drG, drLP, d1, d2, d3, grG, grBP, grLG };
  }

  /** Called every frame with the game: room, altitude, the two clocks. Only parameters move. */
  function scene(g) {
    if (!ctx || !amb) return;
    const now = ctx.currentTime;
    const hidden = !!g.hideShip;
    const shipR = g.shipR || R_STATION;
    // clock ticks need frame precision; the rest is retargeted at most ten times a second
    clockTicks(g, hidden);
    if (now - S.sceneAt < 0.1) return;
    S.sceneAt = now;
    const ph = phaseOf(g.flags); // fetch the voices' clips for this act (and the next) once it starts
    if (ph !== V.phase) setPhase(ph);
    const room = ROOM_IDS.find((id) => g.inRoom?.(id)) || S.room || 'corridor';
    S.room = room; S.hidden = hidden;
    const R = ROOMS[room];
    const d = Math.min(1, Math.max(0, Math.log(R_STATION / shipR) / Math.log(R_STATION / R_FLOOR)));
    S.depth = d;
    const strain = Math.max(0, Math.log10(hoverAccel(shipR, 1.2e5) / hoverAccel(R_STATION, 1.2e5)));
    const pitch = 1 + 0.08 * strain;
    const k = hidden ? 0 : 1;
    glide(amb.humG.gain, 'hum', (hidden ? 0.004 : 0.05 * R.hum) * (1 + 0.35 * d), 0.5);
    glide(amb.h1.frequency, 'h1', 48 * pitch, 0.8); glide(amb.h2.frequency, 'h2', 72.3 * pitch, 0.8);
    glide(amb.humLP.frequency, 'humLP', 190 + 160 * d, 0.8);
    glide(amb.airG.gain, 'air', 0.05 * R.air * k, 0.6); glide(amb.airLP.frequency, 'airLP', R.airLP, 0.6);
    glide(amb.elG.gain, 'el', 0.022 * R.elec * k * (1 - 0.5 * d), 0.5); glide(amb.elLP.frequency, 'elLP', R.elecLP, 0.4);
    const f0 = 73.42 * Math.pow(2, -d);
    glide(amb.drG.gain, 'dr', 0.045 * Math.pow(d, 1.3) * k, 0.7);
    glide(amb.d1.frequency, 'd1', f0, 0.9); glide(amb.d2.frequency, 'd2', f0 * 1.003, 0.9); glide(amb.d3.frequency, 'd3', f0 / 2, 0.9);
    glide(amb.drLP.frequency, 'drLP', 900 - 650 * d, 0.9);
    glide(amb.grG.gain, 'gr', 0.025 * d * k, 0.8); glide(amb.grLG.gain, 'grL', 0.02 * d * k, 0.8); glide(amb.grBP.frequency, 'grBP', f0 * 1.5, 0.9);
    // the ship's sounds step back while someone speaks, so every line sits clearly on top
    const talk = speaking(now);
    glide(buses.amb.gain, 'ambDuck', talk ? AMB_LEVEL * AMB_UNDER_VOICE : AMB_LEVEL, talk ? 0.12 : 0.5, 0.01);
    // hull stress: the deeper the hold, the more often the frame creaks under the field (never at station)
    if (d > 0.12 && !hidden && !talk) {
      if (!S.nextCreak) S.nextCreak = now + 6 + Math.random() * 10;
      else if (now > S.nextCreak) { S.nextCreak = now + (14 + Math.random() * 26) / (0.35 + d); creak(d); }
    } else if (d <= 0.12) S.nextCreak = 0;
    // telemetry: an occasional soft chirp from the bridge consoles
    if (R.chirps && !hidden && !talk && g.mode !== 'cutscene') {
      if (!S.nextChirp) S.nextChirp = now + 4 + Math.random() * 6;
      else if (now > S.nextChirp) { S.nextChirp = now + 9 + Math.random() * 14; chirp(); }
    }
  }

  // Two clocks during the descent: the ship's own second (a low wooden tock, left) and the far relay's
  // second (a glassy tick, right). At station they agree; at the deepest hold the relay ticks twice per tock.
  function clockTicks(g, hidden) {
    const c = g.clocks; if (!c) return;
    const sT = Math.floor(c.ship), rT = Math.floor(c.relay);
    const on = !hidden && S.depth > 0.02 && g.mode !== 'cutscene';
    if (on && S.shipT != null) {
      const k = Math.min(1, S.depth * 6);
      if (sT !== S.shipT) S.ticks.ship++, tone({ f: 640, type: 'triangle', a: 0.002, d: 0.07, vol: 0.05 * k, bus: buses.amb, pan: -0.3, lp: 1800 });
      if (rT !== S.relayT) S.ticks.relay++, tone({ f: 2350, a: 0.001, d: 0.05, vol: 0.022 * k, bus: buses.amb, pan: 0.3, send: 0.2 });
    }
    S.shipT = sT; S.relayT = rT;
  }

  // a long, low metallic groan of the frame taking the load, then a couple of small thermal ticks
  function creak(d) {
    const t = ctx.currentTime, j = 0.85 + Math.random() * 0.3, pan = (Math.random() * 2 - 1) * 0.7, v = 0.008 + 0.014 * d;
    hiss({ f: 820 * j, to: 430 * j, q: 18, a: 0.25, d: 0.9 + 0.5 * d, vol: v, bus: buses.amb, pan, send: 0.5 });
    hiss({ f: 260 * j, to: 180 * j, q: 9, at: t + 0.1, a: 0.2, d: 0.8, vol: v * 0.8, bus: buses.amb, pan, send: 0.3 });
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) hiss({ f: 3200 + Math.random() * 1800, q: 6, at: t + 1.2 + i * (0.18 + Math.random() * 0.4), a: 0.001, d: 0.025, vol: 0.006 + 0.006 * d, bus: buses.amb, pan: -pan, send: 0.6 });
    note('creak', { d: +d.toFixed(2) });
  }

  function chirp() {
    const n = 2 + Math.floor(Math.random() * 2), t = ctx.currentTime;
    for (let i = 0; i < n; i++) tone({ f: CHIRP_NOTES[Math.floor(Math.random() * CHIRP_NOTES.length)], at: t + i * 0.11, a: 0.004, d: 0.12, vol: 0.008, bus: buses.amb, send: 0.5, pan: 0.4 });
  }

  // ---------- one-shot building blocks ----------
  function env(param, t0, a, peak, d) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    param.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone({ f, to: f2, type = 'sine', at, a = 0.005, d = 0.12, vol = 0.1, bus, pan = 0, send = 0, lp }) {
    if (!ctx) return;
    const t = at ?? ctx.currentTime, out = gain(0, panTo(pan, bus || buses.sfx));
    if (send) out.connect(gain(send, buses.verb));
    const o = osc(type, f, lp ? filter('lowpass', lp, 0.7, out) : out);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + a + d);
    env(out.gain, t, a, vol, d); o.start(t); o.stop(t + a + d + 0.05);
  }
  function hiss({ f = 1200, to: f2, q = 0.8, type = 'bandpass', at, a = 0.01, d = 0.08, vol = 0.1, bus, pan = 0, send = 0 }) {
    if (!ctx) return;
    const t = at ?? ctx.currentTime, s = ctx.createBufferSource(); s.buffer = buses.noise;
    const out = gain(0, panTo(pan, bus || buses.sfx)), fl = filter(type, f, q, out);
    if (send) out.connect(gain(send, buses.verb));
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    s.connect(fl); env(out.gain, t, a, vol, d); s.start(t, Math.random() * 1.5); s.stop(t + a + d + 0.1);
  }
  // a short UI sound, skipped if another one just played (a click that also opens a panel makes one sound)
  function ui(fn) { if (!ctx) return; const t = ctx.currentTime; if (t - lastUi < 0.045) return; lastUi = t; fn(t); }

  // ---------- radio voice ----------
  // A line from Ines, as it reaches the ship: her voice (a buzz shaped by moving formants into syllables)
  // stretched in time and lowered in pitch by 1 + z, then the receiver's own band and static, which do
  // not redshift. Squelch clicks open and close the transmission.
  //
  // If a recorded line claims the transmission (voice(), called by the game's say() in the same turn),
  // the recording goes through the same receiver instead of the buzz: see playRecorded.
  function radio(onePlusZ = 1, chars = 40) {
    if (!ctx) return;
    const req = { z: onePlusZ, chars };
    V.radioReq = req;
    Promise.resolve().then(safe(() => { if (V.radioReq === req) { V.radioReq = null; murmur(onePlusZ, chars); } }));
  }
  const zOf = (onePlusZ) => Math.min(40, Math.max(1, onePlusZ || 1));
  // the ship's receiver, which does not redshift: band-pass, a little grit, a static bed and squelch clicks
  function receiver(t0, end, s, lvl) {
    const redness = Math.min(1, Math.log(s) / 2.5);
    hiss({ f: 2400, q: 1.6, at: Math.max(ctx.currentTime, t0 - 0.14), d: 0.1, vol: 0.05, bus: buses.sig }); // squelch open
    const out = gain(0, buses.sig); out.connect(gain(0.25, buses.verb));
    const shaper = ctx.createWaveShaper(); const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    shaper.curve = curve; shaper.connect(filter('highpass', 180, 0.6, filter('lowpass', 3200, 0.7, out)));
    out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(lvl, t0 + 0.05); out.gain.setValueAtTime(lvl, end); out.gain.linearRampToValueAtTime(0, end + 0.1);
    // static bed under the voice, louder as the signal reddens
    const st = loop(buses.noise), stG = gain(0, buses.sig); st.connect(filter('bandpass', 1900, 0.6, stG));
    const sv = 0.008 + 0.02 * redness;
    stG.gain.setValueAtTime(0, t0); stG.gain.linearRampToValueAtTime(sv, t0 + 0.08); stG.gain.setValueAtTime(sv, end); stG.gain.linearRampToValueAtTime(0, end + 0.12);
    st.start(t0); st.stop(end + 0.3);
    hiss({ f: 1800, q: 2, at: end + 0.1, d: 0.08, vol: 0.035, bus: buses.sig }); // squelch close
    tone({ f: 1100, at: end + 0.12, d: 0.05, vol: 0.012, bus: buses.sig });
    return { input: shaper, out, stop: (t) => { out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.03); stG.gain.cancelScheduledValues(t); stG.gain.setTargetAtTime(0, t, 0.03); } };
  }
  function murmur(onePlusZ, chars) {
    const s = zOf(onePlusZ);
    const t0 = ctx.currentTime + 0.14;
    const dur = Math.min(8.5, Math.max(0.8, chars * 0.052 * s));
    // level: dimmer as the light that carries her weakens, but never so faint the stretch cannot be heard
    const lvl = 0.1 * Math.max(0.35, Math.pow(s, -0.5));
    // the length is only known once the syllables are laid out, so the receiver is built after them
    const voice = gain(0);
    // the voice: a glottal buzz and breath through three formants, everything divided by 1 + z
    const src = osc('sawtooth', 205 / s), breath = loop(buses.noise), bG = gain(0.06);
    breath.connect(filter('highpass', 2500 / s, 0.7, bG));
    const F = [[1, 6], [0.55, 9], [0.28, 11]].map(([lv, q]) => { const f = filter('bandpass', 500, q, gain(lv, voice)); src.connect(f); bG.connect(f); return f; });
    // syllables, words, a falling phrase
    const syl = 0.2 * s; let t = t0, i = 0;
    while (t < t0 + dur - syl * 0.5) {
      const v = VOWELS[Math.floor(Math.random() * VOWELS.length)], len = syl * (0.75 + Math.random() * 0.5);
      const prog = (t - t0) / dur, pf = (205 / s) * (1.06 - 0.16 * prog) * (0.93 + Math.random() * 0.14);
      src.frequency.setTargetAtTime(pf, t, 0.03 * s);
      F.forEach((f, j) => f.frequency.setTargetAtTime(v[j] / s, t, 0.025 * s));
      const peak = 0.9 * (0.7 + Math.random() * 0.3);
      voice.gain.setTargetAtTime(peak, t, 0.02 * s);
      voice.gain.setTargetAtTime(0.08, t + len * 0.7, 0.03 * s);
      i++; t += len;
      if (i % (2 + Math.floor(Math.random() * 3)) === 0) { voice.gain.setTargetAtTime(0, t, 0.02 * s); t += 0.09 * s; } // a word break
    }
    voice.gain.setTargetAtTime(0, t, 0.04 * s);
    const end = t + 0.3 * s;
    talking(t0, end); note('radio', { z: +s.toFixed(2) });
    voice.connect(receiver(t0, end, s, lvl).input);
    for (const n of [src, breath]) { n.start(t0); n.stop(end + 0.3); }
  }

  // ---------- the recorded voices ----------
  // Lines recorded with Kokoro-82M live in assets/voice/<speaker>/, listed in manifest.json by their text:
  // Ines (voice af_sky) and WREN, the ship (bm_george). Clips are fetched an act at a time (the act the
  // save is in, and the next), never all at once. A line with no clip yet, or one that has not finished
  // loading, keeps the old behaviour: the procedural radio voice for Ines, silence for WREN.
  //
  // Over the radio an Ines clip plays at playbackRate 1/(1+z): gravitational redshift stretches time and
  // lowers every frequency by the same factor, which is exactly what slowing a recording does. The
  // receiver after it (band-pass, grit, static, squelch) is the ship's own and is not redshifted. WREN is
  // the ship itself, so it is never redshifted: it speaks over the ship's PA, clean.
  const bank = (dir) => ({ dir: new URL(`../../assets/voice/${dir}/`, import.meta.url), manifest: null, loading: null, byText: new Map(), patterns: [], clips: new Map(), phaseLoaded: new Set() });
  const BANKS = { INES: bank('ines'), WREN: bank('wren') };
  // one voice at a time across both speakers: busyUntil is when the last scheduled line ends
  const V = { phase: null, radioReq: null, busyUntil: 0, played: [] };
  function loadManifest(B) {
    if (B.loading) return B.loading;
    B.loading = fetch(new URL('manifest.json', B.dir)).then((r) => (r.ok ? r.json() : null)).then((m) => {
      if (!m?.lines) return null;
      B.manifest = m;
      for (const [key, e] of Object.entries(m.lines)) {
        if (e.pattern) { try { B.patterns.push({ re: new RegExp(e.pattern, 'u'), key }); } catch { /* skip */ } } else B.byText.set(e.text, key);
      }
      if (V.phase) loadPhase(B, V.phase);
      return m;
    }).catch(() => null);
    return B.loading;
  }
  function decode(ab) { return new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p?.then) p.then(res, rej); }); }
  function loadClip(B, key) {
    if (!ctx || B.clips.has(key)) return B.clips.get(key)?.p;
    const c = { buf: null };
    c.p = fetch(new URL(`${key}.ogg`, B.dir)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)))).then(decode)
      .then((b) => { c.buf = b; return b; }, () => null);
    B.clips.set(key, c);
    return c.p;
  }
  function loadPhase(B, name) {
    const m = B.manifest; if (!m) return;
    const i = m.phases.indexOf(name);
    for (const ph of [name, m.phases[i + 1]]) {
      if (!ph || B.phaseLoaded.has(ph)) continue;
      B.phaseLoaded.add(ph);
      for (const [key, e] of Object.entries(m.lines)) if (e.phase === ph) loadClip(B, key);
    }
  }
  function setPhase(ph) {
    V.phase = ph;
    for (const B of Object.values(BANKS)) { if (B.manifest) loadPhase(B, ph); else loadManifest(B); }
  }
  // which act the game is in, from its flags: only the clips for this act and the next are fetched
  function phaseOf(f = {}) {
    return f.finished ? 'free' : f.orpheusReady ? 'orpheus' : f.inesHome ? 'helm' : f.beaconDone ? 'rescue' : 'opening';
  }
  const keyOf = (B, text) => B.byText.get(text) ?? B.patterns.find((p) => p.re.test(text))?.key;

  /** Play a clip from time t0 in one of four settings; returns {end, stop}. */
  function playRecorded(buf, t0, setting, onePlusZ) {
    const src = ctx.createBufferSource(); src.buffer = buf;
    let end, chain;
    if (setting === 'radio') {
      const s = zOf(onePlusZ);
      src.playbackRate.value = 1 / s;
      end = t0 + buf.duration * s;
      // as loud as the old radio voice at z = 1, dimming the same way with the redshift
      chain = receiver(t0, end, s, 0.1 * Math.max(0.35, Math.pow(s, -0.5)));
      src.connect(gain(1.5, chain.input));
    } else if (setting === 'intercom') {
      // the ship's intercom: a small speaker's band, a touch of presence, a short key click either side
      end = t0 + buf.duration;
      const out = gain(0.55, buses.sig); out.connect(gain(0.08, buses.verb));
      const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2200; pres.gain.value = 4; pres.Q.value = 0.9; pres.connect(out);
      src.connect(filter('highpass', 320, 0.7, filter('lowpass', 4200, 0.7, pres)));
      tone({ f: 1400, at: t0 - 0.06, d: 0.035, vol: 0.012, bus: buses.sig });
      tone({ f: 1050, at: end + 0.05, d: 0.035, vol: 0.01, bus: buses.sig });
      chain = { stop: (t) => { out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.03); } };
    } else if (setting === 'pa') {
      // WREN, the ship's own voice over its PA: full range, never a radio. A gentle shelf off the lows and
      // the very top (a good ceiling speaker, not a person beside you), a touch of presence, and a little
      // more of the ship's room than a voice in person
      end = t0 + buf.duration;
      const out = gain(0.6, buses.sfx); out.connect(gain(0.16, buses.verb));
      const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2600; pres.gain.value = 1.5; pres.Q.value = 0.8; pres.connect(out);
      const top = ctx.createBiquadFilter(); top.type = 'highshelf'; top.frequency.value = 7000; top.gain.value = -4; top.connect(pres);
      const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 220; low.gain.value = -3; low.connect(top);
      src.connect(filter('highpass', 110, 0.6, low));
      chain = { stop: (t) => { out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.03); } };
    } else {
      // in the room with you: dry, with a little of the ship's own reverb
      end = t0 + buf.duration;
      const out = gain(0.6, buses.sfx); out.connect(gain(0.12, buses.verb));
      src.connect(filter('highpass', 90, 0.6, out));
      chain = { stop: (t) => { out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.03); } };
    }
    src.start(t0); src.stop(end + 0.05);
    return { end, stop: safe(() => { const t = ctx.currentTime; if (t < end) { chain.stop(t); src.stop(t + 0.15); if (V.busyUntil === end) V.busyUntil = t; for (const sp of S.talk) if (sp[1] === end) sp[1] = t; } }) };
  }

  /**
   * Speak a line in a recorded voice (Ines or WREN) if there is a clip for it and it has loaded.
   * Ines's setting: 'radio' (from the capsule), 'intercom' (from the capsule bay) or 'room' (in person). Over
   * the radio, 1 + z comes from a radio(onePlusZ) call made in the same turn (it is 1 without one); the clip
   * takes that call's place, so the procedural buzz only plays for lines that have no clip. WREN is always
   * the ship's PA, whatever the subtitle's tag says.
   * Returns { dur, stop } (dur: seconds from now until the line has finished) or null.
   */
  function voice(who, text, setting = 'room') {
    const B = BANKS[who];
    if (!B || !ctx) return null;
    if (!B.manifest) { loadManifest(B); return null; }
    const key = keyOf(B, text);
    const clip = key && B.clips.get(key);
    if (!clip?.buf) { if (key) loadClip(B, key); return null; }
    let how = 'pa', req = null;
    if (who === 'INES') {
      req = V.radioReq;
      if (req) V.radioReq = null; // claimed: no buzz for this line
      how = req && setting === 'room' ? 'radio' : setting; // a radio() call means a transmission, wherever she is
    }
    // one voice at a time, Ines and WREN alike: a line that arrives while someone is talking waits its turn
    const now = ctx.currentTime, t0 = Math.max(now + (how === 'radio' ? 0.14 : 0.05), V.busyUntil + 0.15);
    const p = playRecorded(clip.buf, t0, how, req?.z);
    V.busyUntil = p.end; talking(t0, p.end);
    V.played.push({ who, key, how, z: req?.z ?? 1, at: +t0.toFixed(2), sec: +(p.end - t0).toFixed(2) }); if (V.played.length > 20) V.played.shift();
    return { dur: p.end - now + 0.25, stop: p.stop };
  }

  // ---------- the alarm ----------
  // A soft two-tone (triangle through a low-pass), one fixed graph. It eases to a lower level after a
  // while: it has done its job, and it should not wear the player down during a long wait.
  function setAlarm(on) {
    if (!ctx) return;
    if (on && !alarm) {
      const g = gain(0, buses.sfx); g.connect(gain(0.3, buses.verb));
      const lp = filter('lowpass', 1900, 0.8, g), o = osc('triangle', 740, lp), o2 = osc('sine', 370, gain(0.4, lp));
      o.start(); o2.start();
      const since = ctx.currentTime;
      const cycle = (t = ctx.currentTime + 0.05) => {
        const k = t - since < 14 ? 1 : 0.55, v = 0.05 * k;
        for (const [f, at, len] of [[740, 0, 0.22], [554.4, 0.28, 0.26]]) {
          o.frequency.setValueAtTime(f, t + at); o2.frequency.setValueAtTime(f / 2, t + at);
          g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(v, t + at + 0.03);
          g.gain.setValueAtTime(v, t + at + len - 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + at + len);
        }
      };
      if (offline) for (let i = 0; i < 20; i++) cycle(since + 0.05 + i * 1.4); // a test render cannot run timers
      else cycle();
      alarm = { g, o, o2, id: offline ? null : setInterval(safe(() => cycle()), 1400) };
    } else if (!on && alarm) {
      if (alarm.id) clearInterval(alarm.id);
      const t = ctx.currentTime;
      alarm.g.gain.cancelScheduledValues(t); alarm.g.gain.setTargetAtTime(0, t, 0.05);
      alarm.o.stop(t + 0.5); alarm.o2.stop(t + 0.5); alarm = null;
    }
  }

  // ---------- UI sounds from the panels, without hooks in their code ----------
  const onClick = safe((e) => {
    if (!ctx || !e.target?.closest) return;
    const b = e.target.closest('button, [role="button"], summary, input[type="checkbox"], input[type="radio"], select');
    // after the button's own handler: if it opened or closed a console, that chime is the only sound
    if (b && !b.disabled) setTimeout(api.tick, 0);
  });
  let lastSlide = 0;
  const onInput = safe((e) => {
    const el = e.target;
    if (!ctx || el?.type !== 'range') return;
    const t = ctx.currentTime; if (t - lastSlide < 0.05) return; lastSlide = t;
    const lo = +el.min || 0, hi = +el.max || 1, x = hi > lo ? (+el.value - lo) / (hi - lo) : 0.5;
    tone({ f: 500 * Math.pow(2, 2 * x), a: 0.002, d: 0.035, vol: 0.02, bus: buses.ui }); // pitch follows the slider
  });
  const onFocus = safe((e) => {
    const el = e.target;
    if (!ctx || !el?.matches?.(':focus-visible') || !el.matches('button, input, select, [tabindex]')) return;
    ui((t) => tone({ f: 1500, at: t, a: 0.002, d: 0.025, vol: 0.008, bus: buses.ui }));
  });
  if (!offline) { document.addEventListener('click', onClick, true); document.addEventListener('input', onInput, true); document.addEventListener('focusin', onFocus, true); }

  // ---------- public API ----------
  const api = {
    get ready() { return !!ctx; },
    get muted() { return muted; },
    /** For tests and the debug probe: the context and the current room/depth. */
    get debug() { return { ctx, state: ctx?.state, room: S.room, depth: S.depth, ambLevel: buses ? +buses.amb.gain.value.toFixed(3) : null, speaking: ctx ? speaking(ctx.currentTime) : false, events: [...S.events], carriers: [...carriers.keys()], alarm: !!alarm, ticks: { ...S.ticks }, voice: { phase: V.phase, loaded: Object.fromEntries(Object.entries(BANKS).map(([w, B]) => [w, [...B.clips.values()].filter((c) => c.buf).length])), played: [...V.played] } }; },
    setMuted(m) { muted = !!m; try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* */ } applyLevel(); },
    setVolume(v) { volume = Math.min(1, Math.max(0, +v || 0)); applyLevel(); },
    duck(on) { ducked = !!on; applyLevel(); },

    scene,
    /** Older entry point: hum level and pitch only. scene(g) supersedes it. */
    setHum(lv, pitch = 1) { if (!amb) return; glide(amb.humG.gain, 'hum', 0.05 * lv, 0.4); glide(amb.h1.frequency, 'h1', 48 * pitch, 0.6); glide(amb.h2.frequency, 'h2', 72.3 * pitch, 0.6); },

    /** A footstep on the deck: heel thud, sole scuff and a faint ring of the plating (none on the quarters' rug).
     * soft scales it (a slow step is quieter and duller than a run); a running step lands harder and brighter. */
    step(soft = 1) {
      if (!ctx) return;
      const R = ROOMS[S.room] || ROOMS.corridor, side = (S.side = -(S.side || 0.12)), j = 0.9 + Math.random() * 0.2, k = Math.min(1.3, Math.max(0.2, soft));
      tone({ f: 105 * j, to: 52, a: 0.003, d: 0.07 + 0.02 * k, vol: 0.09 * k * R.thud, pan: side, lp: 280 + 160 * k });
      hiss({ f: 900 * j, q: 0.9, a: 0.004, d: 0.05, vol: 0.022 * k * R.thud, pan: side });
      if (R.ring > 0.2) hiss({ f: 2600 * j, q: 14, a: 0.002, d: 0.16, vol: 0.016 * k * R.ring, pan: side, send: 0.15 });
      note('step', { k: +k.toFixed(2), room: S.room });
    },
    /** Coming to a stop: the trailing foot drawn in, a short sole scuff and a little weight settling. */
    settle() {
      if (!ctx) return;
      const R = ROOMS[S.room] || ROOMS.corridor, side = -(S.side || 0.12);
      hiss({ f: 700, to: 450, q: 0.8, a: 0.01, d: 0.09, vol: 0.012 * R.thud, pan: side });
      tone({ f: 90, to: 60, a: 0.004, d: 0.06, vol: 0.03 * R.thud, pan: side, lp: 260 });
      note('settle');
    },
    /** A pressure door: a hiss of air as it slides, a soft thump as it seats. */
    door() {
      if (!ctx) return; const t = ctx.currentTime;
      hiss({ f: 500, to: 1500, q: 0.7, a: 0.05, d: 0.4, vol: 0.045, send: 0.2 });
      tone({ f: 120, to: 70, type: 'triangle', at: t + 0.38, a: 0.004, d: 0.18, vol: 0.05, lp: 300 });
      note('door');
    },
    /** The same door sliding shut behind you: the air falls rather than rises, and a latch seats it. */
    doorClose() {
      if (!ctx) return; const t = ctx.currentTime;
      hiss({ f: 1300, to: 450, q: 0.7, a: 0.04, d: 0.36, vol: 0.03, send: 0.2 });
      tone({ f: 105, to: 62, type: 'triangle', at: t + 0.34, a: 0.004, d: 0.16, vol: 0.04, lp: 280 });
      tone({ f: 1900, at: t + 0.36, a: 0.001, d: 0.025, vol: 0.008, send: 0.2 }); // the latch
      note('doorClose');
    },
    /** A locked door: two low, polite beeps from its panel (no buzzer: it is not an error, just closed). */
    denied() {
      ui((t) => { tone({ f: 330, at: t, a: 0.004, d: 0.09, vol: 0.022, bus: buses.ui, lp: 1200 }); tone({ f: 262, at: t + 0.13, a: 0.004, d: 0.12, vol: 0.02, bus: buses.ui, lp: 1200 }); note('denied'); });
    },
    /** Something you can use comes under your gaze: the faintest glass tick, so the prompt is felt as well as read. */
    focus() { ui((t) => { tone({ f: 2200, at: t, a: 0.002, d: 0.04, vol: 0.007, bus: buses.ui, send: 0.2 }); note('focus'); }); },
    /** A soft tick for a button. */
    tick() { ui((t) => { tone({ f: 1750, at: t, a: 0.002, d: 0.03, vol: 0.025, bus: buses.ui }); tone({ f: 880, at: t, a: 0.002, d: 0.04, vol: 0.015, bus: buses.ui }); }); },
    click() { api.tick(); },
    /** A console wakes: a rising two-note glass chime over a little power-up swish. */
    open() {
      ui((t) => {
        note('open');
        tone({ f: 659.3, at: t, a: 0.006, d: 0.22, vol: 0.04, bus: buses.ui, send: 0.35 });
        tone({ f: 987.8, at: t + 0.075, a: 0.006, d: 0.3, vol: 0.035, bus: buses.ui, send: 0.35 });
        hiss({ f: 600, to: 3000, q: 0.8, at: t, a: 0.03, d: 0.18, vol: 0.012, bus: buses.ui });
      });
    },
    /** A console sleeps: the same chime, falling, a little quieter. */
    close() {
      ui((t) => {
        note('close');
        tone({ f: 987.8, at: t, a: 0.006, d: 0.16, vol: 0.03, bus: buses.ui, send: 0.3 });
        tone({ f: 659.3, at: t + 0.07, a: 0.006, d: 0.24, vol: 0.028, bus: buses.ui, send: 0.3 });
      });
    },

    /** A received ping from K-1: a small bell whose pitch is divided by 1 + z and loudness set by flux. */
    ping(onePlusZ, flux = 1) {
      if (!ctx) return;
      const f = 1240 / onePlusZ, v = 0.13 * Math.min(1, Math.pow(flux, 0.35));
      if (f < 25 || v < 0.002) return;
      tone({ f, a: 0.004, d: 0.9, vol: v, bus: buses.sig, send: 0.45 });
      tone({ f: f * 2, a: 0.003, d: 0.35, vol: v * 0.28, bus: buses.sig, send: 0.45 });
      tone({ f: f * 2.76, a: 0.002, d: 0.18, vol: v * 0.12, bus: buses.sig, send: 0.45 }); // the bell's inharmonic shimmer
    },

    /** A continuous carrier for a falling transmitter. Call every frame with its state; null removes it. */
    carrier(id, st) {
      if (!ctx) return;
      let c = carriers.get(id);
      if (!st) {
        if (c) { const t = ctx.currentTime; c.g.gain.cancelScheduledValues(t); c.g.gain.setTargetAtTime(0, t, 0.3); for (const n of c.nodes) n.stop(t + 2); carriers.delete(id); }
        return;
      }
      const f = Math.max(12, st.freq), lnz = Math.log(Math.max(1, (c?.f0 || st.freq) / f));
      if (!c) {
        // two voices of the same soft wave, a hair apart, with a slow vibrato that scales with the pitch
        const g = gain(0, buses.sig), lp = filter('lowpass', 4000, 0.5, g), wet = gain(0.15, buses.verb); g.connect(wet);
        const o = osc(buses.warm, f, lp), o2 = osc(buses.warm, f * 1.0025, gain(0.5, lp));
        const lfo = osc('sine', 4.4), lg = gain(f * 0.003); lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
        o.start(); o2.start(); lfo.start();
        c = { g, lp, o, o2, lg, wet, f0: st.freq, key: `car:${id}:${++serial}:`, nodes: [o, o2, lfo] }; carriers.set(id, c);
      }
      glide(c.o.frequency, `${c.key}f`, f, 0.08, 0.0015); glide(c.o2.frequency, `${c.key}f2`, f * 1.0025, 0.08, 0.0015);
      glide(c.lg.gain, `${c.key}v`, f * 0.003, 0.2, 0.02);
      glide(c.lp.frequency, `${c.key}lp`, Math.min(4000, Math.max(260, f * 7)), 0.2, 0.02);
      // as the light weakens the tone recedes: quieter, and more of it is the room's echo
      glide(c.g.gain, `${c.key}g`, st.freq < 18 ? 0 : st.vol * 1.6, 0.15, 0.02);
      glide(c.wet.gain, `${c.key}w`, 0.15 + 0.5 * Math.min(1, lnz / 3), 0.4, 0.05);
    },

    radio,
    voice,
    /** For tests: fetch and decode the clip for a line; resolves true once voice() can play it. */
    async voiceLoad(text, who = 'INES') { const B = BANKS[who]; if (!ctx || !B) return false; await loadManifest(B); const k = keyOf(B, text); return !!(k && await loadClip(B, k)); },
    alarm: setAlarm,

    /** Static hiss level 0..1 (the Orpheus feed losing its signal). */
    static(lv) {
      if (!ctx) return;
      if (!statics) {
        const g = gain(0, buses.sig), s = loop(buses.noise, filter('bandpass', 2300, 0.5, filter('lowpass', 5200, 0.7, g)));
        s.start(); statics = { g };
      }
      glide(statics.g.gain, 'static', 0.035 * Math.min(1, Math.max(0, lv || 0)), 0.2, 0.03);
    },

    /** An Orpheus frame arriving: a soft rising data chirp. */
    frame() { tone({ f: 1500, to: 2300, a: 0.003, d: 0.05, vol: 0.016, bus: buses.sig }); },
    /** The dream's heartbeat: two low, round thumps. */
    heartbeat() {
      if (!ctx) return; const t = ctx.currentTime;
      tone({ f: 62, to: 44, at: t, a: 0.008, d: 0.2, vol: 0.16, lp: 180 });
      tone({ f: 56, to: 40, at: t + 0.23, a: 0.008, d: 0.24, vol: 0.11, lp: 160 });
    },
    whoosh(sec = 3) { hiss({ f: 200, to: 2400, q: 0.6, a: sec * 0.4, d: sec * 0.6, vol: 0.04, send: 0.4 }); },

    dispose() {
      disposed = true;
      if (!offline) {
        removeEventListener('pointerdown', unlock, true); removeEventListener('keydown', unlock, true); removeEventListener('touchend', unlock, true);
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('click', onClick, true); document.removeEventListener('input', onInput, true); document.removeEventListener('focusin', onFocus, true);
      }
      if (alarm?.id) clearInterval(alarm.id);
      if (!offline) ctx?.close?.().catch(() => {});
    },
  };
  // start: with a test context at once; in the game only once the player has clicked, tapped or pressed a key
  if (!offline) {
    addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true); addEventListener('touchend', unlock, true);
    document.addEventListener('visibilitychange', onVisibility);
    // the click on "Wake up" is a user gesture in most browsers, so this usually starts right away
    try { if (gestureAllowed()) ensure(); } catch { /* wait for a gesture */ }
  } else ensure();
  // nothing in here may ever throw into the game loop
  for (const k of Object.keys(api)) {
    const d = Object.getOwnPropertyDescriptor(api, k);
    if (typeof d.value === 'function') api[k] = safe(d.value);
  }
  return api;
}
