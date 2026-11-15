// The story of Frozen Star, as an async script. Each act ends at a checkpoint.
import * as THREE from 'three';
import { Infall } from '../physics/infall.js';
import { lookBasis, fallerVelocity } from '../render/raytracer.js';
import { hoverRate } from '../physics/body.js';
import { formatDuration } from '../physics/units.js';
import { SEC_PER_M, R_STATION, shipPosition, HOLE } from './world.js';
import { EYE } from './walk.js';
import {
  createRun, runMarker, screenFrame, screenLines, drawRunOnScreen, drawMap, drawClocks,
  datapadApp, probeApp, commsApp, mapApp, helmApp, createFeed, drawFeed, feedApp, archiveApp,
} from './apps.js';
import { CHAPTER_LIST } from './chapters-list.js';

const ORDER = ['start', 'bridge', 'probe-done', 'rescue-done', 'helm-done', 'epilogue'];
const secs = (m) => m * SEC_PER_M;

export async function runStory(g, cp) {
  const at = Math.max(0, ORDER.indexOf(cp));
  g.helmTarget = R_STATION;
  baseScreens(g);
  baseHandlers(g);
  if (at === 0) { await dream(g); await wake(g); await toBridge(g); }
  else spawnOnBridge(g);
  if (at <= 1) await beaconAct(g);
  if (at <= 2) await rescueAct(g);
  if (at <= 3) await helmAct(g);
  if (at <= 4) await orpheusAct(g);
  await epilogue(g);
}

// ---------- always-on things ----------
function baseScreens(g) {
  g.screenDraw.clocks = (ctx, w, h) => drawClocks(ctx, w, h, g);
  g.screenDraw.probe = (ctx, w, h) => { if (g.beacon) drawRunOnScreen(ctx, w, h, g.orpheus || g.beacon, g.orpheus ? 'ORPHEUS · as seen from the ship' : 'BEACON K-1 · as seen from the ship'); else { screenFrame(ctx, w, h, 'PROBE', 'bay 1: beacon K-1 · bay 2: Orpheus'); screenLines(ctx, w, h, ['K-1     ready', 'ORPHEUS ' + (g.flags.orpheusReady ? 'ready' : 'locked')]); } };
  g.screenDraw.comms = (ctx, w, h) => { if (g.capsule) drawRunOnScreen(ctx, w, h, g.capsule, 'CAPSULE · as seen from the ship'); else { screenFrame(ctx, w, h, 'COMMS', 'channel: Ines Okafor (capsule)'); screenLines(ctx, w, h, [g.flags.inesHome ? 'Capsule docked.' : 'Capsule in bay.', 'Recall beam: armed']); } };
  g.screenDraw.helm = (ctx, w, h) => { screenFrame(ctx, w, h, 'HELM', 'station-keeping field'); screenLines(ctx, w, h, [`altitude  ${(g.shipR / 2).toFixed(3)} rs`, `relay     x${(1 / hoverRate(g.shipR)).toFixed(3)}`, g.flags.helmUnlocked ? 'descent:  authorised' : 'descent:  locked']); };
  g.screenDraw.map = (ctx, w, h) => { const r = g.lastRun; if (r && g.flags.mapUnlocked) drawMap(ctx, w, h, r); else { screenFrame(ctx, w, h, 'SPACETIME MAP', 'nothing plotted yet'); } };
  g.screenDraw.archive = (ctx, w, h) => { screenFrame(ctx, w, h, 'ARCHIVE', 'expedition library'); screenLines(ctx, w, h, CHAPTER_LIST.map((c) => `${c.num}  ${c.title}`), 0.3); };
  g.screenDraw.feed = (ctx, w, h) => { if (g.feed) drawFeed(ctx, w, h, g.feed, g.feedState()); else { screenFrame(ctx, w, h, 'CAMERA FEED', 'no signal'); } };
}

function baseHandlers(g) {
  const pad = g.ship.interactables.find((i) => i.id === 'datapad');
  pad.focus = { pos: new THREE.Vector3(3.9, 1.5, 3.0), look: new THREE.Vector3(4.6, 0.8, 3.0) };
  g.on('datapad', (it) => g.openApp(it, datapadApp));
  g.on('photo', () => g.say('YOU', 'Home. Twenty-six thousand light-years behind us.'));
  g.on('porthole', async () => {
    await g.say('WREN', 'The black disk is Erebus\'s shadow. It is about two and a half times wider than the horizon itself.');
    await g.say('WREN', 'The bright ring around it is starlight from behind the hole, bent all the way around.');
  });
  g.on('map', (it) => g.openApp(it, (b) => mapApp(b, g, { run: () => (g.flags.mapUnlocked ? g.lastRun : null) })));
  g.on('archive', (it) => g.openApp(it, (b) => archiveApp(b, g, { chapters: CHAPTER_LIST })));
  g.on('helm', (it) => g.openApp(it, (b) => (g.flags.helmUnlocked ? helmApp(b, g, { onTarget: (r) => { g.helmTarget = r; } }) : (b.append(h3('Helm'), p('Holding station at 10 rₛ. Descent is locked until the survey plan calls for it.')), null))));
  g.on('comms', (it) => g.openApp(it, (b) => commsApp(b, g, { run: () => g.capsule, onFire: () => g.fireRecall?.(), showMap: (g.flags.rescueTries || 0) > 0 })));
  g.on('feed', (it) => g.openApp(it, (b) => (g.feed ? feedApp(b, g, { feedState: g.feedState, feed: g.feed }) : (b.append(h3('Camera feed'), p('No signal.')), null))));
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
const h3 = (t) => Object.assign(document.createElement('h3'), { textContent: t });
const p = (t) => Object.assign(document.createElement('p'), { textContent: t });

function setWalk(g, x, z, yaw, pitch = 0) {
  g.me = { x, z, yaw, pitch, vx: 0, vz: 0 };
  g.mode = 'walk'; g.controls.setEnabled(true); g.hud.crosshair(true);
}

function spawnOnBridge(g) {
  g.flags.mapUnlocked = g.flags.mapUnlocked ?? false;
  setWalk(g, 0, -7.0, 0);
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
  const tick = (dt) => { tau = Math.min(f.tauEnd, tau + dt * speed); };
  g.ticks.add(tick);
  g.hud.fade(1, 0);
  await g.wait(0.3);
  g.hud.fade(0, 3);
  await g.wait(2);
  g.say('YOU', '(Falling. No wind, no sound.)', { style: { fontStyle: 'italic' } });
  await g.until(() => f.rOfTau(tau) < 7);
  g.say('YOU', '(The black is spreading. The light is all overhead now.)', { style: { fontStyle: 'italic' } });
  await g.until(() => tau >= f.tauH);
  g.say('YOU', '(Nothing happened.)', { style: { fontStyle: 'italic' }, dur: 2.2 });
  await g.until(() => f.rOfTau(tau) < 0.9);
  await g.hud.fade(1, 0.6, '#fff');
  g.ticks.delete(tick);
  g.skyOverride = null; g.hideShip = false;
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
  await g.say('WREN', 'Good morning, Doctor. It is 06:40, ship time.');
  await g.tweenTo(new THREE.Vector3(3.8, 1.15, 5.3), -0.12, -0.04, 2.2);
  await g.tweenTo(new THREE.Vector3(3.7, EYE, 4.7), -0.1, 0.0, 1.4);
  setWalk(g, 3.7, 4.7, -0.1, 0.0);
  g.say('WREN', 'We reached station above Erebus at 04:12. Ten Schwarzschild radii out, holding steady.');
  g.hud.hint(g.controls.isTouch() ? 'Left thumb to walk, drag to look around.' : 'Click to look around. <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to walk, <kbd>E</kbd> to use things.');
  await g.wait(4.5);
  await g.say('INES', 'Morning, doc! You slept through the arrival. Come up to the bridge, the view is ridiculous.');
  g.objective('Go to the bridge');
  await g.wait(6); g.hud.hint(null);
}

async function toBridge(g) {
  await g.until(() => g.inRoom('bridge'));
  g.save('bridge');
}

// ---------- act 2: the beacon ----------
async function beaconAct(g) {
  g.objective(null);
  let launched = false;
  g.launchBeacon = () => {
    if (g.beacon) return;
    const run = createRun(g, 'beacon'); run.signals = [];
    g.beacon = run; g.lastRun = run; launched = true;
    g.removeBeaconMarker = g.addMarker(runMarker(run));
    run.log.push({ who: 'probe', text: 'Released at τ = 0' });
  };
  await g.say('INES', 'Isn\'t it something? That black circle is Erebus. Well, its shadow. I\'m out in the capsule bay doing pre-flight.');
  await g.say('WREN', 'First item on today\'s plan: drop beacon probe K-1 and log its signal.');
  if (!launched) g.objective('Drop the beacon probe (probe console, left)');
  await g.until(() => launched);
  g.objective('Watch the probe fall');
  const run = g.beacon, f = run.f;
  let sent = 0, got = 0, asked = false, answer = null;
  const A9 = f.messageArrival(90);
  const tick = () => {
    while (sent < 9 && run.tau() >= (sent + 1) * 10) { sent++; run.signals.push({ tau: sent * 10 }); run.log.push({ who: 'probe', text: `Ping ${sent} sent at τ = ${sent * 10} M` }); }
    while (got < 9 && run.S() >= f.messageArrival((got + 1) * 10)) { got++; run.log.push({ who: 'ship', text: `Ping ${got} received ${formatDuration(secs(f.messageArrival(got * 10)))} after release`, kind: 'got' }); }
  };
  g.ticks.add(tick);
  g.say('WREN', 'K-1 pings every ten M of its own time. About six seconds.');
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
  g.say('WREN', answer === 1 ? 'Ping 9, right on your prediction.' : answer == null ? `Ping 9, at ${Math.round(secs(A9))} seconds.` : `Ping 9, at ${Math.round(secs(A9))} seconds. Each ping has to climb out of a deeper well than the last.`);
  await g.until(() => run.tau() >= f.tauEnd);
  await g.wait(1.5);
  await g.say('WREN', `By its own clock, K-1 crossed the horizon ${Math.round(secs(f.tauH))} seconds after release, and reached the centre less than a second later.`);
  await g.say('INES', 'Then what am I looking at? It\'s still there on the screen, right at the edge.');
  await g.say('WREN', 'Old light. Each moment of the fall reaches us later than the one before. The picture slows, reddens and fades, but the probe itself is gone.');
  await g.until(() => run.seen().lnz > 9);
  g.ticks.delete(tick);
  await g.say('INES', '...and now it\'s gone from the screen too.');
  g.flags.mapUnlocked = true; g.flags.beaconDone = true;
  await g.say('WREN', 'I have drawn the whole fall on the spacetime map, on the port wall.');
  g.removeBeaconMarker?.();
  g.objective('Optional: study the spacetime map (port wall)');
  g.save('probe-done');
  await g.wait(10);
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
    await g.say('WREN', 'Capsule away. She is holding position beside us.');
    await g.wait(5);
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
  const tick = () => { if (on) { const k = 0.5 + 0.5 * Math.sin(g.time * 5); L.color.setRGB(1, 0.25 + 0.2 * k, 0.2 + 0.15 * k); } };
  g.ticks.add(tick);
  return (v) => { on = v; if (!v) L.color.copy(base); };
}

async function rescueAttempt(g) {
  g.alarm = g.alarm || alarmFn(g);
  g.alarm(true);
  const run = createRun(g, 'capsule'); run.signals = [];
  g.capsule = run; g.lastRun = run;
  const removeMarker = g.addMarker(runMarker(run, { nm0: 560, size: 0.007 }));
  const f = run.f, D = f.rescueDeadline;
  g.say('WREN', 'Doctor, Ines\'s capsule has lost main power. It is falling.');
  g.objective('Save Ines: fire the recall beam from the comms console. Wait as long as you dare.');
  // her messages, delivered when their light arrives
  const queue = INES_LINES.map(([tau, text]) => ({ tau, text, at: f.messageArrival(tau), done: false }));
  for (const q of queue) run.signals.push({ tau: q.tau });
  let result = null;
  g.fireRecall = () => {
    if (run.fired != null) return;
    run.fired = run.S();
    const seen = run.seen();
    run.log.push({ text: `[You fired the recall beam. Your screen showed her at ${(seen.r / 2).toFixed(2)} rₛ.]`, style: { color: '#7fd6a8' } });
  };
  const tick = () => {
    const S = run.S();
    for (const q of queue) if (!q.done && S >= q.at) {
      q.done = true;
      if (result?.saved && q.tau > result.tau) continue; // she escaped: these were never sent
      const style = inesStyle(f, q.tau);
      run.log.push({ text: q.text, style }); g.say('INES', q.text, { style });
    }
    if (run.fired != null && !result) {
      const hit = f.rescueAt(run.fired);
      const T0 = f.stationTTilde(run.fired), Tnow = f.stationTTilde(S);
      if (Tnow - T0 >= f.R0 - (hit.meets ? hit.r : 0)) result = { saved: !hit.inside, r: hit.r, tau: hit.tau };
    }
  };
  g.ticks.add(tick);
  g.say('WREN', 'The recall beam travels at light speed. It must reach her before she crosses the horizon.');
  await g.until(() => result || run.S() > 175);
  let saved = !!result?.saved;
  if (saved) {
    run.hidden = true; removeMarker();
    g.alarm(false); g.objective(null);
    await g.say('INES', 'Engine\'s lit! I felt that. I\'m climbing. I\'m coming home!');
    await g.say('WREN', `You fired ${Math.round(secs(D - run.fired))} seconds before the last possible moment. At that moment your screen showed her ${(f.seenAt(run.fired).r / 2).toFixed(1)} rₛ out, looking almost normal.`);
    g.ticks.delete(tick);
    await g.hud.fade(1, 1.5);
    g.hud.clearSubs();
    g.capsule = null;
    await g.hud.card('Twenty minutes later', null, 2.4);
    await g.hud.fade(0, 1.5);
    await g.say('INES', 'Docked. Hands still shaking.');
    await g.say('INES', 'You know what scares me? On your screen I looked fine the whole time. If you\'d waited until I looked like I was in trouble...');
    await g.say('WREN', 'It would have been far too late. By the deadline, her picture was still only a third of the way down.');
  } else {
    await g.say('WREN', result ? `The beam reached the capsule at ${(result.r / 2).toFixed(2)} rₛ. Inside the horizon. Her engine cannot help her there.` : 'You did not fire. She crossed the horizon long ago.');
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
  await g.say('INES', 'I want to see that again. Without dying this time.');
  await g.say('WREN', 'The station-keeping field can take us lower. Below 1.33 rₛ, every second aboard is two seconds on the relay far away.');
  g.objective('Take the Tern down until the relay clock runs twice as fast (helm)');
  await g.until(() => 1 / hoverRate(g.shipR) >= 2);
  g.say('WREN', 'Relay clock at double speed. Hold here for twenty seconds.');
  g.objective('Hold for 20 seconds');
  const ship0 = g.clocks.ship, relay0 = g.clocks.relay;
  let held = 0;
  const tick = (dt) => { held = 1 / hoverRate(g.shipR) >= 2 ? held + dt : Math.max(0, held - dt * 0.5); };
  g.ticks.add(tick);
  await g.until(() => held >= 20);
  g.ticks.delete(tick);
  await g.say('INES', 'The window\'s gone completely black. WREN, is the camera broken?');
  await g.say('WREN', 'No. From this low, the shadow covers more than half the sky. Every star is squeezed into a bright patch behind us, where we have no windows.');
  await g.say('INES', 'Okay. That\'s enough. Take us back up.');
  g.objective('Return to 10 rₛ (helm)');
  await g.until(() => g.shipR > R_STATION - 0.05);
  const lost = (g.clocks.relay - relay0) - (g.clocks.ship - ship0);
  await g.say('WREN', `Back at station. The rest of the universe aged ${Math.round(lost)} seconds more than we did down there.`);
  g.objective(null);
  g.save('helm-done');
}

// ---------- act 5: Orpheus ----------
async function orpheusAct(g) {
  g.flags.orpheusReady = true; g.flags.beaconDone = true; g.flags.mapUnlocked = true;
  await g.say('INES', 'One probe left. Orpheus. It has a camera, and it streams.');
  await g.say('WREN', 'Orpheus is loaded at the probe console. Its feed will show on the starboard screen.');
  g.objective('Launch Orpheus (probe console), then watch its feed (starboard screen)');
  let launched = false;
  g.feed = createFeed();
  const FRAME = 1.5; // M of probe time between frames
  let frames = 0, tauSent = 0, rSent = R_STATION;
  g.feedState = () => {
    const r = g.orpheus; if (!r) return { frames: 0 };
    const S = r.S(), z = frames ? r.f.onePlusZ(Math.max(2.0000001, rSent)) : 1;
    const nextTau = (frames + 1) * FRAME, nextAt = r.f.messageArrival(nextTau);
    return { frames, tauSent, rSent, noise: Math.max(0, (Math.log(z) - 0.6) / 3.2), status: z > 25 ? 'signal fading' : z > 3 ? 'signal weak' : 'signal good', nextIn: isFinite(nextAt) ? secs(nextAt - S) : Infinity };
  };
  g.launchOrpheus = () => {
    if (g.orpheus) return;
    const run = createRun(g, 'orpheus'); run.signals = [];
    g.orpheus = run; g.lastRun = run; launched = true;
    g.removeOrpheusMarker = g.addMarker(runMarker(run, { nm0: 500 }));
  };
  await g.until(() => launched);
  const run = g.orpheus, f = run.f;
  const tick = () => {
    for (;;) {
      const next = (frames + 1) * FRAME;
      if (next >= f.tauH || run.S() < f.messageArrival(next)) break;
      frames++; tauSent = next; rSent = f.rOfTau(next);
      g.feed.render(rSent, g.time);
      if (frames % 6 === 0) run.signals.push({ tau: next });
    }
  };
  g.ticks.add(tick);
  g.objective('Watch the Orpheus feed (starboard screen)');
  await g.until(() => run.tau() >= f.tauH - 6);
  g.say('WREN', 'Frames are arriving further apart. The signal is being stretched as it climbs out.');
  await g.until(() => run.tau() >= f.tauEnd);
  await g.wait(4);
  g.say('YOU', '(That view. That\'s what I dreamt.)', { style: { fontStyle: 'italic' } });
  await g.until(() => run.seen().lnz > 9);
  await g.wait(2);
  await g.say('INES', 'So that last frame is all we get. Did it fall in, or is it stuck there?');
  const pick = await g.hud.choice('What do you tell Ines?', ['It fell in. Its last light just never reaches us.', 'It is frozen at the edge, forever.']);
  if (pick === 1) {
    await g.say('WREN', 'Its clock never stopped. Orpheus reached the centre less than a second after crossing, by its own clock. The frozen picture is only the last light that could still climb out, and even that has faded.');
    await g.say('INES', 'So "frozen" is just what it looks like from here.');
  } else {
    await g.say('INES', 'And the rest of the trip, the part inside... nobody out here will ever see it.');
    await g.say('WREN', 'No one outside ever will. Only Orpheus saw it.');
  }
  g.say('YOU', '(Only Orpheus. And me, in a dream.)', { style: { fontStyle: 'italic' } });
  g.ticks.delete(tick); g.removeOrpheusMarker?.();
  g.save('epilogue');
  await g.wait(5);
}

// ---------- epilogue ----------
async function epilogue(g) {
  g.flags.helmUnlocked = true; g.flags.mapUnlocked = true; g.flags.orpheusReady = true; g.flags.beaconDone = true; g.flags.inesHome = true;
  await g.hud.card('Frozen Star', 'Thanks for playing. The Tern is yours to explore.', 4);
  g.objective('Explore the Tern. The lab archive has more.');
  // free play: the beacon can be dropped again from the probe console
  g.flags.beaconDone = false; g.beacon = null; g.orpheus = null;
  g.launchBeacon = () => {
    const run = createRun(g, 'beacon'); run.signals = [];
    g.beacon = run; g.lastRun = run;
    const rm = g.addMarker(runMarker(run));
    let sent = 0;
    const tick = () => {
      while (sent < 9 && run.tau() >= (sent + 1) * 10) { sent++; run.signals.push({ tau: sent * 10 }); }
      if (run.seen().lnz > 10) { rm(); g.ticks.delete(tick); g.beacon = null; }
    };
    g.ticks.add(tick);
  };
}
