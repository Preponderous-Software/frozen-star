// Postscript: the photon sphere. An optional mission after the story. The Tern hovers at 1.5 rₛ,
// where light can circle Erebus, and fires its ranging laser along the hull. The pulse goes once
// round the hole and comes back to the stern 11 seconds later; a second pulse, fired one metre
// further out, shows how fine a balance that orbit is.
import { h, loop } from '../ui/dom.js';
import { tangentPulse, pulseAt, lapDrift, PHOTON_LAP } from '../physics/photon-orbit.js';
import { PHOTON_SPHERE } from '../physics/light.js';
import { METERS_PER_M_SUN } from '../physics/units.js';
import { BlackHoleView, lookBasis, hoverVelocity } from '../render/raytracer.js';
import { helmApp } from './apps.js';
import { HOLE, SEC_PER_M, R_STATION, shipPosition } from './world.js';
import { shadowDeg } from './story.js';

const M_METRES = HOLE.mass * METERS_PER_M_SUN; // one M of length at Erebus: about 177,000 km
const LOCK = 0.01 / M_METRES; // the field holds the photon sphere to within a centimetre
const MAST = 1 / M_METRES; // the dorsal mast stands one metre further out
const NEAR = 0.012; // how close (in M) the helm must bring the ship before the field can lock
const SNAP = 0.06; // a helm target this close (in M, 0.03 rₛ) is taken as the photon sphere itself
const secs = (m) => m * SEC_PER_M;
const LAP_S = secs(PHOTON_LAP.hover), LAP_FAR_S = secs(PHOTON_LAP.far);
const LAP_KM = (2 * Math.PI * PHOTON_SPHERE * M_METRES) / 1000;
const MAST_LAP1 = lapDrift(1, 1), MAST_LAP2_KM = lapDrift(1, 2) / 1000;
export const HALO = { LAP_S, LAP_FAR_S, LAP_KM, MAST_LAP1, MAST_LAP2_KM, LOCK_LAP_M: lapDrift(0.01, 1) };

const fmtKm = (km) => (km >= 1e6 ? `${(km / 1e6).toFixed(2)} million km` : `${Math.round(km).toLocaleString('en')} km`);

/** The pulse in flight: launched at ship time S0 (M) from radius r0. Its place follows Schwarzschild time. */
function launch(g, r0, kind) {
  const run = tangentPulse(r0, { maxTurns: 5, rOut: 9 }), S0 = g.physicsNow(), rate = Math.sqrt(1 - 2 / r0);
  const p = { kind, run, live: true, stopAt: Infinity, far: () => Math.min(p.stopAt, (g.physicsNow() - S0) / rate) };
  return p;
}

// ---------- the drawings ----------
function drawOrbit(ctx, w, hh, st) {
  ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, w, hh);
  const cx = w / 2, cy = hh / 2, k = Math.min(w, hh) / 2 / 6.2; // 6.2 M to the edge
  // shadow edge as seen from far away (b = 3√3), the horizon, and the photon sphere
  ctx.fillStyle = 'rgba(255,170,80,.06)'; ctx.beginPath(); ctx.arc(cx, cy, k * 3 * Math.sqrt(3), 0, 7); ctx.fill();
  ctx.fillStyle = '#000'; ctx.strokeStyle = 'rgba(255,200,130,.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, k * 2, 0, 7); ctx.fill(); ctx.stroke();
  ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(143,184,255,.55)';
  ctx.beginPath(); ctx.arc(cx, cy, k * PHOTON_SPHERE, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = `500 ${Math.round(hh * 0.045)}px "IBM Plex Mono", monospace`; ctx.fillStyle = 'rgba(143,184,255,.8)';
  ctx.textAlign = 'center'; ctx.fillText('photon sphere · 1.5 rs', cx, cy + k * 3 + hh * 0.07); ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,200,130,.75)'; ctx.fillText('horizon', cx - k * 0.95, cy + 4);
  // the ship, at the top, looking down at Erebus; the pulse leaves to the right (clockwise)
  const at = (r, phi) => [cx + k * r * Math.sin(phi), cy - k * r * Math.cos(phi)];
  const [sx, sy] = at(st.shipR, 0);
  ctx.fillStyle = '#ffc882'; ctx.beginPath(); ctx.moveTo(sx, sy + 7); ctx.lineTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy - 6); ctx.closePath(); ctx.fill();
  ctx.fillText('Tern', sx + 9, sy - 6);
  for (const p of st.pulses) {
    const t = p.far(), col = p.kind === 'mast' ? '255,120,200' : '120,255,190';
    // trail: the path so far (the last lap only, so it reads as a moving pulse, not a solid ring)
    ctx.strokeStyle = `rgba(${col},.75)`; ctx.lineWidth = 2; ctx.beginPath();
    let first = true, last = null;
    for (const s of p.run.samples) {
      if (s.t > t) break;
      if (s.phi < (p.headPhi ?? 0) - 2 * Math.PI) continue;
      const [x, y] = at(s.r, s.phi); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); last = s;
    }
    const here = pulseAt(p.run, t);
    if (here) { const [x, y] = at(here.r, here.phi); ctx.lineTo(x, y); p.headPhi = here.phi; ctx.stroke(); ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
    else if (last) ctx.stroke();
  }
}

/** A camera on the hull looking straight along it, sideways to Erebus. Rendered on demand, not every frame. */
function sideCam() {
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
  let view = null;
  try { view = new BlackHoleView(canvas, { scale: 1, preserve: true }); view.set({ steps: 420, diskOuter: 15 }); view.resize = () => {}; } catch { /* no WebGL 2 */ }
  return {
    canvas, ok: () => !!view,
    render(r, t) {
      if (!view) return;
      const pos = shipPosition(r);
      view.set({ cam: pos, basis: lookBasis(pos, [pos[0] + 1, pos[1], pos[2]]), V: hoverVelocity(pos), fov: 1.4, time: t, disk: true });
      view.render();
    },
  };
}

function drawSide(ctx, w, hh, cam, locked) {
  ctx.drawImage(cam.canvas, 0, 0, w, hh);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, w, hh * 0.13);
  ctx.fillStyle = '#ffc882'; ctx.font = `500 ${hh * 0.05}px "IBM Plex Mono", monospace`;
  ctx.fillText('HULL CAMERA · looking along the hull, side-on to Erebus', w * 0.03, hh * 0.085);
  if (!locked) return;
  // straight ahead along the hull: the edge of the shadow, where the Tern's own light comes back round
  ctx.strokeStyle = 'rgba(120,255,190,.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(w / 2, hh / 2, hh * 0.06, 0, 7); ctx.moveTo(w / 2, hh * 0.3); ctx.lineTo(w / 2, hh * 0.41); ctx.moveTo(w / 2, hh * 0.59); ctx.lineTo(w / 2, hh * 0.7); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, hh * 0.86, w, hh * 0.14);
  ctx.fillStyle = '#9dffd0';
  ctx.fillText(`Dead ahead: our own light, ${LAP_S.toFixed(1)} s old`, w * 0.03, hh * 0.945);
}

// ---------- the laser section of the helm panel ----------
function laserApp(body, g, st) {
  st.cam = st.cam || g.haloCam || (g.haloCam = sideCam()); // one WebGL context, made the first time it is needed
  const dispose = helmApp(body, g, { onTarget: (r) => { g.helmTarget = Math.abs(r - PHOTON_SPHERE) < SNAP ? PHOTON_SPHERE : r; st.locked = false; } }); // a near miss snaps to 1.5 rₛ
  const orbit = h('canvas.fp-feed', { style: { aspectRatio: '1 / 1', maxWidth: '360px', margin: '0 auto' } }); orbit.width = orbit.height = 400;
  const side = h('canvas.fp-feed'); side.width = 640; side.height = 360;
  const status = h('p.fine');
  const fire = h('button.primary', { type: 'button', onclick: () => st.onFire?.('hull') }, 'Fire the ranging laser along the hull');
  const mast = h('button.primary', { type: 'button', hidden: true, onclick: () => st.onFire?.('mast') }, 'Fire from the mast, one metre further out');
  const sec = h('section.fp-sec', h('p.eyebrow', 'Ranging laser · the photon sphere'), h('div.fp-action-row', fire, ' ', mast), status, orbit,
    h('p.fine', 'Seen from above. The dashed circle is the photon sphere, 1.5 rₛ, where light can orbit. The faint disk is the shadow far-away observers see.'), side);
  body.insertBefore(sec, body.children[1] || null);
  let camAt = -1, camLocked = null;
  const stop = loop(() => {
    const flying = st.pulses.some((p) => p.live);
    fire.hidden = st.step !== 'hull';
    fire.disabled = !st.locked || flying || st.step !== 'hull' || !st.onFire;
    mast.hidden = st.step !== 'mast'; mast.disabled = !st.locked || flying || st.step !== 'mast' || !st.onFire;
    status.textContent = st.locked ? `Field locked to the photon sphere, ${(PHOTON_SPHERE / 2).toFixed(3)} rₛ, to within a centimetre.${!flying && !st.onFire && st.step !== 'done' ? ' The laser arms in a moment: listen to WREN first.' : ''}`
      : Math.abs(g.shipR - PHOTON_SPHERE) < 0.2 ? `Altitude ${(g.shipR / 2).toFixed(3)} rₛ. Bring it to 1.500 rₛ and the field will lock.`
        : `Altitude ${(g.shipR / 2).toFixed(3)} rₛ. The laser test needs the ship at the photon sphere, 1.5 rₛ.`;
    drawOrbit(orbit.getContext('2d'), orbit.width, orbit.height, { shipR: g.shipR, pulses: st.pulses });
    // the hull camera: re-rendered only when the altitude has moved, or once the lock engages
    if (st.cam.ok() && (Math.abs(camAt - g.shipR) > 0.02 || camLocked !== st.locked)) { camAt = g.shipR; camLocked = st.locked; st.cam.render(g.shipR, g.time); }
    if (st.cam.ok()) drawSide(side.getContext('2d'), side.width, side.height, st.cam, st.locked); else side.hidden = true;
  });
  return () => { stop(); dispose?.(); };
}

// ---------- the mission ----------
export async function haloAct(g, { logbook } = {}) {
  g.flags.helmUnlocked = true;
  const stats = g.flags.stats = g.flags.stats || {};
  g.save('halo');
  g.hud.hint(null);
  const st = { locked: false, pulses: [], step: 'hull', onFire: null, cam: g.haloCam || null };
  g.haloState = st; // for scripted checks (window.__fs in ?debug)
  const helmBefore = g.handlers.helm;
  const helmIt = g.ship.interactables.find((i) => i.id === 'helm');
  g.on('helm', (it) => g.openApp(it, (b) => laserApp(b, g, st)));
  const tick = () => {
    if (!st.locked && Math.abs(g.shipR - PHOTON_SPHERE) < NEAR && Math.abs(g.helmTarget - PHOTON_SPHERE) < NEAR) {
      st.locked = true; g.helmTarget = PHOTON_SPHERE; g.shipR = PHOTON_SPHERE; g.audio.click();
    }
    for (const p of st.pulses) if (p.live && !pulseAt(p.run, p.far())) p.live = false;
  };
  g.ticks.add(tick);

  g.objective('Optional: take the Tern down to the photon sphere, 1.5 rₛ (helm)', { hint: 'The helm is the low desk in the middle of the bridge. Lower the altitude to 1.500 rₛ and the field will lock there.' });
  g.waypoint = { pos: helmIt.pos.clone(), label: 'Helm', near: 2.2 };
  const intro = (async () => {
    await g.say('WREN', 'Doctor, one item is left on the survey plan, if you want it. It is optional. A ranging-laser test at the photon sphere.');
    await g.say('INES', 'The what sphere?');
    await g.say('WREN', 'One and a half horizon radii. At that height light can orbit Erebus. A beam fired sideways goes all the way round.');
    await g.say('INES', 'Light going in a circle. Okay, doc, I have to see that.');
  })().catch(() => {});
  await g.until(() => st.locked);
  g.waypoint = null;
  g.objective('Photon sphere reached. Listen to WREN, then log a prediction'); // the descent is done: its hint must not fire now
  stats.halo = { ...(stats.halo || {}) };
  await intro; // a quick pilot gets there first: let the briefing finish, so the lines stay in order
  await g.say('WREN', 'Photon sphere. I have locked the field to it, to within a centimetre. You will see why that matters.');
  await g.say('WREN', `Look forward: the shadow now covers exactly half the sky, ${Math.round(shadowDeg(PHOTON_SPHERE))} degrees. Its edge is a circle at right angles to our nose: straight up, straight down, and straight out on either side of the hull.`);
  const pick = await g.hud.choice('Log a prediction: fired along the hull, when will the pulse come back round to the stern, by the ship\'s clock?', [
    `After about ${LAP_S.toFixed(0)} seconds`,
    `After about ${LAP_FAR_S.toFixed(0)} seconds`,
    'Never: light travels in straight lines',
  ], { timeout: 25 });
  stats.halo.prediction = pick === 0 ? 'right' : pick == null ? 'none' : 'wrong';
  g.objective('Fire the ranging laser along the hull (helm)', { hint: 'The laser controls are at the top of the helm panel, once the field is locked at 1.5 rₛ.', after: 20 });

  // the first pulse: once round, and home
  const fired = (kind) => new Promise((res) => { st.onFire = (k) => { if (k !== kind) return; const r0 = PHOTON_SPHERE + (kind === 'mast' ? MAST : LOCK); const p = launch(g, r0, kind); st.pulses = [p]; g.audio.whoosh(0.6); st.onFire = null; res(p); }; });
  const p1 = await fired('hull');
  g.objective('Watch the pulse go round Erebus (helm panel)');
  g.say('WREN', 'Pulse away. Watch the plot on the helm panel.').catch(() => {});
  await g.until(() => p1.far() >= PHOTON_LAP.far);
  p1.stopAt = PHOTON_LAP.far; p1.live = false; // caught: it goes no further
  g.audio.ping(1, 1);
  g.objective(null); // done: the pulse is home
  stats.halo.lap = LAP_S;
  await g.say('WREN', `Caught at the stern, ${LAP_S.toFixed(1)} seconds after it left, ${HALO.LOCK_LAP_M.toFixed(1)} metres from where it set out. It went all the way round Erebus: ${fmtKm(LAP_KM)}.`);
  await g.say('WREN', pick === 0 ? 'As you predicted. That is just the circumference divided by the speed of light.'
    : pick === 1 ? `Not quite. ${LAP_FAR_S.toFixed(1)} seconds is what the relay far away counts for one lap. Our clock runs slow down here, so we count ${LAP_S.toFixed(1)}: the circumference divided by the speed of light.`
      : `It did. Light goes straight, but space here is curved, and at this height straight means round. ${LAP_S.toFixed(1)} seconds: the circumference divided by the speed of light. The relay far away counts ${LAP_FAR_S.toFixed(1)}.`);
  await g.say('INES', 'Wait. So any light that leaves the ship sideways comes back round to us?');
  await g.say('WREN', 'Exactly sideways, yes. Including the light bouncing off the back of your head.');
  await g.say('INES', 'So if I look straight along the hull, right at the edge of the shadow...');
  await g.say('WREN', `You see the back of your own head, as it was ${LAP_S.toFixed(0)} seconds ago. Squeezed into a thin line along the edge. One more lap in, a second copy, ${Math.round(LAP_S * 2)} seconds old and hundreds of times thinner. The hull camera on the helm panel looks along it.`);
  await g.say('INES', 'That is the creepiest thing I\'ve heard all week. And I nearly fell into a black hole this morning.');

  // the second pulse: one metre out, and the balance tips
  st.step = 'mast';
  g.objective('Fire a pulse from the mast, one metre further out (helm)', { hint: 'The second laser button on the helm panel fires from the dorsal mast, one metre further from Erebus.', after: 20 });
  await g.say('WREN', 'Now the reason for the centimetre. The dorsal mast has a laser too, one metre further out. Fire it and watch.');
  const p2 = await fired('mast');
  g.objective('Watch the mast pulse (helm panel)');
  g.say('WREN', 'Mast pulse away.').catch(() => {});
  await g.until(() => p2.far() >= PHOTON_LAP.far);
  await g.say('WREN', `Lap one: it passed us ${Math.round(MAST_LAP1)} metres too high. It missed the stern.`);
  await g.until(() => p2.far() >= 2 * PHOTON_LAP.far || !p2.live);
  await g.say('WREN', `Lap two: ${Math.round(MAST_LAP2_KM)} kilometres off. Each lap multiplies the miss by about ${Math.round(lapDrift(1, 1))}.`);
  await g.until(() => !p2.live);
  stats.halo.mast = true;
  await g.say('WREN', 'And it is gone, out to the stars. A metre high and it spirals out; a metre low and it spirals in, through the horizon. The photon sphere is a knife edge. Nothing stays on it for long.');
  await g.say('INES', 'Like balancing a pencil on its point. Okay. I\'ve seen light go in a circle. Take us home, doc.');

  st.step = 'done';
  g.objective('Return to 10 rₛ (helm)');
  await g.until(() => g.shipR > R_STATION - 0.05);
  g.ticks.delete(tick);
  if (helmBefore) g.on('helm', helmBefore);
  g.objective(null);
  stats.halo.done = true;
  g.flags.haloDone = true;
  await g.say('WREN', 'Back at station. I have added the laser test to the expedition log.');
  g.save('epilogue');
  await logbook?.();
}
