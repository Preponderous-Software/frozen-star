// The two synchronized views used in the early chapters: what the station sees, and what the probe lives through.
import { h, stat, status, log } from './dom.js';
import { FieldView } from './scene2d.js';
import { formatDuration, formatAccel, secondsFromM, sig } from '../physics/units.js';
import { tidalStretch } from '../physics/body.js';

const EMIT_NM = 470; // the probe's beacon is blue

// tag: a name drawn beside the falling dot. hints: a plain-words line under each readout.
export function stationPanel(f, { title = 'Station · what you see', clockNote = 'station clock', subject = 'Probe', tag = '', hints = false } = {}) {
  const canvas = h('canvas.field', { 'aria-label': 'What the station sees of the probe' });
  const clock = h('div.clock');
  const hint = (t) => (hints ? t : undefined);
  const seenTau = stat(`${subject} clock you see`, '–', hint('read off its light')), seenZ = stat('Redshift 1+z', '–', hint('how stretched its light is')),
    seenB = stat('Brightness', '–', hint('of what it was beside you')), seenR = stat('Appears at', '–', hint('where that light left it'));
  const st = status('The probe hangs beside the station, ready to drop.');
  const lg = log();
  const el = h('section.view',
    h('div.view-head', h('span.who', title), h('span.fine', clockNote)),
    canvas, clock, h('div.stats', seenTau.el, seenZ.el, seenB.el, seenR.el), st.el, lg.el);
  const view = new FieldView(canvas, { R0: f.R0 });

  function update(S, { mass, pulses = [] } = {}) {
    const s = f.seenAt(S), z = Math.exp(s.lnz), flux = Math.exp(-4 * s.lnz), nm = EMIT_NM * z;
    view.begin().hole().station().glow(s.r, { nm, flux });
    for (const p of pulses) view.pulse(p.r, p.color);
    if (tag && S > 0 && s.lnz <= 9) {
      const { ctx, d, cy } = view, x = view.x(s.r);
      ctx.font = `500 ${11 * d}px "IBM Plex Mono", ui-monospace, monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(236,232,244,.92)'; ctx.fillText(`${tag} ▾`, x, cy - 20 * d);
      ctx.textAlign = 'start';
    }
    clock.innerHTML = `${S.toFixed(1)} M<small>${formatDuration(secondsFromM(S, mass))} for this hole</small>`;
    seenTau.set(`${s.tau.toFixed(3)} M`);
    seenZ.set(s.lnz < Math.log(1e4) ? z.toPrecision(4) : s.lnz < 200 ? sig(z) : `e<sup>${s.lnz.toFixed(0)}</sup>`);
    seenB.set(flux > 1e-3 ? `${(flux * 100).toPrecision(3)}%` : `10<sup>${Math.floor(-4 * s.lnz / Math.LN10)}</sup>`);
    seenR.set(`${(s.r / 2).toFixed(s.r < 2.01 ? 6 : 2)} r<sub>s</sub>`);
    if (S <= 0) st.set('The probe hangs beside the station, ready to drop.');
    else if (s.lnz > 9) st.set('Gone. Its light is stretched more than 8,000 times and too faint for any telescope. What you last saw was old light.', 'done');
    else if (nm > 780 && s.r > 2.3) st.set('Too red to see by eye now: its light has slid into the infrared. It is still falling, but from here it seems to crawl.', 'bad');
    else if (nm > 780) st.set('Frozen at the horizon and too red to see by eye. An infrared telescope still catches it, barely. Its clock has nearly stopped.', 'bad');
    else if (z > 1.6) st.set('Slowing and reddening. Each ping takes longer to reach you than the one before.', 'warn');
    else st.set('Falling. It looks almost normal from here.');
    return s;
  }
  return { el, update, log: lg, status: st };
}

export function probePanel(f, { title = 'Probe · its own clock' } = {}) {
  const canvas = h('canvas.field', { 'aria-label': 'The probe falling, on its own clock' });
  const clock = h('div.clock');
  const pR = stat('Distance'), pTide = stat('Tidal stretch'), pH = stat('Crosses horizon at'), pLight = stat('Light sent outward');
  const st = status('Its clock ticks at one second per second, as every clock does for whoever carries it.');
  const lg = log();
  const el = h('section.view',
    h('div.view-head', h('span.who', title), h('span.fine', 'proper time τ')),
    canvas, clock, h('div.stats', pR.el, pTide.el, pH.el, pLight.el), st.el, lg.el);
  const view = new FieldView(canvas, { R0: f.R0 });

  function update(tau, { mass, started = true } = {}) {
    const inside = tau >= f.tauH, done = tau >= f.tauEnd - 1e-9, r = done ? 0 : f.rOfTau(tau);
    const tg = done ? Infinity : tidalStretch(r, mass) / 9.80665;
    const stretch = 1 + Math.min(6, Math.max(0, Math.log10(Math.max(1, tg)) / 1.5));
    view.begin({ inside }).hole().station();
    if (!done) view.body(r, { stretch, inside });
    clock.innerHTML = `${tau.toFixed(2)} M<small>${formatDuration(secondsFromM(tau, mass))} on the probe</small>`;
    pR.set(`${(r / 2).toFixed(r < 2.05 ? 4 : 2)} r<sub>s</sub>`);
    pTide.set(done ? '∞' : formatAccel(tg * 9.80665));
    pH.set(`τ = ${f.tauH.toFixed(2)} M`);
    pLight.set(inside ? '<span class="bad-t">trapped</span>' : '<span class="ok-t">escapes</span>');
    if (!started) st.set('Its clock ticks at one second per second, as every clock does for whoever carries it.');
    else if (done) st.set(`Reached r = 0, ${formatDuration(secondsFromM(f.tauEnd - f.tauH, mass))} after crossing. The station still sees it above the horizon.`, 'done');
    else if (inside) st.set('Inside. Every path now leads to r = 0, and no message can get out. Crossing felt like nothing at all.', 'bad');
    else if (tg > 1e4) st.set('Torn apart. On a hole this small, tides shred the probe before it even reaches the horizon.', 'bad');
    else if (f.tauH - tau < 12) st.set('Close to the horizon. Nothing marks it locally: no wall, no flash.', 'warn');
    else st.set('Falling. Its clock ticks normally.');
    return { r, inside, done };
  }
  return { el, update, log: lg, status: st };
}
