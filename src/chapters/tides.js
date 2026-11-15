import { h, loop, slider, stat } from '../ui/dom.js';
import { HOLES, formatMass, formatDuration, formatAccel, metersFromM, G_EARTH, expo, sig } from '../physics/units.js';
import { tidalStretch, tidalRadius, maxTimeInside, minMassForSafeCrossing } from '../physics/body.js';
import { brief, WORD_RS, WORD_G, WORD_HORIZON, WORD_SCI } from './lesson.js';

const LIMIT_G = 10; // what a trained, braced pilot survives across their body

export default {
  id: 'tides', num: 4, title: 'Pick Your Hole',
  kicker: 'Some black holes tear you apart. Some let you drift through. Choose.',
  goals: [`Cross the horizon under ${LIMIT_G} g of stretch`, 'Also get at least an hour inside', 'Do both with a real black hole'],
  mount(root, ctx) {
    const massS = slider('Mass', { id: 'td-mass', min: 0.5, max: 11, step: 0.01, value: 1, fmt: (v) => formatMass(10 ** v) });
    const picks = h('div.picks', HOLES.map((x) => h('button.chip', { id: `td-${x.id}`, onclick: () => { massS.value = Math.log10(x.mass); chosen = x; result = null; } }, x.name)));
    let chosen = null, anim = null, result = null;
    massS.input.addEventListener('input', () => { chosen = null; result = null; });
    const drop = h('button.primary#td-drop', 'Drop the pilot');
    const sH = stat('Stretch at the horizon'), sR = stat('Torn apart at'), sIn = stat('Longest time inside'), sSize = stat('Horizon radius');
    const plot = h('canvas.plot', { 'aria-label': 'Tidal stretch against distance' });
    const figure = h('canvas.figure', { 'aria-label': 'The pilot, stretched by tides' });
    const verdict = h('div.status');
    drop.addEventListener('click', () => { anim = { t: 0, mass: 10 ** massS.value, real: chosen }; result = null; });

    root.append(
      brief({
        goal: `Get a pilot through the horizon in one piece, with time to spare inside. Gravity pulls harder on whatever is closer, so near a black hole your feet are pulled harder than your head. That difference stretches you. Find a black hole where the stretch stays under ${LIMIT_G} g.`,
        steps: ['Pick a real black hole, or drag the mass slider.', 'Press Drop the pilot and watch the dot slide down the curve toward the horizon.', 'If the pilot is torn apart, ask yourself: does a heavier hole make it better or worse?'],
        words: [WORD_G, WORD_RS, WORD_HORIZON, ['Suns (mass)', 'Black holes are weighed in suns: 4 million suns is four million times the mass of our Sun.'], WORD_SCI],
      }),
      h('div.controls', massS.el, picks, drop),
      h('div.bench',
        h('section.view', h('div.view-head', h('span.who', 'Tidal stretch across a 2 m body'), h('span.fine', 'distance in horizon radii')), plot,
          h('p.fine', 'Every black hole has the same curve shape. A heavier hole slides it down: double the mass and the stretch at the horizon drops to a quarter.')),
        h('section.view', h('div.view-head', h('span.who', 'The pilot'), h('span.fine', `survives ${LIMIT_G} g of stretch`)), figure,
          h('div.stats', sH.el, sR.el, sIn.el, sSize.el), verdict)),
    );

    const stop = loop((dt) => {
      const M = anim ? anim.mass : 10 ** massS.value;
      const atH = tidalStretch(2, M) / G_EARTH, rTear = tidalRadius(M, LIMIT_G * G_EARTH), inside = maxTimeInside(M);
      sH.set(formatAccel(atH * G_EARTH));
      sR.set(rTear > 2 ? `${sig(rTear / 2)} rₛ (${km(metersFromM(rTear, M))})` : 'nowhere outside the horizon');
      sIn.set(formatDuration(inside));
      sSize.set(km(metersFromM(2, M)));
      // plot
      const c = fit(plot), { ctx: g, w, hh, d } = c;
      g.fillStyle = '#080a14'; g.fillRect(0, 0, w, hh);
      const pad = { l: 52 * d, r: 12 * d, t: 12 * d, b: 30 * d };
      const xMax = 6, yMin = -6, yMax = 14;
      const X = (rs) => pad.l + (rs / xMax) * (w - pad.l - pad.r), Y = (lg) => hh - pad.b - ((lg - yMin) / (yMax - yMin)) * (hh - pad.t - pad.b);
      g.font = `${10 * d}px "IBM Plex Mono", monospace`; g.fillStyle = 'rgba(155,152,180,.9)'; g.strokeStyle = 'rgba(155,152,180,.15)'; g.lineWidth = d;
      for (let e = yMin; e <= yMax; e += 4) { g.beginPath(); g.moveTo(pad.l, Y(e)); g.lineTo(w - pad.r, Y(e)); g.stroke(); g.fillText(`10${sup(e)} g`, 4 * d, Y(e) + 3 * d); }
      for (let x = 1; x <= xMax; x++) g.fillText(`${x}`, X(x) - 3 * d, hh - pad.b + 14 * d);
      g.fillText('distance from centre (rₛ)', X(2), hh - 4 * d);
      g.fillStyle = 'rgba(255,90,80,.08)'; g.fillRect(pad.l, pad.t, X(1) - pad.l, hh - pad.t - pad.b);
      g.setLineDash([5 * d, 4 * d]); g.strokeStyle = 'rgba(255,180,92,.75)'; g.beginPath(); g.moveTo(X(1), pad.t); g.lineTo(X(1), hh - pad.b); g.stroke();
      g.strokeStyle = 'rgba(255,107,92,.7)'; g.beginPath(); g.moveTo(pad.l, Y(Math.log10(LIMIT_G))); g.lineTo(w - pad.r, Y(Math.log10(LIMIT_G))); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,107,92,.95)'; g.fillText(`pilot's limit, ${LIMIT_G} g`, w - pad.r - 130 * d, Y(Math.log10(LIMIT_G)) - 5 * d);
      g.fillStyle = 'rgba(255,180,92,.95)'; g.fillText('horizon', X(1) + 4 * d, pad.t + 12 * d);
      g.strokeStyle = '#ffc882'; g.lineWidth = 2 * d; g.beginPath();
      for (let i = 0; i <= 200; i++) { const rs = 0.15 + (xMax - 0.15) * i / 200, lg = Math.log10(tidalStretch(rs * 2, M) / G_EARTH); const p = [X(rs), Y(Math.max(yMin - 1, Math.min(yMax + 1, lg)))]; i ? g.lineTo(...p) : g.moveTo(...p); }
      g.save(); g.beginPath(); g.rect(pad.l, pad.t, w - pad.l - pad.r, hh - pad.t - pad.b); g.clip(); g.stroke(); g.restore();
      // animation marker
      let rNow = xMax * 2, torn = false;
      if (anim) {
        anim.t += dt / 4; rNow = 2 * Math.max(0.15, xMax * (1 - anim.t) ** 1.6);
        torn = tidalStretch(rNow, M) / G_EARTH > LIMIT_G;
        const lg = Math.log10(tidalStretch(rNow, M) / G_EARTH);
        g.fillStyle = torn ? '#ff6b5c' : '#7fd6a8'; g.beginPath(); g.arc(X(rNow / 2), Y(Math.max(yMin, Math.min(yMax, lg))), 5 * d, 0, 7); g.fill();
        if (anim.t >= 1 || (torn && rNow > 2)) finish(rNow > 2 && torn, M, inside, anim.real);
      }
      drawFigure(figure, anim ? tidalStretch(rNow, M) / G_EARTH : atH, torn);
      if (result) { verdict.textContent = result[0]; verdict.className = 'status ' + result[1]; }
      else if (!anim) { verdict.textContent = atH > LIMIT_G ? `At the horizon the stretch is ${formatAccel(atH * G_EARTH)}. The pilot would not survive the approach. Drop to see where it happens.` : `At the horizon the stretch is ${formatAccel(atH * G_EARTH)}. The pilot would barely notice. Drop to try it.`; verdict.className = 'status' + (atH > LIMIT_G ? ' bad' : ' good'); }
      else { verdict.textContent = 'Falling…'; verdict.className = 'status'; }
    });

    function finish(tornOutside, M, inside, real) {
      anim = null;
      if (tornOutside) { result = [`Torn apart ${sig(tidalRadius(M, LIMIT_G * G_EARTH) / 2)} rₛ from the centre, before reaching the horizon. A small hole packs its mass into a tiny space, so its horizon sits very close to the centre, where the pull changes sharply across a body. Try a heavier hole.`, 'bad']; return; }
      const hour = inside >= 3600;
      result = [`Crossed in one piece. At most ${formatDuration(inside)} until the centre${hour ? '.' : ', short of an hour. Heavier holes give you longer inside.'}${hour && !real ? ' Now try it with one of the real black holes.' : ''}`, 'good'];
      ctx.goal(0, true);
      if (hour) ctx.goal(1, true);
      if (hour && real) {
        ctx.goal(2, true);
        ctx.debrief({
          title: 'Bigger is gentler',
          body: [
            `Double a black hole's mass and the stretch at its horizon drops to a quarter. Below about ${formatMass(minMassForSafeCrossing(LIMIT_G * G_EARTH))} the stretch at the horizon passes ${LIMIT_G} g, so black holes made by dying stars, a few to a few dozen suns, shred anything long before it arrives.`,
            `${real.name} is so large that its horizon is ${km(metersFromM(2, real.mass))} across, and space there is almost flat over the length of a person.`,
            `Time inside also grows with mass. The longest anyone can last between horizon and centre grows in step with the mass: for ${real.name} it is ${formatDuration(maxTimeInside(real.mass))}, and only for someone who falls from rest just above the horizon. Firing rockets to "escape" only shortens it.`,
          ],
        });
      }
    }
    return stop;
  },
};

function km(m) { return m >= 1e9 ? `${sig(m / 1.496e11)} AU` : m >= 1e3 ? `${Number((m / 1e3).toPrecision(3)).toLocaleString()} km` : `${m.toPrecision(3)} m`; }
const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
function fit(c) { const d = window.devicePixelRatio || 1, w = Math.round(c.clientWidth * d), hh = Math.round(c.clientHeight * d); if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; } return { ctx: c.getContext('2d'), w, hh, d }; }

function drawFigure(c, gs, torn) {
  const { ctx, w, hh, d } = fit(c);
  ctx.fillStyle = '#080a14'; ctx.fillRect(0, 0, w, hh);
  const k = 1 + Math.min(5, Math.max(0, Math.log10(Math.max(1, gs))) * 0.5);
  ctx.save(); ctx.translate(w / 2, hh / 2); ctx.scale(k, 1 / Math.sqrt(k));
  ctx.fillStyle = torn ? '#ff8a7a' : '#ffd29a'; ctx.strokeStyle = torn ? '#ff6b5c' : '#ffc882'; ctx.lineWidth = 2 * d / k;
  // a simple suited figure lying along the stretch direction (toward the hole, left)
  const u = Math.min(w, hh) / 9;
  ctx.beginPath(); ctx.arc(-2.2 * u, 0, 0.55 * u, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-1.6 * u, -0.55 * u, 2.4 * u, 1.1 * u, 0.4 * u); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.8 * u, -0.3 * u); ctx.lineTo(2.4 * u, -0.45 * u); ctx.moveTo(0.8 * u, 0.3 * u); ctx.lineTo(2.4 * u, 0.45 * u); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(155,152,180,.9)'; ctx.font = `${10 * d}px "IBM Plex Mono", monospace`;
  ctx.fillText('← toward the hole', 10 * d, hh - 10 * d);
}
