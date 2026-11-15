// Console apps (DOM panels opened at a console) and the drawings on the ship's own screens.
// Physics runs live in the world (createRun); apps and screens only look at them.
import { h, loop, slider, stat, hero, meter, sparkline } from '../ui/dom.js';
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
// One look for every wall and console screen: a dark glass face, a title bar with an amber rule,
// faint corner brackets, and status words in colour (ready, locked, spent...).
function screenChrome(ctx, w, hh) {
  ctx.strokeStyle = 'rgba(255,200,130,.35)'; ctx.lineWidth = Math.max(1, hh * 0.006);
  const m = hh * 0.035, L = hh * 0.07;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, hh - m, 1, -1], [w - m, hh - m, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
  }
}
export function screenFrame(ctx, w, hh, title, sub) {
  const g = ctx.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, '#0a0e1c'); g.addColorStop(1, '#05070f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
  // a faint grid, like a ruled instrument face
  ctx.strokeStyle = 'rgba(143,184,255,.05)'; ctx.lineWidth = 1;
  for (let x = w * 0.05; x < w; x += w * 0.075) { ctx.beginPath(); ctx.moveTo(x, hh * 0.22); ctx.lineTo(x, hh); ctx.stroke(); }
  for (let y = hh * 0.22; y < hh; y += hh * 0.1) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,200,130,.08)'; ctx.fillRect(0, 0, w, hh * 0.2);
  ctx.fillStyle = '#ffb45c'; ctx.fillRect(0, hh * 0.2, w, Math.max(2, hh * 0.006));
  ctx.fillStyle = '#ffc882'; ctx.font = `600 ${hh * 0.075}px ${MONO}`; ctx.fillText(title, w * 0.05, hh * 0.105);
  if (sub) { ctx.fillStyle = 'rgba(190,186,212,.95)'; ctx.font = `400 ${hh * 0.048}px ${MONO}`; ctx.fillText(sub, w * 0.05, hh * 0.17); }
  screenChrome(ctx, w, hh);
}
// the last word of a line, when it is a state, gets that state's colour
const STATE_COLOURS = { ready: '#7fd6a8', authorised: '#7fd6a8', docked: '#7fd6a8', 'by': '#7fd6a8', armed: '#ffb45c', locked: '#9b98b4', spent: '#9b98b4', fired: '#9b98b4' };
export function screenLines(ctx, w, hh, lines, y0 = 0.32, color = '#ece8f4') {
  ctx.font = `500 ${hh * 0.062}px ${MONO}`;
  lines.forEach((l, i) => {
    const y = hh * (y0 + 0.04 + i * 0.115), m = l.match(/^(.*?)(\S+)\.?$/), word = m?.[2]?.toLowerCase().replace(/\W/g, '');
    const c = STATE_COLOURS[word];
    if (!c || !m[1].trim()) { ctx.fillStyle = color; ctx.fillText(l, w * 0.06, y); return; }
    ctx.fillStyle = color; ctx.fillText(m[1], w * 0.06, y);
    const x = w * 0.06 + ctx.measureText(m[1]).width;
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(w * 0.035, y - hh * 0.02, hh * 0.012, 0, 7); ctx.fill();
    ctx.fillText(m[2], x, y);
  });
}

const fieldViews = new WeakMap();
export function drawRunOnScreen(ctx, w, hh, run, title) {
  let fv = fieldViews.get(ctx.canvas); if (!fv) { fv = new FieldView(ctx.canvas, { R0: R_STATION }); fieldViews.set(ctx.canvas, fv); }
  // after a rescue, once the light of the engine burn arrives, the picture stops falling
  const climbing = run.saved && run.S() >= run.saved.seenAt;
  const s = climbing ? run.f.seenAt(run.saved.seenAt) : run.seen(), z = Math.exp(s.lnz);
  if (climbing) title = title.replace('as seen from the ship', 'engine burn seen, climbing home');
  fv.begin().hole().station().glow(s.r, { nm: 470 * z, flux: Math.exp(-4 * s.lnz) });
  ctx.fillStyle = 'rgba(5,7,15,.7)'; ctx.fillRect(0, 0, w, hh * 0.15); ctx.fillRect(0, hh * 0.84, w, hh * 0.16);
  ctx.fillStyle = '#ffb45c'; ctx.fillRect(0, hh * 0.15, w, Math.max(2, hh * 0.005));
  ctx.fillStyle = '#ffc882'; ctx.font = `600 ${hh * 0.062}px ${MONO}`; ctx.fillText(title, w * 0.04, hh * 0.1);
  // the one number that matters, big: how stretched its light is
  const zs = z < 1e4 ? z.toPrecision(3) : sig(z), red = z > 1.6;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(190,186,212,.95)'; ctx.font = `500 ${hh * 0.042}px ${MONO}`; ctx.fillText('LIGHT STRETCHED', w * 0.96, hh * 0.25);
  ctx.fillStyle = red ? '#ff8a7a' : '#ece8f4'; ctx.font = `600 ${hh * 0.12}px ${MONO}`; ctx.fillText(`×${zs}`, w * 0.96, hh * 0.37);
  ctx.textAlign = 'start';
  ctx.fillStyle = '#ece8f4'; ctx.font = `400 ${hh * 0.05}px ${MONO}`;
  ctx.fillText(`seen at ${(s.r / 2).toFixed(s.r < 2.02 ? 4 : 2)} rs    its clock ${s.tau.toFixed(2)} M`, w * 0.04, hh * 0.935);
  screenChrome(ctx, w, hh);
}

const diagrams = new WeakMap();
const fallerName = (run) => (run.kind === 'capsule' ? 'Ines' : run.kind === 'orpheus' ? 'Orpheus' : 'K-1');
export function drawMap(ctx, w, hh, run) {
  let d = diagrams.get(ctx.canvas);
  if (!d || d.f !== run.f) { d = new SpacetimeDiagram(ctx.canvas, run.f); d.names = { station: 'ship', faller: fallerName(run) }; diagrams.set(ctx.canvas, d); }
  d.S = run.S(); d.tau = run.tau(); d.cutTau = run.saved?.tau; d.signals = run.signals || []; d.rescues = run.fired != null ? [run.fired] : []; d.showDeadline = !!run.showDeadline;
  d.top = 44; d.draw();
  ctx.fillStyle = 'rgba(255,200,130,.08)'; ctx.fillRect(0, 0, w, hh * 0.085);
  ctx.fillStyle = '#ffb45c'; ctx.fillRect(0, hh * 0.085, w, Math.max(2, hh * 0.004));
  ctx.fillStyle = '#ffc882'; ctx.font = `600 ${hh * 0.05}px ${MONO}`; ctx.fillText('SPACETIME MAP · ' + fallerName(run), w * 0.03, hh * 0.06);
  ctx.fillStyle = 'rgba(190,186,212,.9)'; ctx.font = `400 ${hh * 0.028}px ${MONO}`; ctx.textAlign = 'right';
  ctx.fillText('gold: its path · blue: the ship · green: its signals', w * 0.97, hh * 0.058); ctx.textAlign = 'start';
}

export function drawClocks(ctx, w, hh, g) {
  ctx.fillStyle = '#070a14'; ctx.fillRect(0, 0, w, hh);
  const fmt = (s) => { const t = 6 * 3600 + 40 * 60 + s; const hhh = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, sec = Math.floor(t % 60); return `${String(hhh).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; };
  const rate = 1 / hoverRate(g.shipR);
  ctx.font = `500 ${hh * 0.5}px ${MONO}`; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffc882'; ctx.fillText(`SHIP ${fmt(g.clocks.ship)}`, w * 0.02, hh / 2);
  ctx.fillStyle = '#8fb8ff'; ctx.fillText(`RELAY ${fmt(g.clocks.relay)}`, w * 0.33, hh / 2);
  // say what the factor is: how much faster the far-away relay's clock runs than the ship's
  ctx.font = `500 ${hh * 0.36}px ${MONO}`;
  ctx.fillStyle = rate > 1.5 ? '#ff6b5c' : '#ece8f4'; ctx.fillText(`RELAY RUNS ×${rate.toFixed(rate < 10 ? 2 : 1)}  ${(g.shipR / 2).toFixed(2)} rs`, w * 0.635, hh / 2);
  ctx.textBaseline = 'alphabetic';
}

// ---------- apps ----------

const fact = (big, unit, text) => h('div.fp-fact', h('b', big, h('i', unit)), h('span', text));

export function datapadApp(body) {
  body.append(
    h('p.eyebrow', 'Datapad · expedition brief'),
    h('h3', 'Tern expedition to Erebus'),
    h('div.fp-facts',
      fact('120,000', ' suns', 'the mass of Erebus, a black hole drifting alone'),
      fact('354,000', ' km', 'its horizon radius, 1 rₛ: about the Earth–Moon distance'),
      fact('10', ' rₛ', 'where the Tern holds station, ten horizon radii out'),
      fact('0.59', ' s', 'one unit of black-hole time, 1 M (GM/c³)')),
    h('p', 'You are the expedition\'s relativist. The question you came to settle is an old one: from far away, nothing is ever seen to fall into a black hole. It slows, reddens and freezes at the edge. Does it fall in anyway?'),
    h('section.fp-sec', h('p.who', 'Plan for today'),
      h('ol.fp-plan',
        h('li', h('b', 'Beacon K-1'), ' drop it and log its signal (probe console)'),
        h('li', h('b', 'Capsule survey'), ' Ines flies out to sample the disk light (comms)'),
        h('li', h('b', 'Descent trial'), ' take the ship down, field permitting (helm)'),
        h('li', h('b', 'Orpheus'), ' a camera probe sent all the way in (probe console, feed screen)'))),
    h('p.fine', 'Everything you see happens at its true speed.'),
  );
}

// one plain-words key for the units every panel uses, near the top where a first-timer looks
function glossary() {
  return h('dl.fp-gloss',
    h('div', h('dt', 'rₛ'), h('dd', 'horizon radius, 354,000 km. The ship holds at 10 rₛ.')),
    h('div', h('dt', 'M'), h('dd', 'the black hole\'s unit of time: 0.59 s here.')),
    h('div', h('dt', '1+z'), h('dd', 'redshift: how stretched light is. At 2, every wave arrives twice as long and the picture runs at half speed.')));
}

const fmtZ = (z) => (z < 1e4 ? z.toPrecision(3) : sig(z));
function zNote(z, lnz) {
  if (lnz > 9) return 'Stretched beyond any telescope. What you saw last was old light.';
  if (z < 1.05) return 'Its light arrives almost unstretched: what you see is close to how it is.';
  return `Every light wave arrives ${fmtZ(z)} times longer: it looks redder, and everything you see it do runs at 1/${fmtZ(z)} speed.`;
}

/**
 * Teaching charts for a falling run: 1+z climbing on the ship's clock, and the gaps between its
 * signals as they arrive. Both are computed from the physics, not recorded, so they are right the
 * moment the panel opens.
 */
function signalCharts(r, { signalName = 'ping' } = {}) {
  const f = r.f;
  const zHero = hero('Its light, stretched by', { note: '' });
  const zC = h('canvas.fp-spark'), gC = h('canvas.fp-spark');
  const gNote = h('p.fine');
  const el = h('section.fp-sec',
    h('p.who', 'Its signal, as it reaches you'),
    zHero.el, zC,
    h('p.fine', 'Redshift over time on your clock. The dashed line is ×2: from there on you see it at half speed or slower.'),
    gC, gNote);
  const arrivals = new Map(), arrive = (tau) => { if (!arrivals.has(tau)) arrivals.set(tau, f.messageArrival(tau)); return arrivals.get(tau); };
  let last = -1;
  function update(now) {
    const S = r.S(), s = r.seen(), z = Math.exp(s.lnz);
    zHero.set(s.lnz > 9 ? 'lost' : `×${fmtZ(z)}`, '', zNote(z, s.lnz));
    zHero.tone(s.lnz > 9 ? 'done' : z > 3 ? 'bad' : z > 1.6 ? 'warn' : '');
    if (now - last < 250) return; last = now;
    // 1+z against your clock
    const N = 48, zs = [];
    for (let i = 0; i <= N; i++) zs.push(Math.min(1e3, Math.exp(f.seenAt((S * i) / N).lnz)));
    sparkline(zC, zs, { kind: 'line', color: '#ff8a7a', min: 1, max: 3, log: true, refs: [{ y: 2, label: '×2' }], xLabel: `release → now, ${Math.round(S * SEC_PER_M)} s on your clock` });
    // gaps between the signals that have arrived
    const got = (r.signals || []).map((x) => x.tau).filter((t) => S >= arrive(t)).sort((a, b) => a - b);
    const gaps = [], sent = got.length ? got[0] * SEC_PER_M : 0;
    let prevA = 0; for (const t of got) { const a = arrive(t); gaps.push((a - prevA) * SEC_PER_M); prevA = a; } // release is seen at once
    sparkline(gC, gaps.slice(-24), { kind: 'bars', color: '#7fd6a8', min: 0, max: sent * 2, refs: sent ? [{ y: sent, label: `sent every ${sent.toFixed(1)} s` }] : [], xLabel: `gap between ${signalName}s as they arrive` });
    gNote.textContent = !got.length ? `No ${signalName} has reached you yet.`
      : gaps.length < 2 ? `${got.length} ${signalName} received. Watch the next gaps.`
        : `Last gap: ${gaps[gaps.length - 1].toFixed(1)} s, for ${sent.toFixed(1)} s on its clock. Each one climbs out of a deeper well than the last.`;
  }
  return { el, update };
}

/** Beacon or Orpheus launcher, with the live station view and the probe's own telemetry. */
export function probeApp(body, g, { run, canLaunch, onLaunch, name }) {
  const wrap = h('div.fp-stack');
  body.append(wrap);
  let panels = null;
  const stop = loop((dt, now) => {
    const r = run();
    if (!r && !panels) {
      if (!wrap.firstChild) {
        const can = canLaunch();
        wrap.append(
          h('p.eyebrow', 'Probe console'), h('h3', name),
          h('p', `Released from rest beside the ship, 10 rₛ from Erebus, the black hole. It carries a clock and a beacon${/orpheus/i.test(name) ? ', and a camera that sends a frame home every few seconds of its own time' : ''}.`),
          h('div.fp-facts',
            fact('10', ' rₛ', 'its starting height, ten horizon radii'),
            fact(/orpheus/i.test(name) ? 'camera' : 'every 10', /orpheus/i.test(name) ? '' : ' M', /orpheus/i.test(name) ? 'frames sent home as it falls' : 'a ping on its own clock, about 6 s')),
          h('button.primary.big#fp-launch', { disabled: !can, onclick: () => { onLaunch(); } }, can ? `Launch ${name}` : `${name}: locked`),
          h('p.fine', { hidden: can }, /orpheus/i.test(name) ? 'Locked for now: the survey plan launches Orpheus after the descent trial.' : 'Locked for now: the survey plan launches it later.'));
      }
      return;
    }
    if (r && (!panels || panels.run !== r)) {
      wrap.replaceChildren();
      const st = stationPanel(r.f, { title: 'Ship · what you see', clockNote: 'ship clock', tag: name.replace('Beacon ', ''), hints: true }), pr = probePanel(r.f, { title: `${name} · its own clock` });
      const own = h('b'), seen = h('b'), gap = h('p.fp-gap');
      const head = h('div.fp-twoclocks',
        h('div', h('span', 'Its own clock'), own, h('small', 'what it lives through')),
        h('div', h('span', 'Its clock, as you see it'), seen, h('small', 'read off its light')), gap);
      const charts = signalCharts(r, { signalName: /orpheus/i.test(name) ? 'signal' : 'ping' });
      panels = { run: r, st, pr, own, seen, gap, charts };
      wrap.append(h('p.eyebrow', `Probe console · ${name} away`), head, charts.el, glossary(), st.el, pr.el);
    }
    if (panels) {
      const R = panels.run, tau = R.tau(), s = R.seen(), f = R.f;
      panels.own.textContent = tau >= f.tauEnd ? 'ended' : `${tau.toFixed(1)} M`;
      panels.seen.textContent = `${s.tau.toFixed(1)} M`;
      const behind = tau - s.tau;
      panels.gap.textContent = tau >= f.tauH ? `It has crossed the horizon. You will never see the moment it did: its last light is still climbing out, slower and redder.`
        : behind < 0.3 ? 'The picture you see is almost live.' : `The picture is ${behind.toFixed(1)} M (${(behind * SEC_PER_M).toFixed(1)} s) behind its clock, and falling further behind.`;
      panels.gap.className = 'fp-gap' + (tau >= f.tauH ? ' bad' : behind > 5 ? ' warn' : '');
      panels.charts.update(now);
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
  if (!r) {
    body.append(h('p.eyebrow', 'Comms'), h('h3', 'Capsule channel'), h('p', 'Channel open. No traffic.'),
      h('p.fine', 'Ines\'s capsule talks to the ship on this console. The recall beam, a light-speed command to fire her engine, is sent from here too.'));
    return null;
  }
  const st = stationPanel(r.f, { title: 'Capsule · what you see', clockNote: 'ship clock', subject: 'Her', tag: 'Ines', hints: true });
  const after = h('p.fp-gap', { hidden: true });
  const fire = h('button.danger.big#fp-fire', { onclick: () => { onFire(); fire.disabled = true; fire.textContent = 'Recall beam fired'; } }, 'Fire recall beam');
  if (r.fired != null) { fire.disabled = true; fire.textContent = 'Recall beam fired'; }
  const msgs = h('div.fp-msgs');
  // the deadline is a calculation, not something you can see: show it as a plain clock and a fuse
  const D = r.f.rescueDeadline * SEC_PER_M;
  const fuse = meter({ min: 0, max: D * 1.08, ticks: [[0, 'mayday'], [D, 'deadline']], zones: [[D - 30, 'warn'], [D - 10, 'bad']], label: 'Time since her mayday, against the deadline' });
  const clock = h('p.fp-deadline');
  let diag = null, diagCanvas = null;
  // the Fire button, the fuse and her words stay in view together
  body.append(h('p.eyebrow', 'Comms · capsule channel'),
    h('div.fp-action', fire, fuse.el, clock),
    after, h('p.who', 'Ines, as received'), msgs, glossary(), st.el);
  if (showMap) {
    diagCanvas = h('canvas.diagram.small'); diag = new SpacetimeDiagram(diagCanvas, r.f); diag.showDeadline = true; diag.names = { station: 'ship', faller: 'Ines' };
    body.append(h('p.who', 'Spacetime map'), diagCanvas, h('p.fine', 'The red dashed line is the last inward light ray that meets her outside the horizon.'));
  }
  let n = 0;
  let frozenAt = null;
  const stop = loop(() => {
    const S = r.S();
    const since = S * SEC_PER_M, left = (r.f.rescueDeadline - (r.fired ?? S)) * SEC_PER_M;
    clock.textContent = r.fired != null ? `Beam fired ${Math.round(since - (S - r.fired) * SEC_PER_M)} s after her mayday, ${left >= 0 ? `${Math.round(left)} s before the deadline` : `${Math.round(-left)} s after the deadline`}.`
      : left > 0 ? `Since her mayday: ${Math.floor(since)} s. The beam must leave within ${Math.max(1, Math.round(r.f.rescueDeadline * SEC_PER_M) - Math.floor(since))} s.` : `Since her mayday: ${Math.floor(since)} s. The deadline has passed.`;
    clock.classList.toggle('late', r.fired == null && left < 10);
    fuse.set((r.fired ?? S) * SEC_PER_M, r.fired != null ? (left >= 0 ? 'good' : 'bad') : undefined);
    if (r.saved) {
      after.hidden = false;
      if (S < r.saved.seenAt) { after.textContent = 'Beam delivered. The picture below is old light from before it reached her: it will keep falling until the light of her engine burn arrives.'; after.className = 'fp-gap warn'; }
      else { if (frozenAt == null) frozenAt = r.saved.seenAt; after.textContent = `Engine burn seen at ${(r.saved.r / 2).toFixed(2)} rₛ. She is climbing out and coming home.`; after.className = 'fp-gap'; }
    }
    st.update(frozenAt ?? S, { mass: HOLE.mass });
    if (frozenAt != null) st.status.set('Climbing. Her engine burn has reached you: from here on the picture shows her coming home.');
    while (n < r.log.length) { const m = r.log[n++]; msgs.prepend(h('p', { style: m.style || {} }, m.text)); }
    if (diag) { diag.S = r.S(); diag.tau = r.tau(); diag.cutTau = r.saved?.tau; diag.rescues = r.fired != null ? [r.fired] : []; diag.draw(); }
  });
  return stop;
}

const key = (cls, text) => h('li', h('i.' + cls), text);

export function mapApp(body, g, { run }) {
  const r = run();
  if (!r) {
    body.append(h('p.eyebrow', 'Spacetime map'), h('h3', 'Nothing plotted yet'),
      h('p', 'This screen draws a falling object\'s path through space and time, with the light it sends home. It fills in once the first probe is away.'));
    return null;
  }
  const who = r.kind === 'capsule' ? 'Ines\'s capsule' : r.kind === 'orpheus' ? 'Orpheus' : 'beacon K-1';
  const c = h('canvas.diagram'); const d = new SpacetimeDiagram(c, r.f); d.names = { station: 'ship', faller: fallerName(r) };
  const legend = h('ul.fp-key',
    key('gold', `${who}'s path`),
    key('blue', 'the ship, holding at 10 rₛ'),
    key('green', 'its signals, climbing out to you'),
    key('horizon', 'the horizon: no way back below it'),
    key('sing', 'the singularity: where every path inside ends'),
    r.saved ? key('climb', 'her climb home after the recall beam') : null,
    key('cone', 'light cones: the directions light can go'));
  const lastChance = h('li', h('i.last'), 'last chance: the latest a beam from the ship could still reach her');
  body.append(h('p.eyebrow', 'Spacetime map'), h('h3', r.kind === 'capsule' ? 'Ines\'s fall' : r.kind === 'orpheus' ? 'Orpheus' : 'Beacon K-1'), c, legend,
    h('section.fp-sec', h('p.who', 'How to read it'),
      h('p', `Time runs to the right; height above the centre runs up. ${r.saved ? 'Her path stops where the recall beam reached her, and the dashed green line climbs home. ' : ''}The green lines are its signals: the closer to the horizon they start, the longer they hug it before escaping, which is why they reach you late.`),
      h('p', 'At the horizon the outward edge of each light cone lies flat: even light aimed straight up stays put. Inside, every direction leads down.')));
  return loop(() => {
    d.S = r.S(); d.tau = r.tau(); d.cutTau = r.saved?.tau; d.signals = r.signals || []; d.rescues = r.fired != null ? [r.fired] : []; d.showDeadline = !!r.showDeadline; d.draw();
    if (d.showDeadline && !lastChance.isConnected) legend.append(lastChance);
  });
}

export function helmApp(body, g, { onTarget }) {
  const target = slider('Hold station at', { id: 'fp-alt', min: Math.log10(0.03), max: Math.log10(9), step: 0.001, value: Math.log10(g.helmTarget / 2 - 1), fmt: (x) => (x >= Math.log10(9) - 0.002 ? '10 rₛ' : `${sig(1 + 10 ** x, 4)} rₛ`) });
  target.input.addEventListener('input', () => onTarget(2 * (1 + 10 ** target.value)));
  const rateHero = hero('Far-away clocks run', { note: '' });
  const rateMeter = meter({ min: 1, max: 8, log: true, ticks: [[1, '×1'], [2, '×2 · 1.33 rₛ'], [4, '×4 · 1.07 rₛ'], [8, '×8']], zones: [[2, 'warn'], [4, 'bad']], label: 'How much faster far-away clocks run than the ship\'s' });
  const sR = stat('Altitude now', '–', 'in horizon radii; 1 rₛ is the horizon'), sGain = stat('Relay clock ahead of yours', '–', 'gained since you woke');
  const sField = stat('Field strength', '–', 'what holds the ship up; nobody aboard feels it'), sTide = stat('Stretch across the hull', '–', 'pull at the bow minus pull at the stern, 40 m apart');
  const up = h('button#fp-home', { onclick: () => { target.value = Math.log10(9); onTarget(R_STATION); } }, 'Return to 10 rₛ');
  const rearC = h('canvas.fp-feed', { hidden: true }); rearC.width = 640; rearC.height = 360;
  const rearNote = h('p.fine', { hidden: true }, 'Rear camera, looking away from Erebus. Hovering this low, every star in the sky is squeezed into this view; the bright ring is the inner edge of the accretion disk, which now surrounds the ship.');
  body.append(h('p.eyebrow', 'Helm · station-keeping field'),
    h('section.fp-sec', rateHero.el, rateMeter.el),
    h('div.fp-action', target.el, up),
    h('div.stats', sR.el, sGain.el, sField.el, sTide.el), rearC, rearNote,
    h('p.fine', 'The field pushes every atom aboard equally, so nobody feels it. Pushing everything at once is indistinguishable from standing still: that is the equivalence principle. The field cannot hold the ship below about 1.03 rₛ.'));
  return loop(() => {
    const deep = !!g.rear && g.shipR < 6;
    rearC.hidden = !deep; rearNote.hidden = !deep;
    if (deep) drawRear(rearC.getContext('2d'), rearC.width, rearC.height, g);
    const rate = 1 / hoverRate(g.shipR);
    rateHero.set(`×${rate.toFixed(rate < 10 ? 3 : 1)}`, ' faster than yours', `For every second aboard, ${rate.toFixed(2)} seconds pass on the relay far away.`);
    rateHero.tone(rate >= 4 ? 'bad' : rate >= 2 ? 'warn' : '');
    rateMeter.set(rate);
    sR.set(`${(g.shipR / 2).toFixed(3)} rₛ`);
    sGain.set(formatDuration(Math.max(0, g.clocks.relay - g.clocks.ship)));
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
  // signal strength, like a phone's bars: fewer as the carrier is stretched away
  const bars = st.frames === 0 ? 0 : Math.max(isFinite(st.nextIn) ? 1 : 0, Math.round(4 * (1 - noise)));
  for (let i = 0; i < 4; i++) {
    const bh = hh * (0.025 + i * 0.012), x = w * 0.9 + i * w * 0.018;
    ctx.fillStyle = i < bars ? (bars <= 1 ? '#ff8a7a' : '#7fd6a8') : 'rgba(255,255,255,.18)';
    ctx.fillRect(x, hh * 0.97 - bh, w * 0.011, bh);
  }
}

export function feedApp(body, g, { feedState, feed }) {
  const c = h('canvas.fp-feed'); c.width = 960; c.height = 540;
  const ctx = c.getContext('2d');
  const from = hero('Last frame sent from', { note: '' }), due = stat('Next frame due', '–', 'on your clock'), count = stat('Frames received', '0', 'one sent every few seconds of its time');
  const gC = h('canvas.fp-spark'), gNote = h('p.fine');
  body.append(h('p.eyebrow', 'Orpheus · camera feed'), c,
    h('section.fp-sec', from.el, h('div.stats', count.el, due.el), gC, gNote),
    h('p', 'Each frame is rendered from where Orpheus was when it sent it. Frames from closer to the horizon take longer to climb out, so they arrive further and further apart, on a fainter and fainter signal.'));
  const arrivals = [];
  let last = -1;
  return loop((dt, now) => {
    const st = feedState();
    drawFeed(ctx, c.width, c.height, feed, st);
    if (!st.frames) { from.set('—', '', 'Waiting for the first frame to climb out to you.'); due.set(isFinite(st.nextIn) ? `${st.nextIn.toFixed(1)} s` : '–'); return; }
    from.set((st.rSent / 2).toFixed(3), ' rₛ', isFinite(st.nextIn) ? 'The horizon is at 1 rₛ. Each frame left from deeper than the one before.' : 'This is the last frame that will ever arrive. Everything Orpheus sent later is still climbing, and never gets out.');
    from.tone(isFinite(st.nextIn) ? (st.rSent < 2.4 ? 'warn' : '') : 'bad');
    count.set(String(st.frames));
    due.set(isFinite(st.nextIn) ? `in ${st.nextIn.toFixed(1)} s` : 'never');
    if (now - last < 250) return; last = now;
    // gaps between frame arrivals, from the physics: frame k left at k × (its frame interval)
    const r = g.orpheus, step = st.tauSent / st.frames;
    if (r && step > 0) {
      while (arrivals.length < st.frames) arrivals.push(r.f.messageArrival((arrivals.length + 1) * step));
      const gaps = arrivals.map((a, i) => (a - (i ? arrivals[i - 1] : 0)) * SEC_PER_M), sent = step * SEC_PER_M;
      sparkline(gC, gaps.slice(-30), { kind: 'bars', color: '#8fb8ff', min: 0, max: sent * 3, refs: [{ y: sent, label: `sent every ${sent.toFixed(1)} s` }], xLabel: 'gap between frames as they arrive' });
      gNote.textContent = `Last gap: ${gaps[gaps.length - 1].toFixed(1)} s. On Orpheus's own clock they are all ${sent.toFixed(1)} s apart.`;
    }
  });
}

/** The archive terminal: the original chapters, run inside the ship. */
export function archiveApp(body, g, { chapters }) {
  const host = h('div.fp-archive-host');
  let stop = null;
  const list = h('div.fp-archive-list', chapters.map((c, i) => h('button.fp-arch', { onclick: (e) => open(c, e.currentTarget) }, h('b', String(i + 1).padStart(2, '0')), h('span', c.title, c.kicker ? h('small', c.kicker) : null))));
  body.append(h('p.eyebrow', 'Archive · lab terminal'), h('h3', 'Training simulations'), h('p', 'From the expedition library. Each one isolates one idea, with the controls in your hands.'), list, host);
  function open(c, btn) {
    for (const b of list.children) b.classList.toggle('on', b === btn);
    stop?.(); host.replaceChildren(h('h3', c.title), h('p.fine', c.kicker));
    const inner = h('div.ch-body'); host.append(inner);
    stop = c.mount(inner, { goal() {}, debrief: ({ title, body: paras }) => host.append(h('section.debrief', h('h3', title), ...paras.map((p) => h('p', p)))) });
    host.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }
  return () => stop?.();
}

export { formatDuration, SEC_PER_M };
