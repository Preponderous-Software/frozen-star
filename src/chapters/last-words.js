import { h, loop, slider } from '../ui/dom.js';
import { Infall } from '../physics/infall.js';
import { stationPanel, probePanel } from '../ui/panels.js';
import { SpacetimeDiagram } from '../ui/diagram.js';
import { HOLES } from '../physics/units.js';

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
    drop.addEventListener('click', () => {
      S = 0; tau = 0; msgs = []; lost = 0; running = true; diagram.reset(); station.log.clear(); probe.log.clear();
      send.disabled = false; drop.textContent = 'Start over';
    });
    send.addEventListener('click', () => {
      const id = msgs.length + 1, arr = f.messageArrival(tau);
      msgs.push({ id, tau, arr, got: false }); diagram.signals.push({ tau });
      if (isFinite(arr)) probe.log.add(`Message ${id} sent at τ = ${tau.toFixed(3)} M · will arrive at ${arr.toFixed(1)} M`);
      else { lost++; probe.log.add(`Message ${id} sent at τ = ${tau.toFixed(3)} M · inside the horizon, it will never arrive`, 'never'); }
    });
    const onKey = (e) => { if (e.code === 'Space' && !send.disabled && document.activeElement?.tagName !== 'INPUT') { e.preventDefault(); send.click(); } };
    window.addEventListener('keydown', onKey);

    root.append(
      h('div.controls', speed.el, drop, send, h('span.fine', 'Space also transmits'), h('span.best', 'Latest arrival ', bestOut)),
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
              'Getting a message home later needs you to send it much closer to the horizon. Each step ten times closer buys only about 9 M more delay, which is why the gold target is so hard.',
              'Nothing on the probe changed at the crossing. Light you sent outward just stopped making progress outward, and inside, even outward-aimed light falls toward r = 0.',
            ],
          });
        }
      }
      diagram.tau = tau; diagram.S = S; diagram.draw();
      station.update(S, { mass }); probe.update(tau, { mass, started: running || S > 0 });
    });
    return () => { stop(); window.removeEventListener('keydown', onKey); };
  },
};
