// Bend the Light: aim a beam past the hole and find the photon sphere and the edge of the shadow.
import { h, loop, slider, prefersReducedMotion } from '../ui/dom.js';
import { bendLight, CRITICAL_B, PHOTON_SPHERE } from '../physics/light.js';
import { brief, quiz as makeQuiz, coach, WORD_RS, WORD_HORIZON } from './lesson.js';

const B_EDGE = CRITICAL_B / 2; // in rₛ: 2.598
const deg = (rad) => (rad * 180) / Math.PI;

export default {
  id: 'bend-light', num: 6, title: 'Bend the Light',
  kicker: 'Aim a laser past the hole. Can you make light come back to you?',
  goals: ['Bend a beam by more than 90°', 'Make light circle the hole once', 'Explain the size of the shadow'],
  mount(root, ctx) {
    const aim = slider('Aim', { id: 'bl-aim', min: 0, max: 6, step: 0.01, value: 4.5, fmt: (v) => `${v.toFixed(2)} rₛ` });
    const fine = slider('Fine-tune', { id: 'bl-fine', min: -0.01, max: 0.01, step: 0.00001, value: 0, fmt: (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(5)}` });
    const canvas = h('canvas.lx-orbit', { 'aria-label': 'Top-down view: a laser beam passing the black hole' });
    const tip = coach();
    const readB = h('b', '–'), readBend = h('b', '–'), readClose = h('b', '–');
    let seenCapture = false, seenEscape = false, quizShown = false;

    const q = makeQuiz({
      id: 'bl-q',
      prompt: h('span', h('b', 'Now the payoff. '), 'Seen from far away, a black hole looks like a black disk on the sky: its shadow. How wide is the shadow compared with the horizon?'),
      choices: [
        ['The same size: the shadow is the horizon', false, `Light aimed to pass anywhere inside ${B_EDGE.toFixed(2)} rₛ falls in, not just light aimed at the horizon itself. So the dark patch is much wider than the horizon.`],
        ['1.5 times wider, the size of the photon sphere', false, `Close: the edge of the shadow is light that skims the photon sphere. But that light was bent on its way in, so you had to aim it ${B_EDGE.toFixed(2)} rₛ out, not 1.5 rₛ.`],
        [`About ${B_EDGE.toFixed(1)} times wider`, true, `Every beam aimed within ${B_EDGE.toFixed(2)} rₛ of the centre is swallowed, so from far away the hole blocks a disk ${B_EDGE.toFixed(2)} times the horizon's size. The Event Horizon Telescope saw exactly this kind of shadow around M87* in 2019.`],
        ['Infinitely wide: it blocks the whole sky', false, 'Only if you hover right at the horizon. From far away the shadow is a small disk; the beams you aimed wide of it got past.'],
      ],
      onAnswer(ok) {
        if (!ok) return;
        ctx.goal(2, true);
        ctx.debrief({
          title: 'The ring is light that went around',
          body: [
            `Aim a beam within ${B_EDGE.toFixed(2)} rₛ of the centre and it falls in. Aim just outside and it can wind around the hole at 1.5 rₛ, the photon sphere, before escaping in any direction, even straight back at you.`,
            'Each extra loop needs you to aim about 535 times closer to the edge. That is why the bright ring around a black hole is so thin: it is made of light that went once, twice, many times around.',
            'That ring is what you see around Erebus through the Tern\'s windows, and its black interior is the shadow, 2.6 times the size of the horizon.',
          ],
        });
      },
    });
    q.el.hidden = true;

    root.append(
      brief({
        goal: 'Gravity bends light. Fire a laser past the black hole and see how far you can bend it: sideways, back toward you, and all the way around.',
        steps: ['Drag Aim to move the laser closer to the centre line. The beam is redrawn as you drag.', 'Find where light stops getting past and starts falling in.', 'Just outside that line, use Fine-tune to make the beam turn back and loop around the hole.'],
        words: [WORD_RS, WORD_HORIZON, ['Photon sphere', 'The dashed circle at 1.5 rₛ. Here gravity bends light into a circle, so light can orbit the hole, though the slightest nudge sends it in or out.'], ['Aim', 'How far to the side of the centre the laser points. At 0 it points straight at the hole.']],
      }),
      h('div.controls', aim.el, fine.el,
        h('span.lx-readout', 'Aimed at ', readB), h('span.lx-readout', 'Bent by ', readBend), h('span.lx-readout', 'Closest pass ', readClose)),
      tip.el,
      h('section.view', h('div.view-head', h('span.who', 'Seen from above'), h('span.fine', 'black: the horizon · dashed: the photon sphere')), canvas,
        h('p.fine', 'Each beam is a real path of light around a non-spinning black hole, worked out from Einstein\'s equations step by step.')),
      q.el,
    );

    let ray = null, key = '', arc = [], total = 0, t = 0;
    const reduce = prefersReducedMotion();
    function update() {
      const bRs = Math.max(0, aim.value + fine.value), k = bRs.toFixed(6);
      if (k === key) return; key = k;
      ray = bendLight(bRs * 2, { rView: 60 });
      // cumulative length so the light pulse moves at a steady speed
      arc = [0]; for (let i = 1; i < ray.path.length; i++) arc.push(arc[i - 1] + Math.hypot(ray.path[i][0] - ray.path[i - 1][0], ray.path[i][1] - ray.path[i - 1][1]));
      total = arc[arc.length - 1] || 1; t = 0;
      readB.textContent = `${bRs.toFixed(5)} rₛ`;
      if (ray.fate === 'capture') {
        seenCapture = true;
        readBend.textContent = 'swallowed'; readClose.textContent = 'fell in';
        tip.set(`Swallowed. Aimed ${bRs.toFixed(2)} rₛ out, the beam still crossed the horizon at 1 rₛ: gravity pulled it in. ${seenEscape ? 'Somewhere between this aim and your last escaping beam is the edge.' : 'Aim further out until the beam escapes.'}`, 'bad');
      } else {
        seenEscape = true;
        const d = deg(ray.deflection), loops = Math.floor(ray.deflection / (2 * Math.PI));
        readBend.textContent = `${d < 10 ? d.toFixed(2) : d.toFixed(0)}°`; readClose.textContent = `${(ray.rMin / 2).toFixed(3)} rₛ`;
        if (d > 90) ctx.goal(0, true);
        if (loops >= 1) ctx.goal(1, true);
        tip.set(loops >= 1 ? `Around ${loops === 1 ? 'once' : `${loops} times`}! The beam skimmed the photon sphere at ${(ray.rMin / 2).toFixed(3)} rₛ and circled the hole before escaping. ${loops < 3 ? 'Fine-tune closer to the edge for more loops.' : 'Each extra loop needs you to aim about 535 times closer.'}`
          : d > 180 ? `Bent by ${d.toFixed(0)}°: the beam turned around and is heading back past the laser. Aim a hair closer to make it go all the way round.`
            : d > 90 ? `Bent by ${d.toFixed(0)}°, more than a right angle. Closer still and it turns right around.`
              : d > 10 ? `Bent by ${d.toFixed(0)}°. The closer it passes, the harder gravity bends it. Aim closer.`
                : `Bent by only ${d.toFixed(2)}°. Far from the hole, gravity barely bends light. Aim closer to the centre.`, loops >= 1 || d > 90 ? 'good' : '');
      }
      if (!quizShown && (seenCapture && seenEscape) && ray.fate === 'escape' && ray.deflection > Math.PI / 2) { quizShown = true; q.el.hidden = false; }
    }

    const stop = loop((dt) => {
      update();
      t = reduce ? 1 : (t + dt / 2.2) % 1.25;
      draw();
    });

    function draw() {
      const d = window.devicePixelRatio || 1, w = Math.round(canvas.clientWidth * d), hh = Math.round(canvas.clientHeight * d);
      if (!w || !hh) return;
      if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; }
      const g = canvas.getContext('2d');
      g.fillStyle = '#04050b'; g.fillRect(0, 0, w, hh);
      const cx = w * 0.56, cy = hh * 0.6, s = Math.min(w / 36, hh / 17); // pixels per M
      const P = ([x, y]) => [cx + x * s, cy - y * s];
      const font = `${11 * d}px "IBM Plex Mono", ui-monospace, monospace`;
      g.font = font;
      // the edge of the shadow, once both fates have been seen
      if (seenCapture && seenEscape) {
        const y = cy - CRITICAL_B * s;
        g.setLineDash([3 * d, 5 * d]); g.strokeStyle = 'rgba(255,180,92,.35)'; g.lineWidth = d;
        g.beginPath(); g.moveTo(0, y); g.lineTo(cx, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(255,180,92,.75)'; g.fillText(`edge: aim ${B_EDGE.toFixed(3)} rₛ`, 8 * d, y - 6 * d);
      }
      // photon sphere and horizon
      g.setLineDash([4 * d, 5 * d]); g.strokeStyle = 'rgba(255,180,92,.45)'; g.lineWidth = d;
      g.beginPath(); g.arc(cx, cy, PHOTON_SPHERE * s, 0, 7); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, 2 * s, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,140,80,.7)'; g.lineWidth = 1.2 * d; g.stroke();
      g.fillStyle = 'rgba(155,152,180,.9)';
      g.fillText('photon sphere', cx + PHOTON_SPHERE * s * 0.72, cy + PHOTON_SPHERE * s * 0.72 + 12 * d);
      g.fillText('horizon', cx - 22 * d, cy + 4 * d);
      if (!ray) return;
      // the laser
      const ly = cy - Math.max(0, aim.value + fine.value) * 2 * s;
      g.fillStyle = '#8fb8ff'; g.fillRect(4 * d, ly - 5 * d, 18 * d, 10 * d);
      g.fillStyle = 'rgba(155,152,180,.9)'; g.fillText('laser', 4 * d, ly + 18 * d);
      // the beam: drawn up to the moving pulse, then the pulse itself
      const upTo = Math.min(1, t) * total;
      g.strokeStyle = ray.fate === 'capture' ? 'rgba(255,107,92,.9)' : 'rgba(127,214,168,.9)'; g.lineWidth = 1.8 * d;
      g.beginPath();
      let head = null;
      for (let i = 0; i < ray.path.length; i++) {
        if (arc[i] > upTo) break;
        const [x, y] = P(ray.path[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); head = [x, y];
      }
      g.stroke();
      if (head && t < 1) { g.fillStyle = '#e8fff4'; g.beginPath(); g.arc(head[0], head[1], 3.5 * d, 0, 7); g.fill(); }
    }
    return stop;
  },
};
