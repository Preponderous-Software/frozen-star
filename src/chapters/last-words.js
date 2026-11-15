import { h, loop, slider } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { stationPanel, probePanel } from '../ui/panels.js';
import { SpacetimeDiagram } from '../ui/diagram.js';
import { HOLES, formatDuration, secondsFromM } from '../physics/units.js';
import { brief, coach, wordM, WORD_RS, WORD_HORIZON } from './lesson.js';

const TARGETS = [120, 132, 142];

export default {
  id: 'last-words', num: 2, title: 'Last Words',
  kicker: 'Ride the probe. Get a message home as late as you can.',
  goals: [`A message arrives after ${TARGETS[0]} M`, `A message arrives after ${TARGETS[1]} M`, `A message arrives after ${TARGETS[2]} M`],
  mount(root, ctx) {
    const f = new Infall(20), mass = HOLES[1].mass;
    let running = false, S = 0, tau = 0, msgs = [], best = 0, lost = 0, debriefed = false;
    const station = stationPanel(f, { title: 'Station · far away' }), probe = probePanel(f, { title: 'You · on the probe' });
    const diagCanvas = h('canvas.diagram', { 'aria-label': 'Spacetime diagram of your messages' });
    const diagram = new SpacetimeDiagram(diagCanvas, f);
    const speed = slider('Playback', { id: 'lw-speed', min: 0.1, max: 12, step: 0.05, value: 6, fmt: (v) => `${v.toFixed(2)} M/s` });
    const drop = h('button.primary#lw-drop', 'Start the fall');
    const send = h('button.send#lw-send', { disabled: true }, 'Transmit');
    const bestOut = h('b', '–');
    const ifNow = h('b', '–'), horizonIn = h('b', '–');
    const tip = coach('Start the fall, then transmit. Each message shows when it will reach home.');
    drop.addEventListener('click', () => {
      S = 0; tau = 0; msgs = []; lost = 0; running = true; diagram.reset(); station.log.clear(); probe.log.clear();
      send.disabled = false; drop.textContent = 'Start over';
    });
    send.addEventListener('click', () => {
      const id = msgs.length + 1, arr = f.messageArrival(tau);
      msgs.push({ id, tau, arr, got: false }); diagram.signals.push({ tau });
      if (isFinite(arr)) {
        probe.log.add(`Message ${id} sent at ${tau.toFixed(3)} M on your clock · will arrive at ${arr.toFixed(1)} M`);
        const next = TARGETS.find((t) => arr < t);
        tip.set(next ? `This one gets home at ${arr.toFixed(1)} M. To beat ${next} M, send closer to the horizon: ${f.tauH - tau > 0.5 ? 'wait longer' : 'slow the playback and wait for the last moment'}.` : `Arrives at ${arr.toFixed(1)} M: every target beaten. You sent it ${(f.tauH - tau).toPrecision(2)} M before the horizon.`, next ? '' : 'good');
      } else {
        lost++; probe.log.add(`Message ${id} sent at ${tau.toFixed(3)} M on your clock · inside the horizon, it will never arrive`, 'never');
        tip.set(`Too late: you crossed the horizon ${(tau - f.tauH).toPrecision(2)} M before sending. Nothing changed around you when you crossed, which is why it is so easy to miss. Press Start over and send a little sooner.`, 'bad');
      }
    });
    const onKey = (e) => { if (e.code === 'Space' && !send.disabled && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); send.click(); } };
    window.addEventListener('keydown', onKey);

    root.append(
      brief({
        goal: `You are riding a probe into ${HOLES[1].name}. Send a radio message home that arrives as late as possible. Messages sent outside the horizon always get home, however late. Messages sent from inside never do.`,
        steps: ['Press Start the fall.', 'Press Transmit (or Space) to send a message. Send as many as you like.', 'Watch "If you sent now". It climbs faster and faster as the horizon nears. Slow the playback right before the horizon to send in the last instant.'],
        words: [wordM(mass, HOLES[1].name), WORD_RS, WORD_HORIZON, ['Spacetime diagram', 'A map with distance from the hole across and time up the page. Each line is a message travelling out.']],
      }),
      h('div.controls', speed.el, drop, send, h('span.fine', 'Space also transmits'), h('span.lx-readout', 'Horizon in ', horizonIn), h('span.lx-readout', 'If you sent now, it arrives at ', ifNow), h('span.best', 'Latest arrival ', bestOut)),
      tip.el,
      h('div.bench', probe.el, station.el),
      h('section.view.diagram-view', h('div.view-head', h('span.who', 'Spacetime diagram'), h('span.fine', 'each line is one of your messages')), diagCanvas,
        h('p.fine', 'Messages sent near the horizon hug it for a long time before escaping. Messages sent from inside fall inward with you.')),
    );

    const stop = loop((dt) => {
      if (running) {
        const step = dt * speed.value; S += step; tau = Math.min(f.tauEnd, tau + step);
        if (tau >= f.tauEnd) send.disabled = true;
        for (const m of msgs) if (!m.got && S >= m.arr) {
          m.got = true; best = Math.max(best, m.arr); bestOut.textContent = `${best.toFixed(1)} M`;
          station.log.add(`Message ${m.id} received at ${S.toFixed(1)} M`, 'got');
          TARGETS.forEach((t, i) => { if (m.arr >= t) ctx.goal(i, true); });
        }
        const pending = msgs.some((m) => !m.got && isFinite(m.arr));
        if (!debriefed && tau >= f.tauEnd && !pending) {
          debriefed = true;
          ctx.debrief({
            title: 'The horizon is a one-way door',
            body: [
              `Your latest message reached home at ${best ? best.toFixed(1) + ' M' : '(none arrived)'}. ${lost ? `${lost} message${lost > 1 ? 's were' : ' was'} sent from inside and never got out.` : ''}`,
              'To get a message home later, you had to send it much closer to the horizon. Each time you get ten times closer, the message arrives only about 9 M later. That is why the last target is so hard, and why the delay has no upper limit.',
              'Nothing on the probe changed at the crossing. Light you sent outward just stopped making progress outward. Inside, even light aimed straight out falls toward the centre.',
              `For ${HOLES[1].name}, 1 M is ${formatDuration(secondsFromM(1, mass))}, so your whole fall took ${formatDuration(secondsFromM(f.tauEnd, mass))} on your own clock.`,
            ],
          });
        }
      }
      const left = f.tauH - tau;
      horizonIn.textContent = !running && !S ? '–' : left > 0 ? `${left < 1 ? left.toFixed(3) : left.toFixed(1)} M` : 'crossed';
      horizonIn.className = left > 0 && left < 2 ? 'warn-t' : left <= 0 ? 'bad-t' : '';
      const a = f.messageArrival(tau);
      ifNow.textContent = !running && !S ? '–' : isFinite(a) ? `${a.toFixed(1)} M` : 'never';
      ifNow.className = isFinite(a) ? '' : 'bad-t';
      diagram.tau = tau; diagram.S = S; diagram.draw();
      station.update(S, { mass }); probe.update(tau, { mass, started: running || S > 0 });
    });
    return () => { stop(); window.removeEventListener('keydown', onKey); };
  },
};
