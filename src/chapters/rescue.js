import { h, loop, slider } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { stationPanel } from '../ui/panels.js';
import { SpacetimeDiagram } from '../ui/diagram.js';
import { HOLES } from '../physics/units.js';

export default {
  id: 'rescue', num: 3, title: 'The Rescue',
  kicker: 'A pilot is drifting in. Your screen says there is time.',
  goals: ['Save the pilot', 'Fire within the last 10 M before the deadline', 'Explain why waiting fails'],
  mount(root, ctx) {
    const f = new Infall(20), mass = HOLES[1].mass, D = f.rescueDeadline;
    let running = false, S = 0, fired = null, result = null, attempts = 0, failedOnce = false;
    const station = stationPanel(f, { title: 'Station · your screen' });
    const diagCanvas = h('canvas.diagram', { 'aria-label': 'Spacetime diagram of the rescue' });
    const diagram = new SpacetimeDiagram(diagCanvas, f);
    const speed = slider('Playback', { id: 'rs-speed', min: 1, max: 12, step: 0.5, value: 5, fmt: (v) => `${v} M/s` });
    const start = h('button.primary#rs-start', 'Begin the watch');
    const fire = h('button.send#rs-fire', { disabled: true }, 'Fire recall beam');
    const story = h('div.story',
      h('p', 'Pilot Ines Okafor is in a survey capsule that has lost power beside the station. It is starting to fall toward Sagittarius A*. She has asked you to wait as long as possible: every minute of data from the fall is priceless.'),
      h('p', 'The recall beam travels at the speed of light. If it reaches her before she crosses the horizon, her backup engine fires and she escapes. ', h('b', 'Fire as late as you dare.')));
    start.addEventListener('click', () => {
      S = 0; fired = null; result = null; running = true; diagram.reset(); station.log.clear();
      fire.disabled = false; start.textContent = 'Rewind and try again';
    });
    fire.addEventListener('click', () => {
      fired = S; attempts++; fire.disabled = true; diagram.rescues = [S];
      const seen = f.seenAt(S);
      station.log.add(`Beam fired at ${S.toFixed(1)} M. Your screen showed the capsule at ${(seen.r / 2).toFixed(2)} rₛ.`);
    });

    const quiz = h('div.quiz', { hidden: true },
      h('p', h('b', 'Debrief question. '), 'At the last moment a beam could still save her, where did your screen show the capsule?'),
      h('div.choices', [
        ['Right at the edge of the horizon', false],
        [`About ${(f.seenAt(D).r / 2).toFixed(0)} rₛ out, looking almost normal`, true],
        ['Already gone from the screen', false],
      ].map(([label, ok], i) => h('button.choice', { id: `rs-q${i}`, onclick: (e) => {
        e.currentTarget.classList.add(ok ? 'right' : 'wrong');
        if (ok) {
          ctx.goal(2, true); diagram.showDeadline = true;
          ctx.debrief({
            title: 'The image is old news',
            body: [
              `The deadline was ${D.toFixed(1)} M on the station clock. At that moment your screen showed the capsule ${(f.seenAt(D).r / 2).toFixed(1)} rₛ out, only ${(Math.exp(f.seenAt(D).lnz) - 1).toFixed(2)} redshifted.`,
              'The picture on your screen is light that left the capsule long ago. The beam has to travel inward while her light travels outward, so the true deadline arrives long before the picture looks worrying.',
              'The red dashed line on the diagram is the last inward light ray that meets her outside the horizon. After it, she is lost for good, even though you will keep seeing her for a long time.',
            ],
          });
        }
      } }, label))));

    root.append(story,
      h('div.controls', speed.el, start, fire),
      h('div.bench', station.el, h('section.view.diagram-view', h('div.view-head', h('span.who', 'Spacetime diagram'), h('span.fine', 'unlocked after your first attempt')), diagCanvas,
        h('p.fine', 'Time runs to the right. Blue: the station. Gold: the capsule. The recall beam travels inward, down and to the right.'))),
      quiz);
    diagCanvas.style.filter = 'blur(6px) saturate(.3)';

    const stop = loop((dt) => {
      if (running) {
        S += dt * speed.value;
        if (fired != null && !result) {
          const hit = f.rescueAt(fired);
          const T0 = f.stationTTilde(fired), Tnow = f.stationTTilde(S);
          if (Tnow - T0 >= f.R0 - (hit.meets ? hit.r : 0)) {
            result = hit;
            if (!hit.inside) {
              station.log.add(`The beam reached her at ${(hit.r / 2).toFixed(2)} rₛ, outside the horizon. Engine lit. She is coming home.`, 'got');
              ctx.goal(0, true); if (fired >= D - 10) ctx.goal(1, true);
              running = false; // she burns out of the well; the fall stops here
              station.log.add(fired >= D - 10 ? `Cut it fine: ${(D - fired).toFixed(1)} M before the deadline.` : `Safe, with ${(D - fired).toFixed(1)} M to spare. She wanted you to wait longer.`, fired >= D - 10 ? 'got' : '');
            } else {
              failedOnce = true;
              station.log.add(`The beam caught up with her ${hit.r > 0 ? `at ${(hit.r / 2).toFixed(2)} rₛ, already inside the horizon` : 'nowhere: she had already reached r = 0'}. Too late, ${(fired - D).toFixed(1)} M past the deadline.`, 'never');
            }
            if (attempts >= 1) { diagCanvas.style.filter = ''; diagram.showDeadline = failedOnce; quiz.hidden = false; }
          }
        }
        if (fired == null && S > 400) { running = false; fire.disabled = true; station.log.add('You never fired. She crossed the horizon long ago.', 'never'); diagCanvas.style.filter = ''; quiz.hidden = false; }
      }
      diagram.S = S; diagram.tau = Math.min(f.tauEnd, S); // capsule proper time runs from the drop at S = 0
      diagram.draw();
      const pulses = [];
      if (fired != null && (!result || !result.inside)) {
        const rNow = f.R0 - (f.stationTTilde(S) - f.stationTTilde(fired));
        if (!result && rNow > 2) pulses.push({ r: rNow, color: 'rgba(127,214,168,.95)' });
      }
      station.update(S, { mass, pulses });
    });
    return stop;
  },
};
