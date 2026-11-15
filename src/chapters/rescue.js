import { h, loop, slider } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { stationPanel } from '../ui/panels.js';
import { SpacetimeDiagram } from '../ui/diagram.js';
import { HOLES, formatDuration, secondsFromM } from '../physics/units.js';
import { brief, quiz as makeQuiz, coach, wordM, WORD_RS, WORD_HORIZON, WORD_REDSHIFT } from './lesson.js';

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
    const story = brief({
      goal: `Pilot Ines Okafor's capsule has lost power beside the station and is falling toward ${HOLES[1].name}. She wants you to wait as long as you dare before firing the recall beam: every moment of data from the fall is priceless. Fire too late and the beam cannot reach her before she crosses the horizon.`,
      steps: ['Press Begin the watch. Your screen shows the capsule as its light reaches you.', 'Press Fire recall beam when you judge the moment. The beam travels at the speed of light.', 'If she is lost, rewind and try again. Then answer the debrief question.'],
      words: [wordM(mass, HOLES[1].name), WORD_RS, WORD_HORIZON, WORD_REDSHIFT, ['Recall beam', 'A light signal that tells her backup engine to fire. It has to catch her while she is still outside the horizon.']],
    });
    const tip = coach('Her picture on your screen is what you have to go on. Is it telling you the truth?');
    start.addEventListener('click', () => {
      S = 0; fired = null; result = null; running = true; diagram.reset(); station.log.clear();
      fire.disabled = false; start.textContent = 'Rewind and try again';
    });
    fire.addEventListener('click', () => {
      fired = S; attempts++; fire.disabled = true; diagram.rescues = [S];
      const seen = f.seenAt(S);
      station.log.add(`Beam fired at ${S.toFixed(1)} M. Your screen showed the capsule at ${(seen.r / 2).toFixed(2)} rₛ.`);
      tip.set('Beam away. It has to fall all the way down to her, while she keeps falling too.');
    });

    const seenAtD = f.seenAt(D);
    let Sgone = 0; while (f.seenAt(Sgone).lnz < 9) Sgone += 1; // when her picture becomes too faint to detect
    const q = makeQuiz({
      id: 'rs-q',
      prompt: h('span', h('b', 'Debrief question. '), 'At the last moment a beam could still save her, where did your screen show the capsule?'),
      choices: [
        ['Right at the edge of the horizon', false, `That is what most people expect. But the light showing her at the horizon only reaches you long after it is too late: at the deadline, her picture was still ${(seenAtD.r / 2).toFixed(1)} rₛ out.`],
        [`About ${(seenAtD.r / 2).toFixed(0)} rₛ out, looking almost normal`, true, `At the deadline her picture was ${(seenAtD.r / 2).toFixed(1)} rₛ out, her light stretched by only ${((Math.exp(seenAtD.lnz) - 1) * 100).toFixed(0)}%. The picture lags behind her, and the beam needs time to fall to her.`],
        ['Already gone from the screen', false, `No: you keep seeing her long after the deadline. Her picture only fades away at about ${Sgone} M, far later than the ${D.toFixed(0)} M deadline.`],
      ],
      onAnswer(ok) {
        if (!ok) return;
        ctx.goal(2, true); diagram.showDeadline = true;
        ctx.debrief({
          title: 'The image is old news',
          body: [
            `The deadline was ${D.toFixed(1)} M on the station clock (${formatDuration(secondsFromM(D, mass))} after she started to fall). At that moment your screen showed the capsule ${(seenAtD.r / 2).toFixed(1)} rₛ out, looking almost normal.`,
            'The picture on your screen is light that left the capsule a while ago. And the beam has to travel down to her while she keeps falling. So the real deadline comes long before the picture looks worrying.',
            'On the diagram, the red dashed line is the last beam that meets her outside the horizon. After it, she is lost for good, even though you will keep seeing her for a long time.',
          ],
        });
      },
    });
    const quiz = q.el; quiz.hidden = true;

    root.append(story,
      h('div.controls', speed.el, start, fire),
      tip.el,
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
              tip.set(fired >= D - 10 ? 'Saved, with almost nothing to spare. Notice where her picture was when you fired: nowhere near the horizon.' : `Saved. You had ${(D - fired).toFixed(1)} M (${formatDuration(secondsFromM(D - fired, mass))}) to spare. Rewind and try waiting longer.`, 'good');
              running = false; // she burns out of the well; the fall stops here
              station.log.add(fired >= D - 10 ? `Cut it fine: ${(D - fired).toFixed(1)} M before the deadline.` : `Safe, with ${(D - fired).toFixed(1)} M to spare. She wanted you to wait longer.`, fired >= D - 10 ? 'got' : '');
            } else {
              failedOnce = true;
              station.log.add(`The beam caught up with her ${hit.r > 0 ? `at ${(hit.r / 2).toFixed(2)} rₛ, already inside the horizon` : 'nowhere: she had already reached the centre'}. Too late, ${(fired - D).toFixed(1)} M past the deadline.`, 'never');
              tip.set(`Lost. When you fired, your screen still showed her ${(f.seenAt(fired).r / 2).toFixed(1)} rₛ out, looking fine. But that picture was old light, and by the time the beam fell to her she had crossed. Rewind and fire sooner.`, 'bad');
            }
            if (attempts >= 1) { diagCanvas.style.filter = ''; diagram.showDeadline = failedOnce; quiz.hidden = false; }
          }
        }
        if (fired == null && S > 400) { running = false; fire.disabled = true; station.log.add('You never fired. She crossed the horizon long ago.', 'never'); tip.set('You never fired. She crossed the horizon long ago, even though she was still on your screen.', 'bad'); diagCanvas.style.filter = ''; quiz.hidden = false; }
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
