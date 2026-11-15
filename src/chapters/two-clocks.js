import { h, loop, slider } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { stationPanel, probePanel } from '../ui/panels.js';
import { SpacetimeDiagram } from '../ui/diagram.js';
import { HOLES, formatDuration, formatMass, secondsFromM } from '../physics/units.js';
import { brief, quiz as makeQuiz, wordM, WORD_RS, WORD_HORIZON, WORD_REDSHIFT } from './lesson.js';

const PING = 10, PINGS = 9;

export default {
  id: 'two-clocks', num: 1, title: 'Two Clocks',
  kicker: 'Drop a probe and watch it on two clocks at once.',
  goals: ['Receive all nine pings', 'Predict when ping 9 arrives', 'Keep watching until the probe vanishes'],
  mount(root, ctx) {
    const f = new Infall(20);
    const A9 = f.messageArrival(PING * PINGS);
    let lastVerdict = null, mass = HOLES[1].mass, running = false, S = 0, tau = 0, got = 0, guess = null, gone = false;

    const station = stationPanel(f), probe = probePanel(f);
    const diagCanvas = h('canvas.diagram', { 'aria-label': 'Spacetime diagram of the fall' });
    const diagram = new SpacetimeDiagram(diagCanvas, f);
    const speed = slider('Playback', { id: 'tc-speed', min: 1, max: 30, step: 0.5, value: 8, fmt: (v) => `${v} M/s` });
    const holeSel = h('select#tc-hole', HOLES.map((x) => h('option', { value: x.mass, selected: x.mass === mass }, `${x.name} · ${formatMass(x.mass)}`)));
    holeSel.addEventListener('change', () => { mass = +holeSel.value; });
    const drop = h('button.primary#tc-drop', 'Drop the probe');

    const holeName = () => HOLES.find((x) => x.mass === mass)?.name ?? 'this hole';
    const secs = (m) => formatDuration(secondsFromM(m, mass));
    const options = [
      ['About 90 M, the same as on the probe', false, 'That would be true if light took no time and clocks ran alike everywhere. But each ping starts deeper in the hole\'s gravity than the last, so it needs longer to climb out to you.'],
      [`About ${Math.round(A9)} M`, true, `The pings leave 10 M apart on the probe's clock, but reach you further and further apart: the first two land ${(f.messageArrival(2 * PING) - f.messageArrival(PING)).toFixed(1)} M apart, the last two ${(A9 - f.messageArrival(8 * PING)).toFixed(1)} M apart.`],
      ['About 300 M', false, 'Too late. The delay does grow without limit, but only for light sent from right at the horizon. Ping 9 leaves a little above it, so it still gets out in reasonable time.'],
      ['Never: it is too close to the horizon', false, 'Ping 9 is sent while the probe is still outside the horizon, so it does get out. Only light sent from on or inside the horizon never arrives.'],
    ];
    let verdict = null, picked = -1;
    const rightIdx = options.findIndex(([, ok]) => ok);
    const q = makeQuiz({
      id: 'tc-q', lock: false,
      prompt: h('span', 'The probe sends a ping every ', h('b', '10 M'), ' of its own time, nine in all, the last a few M before it reaches the horizon. When will ping 9 reach the station?'),
      choices: options.map(([l, ok]) => [l, ok, '']),
      onAnswer(ok, i) { guess = ok; picked = i; verdict = options[i][2]; q.buttons.forEach((b, j) => { b.classList.toggle('picked', j === i); b.classList.remove('right', 'wrong'); }); q.why.className = 'lx-why'; q.why.replaceChildren('Prediction locked in: ', h('b', options[i][0]), '. Now press ', h('b', 'Drop the probe'), '. The answer appears here when ping 9 reaches the station.'); },
    });
    const quiz = q.el;
    drop.addEventListener('click', () => {
      S = 0; tau = 0; got = 0; gone = false; running = true; diagram.reset();
      station.log.clear(); probe.log.clear(); drop.textContent = 'Drop again';
      q.buttons.forEach((b) => (b.disabled = true));
      if (verdict) { q.why.className = 'lx-why'; q.why.replaceChildren('Your prediction: ', h('b', options[picked][0]), '. Waiting for ping 9…'); }
    });

    root.append(
      brief({
        goal: 'A probe falls from the station toward the black hole, flashing a ping every 10 M on its own clock. Find out how those pings look from the station, and why it never sees the probe fall in.',
        steps: ['Guess when the last ping will reach the station.', 'Press Drop the probe. The left panel is what the station sees; the right is the probe\'s own clock.', 'Watch the gaps between pings in the station log, and keep watching until the probe fades from view.'],
        words: [wordM(mass, HOLES.find((x) => x.mass === mass).name), WORD_RS, WORD_HORIZON, WORD_REDSHIFT, ['Ping', 'A short flash of light the probe sends home, like a lighthouse blink.']],
      }),
      h('div.controls', h('label', { for: 'tc-hole' }, h('span', 'Black hole'), holeSel), speed.el, drop),
      quiz,
      h('div.bench', station.el, probe.el),
      h('section.view.diagram-view', h('div.view-head', h('span.who', 'Spacetime diagram'), h('span.fine', 'green lines are pings travelling outward')), diagCanvas,
        h('p.fine', 'Time runs to the right. Each small wedge is a light cone: light from that point can only travel inside it. Near the horizon the outward edge lies flat along it; inside, both edges point down toward r = 0.')),
    );

    const stop = loop((dt) => {
      if (running) {
        const step = dt * speed.value; S += step; tau = Math.min(f.tauEnd, tau + step);
        const sent = Math.min(PINGS, Math.floor(tau / PING));
        while (diagram.signals.length < sent) { const k = diagram.signals.length + 1; diagram.signals.push({ tau: k * PING }); probe.log.add(`Ping ${k} sent at ${k * PING} M on the probe's clock`); }
        while (got < PINGS && S >= f.messageArrival((got + 1) * PING)) {
          got++;
          const gap = got > 1 ? f.messageArrival(got * PING) - f.messageArrival((got - 1) * PING) : null;
          station.log.add(`Ping ${got} received at ${S.toFixed(1)} M${gap ? `, ${gap.toFixed(1)} M after the last (sent 10 M apart)` : ''}`, 'got');
          if (verdict && got < PINGS) q.why.replaceChildren('Your prediction: ', h('b', options[picked][0]), `. Ping ${got} of ${PINGS} arrived at ${S.toFixed(1)} M. Waiting for ping 9…`);
          if (got === PINGS) {
            ctx.goal(0, true);
            if (guess === true) ctx.goal(1, true);
            station.log.add(guess === true ? 'Your prediction was right.' : guess === false ? `Your prediction missed: ping 9 arrived at ${A9.toFixed(1)} M.` : 'No prediction this time.', guess ? 'got' : 'never');
            if (verdict) {
              // the outcome, said plainly where the question was asked: right or wrong, the true answer, and why
              q.why.hidden = false; q.why.className = 'lx-why lx-verdict ' + (guess ? 'right' : 'wrong');
              q.why.replaceChildren(
                h('b.lx-verdict-head', guess ? `Right: ping 9 arrived at ${A9.toFixed(1)} M.` : `Wrong: you picked "${options[picked][0]}", but ping 9 arrived at ${A9.toFixed(1)} M.`),
                h('span', verdict),
                guess ? null : h('span', ' ', options[rightIdx][2]));
              q.buttons.forEach((b, j) => { if (j === picked) b.classList.add(guess ? 'right' : 'wrong'); if (j === rightIdx) b.classList.add('right'); });
              lastVerdict = { ok: guess, label: options[picked][0], why: verdict };
            }
          }
        }
        if (!gone && f.seenAt(S).lnz > 9) {
          gone = true; ctx.goal(2, true); running = S < 400;
          // a fresh prediction for the next drop
          guess = null; verdict = null; picked = -1; q.buttons.forEach((b) => { b.disabled = false; b.classList.remove('picked'); });
          const said = lastVerdict; lastVerdict = null;
          ctx.debrief({
            title: 'Both clocks were right',
            body: [
              said ? `Your prediction, "${said.label}", was ${said.ok ? 'right' : 'wrong'}: ping 9 reached the station at ${A9.toFixed(1)} M, though it was sent at 90 M on the probe's clock.` : null,
              `On its own clock the probe crossed the horizon at ${f.tauH.toFixed(1)} M and reached the centre just ${(f.tauEnd - f.tauH).toFixed(1)} M later. For ${holeName()} that is ${secs(f.tauEnd)} from drop to centre.`,
              'The station never saw it cross. Light from close to the horizon needs longer and longer to climb out, so each ping arrived later than the last, and the image slowed, reddened and dimmed.',
              `The image did not stay frozen for long. Its light was stretched more and more, and by ${S.toFixed(0)} M on the station clock (${secs(S)} for ${holeName()}) it had faded below anything a telescope could catch. "You never see it fall in" is a statement about light, not about the probe.`,
            ],
          });
        }
      }
      diagram.tau = tau; diagram.S = S; diagram.draw();
      station.update(S, { mass }); probe.update(tau, { mass, started: running || S > 0 });
    });
    return stop;
  },
};
