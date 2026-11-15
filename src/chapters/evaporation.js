import { h, loop, slider } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { HOLES, formatMass, formatDuration, secondsFromM, expo } from '../physics/units.js';
import { hawkingLifetimeYears, hawkingTemperature } from '../physics/body.js';
import { brief, quiz as makeQuiz, WORD_HORIZON, WORD_SCI } from './lesson.js';

const YEAR = 365.25 * 86400, UNIVERSE_S = 13.8e9 * YEAR;

export default {
  id: 'evaporation', num: 8, title: 'Evaporation',
  kicker: '"But the hole evaporates before you ever get in." Does it?',
  goals: ['Answer the friend', 'Compare three holes on the timeline', 'Find a hole that would be gone by now'],
  mount(root, ctx) {
    const f = new Infall(20);
    const seenMasses = new Set();
    let Sgone = 0; while (f.seenAt(Sgone).lnz < 9) Sgone += 0.5; // station time (M) until the image is undetectable
    const massS = slider('Mass', { id: 'ev-mass', min: -20, max: 11, step: 0.01, value: Math.log10(HOLES[1].mass), fmt: (v) => formatMass(10 ** v) });
    const picks = h('div.picks', HOLES.map((x) => h('button.chip', { id: `ev-${x.id}`, onclick: () => { massS.value = Math.log10(x.mass); } }, x.name)));
    const canvas = h('canvas.timeline', { 'aria-label': 'Timeline on a logarithmic scale' });
    const summary = h('div.status');
    const q = makeQuiz({
      id: 'ev-q',
      prompt: h('span', h('b', 'A friend says: '), '"The station sees the probe freeze forever at the horizon. The hole evaporates in a finite time. So the probe never actually falls in." What do you tell them?'),
      choices: [
        ['They are right: it never crosses.', false, 'The freezing is in the picture the station receives, not in the probe. On its own clock the probe crosses in minutes. Slide the timeline to compare: the hole lasts unimaginably longer.'],
        ['The probe crosses in a finite time on its own clock, long before the hole loses any noticeable mass. The frozen image fades out of reach soon after.', true, `For ${HOLES[1].name} the probe crosses after ${formatDuration(secondsFromM(f.tauH, HOLES[1].mass))} of its own time, while the hole would take ${formatDuration(hawkingLifetimeYears(HOLES[1].mass) * YEAR)} to evaporate. Nothing about evaporation can step in first.`],
        ['Black holes do not evaporate, so the question is moot.', false, 'Quantum physics predicts they do, very slowly (Hawking radiation). The friend\'s premise is fine; their conclusion is what fails.'],
      ],
      onAnswer(ok) { if (ok) { ctx.goal(0, true); maybeDebrief(); } },
    });
    const quiz = q.el;
    root.append(brief({
      goal: 'Settle an argument with numbers. Black holes slowly leak away (Hawking radiation), so a friend claims the hole is gone before anything can fall in. Compare the clocks on the timeline and answer them.',
      steps: ['Pick the real black holes one at a time and read the timeline. Each step to the right is ten times longer.', 'Drag the mass slider far to the left to find a hole small enough to have evaporated already.', 'Answer the friend below.'],
      words: [['Hawking radiation', 'A faint glow every black hole gives off, predicted by Stephen Hawking in 1974. It carries off mass, so a hole slowly shrinks. The smaller the hole, the hotter it glows and the faster it goes.'], WORD_HORIZON, WORD_SCI, ['Kelvin (K)', 'Temperature counted up from absolute zero. Empty space today is about 2.7 K, the afterglow of the Big Bang.']],
    }));
    root.append(h('div.controls', massS.el, picks), h('section.view', canvas, summary), quiz);

    function maybeDebrief() {
      ctx.debrief({
        title: 'Two very different clocks',
        body: [
          `For Sagittarius A*, a probe dropped from 10 rₛ reaches the horizon after ${formatDuration(secondsFromM(f.tauH, HOLES[1].mass))} of its own time. Hawking radiation would take about ${formatDuration(hawkingLifetimeYears(HOLES[1].mass) * YEAR)} to evaporate the hole. The two are not close.`,
          'The "frozen forever" picture fails twice. The image fades out of reach quickly, and in models of evaporating holes an infalling object still crosses the horizon in finite proper time.',
          'What happens to information that falls in, and what an evaporating horizon is really like, are open research questions. Nothing in them rescues "you never fall in".',
        ],
      });
    }

    const stop = loop(() => {
      const M = 10 ** massS.value;
      if (HOLES.some((x) => Math.abs(Math.log10(x.mass) - massS.value) < 0.01)) seenMasses.add(Math.round(massS.value * 10));
      if (seenMasses.size >= 3) ctx.goal(1, true);
      const life = hawkingLifetimeYears(M) * YEAR, cross = secondsFromM(f.tauH, M);
      const fade = secondsFromM(Sgone, M);
      if (life < UNIVERSE_S) ctx.goal(2, true);
      summary.innerHTML = life < UNIVERSE_S
        ? `A hole of ${formatMass(M)} (${expo(M * 1.989e30)} kg, roughly the mass of ${massLike(M * 1.989e30)}) evaporates in ${formatDuration(life)}, sooner than the age of the universe, so any like it would be gone by now. Only black holes born in the Big Bang itself could be this small. It glows at ${expo(hawkingTemperature(M))} K.`
        : `On its own clock, the probe crosses after ${formatDuration(cross)}. Its picture fades out of reach after ${formatDuration(fade)}. Left alone, the hole would evaporate after ${formatDuration(life)}. Its glow is ${expo(hawkingTemperature(M))} K${hawkingTemperature(M) < 2.725 ? ', colder than empty space (2.7 K), so today it soaks up more than it gives off and slowly grows' : ''}.`;
      // timeline
      const d = window.devicePixelRatio || 1, w = Math.round(canvas.clientWidth * d), hh = Math.round(canvas.clientHeight * d);
      if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
      const g = canvas.getContext('2d'); g.fillStyle = '#080a14'; g.fillRect(0, 0, w, hh);
      const lo = -12, hi = 110, pad = 18 * d, X = (s) => pad + ((Math.log10(s) - lo) / (hi - lo)) * (w - 2 * pad), y = hh * 0.55;
      g.strokeStyle = 'rgba(155,152,180,.4)'; g.lineWidth = d; g.beginPath(); g.moveTo(pad, y); g.lineTo(w - pad, y); g.stroke();
      g.font = `${10 * d}px "IBM Plex Mono", monospace`; g.fillStyle = 'rgba(155,152,180,.8)';
      for (let e = -10; e <= 110; e += 20) { g.fillRect(X(10 ** e), y - 3 * d, d, 6 * d); g.fillText(`10${sup(e)} s`, X(10 ** e) - 14 * d, y + 18 * d); }
      const marks = [
        [cross, 'probe crosses', '#ffc882', -1], [fade, 'image fades', '#8fb8ff', -2],
        [UNIVERSE_S, 'age of the universe', 'rgba(155,152,180,.95)', 1], [life, 'hole evaporates', '#ff6b5c', 2],
      ];
      for (const [s, label, color, lane] of marks) {
        if (!(s > 0) || !isFinite(Math.log10(s))) continue;
        const x = Math.min(w - pad, Math.max(pad, X(s))), yy = y + lane * 22 * d * (lane < 0 ? 1 : 1.3) - (lane > 0 ? 0 : 0);
        g.strokeStyle = color; g.beginPath(); g.moveTo(x, y); g.lineTo(x, yy); g.stroke();
        g.fillStyle = color; g.beginPath(); g.arc(x, y, 4 * d, 0, 7); g.fill();
        g.fillText(label, Math.min(w - pad - g.measureText(label).width, Math.max(pad, x - 30 * d)), yy + (lane < 0 ? -4 * d : 12 * d));
      }
    });
    return stop;
  },
};

/** A familiar object of roughly this mass in kg, for scale. */
function massLike(kg) {
  const things = [[7.3e22, 'the Moon'], [9.4e20, 'the dwarf planet Ceres'], [5e11, 'every person on Earth put together'], [6e9, 'the Great Pyramid'], [1e8, 'an aircraft carrier']];
  return things.reduce((best, t) => (Math.abs(Math.log10(kg / t[0])) < Math.abs(Math.log10(kg / best[0])) ? t : best))[1];
}

const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
