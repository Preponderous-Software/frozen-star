import { h, loop, slider } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { stationPanel, probePanel } from '../ui/panels.js';
import { SpacetimeDiagram } from '../ui/diagram.js';
import { HOLES, formatDuration, secondsFromM } from '../physics/units.js';

const PING = 10, PINGS = 9;

export default {
  id: 'two-clocks', num: 1, title: 'Two Clocks',
  kicker: 'Drop a probe and watch it on two clocks at once.',
  goals: ['Receive all nine pings', 'Predict when ping 9 arrives', 'Keep watching until the probe vanishes'],
  mount(root, ctx) {
    const f = new Infall(20);
    const A9 = f.messageArrival(PING * PINGS);
    let mass = HOLES[1].mass, running = false, S = 0, tau = 0, got = 0, guess = null, gone = false;

    const station = stationPanel(f), probe = probePanel(f);
    const diagCanvas = h('canvas.diagram', { 'aria-label': 'Spacetime diagram of the fall' });
    const diagram = new SpacetimeDiagram(diagCanvas, f);
    const speed = slider('Playback', { id: 'tc-speed', min: 1, max: 30, step: 0.5, value: 8, fmt: (v) => `${v} M/s` });
    const holeSel = h('select#tc-hole', HOLES.map((x) => h('option', { value: x.mass, selected: x.mass === mass }, `${x.name} · ${x.mass >= 1e6 ? (x.mass / 1e6).toPrecision(2) + ' million' : x.mass} suns`)));
    holeSel.addEventListener('change', () => { mass = +holeSel.value; });
    const drop = h('button.primary#tc-drop', 'Drop the probe');

    const options = [
      ['about 90 M, the same as on the probe', false],
      [`about ${Math.round(A9)} M`, true],
      ['about 300 M', false],
      ['never: it is too close to the horizon', false],
    ];
    const quiz = h('div.quiz',
      h('p', 'The probe sends a ping every ', h('b', '10 M'), ' of its own time and sends nine before it reaches the horizon. When will ping 9 reach the station?'),
      h('div.choices', options.map(([label, ok], i) => h('button.choice', { id: `tc-q${i}`, onclick: (e) => { guess = ok; quiz.querySelectorAll('.choice').forEach((b) => b.classList.remove('picked')); e.currentTarget.classList.add('picked'); } }, label))),
      h('p.fine', 'Pick an answer, then drop. You can also drop without guessing.'));

    drop.addEventListener('click', () => {
      S = 0; tau = 0; got = 0; gone = false; running = true; diagram.reset();
      station.log.clear(); probe.log.clear(); drop.textContent = 'Drop again';
      quiz.querySelectorAll('.choice').forEach((b) => (b.disabled = true));
    });

    root.append(
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
        while (diagram.signals.length < sent) { const k = diagram.signals.length + 1; diagram.signals.push({ tau: k * PING }); probe.log.add(`Ping ${k} sent at τ = ${k * PING} M`); }
        while (got < PINGS && S >= f.messageArrival((got + 1) * PING)) {
          got++; station.log.add(`Ping ${got} received at ${S.toFixed(1)} M (sent at τ = ${got * PING} M)`, 'got');
          if (got === PINGS) {
            ctx.goal(0, true);
            if (guess === true) ctx.goal(1, true);
            station.log.add(guess === true ? 'Your prediction was right.' : guess === false ? `Your prediction missed: it arrived at ${A9.toFixed(1)} M.` : 'No prediction this time.', guess ? 'got' : 'never');
          }
        }
        if (!gone && f.seenAt(S).lnz > 9) {
          gone = true; ctx.goal(2, true); running = S < 400;
          ctx.debrief({
            title: 'Both clocks were right',
            body: [
              `The probe crossed the horizon at τ = ${f.tauH.toFixed(2)} M on its own clock and hit r = 0 just ${(f.tauEnd - f.tauH).toFixed(2)} M later. For ${HOLES.find((x) => x.mass === mass)?.name ?? 'this hole'} that is ${formatDuration(secondsFromM(f.tauEnd, mass))} from drop to centre.`,
              'The station never saw it cross. Light from close to the horizon needs longer and longer to climb out, so each ping arrived later than the last, and the image slowed, reddened and dimmed.',
              `The image did not stay frozen for long. Its redshift grew by a factor of e every few M, and by ${S.toFixed(0)} M on the station clock it was too faint to detect. "You never see it fall in" is a statement about light, not about the probe.`,
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
