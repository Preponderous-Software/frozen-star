// Console apps (DOM panels opened at a console) and the drawings on the ship's own screens.
// Physics runs live in the world (createRun); apps and screens only look at them.
import { h, loop, slider, stat } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { FieldView, wavelengthRGB } from '../ui/scene2d.js';
import { SpacetimeDiagram } from '../ui/diagram.js';
import { stationPanel, probePanel } from '../ui/panels.js';
import { hoverRate, hoverAccel, tidalStretch } from '../physics/body.js';
import { formatAccel, formatDuration, sig } from '../physics/units.js';
import { BlackHoleView, lookBasis, fallerVelocity, hoverVelocity } from '../render/raytracer.js';
import { HOLE, SEC_PER_M, R_STATION, shipPosition } from './world.js';

const MONO = '"IBM Plex Mono", ui-monospace, monospace';

// ---------- physics runs ----------
export function createRun(g, kind) {
  const f = new Infall(R_STATION), t0 = g.physicsNow();
  const run = {
    kind, f, t0, log: [], fired: null,
    S: () => Math.max(0, g.physicsNow() - t0),
    tau: () => Math.min(f.tauEnd, Math.max(0, g.physicsNow() - t0)),
    seen: () => f.seenAt(Math.max(0, g.physicsNow() - t0)),
  };
  return run;
}

/** A window marker for a run: the probe's light as the ship receives it. */
export function runMarker(run, { nm0 = 470, size = 0.005, name = 'K-1' } = {}) {
  return () => {
    if (run.hidden) return null;
    const s = run.seen(), z = Math.exp(s.lnz), nm = nm0 * z, flux = Math.exp(-4 * s.lnz);
    if (s.lnz > 9) return null;
    const visible = nm <= 790 && flux > 1e-4;
    const label = `${name}<br>1+z ${z < 1e4 ? z.toPrecision(3) : sig(z)} · its clock ${s.tau.toFixed(1)} M${visible ? '' : '<br>infrared only'}`;
    return { rgb: visible ? wavelengthRGB(nm).map((c) => Math.max(c, 0.05)) : [0, 0, 0], flux: visible ? Math.min(1, flux * 1.4) : 0, size: size * (0.6 + 0.4 * Math.min(1, flux * 2)), label };
  };
}

/** The run's carrier as a sound: pitch ÷ (1 + z), loudness by flux. */
export function carrierState(run, base = 660) {
  const s = run.seen(); if (s.lnz > 9) return null;
  return { freq: base / Math.exp(s.lnz), vol: 0.045 * Math.pow(Math.exp(-4 * s.lnz), 0.3) };
}

// ---------- shared drawing on in-ship screens ----------
export function screenFrame(ctx, w, hh, title, sub) {
  ctx.fillStyle = '#070a14'; ctx.fillRect(0, 0, w, hh);
  ctx.fillStyle = '#ffc882'; ctx.font = `500 ${hh * 0.06}px ${MONO}`; ctx.fillText(title, w * 0.04, hh * 0.1);
  if (sub) { ctx.fillStyle = 'rgba(155,152,180,.9)'; ctx.font = `400 ${hh * 0.045}px ${MONO}`; ctx.fillText(sub, w * 0.04, hh * 0.17); }
}
export function screenLines(ctx, w, hh, lines, y0 = 0.32, color = '#ece8f4') {
  ctx.fillStyle = color; ctx.font = `400 ${hh * 0.055}px ${MONO}`;
  lines.forEach((l, i) => ctx.fillText(l, w * 0.05, hh * (y0 + i * 0.1)));
}

const fieldViews = new WeakMap();
export function drawRunOnScreen(ctx, w, hh, run, title) {
  let fv = fieldViews.get(ctx.canvas); if (!fv) { fv = new FieldView(ctx.canvas, { R0: R_STATION }); fieldViews.set(ctx.canvas, fv); }
  const s = run.seen(), z = Math.exp(s.lnz);
  fv.begin().hole().station().glow(s.r, { nm: 470 * z, flux: Math.exp(-4 * s.lnz) });
  ctx.fillStyle = '#ffc882'; ctx.font = `500 ${hh * 0.06}px ${MONO}`; ctx.fillText(title, w * 0.04, hh * 0.1);
  ctx.fillStyle = '#ece8f4'; ctx.font = `400 ${hh * 0.05}px ${MONO}`;
  ctx.fillText(`seen at ${(s.r / 2).toFixed(s.r < 2.02 ? 4 : 2)} rs   1+z ${z < 1e4 ? z.toPrecision(3) : sig(z)}   its clock ${s.tau.toFixed(2)} M`, w * 0.04, hh * 0.94);
}

const diagrams = new WeakMap();
export function drawMap(ctx, w, hh, run) {
  let d = diagrams.get(ctx.canvas);
  if (!d || d.f !== run.f) { d = new SpacetimeDiagram(ctx.canvas, run.f); diagrams.set(ctx.canvas, d); }
  d.S = run.S(); d.tau = run.tau(); d.signals = run.signals || []; d.rescues = run.fired != null ? [run.fired] : []; d.showDeadline = !!run.showDeadline;
  d.draw();
  ctx.fillStyle = '#ffc882'; ctx.font = `500 ${hh * 0.05}px ${MONO}`; ctx.fillText('SPACETIME MAP · ' + (run.kind === 'capsule' ? 'capsule' : run.kind === 'orpheus' ? 'Orpheus' : 'beacon K-1'), w * 0.08, hh * 0.08);
}

export function drawClocks(ctx, w, hh, g) {
  ctx.fillStyle = '#070a14'; ctx.fillRect(0, 0, w, hh);
  const fmt = (s) => { const t = 6 * 3600 + 40 * 60 + s; const hhh = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, sec = Math.floor(t % 60); return `${String(hhh).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; };
  const rate = 1 / hoverRate(g.shipR);
  ctx.font = `500 ${hh * 0.5}px ${MONO}`; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffc882'; ctx.fillText(`SHIP ${fmt(g.clocks.ship)}`, w * 0.02, hh / 2);
  ctx.fillStyle = '#8fb8ff'; ctx.fillText(`RELAY ${fmt(g.clocks.relay)}`, w * 0.33, hh / 2);
  ctx.fillStyle = rate > 1.5 ? '#ff6b5c' : '#ece8f4'; ctx.fillText(`×${rate.toFixed(rate < 10 ? 3 : 1)}  ${(g.shipR / 2).toFixed(2)} rs`, w * 0.66, hh / 2);
  ctx.textBaseline = 'alphabetic';
}

// ---------- apps ----------

export function datapadApp(body) {
  body.append(
    h('p.eyebrow', 'Datapad · expedition brief'),
    h('h3', 'Tern expedition to Erebus'),
    h('p', 'Erebus is an intermediate-mass black hole of about 120,000 suns, drifting alone. Its horizon is 354,000 km in radius, close to the distance from the Earth to the Moon. Distances aboard are given in rₛ, horizon radii: we hold station at 10 rₛ.'),
    h('p', 'You are the expedition\'s relativist. The question you came to settle is an old one: from far away, nothing is ever seen to fall into a black hole. It slows, reddens and freezes at the edge. Does it fall in anyway?'),
    h('p', 'Plan for today: drop beacon probe K-1 and log its signal; capsule survey of the disk light (Ines); descent trial (field permitting); Orpheus camera probe.'),
    h('p.fine', 'At this mass one unit of black-hole time, GM/c³, is 0.59 seconds. Everything you see happens at its true speed.'),
  );
}

/** Beacon or Orpheus launcher, with the live station view and the probe's own telemetry. */
export function probeApp(body, g, { run, canLaunch, onLaunch, name }) {
  const wrap = h('div.fp-stack');
  body.append(wrap);
  let panels = null;
  const stop = loop(() => {
    const r = run();
    if (!r && !panels) {
      if (!wrap.firstChild) {
        wrap.append(
          h('p.eyebrow', 'Probe console'), h('h3', name),
          h('p', 'Released from rest beside the ship, 10 rₛ from Erebus. It carries a clock and a beacon.'),
          h('button.primary.big#fp-launch', { disabled: !canLaunch(), onclick: () => { onLaunch(); } }, `Launch ${name}`));
      }
      return;
    }
    if (r && (!panels || panels.run !== r)) {
      wrap.replaceChildren();
      const st = stationPanel(r.f, { title: 'Ship · what you see', clockNote: 'ship clock' }), pr = probePanel(r.f, { title: `${name} · its own clock` });
      const own = h('b'), seen = h('b'), gap = h('p.fp-gap');
      const head = h('div.fp-twoclocks',
        h('div', h('span', 'Its own clock'), own),
        h('div', h('span', 'Its clock, as you see it'), seen), gap,
        h('p.fp-legend', 'M is the black hole\'s natural unit of time: 1 M = 0.59 s at Erebus. rₛ is the horizon\'s radius (354,000 km); the ship holds at 10 rₛ.'));
      panels = { run: r, st, pr, own, seen, gap };
      wrap.append(head, st.el, pr.el);
    }
    if (panels) {
      const R = panels.run, tau = R.tau(), s = R.seen(), f = R.f;
      panels.own.textContent = tau >= f.tauEnd ? 'ended' : `${tau.toFixed(1)} M`;
      panels.seen.textContent = `${s.tau.toFixed(1)} M`;
      const behind = tau - s.tau;
      panels.gap.textContent = tau >= f.tauH ? `It has crossed the horizon. You will never see the moment it did: its last light is still climbing out, slower and redder.`
        : behind < 0.3 ? 'The picture you see is almost live.' : `The picture is ${behind.toFixed(1)} M (${(behind * SEC_PER_M).toFixed(1)} s) behind its clock, and falling further behind.`;
      panels.gap.className = 'fp-gap' + (tau >= f.tauH ? ' bad' : behind > 5 ? ' warn' : '');
      panels.st.update(panels.run.S(), { mass: HOLE.mass });
      panels.pr.update(panels.run.tau(), { mass: HOLE.mass });
      // mirror the run's log into the panels
      const lg = panels.run.log;
      if ((panels.n || 0) < lg.length) { for (let i = panels.n || 0; i < lg.length; i++) (lg[i].who === 'probe' ? panels.pr : panels.st).log.add(lg[i].text, lg[i].kind || ''); panels.n = lg.length; }
    }
  });
  return stop;
}

/** Comms console during the rescue: the capsule as seen, Ines's messages and the recall beam. */
export function commsApp(body, g, { run, onFire, showMap }) {
  const r = run();
  if (!r) { body.append(h('p.eyebrow', 'Comms'), h('p', 'Channel open. No traffic.')); return null; }
  const st = stationPanel(r.f, { title: 'Capsule · what you see', clockNote: 'ship clock', subject: 'Her' });
  const after = h('p.fp-gap', { hidden: true });
  const fire = h('button.danger.big#fp-fire', { onclick: () => { onFire(); fire.disabled = true; fire.textContent = 'Recall beam fired'; } }, 'Fire recall beam');
  if (r.fired != null) { fire.disabled = true; fire.textContent = 'Recall beam fired'; }
  const msgs = h('div.fp-msgs');
  let diag = null, diagCanvas = null;
  body.append(h('p.eyebrow', 'Comms · capsule channel'), fire, after, st.el, h('p.fp-legend', 'rₛ is the horizon\'s radius; the ship holds at 10 rₛ. M is black-hole time: 1 M = 0.59 s.'), h('p.who', 'Ines, as received'), msgs);
  if (showMap) {
    diagCanvas = h('canvas.diagram.small'); diag = new SpacetimeDiagram(diagCanvas, r.f); diag.showDeadline = true;
    body.append(h('p.who', 'Spacetime map'), diagCanvas, h('p.fine', 'The red dashed line is the last inward light ray that meets her outside the horizon.'));
  }
  let n = 0;
  let frozenAt = null;
  const stop = loop(() => {
    const S = r.S();
    if (r.saved) {
      after.hidden = false;
      if (S < r.saved.seenAt) { after.textContent = 'Beam delivered. The picture below is old light from before it reached her: it will keep falling until the light of her engine burn arrives.'; after.className = 'fp-gap warn'; }
      else { if (frozenAt == null) frozenAt = r.saved.seenAt; after.textContent = `Engine burn seen at ${(r.saved.r / 2).toFixed(2)} rₛ. She is climbing out and coming home.`; after.className = 'fp-gap'; }
    }
    st.update(frozenAt ?? S, { mass: HOLE.mass });
    while (n < r.log.length) { const m = r.log[n++]; msgs.prepend(h('p', { style: m.style || {} }, m.text)); }
    if (diag) { diag.S = r.S(); diag.tau = r.tau(); diag.rescues = r.fired != null ? [r.fired] : []; diag.draw(); }
  });
  return stop;
}

export function mapApp(body, g, { run }) {
  const r = run();
  if (!r) { body.append(h('p.eyebrow', 'Spacetime map'), h('p', 'Nothing has been plotted yet.')); return null; }
  const c = h('canvas.diagram'); const d = new SpacetimeDiagram(c, r.f);
  body.append(h('p.eyebrow', 'Spacetime map'), h('h3', r.kind === 'capsule' ? 'Ines\'s fall' : r.kind === 'orpheus' ? 'Orpheus' : 'Beacon K-1'), c,
    h('p', 'Time runs to the right, distance from the centre runs up. The gold line is the probe. Green lines are its signals climbing out: the closer to the horizon they start, the longer they hug it before escaping.'),
    h('p', 'Each little wedge is a light cone, the directions light can go. At the horizon the outward edge lies flat. Inside, every direction leads down to r = 0.'));
  return loop(() => { d.S = r.S(); d.tau = r.tau(); d.signals = r.signals || []; d.rescues = r.fired != null ? [r.fired] : []; d.showDeadline = !!r.showDeadline; d.draw(); });
}

export function helmApp(body, g, { onTarget }) {
  const target = slider('Hold station at', { id: 'fp-alt', min: Math.log10(0.03), max: Math.log10(9), step: 0.001, value: Math.log10(g.helmTarget / 2 - 1), fmt: (x) => (x >= Math.log10(9) - 0.002 ? '10 rₛ' : `${sig(1 + 10 ** x, 4)} rₛ`) });
  const mark = h('p.fp-legend', 'The relay clock runs twice as fast as yours below 1.33 rₛ, and four times as fast below 1.03 rₛ. The field cannot hold the ship below about 1.03 rₛ.');
  target.input.addEventListener('input', () => onTarget(2 * (1 + 10 ** target.value)));
  const sR = stat('Altitude now'), sRate = stat('Relay clock runs'), sField = stat('Field strength'), sTide = stat('Stretch across the hull');
  const up = h('button#fp-home', { onclick: () => { target.value = Math.log10(9); onTarget(R_STATION); } }, 'Return to 10 rₛ');
  const rearC = h('canvas.fp-feed', { hidden: true }); rearC.width = 640; rearC.height = 360;
  const rearNote = h('p.fine', { hidden: true }, 'Rear camera, looking away from Erebus. Hovering this low, every star in the sky is squeezed into this view; the bright ring is the inner edge of the accretion disk, which now surrounds the ship.');
  body.append(h('p.eyebrow', 'Helm · station-keeping field'), target.el, mark, up, h('div.stats.col', sR.el, sRate.el, sField.el, sTide.el), rearC, rearNote,
    h('p.fine', 'The field pushes every atom aboard equally, so nobody feels it. Pushing everything at once is indistinguishable from standing still: that is the equivalence principle.'));
  return loop(() => {
    const deep = !!g.rear && g.shipR < 6;
    rearC.hidden = !deep; rearNote.hidden = !deep;
    if (deep) drawRear(rearC.getContext('2d'), rearC.width, rearC.height, g);
    sR.set(`${(g.shipR / 2).toFixed(3)} rₛ`);
    sRate.set(`×${(1 / hoverRate(g.shipR)).toFixed(3)} faster than yours`);
    sField.set(formatAccel(hoverAccel(g.shipR, HOLE.mass)));
    sTide.set(formatAccel(tidalStretch(g.shipR, HOLE.mass, 40)));
  });
}

/** Orpheus camera feed: frames rendered from where the probe was when it sent them. */
export function createFeed() {
  const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 270;
  let view = null;
  try { view = new BlackHoleView(canvas, { scale: 1, preserve: true }); view.set({ steps: 520, diskOuter: 15 }); } catch { /* no WebGL 2 */ }
  const dir = shipPosition().map((v) => v / R_STATION);
  return {
    canvas,
    render(r, t) {
      if (!view) return;
      const pos = dir.map((v) => v * Math.max(0.35, r));
      view.set({ cam: pos, basis: lookBasis(pos, [0, 0, 0]), V: fallerVelocity(pos, Math.sqrt(1 - 2 / R_STATION)), fov: 1.25, time: t, disk: true });
      view.resize = () => {}; // fixed size, detached canvas
      view.render();
    },
    dispose() { view?.dispose(); },
  };
}

/** A camera looking aft from the hovering ship: at low altitude the whole sky is squeezed back there. */
export function createRearCam() {
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
  let view = null;
  try { view = new BlackHoleView(canvas, { scale: 1, preserve: true }); view.set({ steps: 360, diskOuter: 15 }); view.resize = () => {}; } catch { /* no WebGL 2 */ }
  return {
    canvas,
    render(r, t) {
      if (!view) return;
      const pos = shipPosition(r), away = pos.map((v) => v * 3);
      view.set({ cam: pos, basis: lookBasis(pos, away), V: hoverVelocity(pos), fov: 1.6, time: t, disk: true });
      view.render();
    },
  };
}

export function drawRear(ctx, w, hh, g) {
  ctx.drawImage(g.rear.canvas, 0, 0, w, hh);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, w, hh * 0.13);
  ctx.fillStyle = '#ffc882'; ctx.font = `500 ${hh * 0.055}px ${MONO}`;
  ctx.fillText(`REAR CAMERA · looking away from Erebus · ${(g.shipR / 2).toFixed(2)} rs`, w * 0.03, hh * 0.085);
}

export function drawFeed(ctx, w, hh, feed, st) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, hh);
  if (st.frames > 0) ctx.drawImage(feed.canvas, 0, 0, w, hh);
  // noise grows as the carrier is redshifted away
  const noise = Math.min(1, st.noise || 0);
  if (noise > 0.02 || st.frames === 0) {
    const n = st.frames === 0 ? 1 : noise, img = ctx.getImageData(0, 0, w, hh), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i] * (1 - n) + v * n; d[i + 1] = d[i + 1] * (1 - n) + v * n; d[i + 2] = d[i + 2] * (1 - n) + v * n; }
    ctx.putImageData(img, 0, 0);
  }
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, hh * 0.88, w, hh * 0.12);
  ctx.fillStyle = '#ffc882'; ctx.font = `500 ${hh * 0.045}px ${MONO}`;
  ctx.fillText(st.frames === 0 ? 'ORPHEUS · NO SIGNAL' : `ORPHEUS · frame ${st.frames} · sent at τ ${st.tauSent.toFixed(2)} M · ${st.status}`, w * 0.03, hh * 0.955);
}

export function feedApp(body, g, { feedState, feed }) {
  const c = h('canvas.fp-feed'); c.width = 960; c.height = 540;
  const ctx = c.getContext('2d');
  const info = h('p.fine');
  body.append(h('p.eyebrow', 'Orpheus · camera feed'), c, info,
    h('p', 'Each frame is rendered from where Orpheus was when it sent it. Frames from closer to the horizon take longer to climb out, so they arrive further and further apart, on a fainter and fainter signal.'));
  return loop(() => {
    const st = feedState();
    drawFeed(ctx, c.width, c.height, feed, st);
    info.textContent = st.frames ? `Frames received: ${st.frames}. Last one sent from ${(st.rSent / 2).toFixed(3)} rₛ. Next frame due: ${isFinite(st.nextIn) ? `${st.nextIn.toFixed(1)} s` : 'never'}.` : 'Waiting for the first frame.';
  });
}

/** The archive terminal: the original chapters, run inside the ship. */
export function archiveApp(body, g, { chapters }) {
  const host = h('div.fp-archive-host');
  let stop = null;
  const list = h('div.fp-archive-list', chapters.map((c, i) => h('button.chip', { onclick: () => open(c) }, `${i + 1}. ${c.title}`)));
  body.append(h('p.eyebrow', 'Archive · lab terminal'), h('p', 'Training simulations from the expedition library. Each one isolates one idea.'), list, host);
  function open(c) {
    stop?.(); host.replaceChildren(h('h3', c.title), h('p.fine', c.kicker));
    const inner = h('div.ch-body'); host.append(inner);
    stop = c.mount(inner, { goal() {}, debrief: ({ title, body: paras }) => host.append(h('section.debrief', h('h3', title), ...paras.map((p) => h('p', p)))) });
  }
  return () => stop?.();
}

export { formatDuration, SEC_PER_M };
