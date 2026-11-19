// The story of Frozen Star, as an async script. Each act ends at a checkpoint.
import * as THREE from 'three';
import { Infall } from '../physics/infall.js';
import { lookBasis, fallerVelocity } from '../render/raytracer.js';
import { hoverRate, hoverAccel, tidalStretch, maxTimeInside } from '../physics/body.js';
import { formatDuration, formatAccel, G_EARTH } from '../physics/units.js';
import { SEC_PER_M, R_STATION, shipPosition, HOLE } from './world.js';
import { EYE } from './walk.js';
import { controlsHintHtml } from './settings.js';
import {
  createRun, runMarker, carrierState, screenFrame, screenLines, drawRunOnScreen, drawMap, drawClocks,
  datapadApp, probeApp, commsApp, mapApp, helmApp, createFeed, drawFeed, feedApp, archiveApp, createRearCam, drawRear,
} from './apps.js';
import { CHAPTER_LIST } from './chapters-list.js';
import { haloAct, HALO } from './act-halo.js';

// 'halo' (the photon-sphere postscript) comes after the story's end: older saves never hold it.
const ORDER = ['start', 'bridge', 'probe-done', 'rescue-done', 'helm-done', 'epilogue', 'halo'];
const secs = (m) => m * SEC_PER_M;
const consolePos = (g, id) => g.ship.interactables.find((i) => i.id === id).pos.clone();

export async function runStory(g, cp) {
  const at = Math.max(0, ORDER.indexOf(cp));
  // starting partway (continue or chapter select): unlock what earlier acts would have
  if (at >= 2) {
    Object.assign(g.flags, { beaconDone: true, mapUnlocked: true });
    // the map plots the last fall: a save from later in the story still shows K-1's, already over
    const k1 = createRun(g, 'beacon', { ago: 400 });
    k1.signals = Array.from({ length: 9 }, (_, i) => ({ tau: (i + 1) * 10 }));
    g.lastRun = k1;
  }
  if (at >= 3) Object.assign(g.flags, { inesHome: true, rescueIntro: true });
  if (at >= 4) Object.assign(g.flags, { helmUnlocked: true });
  g.flags.stats = g.flags.stats || {};
  g.helmTarget = R_STATION;
  baseScreens(g);
  baseHandlers(g);
  reactions(g);
  if (at === 0) { await dream(g); await wake(g); await toBridge(g); }
  else spawnOnBridge(g);
  const chapter = (n, name, sub) => { g.hud.card(`${n} · ${name}`, sub, 3); };
  if (at <= 1) { chapter('I', 'Beacon K-1', 'Drop a probe. Watch it fall.'); await beaconAct(g); }
  if (at <= 2) { chapter('II', 'The rescue', 'Ines takes the capsule out.'); await rescueAct(g); }
  if (at <= 3) { chapter('III', 'The descent', 'Closer to the edge.'); await helmAct(g); }
  if (at <= 4) { chapter('IV', 'Orpheus', 'The last probe has a camera.'); await orpheusAct(g); }
  await epilogue(g, cp === 'halo');
}

// ---------- always-on things ----------
function baseScreens(g) {
  g.screenDraw.clocks = (ctx, w, h) => drawClocks(ctx, w, h, g);
  g.screenDraw.probe = (ctx, w, h) => { if (g.beacon || g.orpheus) drawRunOnScreen(ctx, w, h, g.orpheus || g.beacon, g.orpheus ? 'ORPHEUS · as seen from the ship' : 'BEACON K-1 · as seen from the ship'); else { screenFrame(ctx, w, h, 'PROBE', 'bay 1: beacon K-1 · bay 2: Orpheus'); screenLines(ctx, w, h, [g.flags.beaconDone ? 'K-1     spent' : 'K-1     ready', 'ORPHEUS ' + (g.flags.orpheusReady ? 'ready' : 'locked')]); } };
  g.screenDraw.comms = (ctx, w, h) => { if (g.capsule) drawRunOnScreen(ctx, w, h, g.capsule, 'CAPSULE · as seen from the ship'); else { screenFrame(ctx, w, h, 'COMMS', 'channel: Ines Okafor (capsule)'); screenLines(ctx, w, h, [g.flags.inesHome ? 'Capsule docked.' : g.bay?.state === 'out' ? 'Capsule out.' : 'Capsule in bay: pre-flight.', g.flags.inesHome ? 'Recall beam: standing by' : 'Recall beam: armed']); } };
  g.screenDraw.helm = (ctx, w, h) => {
    if (g.rear && g.shipR < 6) { drawRear(ctx, w, h, g); return; }
    screenFrame(ctx, w, h, 'HELM', 'station-keeping field'); screenLines(ctx, w, h, [`altitude  ${(g.shipR / 2).toFixed(3)} rs`, `relay     x${(1 / hoverRate(g.shipR)).toFixed(3)}`, g.flags.helmUnlocked ? 'descent:  authorised' : 'descent:  locked']); };
  g.screenDraw.map = (ctx, w, h) => { const r = g.lastRun; if (r && g.flags.mapUnlocked) drawMap(ctx, w, h, r); else { screenFrame(ctx, w, h, 'SPACETIME MAP', 'nothing plotted yet'); } };
  g.screenDraw.archive = (ctx, w, h) => { screenFrame(ctx, w, h, 'ARCHIVE', 'expedition library'); screenLines(ctx, w, h, CHAPTER_LIST.map((c, i) => `${i + 1}  ${c.title}`), 0.3); };
  g.screenDraw.feed = (ctx, w, h) => { if (g.feed) drawFeed(ctx, w, h, g.feed, g.feedState()); else { screenFrame(ctx, w, h, 'CAMERA FEED', 'no signal'); } };
}

function baseHandlers(g) {
  const pad = g.ship.interactables.find((i) => i.id === 'datapad');
  pad.focus = { pos: new THREE.Vector3(3.9, 1.5, 3.0), look: new THREE.Vector3(4.6, 0.8, 3.0) };
  g.on('datapad', (it) => g.openApp(it, datapadApp));
  for (const it of g.ship.interactables) if (it.lines) g.on(it.id, async () => { for (const [who, t] of it.lines) await g.say(who, t).catch(() => {}); }); // optional props: their lines live in ship.js
  g.on('porthole', async () => {
    await g.say('WREN', 'The black disk is Erebus\'s shadow. It is about two and a half times wider than the horizon itself.');
    await g.say('WREN', 'The bright ring around it is starlight from behind the hole, bent all the way around.');
  });
  g.on('map', (it) => g.openApp(it, (b) => mapApp(b, g, { run: () => (g.flags.mapUnlocked ? g.lastRun : null) })));
  g.on('archive', (it) => g.openApp(it, (b) => archiveApp(b, g, { chapters: CHAPTER_LIST })));
  g.on('helm', (it) => {
    if (!g.flags.helmUnlocked) {
      g.react?.('helm-early', ['WREN', 'Descent is locked until the survey plan calls for it, Doctor. Erebus will keep.'],
        ...(g.flags.beaconDone ? [] : [['INES', 'And not while I\'m prepping the capsule, please. I\'d like the ship where I left it.']]));
    }
    return g.openApp(it, (b) => (g.flags.helmUnlocked ? helmApp(b, g, { onTarget: (r) => { g.helmTarget = r; } }) : (b.append(h3('Helm'), p('Holding station at 10 rₛ. Descent is locked for now: later in the survey you will take the ship down toward the horizon from here.')), null)));
  });
  g.on('comms', (it) => g.openApp(it, (b) => commsApp(b, g, { run: () => g.capsule, onFire: () => g.fireRecall?.(), showMap: (g.flags.rescueTries || 0) > 0 })));
  g.on('feed', (it) => g.openApp(it, (b) => (g.feed ? feedApp(b, g, { feedState: g.feedState, feed: g.feed }) : (b.append(h3('Camera feed'), p('No signal. This screen shows what a camera probe sends home, and none is out yet.')), null))));
  g.on('probe', (it) => g.openApp(it, (b) => probeApp(b, g, {
    name: g.flags.beaconDone ? 'Orpheus' : 'Beacon K-1',
    run: () => (g.flags.beaconDone ? g.orpheus : g.beacon),
    canLaunch: () => (g.flags.beaconDone ? !!g.flags.orpheusReady && !g.orpheus : !g.beacon),
    onLaunch: () => (g.flags.beaconDone ? g.launchOrpheus?.() : g.launchBeacon?.()),
  })));
  // helm: ease the ship toward the target altitude
  g.ticks.add((dt) => {
    const d = g.helmTarget - g.shipR;
    if (Math.abs(d) > 1e-4) g.shipR += Math.sign(d) * Math.min(Math.abs(d), dt * Math.max(0.15, Math.abs(d) * 0.6));
  });
}

// Angular diameter (degrees) of Erebus's shadow seen from radius r (units of M). Hovering there, the
// edge sits at sin α = (3√3 M / r)·√(1 − 2M/r), past 90° below the photon sphere at 3M. A camera falling
// through r with energy E moves inward at v = √(1 − (1 − 2M/r)/E²) relative to the hoverer, and
// aberration pulls the edge forward: cos α' = (cos α + v) / (1 + v cos α).
export function shadowDeg(r, E) {
  let half = Math.asin(Math.min(1, (3 * Math.sqrt(3) / r) * Math.sqrt(1 - 2 / r)));
  if (r < 3) half = Math.PI - half;
  if (E != null) { const v = Math.sqrt(1 - (1 - 2 / r) / (E * E)), c = Math.cos(half); half = Math.acos((c + v) / (1 + v * c)); }
  return (360 * half) / Math.PI;
}
export const fallSpeed = (r, E) => Math.sqrt(1 - (1 - 2 / r) / (E * E)); // as a fraction of c, past a hovering observer

// ---------- small moments: the crew notices what the player does ----------
// Each fires once, and only while nobody is talking and nothing urgent is going on.
function reactions(g) {
  let talking = 0, quietAt = 0;
  const say0 = g.say;
  g.say = (who, text, opts) => {
    const pr = say0(who, text, opts);
    talking++; const done = () => { talking--; quietAt = g.time; }; pr.then(done, done);
    return pr;
  };
  const seen = new Set();
  g.quiet = (gap = 4) => talking === 0 && g.time - quietAt > gap && g.mode === 'walk' && !g.paused && !g.hud.choosing && !g.capsule && !g.holding;
  g.react = (key, ...lines) => {
    if (seen.has(key)) return false;
    seen.add(key);
    // let whoever is speaking finish first (for a few seconds at most), so nobody talks over the plot
    (async () => {
      await Promise.race([g.until(() => talking === 0), g.wait(6)]);
      for (const [who, text, opts] of lines) await g.say(who, text, opts);
    })().catch(() => {});
    return true;
  };
  const italic = { style: { fontStyle: 'italic' } };
  // home pulls ahead: the photo, a second time
  let photos = 0;
  g.on('photo', () => {
    if (photos++ === 0) return g.say('YOU', 'Home. Twenty-six thousand light-years behind us.');
    const k = 1 / hoverRate(g.shipR), extra = Math.round(60 * (k - 1));
    return g.say('YOU', k < 1.5 ? `(Every hour I spend here, an hour and ${extra} minutes pass at home. They're pulling ahead of me.)` : `(Down here, every hour of mine is ${k.toFixed(1)} hours at home.)`, italic);
  });
  let linger = 0;
  g.ticks.add((dt) => {
    // the expedition's two clocks, kept for the logbook
    const st = g.flags.stats;
    st.shipT = (st.shipT || 0) + dt; st.relayT = (st.relayT || 0) + dt / hoverRate(g.shipR);
    if (g.mode !== 'walk' || g.paused) { linger = 0; return; }
    const yaw = Math.atan2(Math.sin(g.me.yaw), Math.cos(g.me.yaw));
    const atWindow = g.inRoom('bridge') && g.me.z < -9.6 && Math.abs(yaw) < 0.6 && g.me.pitch > -0.5;
    linger = atWindow ? linger + dt : 0;
    if (linger > 8 && g.quiet() && Math.abs(g.shipR - R_STATION) < 0.1) {
      const d = shadowDeg(g.shipR);
      if (g.react('window', ['WREN', `From here Erebus's shadow is ${Math.round(d)} degrees across: about ${Math.round(d / 0.52)} full Moons side by side.`])) linger = 0;
      else if (g.flags.inesHome && g.react('window2',
        ['INES', 'Every time I look, I find another thin arc of light in that ring.'],
        ['WREN', 'You are not imagining them. Light that loops the hole once makes one ring; light that loops twice makes a thinner one just inside it. Every star in the sky is in there, over and over.'])) linger = 0;
    }
    if (g.inRoom('quarters') && g.flags.seenBridge && g.quiet(2)) {
      if (!g.flags.inesHome) g.react('quarters', ['WREN', 'Back already, Doctor? You were talking in your sleep last night. Something about falling. I did not log it.']);
      else g.react('quarters2', ['INES', 'Taking a minute, doc? Don\'t blame you. I can still feel the floor dropping away.']);
    }
    if (g.inRoom('lab') && g.quiet(2)) g.react('lab', ['WREN', 'The archive holds the expedition\'s training simulations. Same equations as outside the window, slowed down so you can take them apart.']);
  });
}

const h3 = (t) => Object.assign(document.createElement('h3'), { textContent: t });
const p = (t) => Object.assign(document.createElement('p'), { textContent: t });

function setWalk(g, x, z, yaw, pitch = 0) {
  g.dropApp?.(); // never leave a console panel up behind a cut
  g.me = { x, z, yaw, pitch, vx: 0, vz: 0 };
  g.mode = 'walk'; g.controls.setEnabled(true); g.hud.crosshair(true);
}

function spawnOnBridge(g) {
  g.flags.mapUnlocked = g.flags.mapUnlocked ?? false; g.flags.seenBridge = true;
  setWalk(g, 0, -7.0, 0);
  g.hud.fade(1, 0); g.hud.fade(0, 1.4);
}

// ---------- prologue: a dream of falling ----------
async function dream(g) {
  g.mode = 'cutscene'; g.controls.setEnabled(false); g.hud.crosshair(false);
  g.hideShip = true;
  const f = new Infall(R_STATION), E = f.E, dir = shipPosition().map((v) => v / R_STATION);
  let tau = 0;
  const speed = 3.6; // a dream is faster than life
  g.skyOverride = () => {
    const r = Math.max(0.3, f.rOfTau(tau)), pos = dir.map((v) => v * r);
    return { cam: pos, basis: lookBasis(pos, [0, -0.4, 0]), V: fallerVelocity(pos, E), fov: 1.35, time: g.time, disk: true };
  };
  let beat = 0;
  // replays: let the player skip the dream
  const skip = Object.assign(document.createElement('button'), { type: 'button', className: 'fp-skip', textContent: 'Skip the dream ›' });
  let skipped = false;
  // a quiet cue (faint stars, an ellipsis) until the sky's first frame is on screen: on a busy machine that
  // can take a while, and a black screen reads as a hang
  const cue = Object.assign(document.createElement('div'), { className: 'fp-dream-cue', innerHTML: '<span>…</span>' });
  cue.setAttribute('aria-hidden', 'true');
  // skipping (the button, Esc or Space) acts at once: the sky stops tracing, and the screen fades to black
  const doSkip = () => {
    if (skipped) return;
    skipped = true; tau = f.tauEnd; g.skyHold = true;
    skip.remove(); cue.remove(); g.hud.clearSubs(); g.hud.fade(1, 0.3);
  };
  skip.onclick = doSkip; g.skipCutscene = doSkip;
  g.el.append(cue, skip);
  const tick = (dt) => {
    // past the horizon the dream slows, so its last line can be read before the white-out
    tau = skipped ? f.tauEnd : Math.min(f.tauEnd, tau + dt * speed * (tau >= f.tauH ? 0.3 : 1));
    beat -= dt; if (beat <= 0 && tau < f.tauH) { g.audio.heartbeat(); beat = 1.1; }
  };
  g.ticks.add(tick);
  g.hud.fade(1, 0);
  const f0 = g.skyFrames || 0;
  await g.until(() => (g.skyFrames || 0) > f0 + 1 || skipped || !g.sky);
  cue.classList.add('out'); setTimeout(() => cue.remove(), 1500);
  if (!skipped) g.hud.fade(0, 3);
  await Promise.race([g.wait(2), g.until(() => skipped)]);
  if (!skipped) g.say('YOU', '(Falling. No wind, no sound.)', { style: { fontStyle: 'italic' } });
  // a line in the long first stretch, so the dream never seems to stall (the fall starts slowly)
  await g.until(() => f.rOfTau(tau) < 18.5 || skipped);
  if (!skipped) g.say('YOU', '(Below you, a perfect black disk in the stars. You are falling toward it.)', { style: { fontStyle: 'italic' } });
  await g.until(() => f.rOfTau(tau) < 14 || skipped);
  if (!skipped) g.say('YOU', '(It grows. The stars around its edge are bending, crowding into a ring.)', { style: { fontStyle: 'italic' } });
  await g.until(() => f.rOfTau(tau) < 7 || skipped);
  if (!skipped) g.say('YOU', '(The black is spreading. The light is all overhead now.)', { style: { fontStyle: 'italic' } });
  await g.until(() => tau >= f.tauH);
  if (!skipped) { g.audio.whoosh(2.5); g.say('YOU', '(Nothing happened.)', { style: { fontStyle: 'italic' }, dur: 2.2 }); }
  await g.until(() => f.rOfTau(tau) < 0.9);
  skip.remove(); g.skipCutscene = null;
  await g.hud.fade(1, skipped ? 0.3 : 0.6, skipped ? '#000' : '#fff');
  g.ticks.delete(tick);
  g.skyOverride = null; g.hideShip = false; g.skyHold = false;
  g.hud.clearSubs();
  await g.hud.fade(1, 0.8, '#000');
}

// ---------- act 1: wake up ----------
async function wake(g) {
  g.mode = 'cutscene';
  g.pose.pos.set(4.1, 0.85, 5.9); g.pose.yaw = Math.PI / 2 + 0.5; g.pose.pitch = 0.9;
  await g.wait(0.6);
  g.hud.fade(0, 2.5);
  await g.hud.card('Frozen Star', 'Research vessel Tern · 10 Schwarzschild radii above Erebus', 3.2);
  g.hud.where.WREN = 'ship\'s AI'; // a quiet tag on WREN's lines until the bridge, so nobody takes WREN for the player
  await g.say('WREN', 'Good morning, Doctor. WREN here, the Tern\'s ship intelligence. It is 06:40, ship time.');
  await g.tweenTo(new THREE.Vector3(3.8, 1.15, 5.3), -0.12, -0.04, 2.2);
  await g.tweenTo(new THREE.Vector3(3.7, EYE, 4.7), -0.1, 0.0, 1.4);
  setWalk(g, 3.7, 4.7, -0.1, 0.0);
  g.objective('Go to the bridge', { hint: 'The bridge is forward, Doctor. Out of your door, turn right, and follow the corridor.', when: () => !g.inRoom('bridge') && !g.inRoom('corridor') });
  g.waypoint = { pos: new THREE.Vector3(1, 1.2, 4.1), label: 'Door', near: 0.9 };
  g.say('WREN', 'We reached station above Erebus at 04:12. Ten Schwarzschild radii out, holding steady.');
  g.controlsHint(controlsHintHtml({ touch: g.controls.isTouch() }));
  await g.wait(4.5);
  await g.say('INES', 'Morning, doc! You slept through the arrival. I\'m down in the capsule bay. Get yourself up to the bridge, the view is ridiculous.');
  g.wait(8).then(() => g.hud.hint(null)).catch(() => {});
}

async function toBridge(g) {
  if (!g.inRoom('corridor') && !g.inRoom('bridge')) g.waypoint = { pos: new THREE.Vector3(1, 1.2, 4.1), label: 'Door', near: 0.9 };
  // hand over to the bridge marker as soon as the door is reached, so the marker never vanishes in the doorway
  await g.until(() => g.inRoom('corridor') || g.inRoom('bridge') || Math.hypot(g.me.x - 1, g.me.z - 4.1) < 1.0);
  g.waypoint = { pos: new THREE.Vector3(0, 1.3, -5), label: 'Bridge', near: 1.2 };
  await g.until(() => g.inRoom('bridge'));
  g.waypoint = null; g.hud.hint(null); g.flags.seenBridge = true; delete g.hud.where.WREN;
  g.save('bridge');
}

// ---------- act 2: the beacon ----------
async function beaconAct(g) {
  let launched = false;
  g.objective('Drop the beacon probe (probe console, left)', { hint: 'The probe console is the one on the left, by the window. Walk up to it and use it.' });
  g.waypoint = { pos: consolePos(g, 'probe'), label: 'Probe', near: 1.4 };
  g.launchBeacon = () => {
    if (g.beacon) return;
    const run = createRun(g, 'beacon'); run.signals = [];
    g.beacon = run; g.lastRun = run; launched = true;
    g.removeBeaconMarker = g.addMarker(runMarker(run, { name: 'K-1' }));
    run.log.push({ who: 'probe', text: 'Released at τ = 0' });
    g.waypoint = null;
  };
  // a quick player may launch while these play: the objective moves on at once, and a briefing nobody needs is dropped
  await Promise.race([g.say('INES', 'Isn\'t it something? That black circle is Erebus. Well, its shadow. I\'m out in the capsule bay doing pre-flight.'), g.until(() => launched)]);
  if (!launched) await Promise.race([g.say('WREN', 'First item on today\'s plan: drop beacon probe K-1 and log its signal.'), g.until(() => launched)]);
  await g.until(() => launched);
  g.objective('Watch the probe fall');
  const run = g.beacon, f = run.f;
  let sent = 0, got = 0, asked = false, answer = null;
  const A9 = f.messageArrival(90);
  const tick = () => {
    while (sent < 9 && run.tau() >= (sent + 1) * 10) { sent++; run.signals.push({ tau: sent * 10 }); run.log.push({ who: 'probe', text: `Ping ${sent} sent at τ = ${sent * 10} M` }); }
    g.audio.carrier('beacon', carrierState(run));
    while (got < 9 && run.S() >= f.messageArrival((got + 1) * 10)) { got++; { const re = f.rOfTau(got * 10), zz = f.onePlusZ(re); g.audio.ping(zz, zz ** -4); } run.log.push({ who: 'ship', text: `Ping ${got} received ${formatDuration(secs(f.messageArrival(got * 10)))} after release`, kind: 'got' }); }
  };
  g.ticks.add(tick);
  g.say('WREN', 'K-1 pings every ten M of its own time, about six seconds. Its beacon is on the speakers. Listen to the pitch.');
  await g.until(() => got >= 3);
  await g.say('INES', 'I can hear it from the bay. Steady as a metronome.');
  g.say('WREN', 'By its own clock, it is. Keep listening.');
  await g.until(() => got >= 6);
  g.say('WREN', 'Notice the gaps between pings growing.');
  await g.until(() => got >= 7);
  asked = true;
  const choice = g.hud.choice('Ping 7 arrived late. Log a prediction: when will ping 9 arrive?', [
    `About ${Math.round(secs(90))} s after release, the same as on the probe`,
    `About ${Math.round(secs(A9))} s after release`,
    'Never: it will be too close to the horizon',
  ], { timeout: Math.max(5, secs(A9 - run.S()) - 1) }).then((i) => { answer = i; });
  await g.until(() => got >= 9);
  g.flags.stats.prediction = answer === 1 ? 'right' : answer == null ? 'none' : 'wrong';
  g.say('WREN', answer === 1 ? 'Ping 9, right on your prediction.' : answer == null ? `Ping 9, at ${Math.round(secs(A9))} seconds.` : `Ping 9, at ${Math.round(secs(A9))} seconds. Each ping has to climb out of a deeper well than the last.`);
  await g.until(() => run.tau() >= f.tauEnd);
  await g.wait(1.5);
  await g.say('WREN', `By its own clock, K-1 crossed the horizon ${Math.round(secs(f.tauH))} seconds after release, and reached the centre less than a second later.`);
  await g.say('INES', 'Then what am I looking at? It\'s still there on the screen, right at the edge.');
  await g.say('WREN', 'Old light. Each moment of the fall reaches us later than the one before. The picture slows, reddens and fades, but the probe itself is gone.');
  await g.until(() => run.seen().lnz > 9);
  g.ticks.delete(tick); g.audio.carrier('beacon', null);
  await g.say('INES', '...and now it\'s gone from the screen too. And the tone slid right down into nothing.');
  g.flags.mapUnlocked = true; g.flags.beaconDone = true;
  await g.say('WREN', 'I have drawn the whole fall on the spacetime map, on the port wall.');
  g.removeBeaconMarker?.();
  g.objective(null);
  g.hud.hint('Optional: the spacetime map is on the port wall.');
  g.save('probe-done');
  await g.wait(10);
  g.hud.hint(null);
}

// ---------- act 3: the rescue ----------
const INES_LINES = [
  [2, 'Lost main power. Everything\'s dead except the radio and the backup engine. I\'m drifting in.'],
  [9, 'Don\'t fire yet! The spectrometer\'s on battery. This is the best data anyone will ever get.'],
  [20, 'You should see the ring from here. It\'s getting bigger.'],
  [33, 'Halfway to the edge of the shadow, I think. The data\'s beautiful.'],
  [46, 'Doc, the stars behind me are going blue. Is that right?'],
  [58, 'Still okay. Still waiting. Don\'t fire yet.'],
  [68, 'Everything overhead is so bright I can barely read the instruments.'],
  [77, 'The black fills most of the window now.'],
  [84, 'Okay. Maybe now, doc?'],
  [90, 'Doc? Now would be good.'],
  [94, 'Fire. Fire now.'],
  [96.6, 'I can\'t tell if you\'ve fired.'],
  [97.6, 'It doesn\'t look like anything. There\'s no edge.'],
  [98.4, '...it\'s so quiet in here.'], // sent from inside: never arrives
];

// Her radio lines redden, stretch and dim with the redshift of the light that carried them.
function inesStyle(f, tau) {
  const z = f.onePlusZ(f.rOfTau(tau)), k = Math.log(z), t = Math.min(1, k / 2.5);
  const mix = (a, b) => Math.round(a + (b - a) * t);
  return { color: `rgb(${mix(255, 255)},${mix(200, 90)},${mix(130, 70)})`, letterSpacing: `${Math.min(0.6, k * 0.07).toFixed(2)}em`, opacity: Math.max(0.4, 1 - k * 0.07) };
}

async function rescueAct(g) {
  g.objective(null);
  g.flags.rescueTries = g.flags.rescueTries || 0;
  if (!g.flags.rescueIntro) {
    await g.say('INES', 'My turn. I\'m taking the capsule out to sample the disk light. Back in twenty minutes.');
    // a short build-up, and the launch waits (a few seconds at most) until the player looks out to port
    g.objective('Watch Ines launch: the port side of the bridge window');
    const hold = g.bay?.hold, eye = new THREE.Vector3();
    const facing = () => { if (!hold || !g.inRoom('bridge') || g.mode !== 'walk') return false; const a = g.lookAngles(eye.set(g.me.x, g.eye, g.me.z), hold); return Math.abs(Math.atan2(Math.sin(a.yaw - g.me.yaw), Math.cos(a.yaw - g.me.yaw))) < 0.6; };
    await g.say('INES', 'Bay doors opening. Watch the port side, doc.');
    await Promise.race([g.until(facing), g.wait(6)]);
    g.bay?.launch(); // [capsule bay] the capsule leaves its cradle and runs forward past the port windows
    await g.wait(8); // out of the bay and forward, into the left of the bridge window
    g.objective(null);
    await g.say('WREN', 'Capsule away. She is holding position beside us.');
    await g.wait(4);
    g.flags.rescueIntro = true;
  }
  for (;;) {
    const saved = await rescueAttempt(g);
    if (saved) break;
    g.flags.rescueTries++;
    await g.hud.fade(1, 2);
    g.hud.clearSubs();
    await g.hud.card('That isn\'t how it went.', 'Not yet. Try again.', 3);
    g.capsule = null; g.alarm(false);
    setWalk(g, 0, -9.6, 0);
    await g.hud.fade(0, 1.5);
    g.say('WREN', 'The comms console now shows the spacetime map. The red dashed line is the last moment the beam can still reach her.');
    await g.wait(3);
  }
  g.flags.inesHome = true;
  g.save('rescue-done');
}

function alarmFn(g) {
  const L = g.ship.lights.bridge, base = L.color.clone();
  let on = false;
  const tick = () => { if (on) { const k = g.settings?.reduceFlash ? 0.5 : 0.5 + 0.5 * Math.sin(g.time * 5); L.color.setRGB(1, 0.25 + 0.2 * k, 0.2 + 0.15 * k); } };
  g.ticks.add(tick);
  return (v) => { on = v; g.audio.alarm(v); if (!v) L.color.copy(base); };
}

async function rescueAttempt(g) {
  g.alarm = g.alarm || alarmFn(g);
  g.alarm(true);
  const run = createRun(g, 'capsule'); run.signals = [];
  g.capsule = run; g.lastRun = run;
  const removeMarker = g.addMarker(runMarker(run, { nm0: 560, size: 0.01, name: 'Capsule · Ines' }));
  g.waypoint = { pos: consolePos(g, 'comms'), label: 'Comms', near: 1.4 };
  const f = run.f, D = f.rescueDeadline;
  g.say('WREN', 'Doctor, Ines\'s capsule has lost main power. It is falling.');
  g.objective('Save Ines: fire the recall beam from the comms console. Wait as long as you dare.', { hint: 'The recall beam is on the comms console, to the right of the helm.', after: 12 });
  // her messages, delivered when their light arrives
  const queue = INES_LINES.map(([tau, text]) => ({ tau, text, at: f.messageArrival(tau), done: false }));
  for (const q of queue) run.signals.push({ tau: q.tau });
  let result = null, lastLine = 0;
  g.fireRecall = () => {
    if (run.fired != null) return;
    run.fired = run.S(); g.audio.click(); g.waypoint = null;
    const seen = run.seen();
    run.log.push({ text: `[You fired the recall beam. Your screen showed her at ${(seen.r / 2).toFixed(2)} rₛ.]`, style: { color: '#7fd6a8' } });
  };
  const tick = () => {
    const S = run.S();
    for (const q of queue) if (!q.done && S >= q.at) {
      q.done = true;
      if (result?.saved && q.tau > result.tau) continue; // she escaped: these were never sent
      const style = inesStyle(f, q.tau), z = f.onePlusZ(f.rOfTau(q.tau));
      const tag = z >= 1.1 ? `stretched ×${z < 10 ? z.toFixed(1) : Math.round(z)}` : null;
      lastLine = S; run.log.push({ text: q.text, style, tag }); g.audio.radio(z, q.text.length); g.say('INES', q.text, { style, tag });
    }
    if (run.fired != null && !result) {
      const hit = f.rescueAt(run.fired);
      const T0 = f.stationTTilde(run.fired), Tnow = f.stationTTilde(S);
      if (Tnow - T0 >= f.R0 - (hit.meets ? hit.r : 0)) result = { saved: !hit.inside, r: hit.r, tau: hit.tau };
    }
  };
  g.ticks.add(tick);
  g.say('WREN', 'The recall beam travels at light speed. It must reach her before she crosses the horizon. And Doctor: whatever you see of her left her a while ago.')
    .then(() => run.fired == null && g.say('WREN', `I can compute the deadline: the beam must leave within ${Math.round(secs(D))} seconds of her mayday. The clock is on the comms console. Her picture will not tell you.`)).catch(() => {});
  // past the deadline with no beam fired, once her last message has arrived, there is nothing more to wait for
  const allIn = () => queue.every((q) => q.done || !isFinite(q.at));
  await g.until(() => result || run.S() > 175 || (run.fired == null && run.S() > D && allIn() && run.S() - lastLine > 8));
  let saved = !!result?.saved;
  if (saved) {
    run.hidden = true; removeMarker();
    run.saved = { tau: result.tau, r: result.r, seenAt: f.messageArrival(result.tau) };
    g.alarm(false); g.objective(null);
    g.flags.stats.margin = secs(D - run.fired); g.flags.stats.marginS = Math.round(secs(D)) - Math.round(secs(run.fired)); // the rounded margin adds up with the rounded deadline g.flags.stats.seenAt = f.seenAt(run.fired).r / 2; g.flags.stats.metAt = result.r / 2;
    // her reply can only reach us with the light of the burn, after everything she sent before it
    g.objective('Wait for Ines\'s reply: its light is still on the way (comms console)');
    await g.say('WREN', 'Beam delivered, in time. But her picture will keep falling for a while, and her older messages are still on their way. That is old light: she is already climbing. Her reply will come after them.');
    await g.until(() => run.S() >= run.saved.seenAt);
    const lit = 'Engine\'s lit! I felt that. I\'m climbing. I\'m coming home!';
    run.log.push({ text: lit }); g.audio.radio(f.onePlusZ(f.rOfTau(run.saved.tau)), lit.length);
    await g.say('INES', lit);
    await g.say('WREN', `You fired ${g.flags.stats.marginS} seconds before the last possible moment. At that moment your screen showed her ${(f.seenAt(run.fired).r / 2).toFixed(1)} rₛ out, looking almost normal.`);
    g.ticks.delete(tick);
    await g.hud.fade(1, 1.5);
    g.hud.clearSubs();
    g.capsule = null;
    g.flags.inesHome = true; // the bay screens show her docked from here on
    await g.hud.card('Twenty minutes later', null, 2.4);
    await g.hud.fade(0, 1.5);
    // the debrief runs alongside the next objective (the helm act waits for it before talking), so there is
    // never a long stretch with nothing to do
    g.objective(null);
    g.dockTalk = (async () => {
      await g.say('INES', 'Docked. Hands still shaking.');
      await g.say('INES', 'You know what scares me? On your screen I looked fine the whole time. If you\'d waited until I looked like I was in trouble...');
      await g.say('WREN', 'It would have been far too late. By the deadline, her picture was still only a third of the way down.');
    })().catch(() => {});
  } else {
    await g.say('WREN', !result ? 'You did not fire. She crossed the horizon long ago.'
      : result.r > 0.01 ? `The beam reached the capsule at ${(result.r / 2).toFixed(2)} rₛ. Inside the horizon. Her engine cannot help her there.`
        : 'The beam never caught her. By her own clock she had already crossed the horizon and reached the centre.');
    await g.until(() => queue.every((q) => q.done || !isFinite(q.at)) || run.S() > 200);
    await g.wait(3);
    g.ticks.delete(tick); removeMarker();
    g.objective(null);
  }
  return saved;
}

// ---------- act 4: the helm ----------
async function helmAct(g) {
  g.flags.helmUnlocked = true;
  g.rear = g.rear || createRearCam();
  let rearT = 0;
  const rearTick = (dt) => { rearT += dt; if (g.shipR < 6 && rearT > 0.25) { rearT = 0; g.rear.render(g.shipR, g.time); } };
  g.ticks.add(rearTick);
  // the objective comes first, so there is never a stretch with nothing to do; the talk runs alongside
  g.objective('Take the Tern down until the relay clock runs twice as fast (helm)', { hint: 'The helm is the low desk in the middle. Lower the altitude until the relay clock reads two times.' });
  g.waypoint = { pos: consolePos(g, 'helm'), label: 'Helm', near: 1.4 };
  (async () => {
    if (g.dockTalk) { await g.dockTalk; g.dockTalk = null; await g.wait(1); }
    await g.say('INES', 'I want to see that again. Without dying this time.');
    await g.say('WREN', 'The station-keeping field can take us lower. Below 1.33 rₛ, every second aboard is two seconds on the relay far away.');
  })().catch(() => {});
  await g.until(() => 1 / hoverRate(g.shipR) >= 2);
  g.waypoint = null;
  g.objective('Hold at twice the relay rate for 20 seconds (helm)');
  // the windows go black down here: explain it while the player holds, not after
  (async () => {
    await g.say('WREN', 'Relay clock at double speed. Hold here for twenty seconds.');
    await g.say('INES', 'The window\'s gone completely black. WREN, is the camera broken?');
    await g.say('WREN', 'No. From this low, the shadow covers more than half the sky. Every star is squeezed into a bright patch behind us. The helm screen shows the rear camera.');
  })().catch(() => {});
  const ship0 = g.clocks.ship, relay0 = g.clocks.relay;
  let held = 0;
  g.holding = true;
  let shown = -1;
  const tick = (dt) => {
    held = 1 / hoverRate(g.shipR) >= 2 ? held + dt : Math.max(0, held - dt * 0.5);
    g.flags.stats.deepest = Math.min(g.flags.stats.deepest ?? Infinity, g.shipR / 2);
    const left = Math.max(0, Math.ceil(20 - held));
    if (left !== shown) { shown = left; g.hud.objectiveNote(left > 0 ? `${left} s to go` : 'Held'); }
  };
  g.ticks.add(tick);
  await g.until(() => held >= 20);
  g.ticks.delete(tick);
  g.holding = false;
  g.objective('Return to 10 rₛ (helm)');
  await g.say('INES', 'Okay. That\'s enough. Take us back up.');
  await g.until(() => g.shipR > R_STATION - 0.05);
  const lost = (g.clocks.relay - relay0) - (g.clocks.ship - ship0);
  g.flags.stats.lost = lost;
  await g.say('WREN', `Back at station. The rest of the universe aged ${Math.round(lost)} seconds more than we did down there.`);
  g.objective(null);
  g.save('helm-done');
}

// ---------- act 5: Orpheus ----------
async function orpheusAct(g) {
  g.flags.orpheusReady = true; g.flags.beaconDone = true; g.flags.mapUnlocked = true;
  let launched = false, onLaunch = null;
  g.launchOrpheus = () => { if (g.orpheus) return; launched = true; onLaunch?.(); };
  await g.say('INES', 'One probe left. Orpheus. It has a camera, and it streams.');
  await g.say('WREN', 'Orpheus is loaded at the probe console. Its feed will show on the starboard screen.');
  g.objective('Launch Orpheus (probe console), then watch its feed (starboard screen)', { hint: 'Orpheus is loaded at the probe console, on the left.' });
  g.waypoint = { pos: consolePos(g, 'probe'), label: 'Probe', near: 1.4 };
  g.feed = createFeed();
  const FRAME = 1.5; // M of probe time between frames
  let frames = 0, tauSent = 0, rSent = R_STATION;
  g.feedState = () => {
    const r = g.orpheus; if (!r) return { frames: 0 };
    const S = r.S(), z = frames ? r.f.onePlusZ(Math.max(2.0000001, rSent)) : 1;
    const nextTau = (frames + 1) * FRAME, nextAt = r.f.messageArrival(nextTau);
    return { frames, tauSent, rSent, noise: Math.max(0, (Math.log(z) - 0.6) / 3.2), status: z > 25 ? 'signal fading' : z > 3 ? 'signal weak' : 'signal good', nextIn: isFinite(nextAt) ? secs(nextAt - S) : Infinity };
  };
  const begin = () => {
    if (g.orpheus) return;
    const run = createRun(g, 'orpheus'); run.signals = [];
    g.orpheus = run; g.lastRun = run;
    g.removeOrpheusMarker = g.addMarker(runMarker(run, { nm0: 500, name: 'Orpheus' }));
    g.waypoint = { pos: new THREE.Vector3(3.3, 1.75, -6.9), label: 'Feed', near: 2.4 };
  };
  onLaunch = begin;
  if (launched) begin();
  await g.until(() => !!g.orpheus);
  const run = g.orpheus, f = run.f;
  const tick = () => {
    for (;;) {
      const next = (frames + 1) * FRAME;
      if (next >= f.tauH || run.S() < f.messageArrival(next)) break;
      frames++; tauSent = next; rSent = f.rOfTau(next);
      g.feed.render(rSent, g.time); g.audio.frame();
      if (frames % 6 === 0) run.signals.push({ tau: next });
    }
  };
  const sound = () => {
    g.audio.carrier('orpheus', carrierState(run, 520));
    const near = Math.max(0, 1 - Math.hypot(g.me.x - 2.6, g.me.z + 6.9) / 5);
    g.audio.static(frames ? Math.min(1, g.feedState().noise) * near : 0);
  };
  g.ticks.add(tick); g.ticks.add(sound);
  g.objective('Watch the Orpheus feed (starboard screen)', { hint: 'The feed is on the big screen on the starboard wall, to the right as you face the window.', after: 25 });
  // while the early frames come in: what to expect when Orpheus passes the depth where the ship hovered
  (async () => {
    await g.until(() => frames >= 8);
    await g.say('INES', 'There it goes. The shadow\'s bigger every frame.');
    await g.until(() => frames >= 18);
    const deep = Math.min(1.33, g.flags.stats.deepest ?? 1.33), r = 2 * deep;
    await g.say('INES', `When it passes ${deep.toFixed(2)} rₛ, where we hovered, will its picture go all black like our window did?`);
    await g.say('WREN', `No. Hovering there, the shadow covered ${Math.round(shadowDeg(r))} degrees of our sky. Orpheus will pass that spot at ${Math.round(100 * fallSpeed(r, f.E))}% of light speed, and its motion swings the sky ahead of it. It will see the shadow only ${Math.round(shadowDeg(r, f.E))} degrees across.`);
    await g.say('WREN', 'Same place, different motion, different sky.');
  })().catch(() => {});
  await g.until(() => run.tau() >= f.tauH - 6);
  g.say('WREN', 'Frames are arriving further apart. The signal is being stretched as it climbs out.');
  await g.until(() => run.tau() >= f.tauEnd);
  await g.wait(4);
  g.say('YOU', '(That view. That\'s what I dreamt.)', { style: { fontStyle: 'italic' } });
  await g.wait(6);
  await g.until(() => !isFinite(g.feedState().nextIn)); // only once the last frame is in
  g.say('WREN', 'No more frames are coming. Everything Orpheus sent after that last one is still trying to climb out, and never will. Its marker in the window is fading the same way.');
  await g.until(() => run.seen().lnz > 9);
  await g.wait(2);
  g.objective(null);
  await g.say('INES', 'So that last frame is all we get. Did it fall in, or is it stuck there?');
  if (g.mode === 'console') await g.closeApp();
  const pick = await g.hud.choice('What do you tell Ines?', ['It fell in. Its last light just never reaches us.', 'It is frozen at the edge, forever.']);
  g.flags.stats.frames = frames; g.flags.stats.rLast = rSent / 2; g.flags.stats.answer = pick === 0 ? 'fell in' : 'frozen';
  if (pick === 1) {
    await g.say('WREN', 'Its clock never stopped. Orpheus reached the centre less than a second after crossing, by its own clock. The frozen picture is only the last light that could still climb out, and even that has faded.');
    await g.say('INES', 'So "frozen" is just what it looks like from here.');
  } else {
    await g.say('INES', 'And the rest of the trip, the part inside... nobody out here will ever see it.');
    await g.say('WREN', 'No one outside ever will. Only Orpheus saw it.');
  }
  g.say('YOU', '(Only Orpheus. And me, in a dream.)', { style: { fontStyle: 'italic' } });
  g.ticks.delete(tick); g.ticks.delete(sound); g.audio.carrier('orpheus', null); g.audio.static(0); g.removeOrpheusMarker?.(); g.waypoint = null;
  g.save('epilogue');
  await g.wait(5);
}

// ---------- epilogue ----------
async function epilogue(g, haloNow) {
  g.flags.helmUnlocked = true; g.flags.mapUnlocked = true; g.flags.orpheusReady = true; g.flags.beaconDone = true; g.flags.inesHome = true;
  const first = !g.flags.finished;
  g.flags.finished = true;
  let wantHalo = haloNow;
  if (!haloNow) {
    g.save('epilogue');
    await g.hud.card('Frozen Star', 'Thanks for playing. The Tern is yours to explore.', 4);
    if (first && (await logbook(g, { halo: !g.flags.haloDone })) === 'halo') wantHalo = true;
  }
  // postscript: the photon sphere. It is offered by WREN once the player has had a little time to themselves,
  // and it stays easy to find: a line under the objective, a prompt at the helm, a button on the logbook.
  let started = false;
  const explore = () => {
    g.objective('Explore the Tern. The lab archive has more.');
    if (!started && !g.flags.haloDone) g.hud.objectiveNote('Optional: the photon sphere. Take the helm to begin.');
  };
  explore();
  freeRoam(g);
  const startHalo = (force = false) => {
    if (started || (g.flags.haloDone && !force)) return null;
    started = true;
    g.hud.card('Postscript · The photon sphere', 'Where light goes in circles.', 3);
    return haloAct(g, { logbook: () => logbook(g) }).then(explore);
  };
  const helmIt = g.ship.interactables.find((i) => i.id === 'helm'), helmLabel = helmIt.label, helmFree = g.handlers.helm;
  Object.defineProperty(helmIt, 'label', { get: () => (!started && !g.flags.haloDone ? 'Optional: the photon sphere' : helmLabel), configurable: true });
  g.on('helm', (it) => { if (startHalo()) return g.handlers.helm(it); return helmFree(it); }); // the postscript's own helm panel
  if (wantHalo) await startHalo(true);
  else if (!g.flags.haloDone) (async () => { await g.wait(25); await g.until(() => g.quiet(4) || started); await startHalo(); })().catch(() => {});
}

// ---------- after the story: small things to find ----------
function freeRoam(g) {
  g.hud.hint('Free roam: talk to Ines (comms console or the capsule bay intercom), take the helm, or drop another beacon.');
  g.wait(12).then(() => g.hud.hint(null)).catch(() => {});
  // Ines, on the comms channel from the capsule bay
  const M = HOLE.mass, tideG = tidalStretch(2, M) / G_EARTH;
  const chats = [
    [['INES', `WREN worked it out for me. At the horizon, the tide from head to toe would have been ${tideG.toFixed(2)} g. A gentle stretch, nothing more.`],
      ['WREN', `Erebus is big, and tides weaken with size. At the horizon of a black hole of ten suns, the same stretch would be ${formatAccel(tidalStretch(2, 10))}.`]],
    [['INES', `And if I had crossed? WREN says the longest anyone can last inside Erebus is ${maxTimeInside(M).toFixed(1)} seconds, by their own watch. Then the centre.`],
      ['INES', 'Less than two seconds. Somehow that\'s worse than forever.']],
    [['INES', 'Next time I go out, you\'re on the beam. Nobody else.']],
    [['INES', 'Go look at the window, doc. I\'m fine. Really.']],
  ];
  // once she has said everything, the channel still answers: a short sign-off, never silence
  const later = [['INES', '…Catch you later, doc.'], ['INES', 'Still here. Go on, the window\'s yours.']];
  let chat = 0;
  g.on('comms', () => {
    if (g.talkingToInes) { g.hud.skip(); return; } // E again moves her on to the next line
    g.talkingToInes = true; g.audio.radio();
    const lines = chat < chats.length ? chats[chat++] : [later[(chat++ - chats.length) % later.length]];
    (async () => { for (const [who, text] of lines) await g.say(who, text); })().catch(() => {}).finally(() => { g.talkingToInes = false; });
  });
  // the helm, with nobody's plan to follow: WREN reads out what the field is holding
  let deepest = R_STATION;
  g.ticks.add(() => {
    deepest = Math.min(deepest, g.shipR);
    if (g.shipR < 2.2 && g.quiet(1)) g.react('free-deep', ['WREN', `The field is pushing against ${formatAccel(hoverAccel(g.shipR, M))} to hold us here. Nobody aboard feels a thing.`]);
    if (g.shipR < 2.08 && g.quiet(1)) g.react('free-floor', ['WREN', `${(1 / hoverRate(g.shipR)).toFixed(1)} relay seconds for each of ours. This is as deep as the field can hold us, Doctor.`], ['INES', 'Doc. Up. Please.']);
    if (deepest < 2.2 && g.shipR > R_STATION - 0.05 && g.quiet(1)) g.react('free-home', ['INES', 'Thank you.']);
  });
  // free play: the beacon can be dropped again from the probe console
  g.flags.beaconDone = false; g.beacon = null; g.orpheus = null;
  let drops = 1;
  g.launchBeacon = () => {
    const run = createRun(g, 'beacon'); run.signals = [];
    g.beacon = run; g.lastRun = run;
    const rm = g.addMarker(runMarker(run, { name: `K-${++drops}` }));
    if (drops === 2) g.react('redrop', ['WREN', `K-2 away. You know how this ends now: about ${Math.round(secs(run.f.tauH))} seconds to the horizon by its clock. It will still look as if it never gets there.`]);
    let sent = 0;
    const tick = () => {
      while (sent < 9 && run.tau() >= (sent + 1) * 10) { sent++; run.signals.push({ tau: sent * 10 }); }
      if (run.seen().lnz > 10) { rm(); g.ticks.delete(tick); g.beacon = null; }
    };
    g.ticks.add(tick);
  };
}

// ---------- the logbook: what the player saw, against what really happened ----------
function logbook(g, { halo = false } = {}) {
  const st = g.flags.stats || {}, tries = g.flags.rescueTries || 0;
  const f = new Infall(R_STATION), s = (m) => Math.round(secs(m)), inside = secs(f.tauEnd - f.tauH).toFixed(1);
  const label = (t) => `<small style="display:block;font:600 11px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">${t}</small>`;
  const row = (k, saw, real, note) => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${k}</b><span>${label('You saw')}${saw}</span><em style="font-size:15px;color:#e3dff0">${label('What happened')}${real}${note ? ` <span style="color:var(--amber-2)">${note}</span>` : ''}</em>`;
    return li;
  };
  const box = document.createElement('div'); box.className = 'fp-logbook';
  box.innerHTML = '<p class="eyebrow">Expedition log · Tern above Erebus</p><h2>What you saw, and what happened</h2>';
  const ul = document.createElement('ul');
  const pick = st.answer === 'fell in' ? 'You told Ines it fell in. It did.' : st.answer === 'frozen' ? 'You told Ines it was frozen. Only its picture was.' : '';
  ul.append(
    row('Beacon K-1',
      `Its pings came further and further apart: ping 9 arrived ${s(f.messageArrival(90))} s after release, not the ${s(90)} s of its own clock. Then its dot hung at the edge of the shadow, reddening, until it faded.`,
      `By its own clock it crossed the horizon ${s(f.tauH)} s after release, and reached the centre ${inside} s later.`,
      st.prediction === 'right' ? 'You predicted ping 9.' : ''),
    row('Ines',
      st.seenAt != null ? `When you fired, your screen showed her at ${st.seenAt.toFixed(1)} rₛ, looking almost normal.` : 'On your screen she looked fine the whole time.',
      st.metAt != null ? `The beam caught her at ${st.metAt.toFixed(2)} rₛ, ${st.marginS ?? Math.round(st.margin)} s before the last moment it could have left.` : `The beam had to leave within ${s(f.rescueDeadline)} s of her mayday, while her picture still looked fine.`,
      tries ? `It took ${tries + 1} tries.` : ''),
    row('Descent',
      'Your own clock ran normally. The windows went black and every star crowded in behind you.',
      st.lost != null ? `You held ${st.deepest != null ? `${st.deepest.toFixed(2)} rₛ` : 'low'}. The relay far away aged ${Math.round(st.lost)} s more than you did.` : 'Hovering clocks run slow. The relay far away aged more than you did.'),
    row('Orpheus',
      st.frames ? `${st.frames} frames, the last sent from ${st.rLast != null ? `${st.rLast.toFixed(2)} rₛ` : 'just above the horizon'}, each later and redder than the one before. Then nothing, ever.` : 'Its frames came slower and redder, and then stopped.',
      `It crossed the horizon ${s(f.tauH)} s after launch by its own clock, and reached the centre ${inside} s later. Nothing it saw inside can ever reach us.`,
      pick),
  );
  if (st.halo?.lap) {
    ul.append(row('Photon sphere',
      `At 1.5 rₛ the shadow covered exactly half the sky. Your laser pulse came back round to the stern ${st.halo.lap.toFixed(1)} s after it left.${st.halo.mast ? ' The pulse from the mast, one metre higher, missed and left for the stars.' : ''}`,
      `It went once round Erebus, ${(HALO.LAP_KM / 1e6).toFixed(2)} million km, at the speed of light. The relay far away counted ${HALO.LAP_FAR_S.toFixed(1)} s. The orbit is unstable: a metre off becomes ${Math.round(HALO.MAST_LAP1)} m after one lap.`,
      st.halo.prediction === 'right' ? 'You predicted the lap time.' : ''));
  }
  box.append(ul);
  if (st.shipT > 60 && st.relayT > st.shipT) {
    const c = document.createElement('p'); c.className = 'fp-logbook-foot';
    c.textContent = `Your clock logged ${formatDuration(st.shipT)} aboard the Tern. The relay, far from Erebus, logged ${formatDuration(st.relayT - st.shipT)} more.`;
    box.append(c);
  }
  const p = document.createElement('p'); p.className = 'fp-logbook-foot';
  p.textContent = 'From far away, nothing is ever seen to fall in. That is a fact about light, not about the things that fall.';
  const actions = document.createElement('div'); actions.className = 'fp-logbook-actions';
  return new Promise((res) => {
    const keep = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Keep exploring', className: 'primary' });
    keep.onclick = () => { box.remove(); res(); };
    const menu = Object.assign(document.createElement('a'), { href: '#title', textContent: 'Main menu', className: 'button' });
    actions.append(keep);
    // the optional postscript, for anyone who wants it now
    if (halo) actions.append(Object.assign(document.createElement('button'), { type: 'button', textContent: 'Postscript: the photon sphere', onclick: () => { box.remove(); res('halo'); } }));
    actions.append(menu); box.append(p, actions);
    g.el.append(box); g.controls.unlock(); keep.focus({ preventScroll: true }); box.scrollTop = 0; // start at the top: it scrolls on short screens
  });
}
