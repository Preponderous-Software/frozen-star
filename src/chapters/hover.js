import { h, loop, slider, stat } from '../ui/dom.js';
import { HOLES, formatDuration, formatAccel, G_EARTH, sig, expo } from '../physics/units.js';
import { brief, WORD_RS, WORD_G, WORD_HORIZON, WORD_SCI } from './lesson.js';
import { hoverRate, hoverAccel } from '../physics/body.js';
import { viewport } from '../ui/view3d.js';
import { yawPitchBasis, hoverVelocity } from '../render/raytracer.js';

const LIMIT_G = 10;
const MILLER = 7 * 365.25 * 24; // 1 hour aboard = 7 years at home

export default {
  id: 'hover', num: 5, title: 'Hover',
  kicker: 'Hold your ship still near the horizon and let the years pass outside.',
  goals: [`Gain 10% on home under ${LIMIT_G} g`, `Gain 25% on home under ${LIMIT_G} g`, 'Try for "1 hour here, 7 years at home"'],
  mount(root, ctx) {
    let hole = HOLES[1];
    const picks = h('div.picks', HOLES.map((x) => h('button.chip', { id: `hv-${x.id}`, 'aria-pressed': x === hole, onclick: (e) => { hole = x; picks.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, x.name)));
    // height above the horizon on a log scale: r = 2(1 + 10^x)
    // min −10: "1 hour = 7 years" needs a clock 61,362 times slow, about 2.7×10⁻¹⁰ rₛ above the horizon
    const height = slider('Hover at', { id: 'hv-height', min: -10, max: 1, step: 0.01, value: 0.9, fmt: (x) => (x >= -2 ? `${sig(1 + 10 ** x, 4)} rₛ` : `${expo(10 ** x)} rₛ above the horizon`) });
    const vp = viewport({ label: 'The view from a ship hovering above the black hole' });
    const sRate = stat('1 hour aboard is'), sAcc = stat('Thrust needed'), sGain = stat('You gain'), sCrew = stat('Crew');
    const note = h('div.status');
    root.append(
      brief({
        goal: 'Clocks run slow deep in gravity. Hover your ship close to the horizon so less time passes for you than for everyone at home. The catch: the closer you hover, the harder your engines must push to hold you still, and the crew feels every bit of it.',
        steps: ['Drag Hover at to the left to move closer to the horizon. Watch "1 hour aboard is" and "Thrust needed".', 'Keep the thrust under 10 g so the crew survives. Try different black holes.', 'For the last goal, find the famous "1 hour here is 7 years at home" from the film Interstellar.'],
        words: [WORD_RS, WORD_HORIZON, WORD_G, ['Thrust', 'How hard the engines push to hold you in place. You feel it as weight, like standing on a planet with that much gravity.'], WORD_SCI],
      }),
      h('div.controls', picks, height.el),
      h('div.bench.wide-left',
        h('section.view', h('div.view-head', h('span.who', 'Out of the window'), h('span.fine', 'drag to look around')), vp.el,
          h('p.fine', 'You are hovering, so you are moving outward through the infalling space. Starlight from above is squeezed into a bright patch and blueshifted. Near the horizon the shadow swallows almost the whole sky.')),
        h('section.view', h('div.view-head', h('span.who', 'Ship status'), h('span.fine#hv-name', hole.name)), h('div.stats.col', sRate.el, sAcc.el, sGain.el, sCrew.el), note,
          h('p.fine', 'Your clock runs slower the closer you hover, and stops altogether at the horizon. The thrust needed to hold still also grows without limit there. Heavier holes need less thrust at the same rₛ.'))),
    );
    let t = 0, millerShown = false;
    const stop = loop((dt) => {
      t += dt;
      const r = 2 * (1 + 10 ** height.value), rate = hoverRate(r), factor = 1 / rate, acc = hoverAccel(r, hole.mass), g = acc / G_EARTH, ok = g <= LIMIT_G;
      sRate.set(`${formatDuration(3600 * factor)} at home`);
      sAcc.set(formatAccel(acc));
      sGain.set(`${sig((factor - 1) * 100)}%`);
      sCrew.set(ok ? '<span class="ok-t">fine</span>' : g < 100 ? '<span class="warn-t">blacking out</span>' : '<span class="bad-t">crushed</span>');
      const nameEl = root.querySelector('#hv-name'); if (nameEl.textContent !== hole.name) nameEl.textContent = hole.name;
      if (ok && factor >= 1.1) ctx.goal(0, true);
      if (ok && factor >= 1.25) ctx.goal(1, true);
      if (factor >= MILLER) {
        ctx.goal(2, true);
        note.textContent = `There it is: 1 hour here is 7 years at home. Holding still takes ${formatAccel(acc)}. No ship or crew could do it.`; note.className = 'status bad';
        if (!millerShown) {
          millerShown = true;
          ctx.debrief({
            title: 'Why the film needed a spinning hole',
            body: [
              'Hovering slows your clock, but the closer you get, the harder you must thrust. Around a non-spinning hole, a big slowdown always comes with crushing thrust, unless the hole is far heavier than any known.',
              `Even at ${HOLES[3].name}, the heaviest hole here, gaining 25% on home means about ${formatAccel(hoverAccel(2 / (1 - 1 / 1.5625), HOLES[3].mass))} of thrust.`,
              'A planet in orbit needs no thrust at all. Around a black hole spinning near its maximum rate, stable orbits reach deep enough for enormous slowdowns. That is how Miller\'s planet in Interstellar works, and why it could not orbit a hole like this one.',
            ],
          });
        }
      } else if (!ok) { note.textContent = `${formatAccel(acc)} would kill the crew. Hover higher${hole === HOLES[HOLES.length - 1] ? '' : ', or pick a heavier hole: at the same rₛ it needs less thrust'}.`; note.className = 'status warn'; }
      else { note.textContent = factor >= 1.1 ? 'Holding steady. Home is ageing faster than you.' : 'Holding steady. The time difference is still small this high up.'; note.className = 'status good'; }
      if (vp.view) {
        const tilt = 0.18, pos = [0, r * Math.sin(tilt), -r * Math.cos(tilt)];
        vp.view.set({ cam: pos, basis: yawPitchBasis(pos.map((v) => -v), vp.look.yaw, vp.look.pitch), V: hoverVelocity(pos), disk: true, time: t, fov: 1.4 });
        vp.render(dt);
      }
    });
    return () => { stop(); vp.dispose(); };
  },
};
